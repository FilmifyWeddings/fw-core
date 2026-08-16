import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateResetToken, markResetTokenUsed } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password
 * Validates 15-minute token and updates user password in Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Reset token is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Validate token
    const tokenValidation = await validateResetToken(token);
    if (!tokenValidation.valid || !tokenValidation.email) {
      return NextResponse.json({ success: false, error: tokenValidation.error || 'Invalid or expired reset token' }, { status: 400 });
    }

    const targetEmail = tokenValidation.email;

    // Find user ID
    let userId = tokenValidation.userId;
    if (!userId) {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const user = userList?.users?.find(u => u.email?.toLowerCase() === targetEmail);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User account not found' }, { status: 404 });
      }
      userId = user.id;
    }

    // Update password in Supabase auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // Mark token as used
    await markResetTokenUsed(token);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated. You can now log in.',
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update password.' },
      { status: 500 }
    );
  }
}
