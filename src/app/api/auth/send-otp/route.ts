import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_init_throw');

export async function POST(req: Request) {
  try {
    const { fullName, email, password } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // 1. Check if user already exists in Supabase auth
    const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (!listErr && existingUsers?.users) {
      const alreadyExists = existingUsers.users.some((u) => u.email?.toLowerCase() === cleanEmail);
      if (alreadyExists) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 400 }
        );
      }
    }

    // 2. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Store in pending_signups (NO USER CREATED IN auth.users YET)
    await supabaseAdmin.from('pending_signups').delete().eq('email', cleanEmail);
    const { error: insertErr } = await supabaseAdmin.from('pending_signups').insert({
      email: cleanEmail,
      full_name: cleanName,
      password_hash: cleanPassword,
      otp_code: otpCode,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error('[send-otp] pending_signups insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to record signup session. Please try again.' }, { status: 500 });
    }

    // 4. Send directly via Resend SDK
    const configuredSender = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'StudioCore <support@studiocore.in>';
    const fromAddress = configuredSender.includes('<') ? configuredSender : `StudioCore <${configuredSender}>`;
    let emailSent = false;
    let emailError: string | null = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const { error: mailError } = await resend.emails.send({
          from: fromAddress,
          to: [cleanEmail],
          subject: 'StudioCore - Your 6-Digit Verification Code',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background: #FAF9F6; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #EBE7DF;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #18181B; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">StudioCore</h1>
                <p style="color: #71717A; font-size: 13px; margin-top: 4px;">Studio Management Workspace</p>
              </div>
              <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #F4F4F5; text-align: center;">
                <p style="color: #27272A; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Your Verification OTP Code</p>
                <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #b45309; font-family: monospace; padding: 12px 0;">
                  ${otpCode}
                </div>
                <p style="color: #71717A; font-size: 12px; margin: 12px 0 0 0;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
              </div>
            </div>
          `,
        });

        if (mailError) {
          console.error('[send-otp] Resend Error:', mailError);
          emailError = mailError.message;
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        console.error('[send-otp] Resend SDK exception:', err);
        emailError = err.message;
      }
    }

    // Fallback to SMTP if Resend is not yet configured or had an error
    if (!emailSent) {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
          await transporter.sendMail({
            from: process.env.SMTP_FROM || `StudioCore <support@studiocore.in>`,
            to: cleanEmail,
            subject: 'StudioCore - Your 6-Digit Verification Code',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background: #FAF9F6; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #EBE7DF;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #18181B; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">StudioCore</h1>
                  <p style="color: #71717A; font-size: 13px; margin-top: 4px;">Studio Management Workspace</p>
                </div>
                <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #F4F4F5; text-align: center;">
                  <p style="color: #27272A; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Your Verification OTP Code</p>
                  <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #b45309; font-family: monospace; padding: 12px 0;">
                    ${otpCode}
                  </div>
                  <p style="color: #71717A; font-size: 12px; margin: 12px 0 0 0;">This code is valid for 10 minutes.</p>
                </div>
              </div>
            `,
          });
          emailSent = true;
          emailError = null;
        } catch (smtpErr: any) {
          console.error('[send-otp] SMTP fallback error:', smtpErr);
        }
      }
    }

    if (!emailSent && emailError) {
      return NextResponse.json({ error: emailError }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (err: any) {
    console.error('[send-otp] Handler error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
