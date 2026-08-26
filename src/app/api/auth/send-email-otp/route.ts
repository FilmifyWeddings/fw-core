import { NextRequest, NextResponse } from 'next/server';
import { isEmailRegistered, isPhoneRegistered, isDisposableEmail, generateAndStoreEmailOtp } from '@/lib/auth-otp-store';
import { sendEmailOtp } from '@/lib/email-service';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-email-otp
 * Validates signup details, blocks duplicate mobile & email, blocks disposable emails,
 * and triggers instant 6-digit OTP delivery via Supabase Cloud Mailer (HTTPS) + Hostinger fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, businessName, email, phone, countryCode, password } = body;

    const targetName = (name || '').trim();
    const targetStudio = (businessName || '').trim();
    const targetEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const code = (countryCode || '+91').trim();
    const fullPhone = cleanPhone ? `${code}${cleanPhone}` : '';

    // 1. Basic field validations
    if (!targetName) {
      return NextResponse.json({ success: false, error: 'Full name is required.' }, { status: 400 });
    }
    if (!targetStudio) {
      return NextResponse.json({ success: false, error: 'Studio name is required.' }, { status: 400 });
    }
    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }
    const isIndia = code === '+91' || code === '91';
    if (isIndia) {
      if (cleanPhone.length !== 10) {
        return NextResponse.json({
          success: false,
          error: 'Indian mobile numbers must be exactly 10 digits (e.g. 9876543210).'
        }, { status: 400 });
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
        }, { status: 400 });
      }
    } else if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15) {
      return NextResponse.json({ success: false, error: 'Please enter a valid mobile number (7 to 15 digits).' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // 2. Check for disposable/throwaway email domains
    if (isDisposableEmail(targetEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Temporary and disposable email addresses are not permitted. Please enter your real email address.',
      }, { status: 400 });
    }

    // 3. Duplicate Email Check (only checks completed active accounts in profiles)
    const emailExists = await isEmailRegistered(targetEmail);
    if (emailExists) {
      return NextResponse.json({
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      }, { status: 400 });
    }

    // 4. Duplicate Mobile Number Check
    const phoneExists = await isPhoneRegistered(cleanPhone);
    if (phoneExists) {
      return NextResponse.json({
        success: false,
        error: 'This mobile number is already registered with another account. Please use a different number or log in.',
      }, { status: 400 });
    }

    // 5. Generate secure 6-digit OTP in our local store
    const { otp } = await generateAndStoreEmailOtp({
      email: targetEmail,
      name: targetName,
      phone: fullPhone,
      expiresInMinutes: 10,
    });

    console.log(`[Email OTP Generated for ${targetEmail}]: ${otp}`);

    // 6. Trigger Multi-Provider Email Dispatch (Primary: Resend)
    let emailDelivered = false;
    try {
      const emailRes = await sendEmailOtp({
        toEmail: targetEmail,
        recipientName: targetName,
        otp,
        expiresInMinutes: 10,
      });
      emailDelivered = emailRes.success;
      console.log(`[Send Email OTP Result for ${targetEmail}]:`, emailRes);
    } catch (emailErr: any) {
      console.warn('[Email OTP Dispatch Notice]:', emailErr?.message);
    }

    // 7. Supabase Cloud Mailer Trigger (ONLY as fallback if primary failed)
    if (!emailDelivered) {
      try {
        supabaseAdmin.auth.signInWithOtp({
          email: targetEmail,
          options: {
            shouldCreateUser: true,
            data: {
              full_name: targetName,
              workspace_name: targetStudio,
              phone: fullPhone,
            },
          },
        }).catch((sbErr) => {
          console.warn('[Supabase Cloud Mailer Fallback Notice]:', sbErr?.message);
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `A verification code has been dispatched to ${targetEmail}.`,
      delivered: emailDelivered,
      // Provide debugOtp in development so developers never get blocked by mail server issues
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err: any) {
    console.error('[Send Email OTP Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch verification code.' },
      { status: 500 }
    );
  }
}
