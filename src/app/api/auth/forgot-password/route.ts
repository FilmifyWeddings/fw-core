import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndStoreResetToken } from '@/lib/auth-otp-store';
import { sendPasswordResetEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password
 * Triggers instant password recovery via Supabase Auth + direct Hostinger fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://studiocore.in';

    // 1. Search for user in `profiles` table first
    let userId: string | null = null;
    let recipientName = 'Creator';

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, workspace_name, email')
        .eq('email', targetEmail)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
        recipientName = profile.full_name || profile.workspace_name || 'Creator';
      }
    } catch (profileErr) {
      console.warn('[Forgot Password Profile Search Warning]:', profileErr);
    }

    // 2. Search in Supabase Auth user list if not found in profiles
    if (!userId) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find(u => u.email?.toLowerCase() === targetEmail);
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          recipientName = existingAuthUser.user_metadata?.full_name || existingAuthUser.user_metadata?.workspace_name || recipientName;
        }
      } catch (authErr) {
        console.warn('[Forgot Password Auth Search Warning]:', authErr);
      }
    }

    if (!userId) {
      userId = 'anon-' + Buffer.from(targetEmail).toString('hex').slice(0, 16);
    }

    // 3. Generate secure 15-minute token & persist in database
    const { token } = await generateAndStoreResetToken({
      email: targetEmail,
      userId: userId,
      expiresInMinutes: 15,
    });

    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${token}`;
    console.log(`[Forgot Password] Dispatching 1-click recovery to ${targetEmail} | Reset URL: ${resetUrl}`);

    // 4. Send Branded Password Reset Email with direct 1-click button via Hostinger SMTP
    const emailResult = await sendPasswordResetEmail({
      toEmail: targetEmail,
      recipientName,
      resetUrl,
      expiresInMinutes: 15,
    });

    if (!emailResult.success) {
      console.warn('[Forgot Password Direct SMTP Notice]:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email. Please check your inbox.',
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}
