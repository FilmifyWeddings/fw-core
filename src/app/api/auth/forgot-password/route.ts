import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndStoreResetToken } from '@/lib/auth-otp-store';
import { sendPasswordResetEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password
 * Generates secure 15-minute reset token and sends modern HTML email via Nodemailer Hostinger SMTP.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();

    // Check if user exists in Supabase
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === targetEmail);

    if (!existingUser) {
      // Return success with generic message for privacy / security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      });
    }

    // Generate secure 15-minute token
    const { token } = await generateAndStoreResetToken({
      email: targetEmail,
      userId: existingUser.id,
      expiresInMinutes: 15,
    });

    // Construct reset password link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${token}`;

    const recipientName = existingUser.user_metadata?.full_name || existingUser.user_metadata?.workspace_name || 'Creator';

    // Send email via Nodemailer Hostinger SMTP
    const emailResult = await sendPasswordResetEmail({
      toEmail: targetEmail,
      recipientName,
      resetUrl,
      expiresInMinutes: 15,
    });

    console.log(`[PASSWORD RESET SENT] Email: ${targetEmail} | Reset URL: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email. Valid for 15 minutes.',
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}
