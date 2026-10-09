import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreOtp, isPhoneRegistered } from '@/lib/auth-otp-store';
import { sendSmsOtp } from '@/lib/sms-gateway';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-phone-otp
 * Dispatches 6-digit Normal SMS OTP to user's mobile number.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, email, countryCode = '+91' } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    // Format full international number
    const national10 = cleanDigits.slice(-10);
    const codeDigits = String(countryCode).replace(/\D/g, '') || '91';
    const fullInternationalPhone = `${codeDigits}${national10}`;

    // Check if phone number is already registered with another account
    const alreadyRegistered = await isPhoneRegistered(fullInternationalPhone);
    if (alreadyRegistered) {
      return NextResponse.json({
        error: 'This mobile number is already registered with another account. Please use your own unique mobile number.',
      }, { status: 409 });
    }

    // Generate & store OTP code
    const { otp, expiresAt } = await generateAndStoreOtp({
      phone: fullInternationalPhone,
      email: email ? String(email).trim().toLowerCase() : undefined,
      type: 'google_phone_verify',
      metadata: { countryCode, national10, fullPhone: fullInternationalPhone },
      expiresInMinutes: 10,
    });

    // Send Normal SMS OTP
    const smsResult = await sendSmsOtp({
      phone: fullInternationalPhone,
      otp,
      templateKey: 'google_onboarding_otp',
    });

    if (!smsResult.success) {
      console.warn('[send-phone-otp notice]: SMS dispatch warning:', smsResult.error);
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent via SMS to ${countryCode} ${national10}`,
      expiresAt: expiresAt.toISOString(),
      // In dev mode, return preview for seamless testing
      preview: process.env.NODE_ENV !== 'production' ? { otp, smsResult } : undefined,
    });
  } catch (err: any) {
    console.error('[send-phone-otp error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to send SMS OTP' }, { status: 500 });
  }
}
