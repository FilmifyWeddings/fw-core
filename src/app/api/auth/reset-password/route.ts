import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateResetToken, validateResetTokenOrOtp, markResetTokenUsed } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

// Helper to safely parse email & sub from Supabase recovery JWT
function parseJwtRecoveryToken(tokenStr: string): { email?: string; userId?: string } | null {
  try {
    const payloadBase64 = tokenStr.split('.')[1];
    if (!payloadBase64) return null;
    const jsonStr = Buffer.from(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr);
    return {
      email: payload?.email || payload?.user_metadata?.email || undefined,
      userId: payload?.sub || undefined,
    };
  } catch {
    return null;
  }
}

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
 * Direct Supabase Admin Password Update (guarantees auth.users update in Supabase database).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, accessToken, password, newPassword, email, otp } = body;
    const finalPassword = (password || newPassword || '').trim();

    if (!finalPassword || finalPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    let targetEmail: string | null = null;
    let realUserId: string | null = null;
    let customTokenToMark: string | null = null;

    // Option A: Supabase recovery JWT access token
    if (accessToken) {
      const parsed = parseJwtRecoveryToken(accessToken);
      if (parsed?.email) {
        targetEmail = parsed.email.trim().toLowerCase();
        realUserId = parsed.userId || null;
      }
    }

    // Option B: Custom 15-minute token
    if (!targetEmail && token) {
      const validation = await validateResetToken(token);
      if (validation.valid && validation.email) {
        targetEmail = validation.email.trim().toLowerCase();
        realUserId = validation.userId && !validation.userId.startsWith('anon-') ? validation.userId : null;
        customTokenToMark = token;
      }
    }

    // Option C: Email + OTP
    if (!targetEmail && email && otp) {
      const validation = await validateResetTokenOrOtp({ email, otp });
      if (validation.valid && validation.email) {
        targetEmail = validation.email.trim().toLowerCase();
        realUserId = validation.userId && !validation.userId.startsWith('anon-') ? validation.userId : null;
        if (validation.token) customTokenToMark = validation.token;
      }
    }

    if (!targetEmail) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired password reset link. Please request a new link.',
      }, { status: 400 });
    }

    // Lookup user in Supabase Auth user list if userId not found yet
    if (!realUserId) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const user = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
        if (user?.id) {
          realUserId = user.id;
        }
      } catch (authErr) {
        console.warn('[Reset Password Auth User List Warning]:', authErr);
      }
    }

    // Fallback: search profiles table
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

    if (!realUserId) {
      return NextResponse.json({
        success: false,
        error: 'User account not found for this email in Supabase. Please register for an account.',
      }, { status: 404 });
    }

    // 3. DIRECTLY UPDATE PASSWORD IN SUPABASE AUTH VIA ADMIN API
    console.log(`[Reset Password] Direct Supabase Admin password update for userId: ${realUserId} (${targetEmail})`);
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(realUserId, {
      password: finalPassword,
      email_confirm: true,
    });

    if (updateError) {
      console.error('[Supabase Auth Password Update Error]:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // 4. Mark custom token used if applicable
    if (customTokenToMark) {
      await markResetTokenUsed(customTokenToMark);
    }

    console.log(`[Reset Password SUCCESS] Supabase Auth password successfully updated for ${targetEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated in Supabase! Redirecting to sign in...',
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update password in Supabase.' },
      { status: 500 }
    );
  }
}
