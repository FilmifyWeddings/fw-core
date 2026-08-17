import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateResetToken, validateResetTokenOrOtp, markResetTokenUsed } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * GET /api/auth/reset-password?token=...
 * Validates the reset token when user clicks the email link.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Reset token is required.' }, { status: 400 });
    }

    const validation = await validateResetToken(token);
    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error || 'This reset link has expired or is invalid.',
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      email: validation.email,
      userId: validation.userId,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message || 'Validation failed.' }, { status: 500 });
  }
}

/**
 * POST /api/auth/reset-password
 * Validates either a 15-minute token OR 6-digit OTP and updates user password in Supabase Auth.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password, newPassword, email, otp } = body;
    const finalPassword = (password || newPassword || '').trim();

    if (!finalPassword || finalPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (!token && (!email || !otp)) {
      return NextResponse.json({ success: false, error: 'Reset token or 6-digit verification code is required.' }, { status: 400 });
    }

    // 1. Validate token or 6-digit OTP
    const validation = await validateResetTokenOrOtp({
      token,
      email,
      otp,
    });

    if (!validation.valid || !validation.email) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Invalid or expired reset code / token. Please request a new link.',
      }, { status: 400 });
    }

    const targetEmail = validation.email.trim().toLowerCase();

    // 2. Find real Supabase Auth user ID
    let realUserId: string | null = validation.userId && !validation.userId.startsWith('anon-') ? validation.userId : null;

    // Check profiles table if needed
    if (!realUserId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', targetEmail)
          .maybeSingle();

        if (profile?.id) {
          realUserId = profile.id;
        }
      } catch (profileErr) {
        console.warn('[Reset Password Profile Lookup Warning]:', profileErr);
      }
    }

    // Check Supabase Auth list if still not found
    if (!realUserId) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const user = userList?.users?.find(u => u.email?.toLowerCase() === targetEmail);
        if (user?.id) {
          realUserId = user.id;
        }
      } catch (authErr) {
        console.warn('[Reset Password Auth User List Warning]:', authErr);
      }
    }

    if (!realUserId) {
      return NextResponse.json({
        success: false,
        error: 'User account not found for this email address. Please register for a new account.',
      }, { status: 404 });
    }

    // 3. Update password in Supabase Auth
    console.log(`[Reset Password] Updating password for user ID: ${realUserId} (${targetEmail})`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(realUserId, {
      password: finalPassword,
      email_confirm: true,
    });

    if (updateError) {
      console.error('[Supabase Auth Password Update Error]:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 4. Mark token / OTP as used
    if (validation.token) {
      await markResetTokenUsed(validation.token);
    }

    console.log(`[Reset Password SUCCESS] Password updated for ${targetEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated! Redirecting to sign in...',
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update password.' },
      { status: 500 }
    );
  }
}
