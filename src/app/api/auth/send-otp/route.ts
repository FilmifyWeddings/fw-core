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
    const sender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    let emailSent = false;
    let emailError: string | null = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const { error: mailError } = await resend.emails.send({
          from: `Filmify Weddings <${sender}>`,
          to: [cleanEmail],
          subject: 'Your 6-Digit Verification Code',
          html: `
            <div style="font-family: sans-serif; padding: 24px; background: #FDFBF7; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e7e5e4;">
              <h2 style="color: #1C1917; margin-top: 0;">Welcome to Filmify Weddings!</h2>
              <p style="color: #44403C; font-size: 14px;">Your verification code is:</p>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b45309; padding: 16px 0;">
                ${otpCode}
              </div>
              <p style="color: #78716C; font-size: 12px; margin-bottom: 0;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
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
            from: process.env.SMTP_FROM || `Filmify Weddings <${process.env.SMTP_USER}>`,
            to: cleanEmail,
            subject: 'Your 6-Digit Verification Code',
            html: `
              <div style="font-family: sans-serif; padding: 24px; background: #FDFBF7; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e7e5e4;">
                <h2 style="color: #1C1917; margin-top: 0;">Welcome to Filmify Weddings!</h2>
                <p style="color: #44403C; font-size: 14px;">Your verification code is:</p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b45309; padding: 16px 0;">
                  ${otpCode}
                </div>
                <p style="color: #78716C; font-size: 12px; margin-bottom: 0;">This code will expire in 10 minutes.</p>
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
