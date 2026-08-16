import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateResetToken, markResetTokenUsed } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password
 * Validates 15-minute token and updates user password in Supabase Auth & profiles.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Reset token is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Validate token
    const tokenValidation = await validateResetToken(token);
    if (!tokenValidation.valid || !tokenValidation.email) {
      return NextResponse.json({
        success: false,
        error: tokenValidation.error || 'Invalid or expired reset token.',
      }, { status: 400 });
    }

    const targetEmail = tokenValidation.email.trim().toLowerCase();

    // 2. Find real Supabase Auth user ID
    let realUserId: string | null = tokenValidation.userId && !tokenValidation.userId.startsWith('anon-') ? tokenValidation.userId : null;

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
      password: password,
      email_confirm: true,
    });

    if (updateError) {
      console.error('[Supabase Auth Password Update Error]:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 4. Mark token as used so it cannot be reused
    await markResetTokenUsed(token);

    console.log(`[Reset Password SUCCESS] Password updated for ${targetEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated! Redirecting to login...',
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update password.' },
      { status: 500 }
    );
  }
}
