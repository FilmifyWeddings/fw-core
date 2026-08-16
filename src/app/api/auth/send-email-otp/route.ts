import { NextRequest, NextResponse } from 'next/server';
import { isEmailRegistered, isDisposableEmail, generateAndStoreEmailOtp } from '@/lib/auth-otp-store';
import { sendEmailOtp } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-email-otp
 * Validates signup details, blocks disposable emails, and sends 6-digit verification code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, businessName, email, phone, countryCode, password } = body;

    const targetName = (name || '').trim();
    const targetStudio = (businessName || '').trim();
    const targetEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');

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
    if (!cleanPhone || cleanPhone.length < 7) {
      return NextResponse.json({ success: false, error: 'Please enter a valid mobile number.' }, { status: 400 });
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

    // 3. Check if email already registered
    const alreadyExists = await isEmailRegistered(targetEmail);
    if (alreadyExists) {
      return NextResponse.json({
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      }, { status: 400 });
    }

    // 4. Generate 6-digit OTP (valid for 10 minutes)
    const { otp } = await generateAndStoreEmailOtp({
      email: targetEmail,
      name: targetName,
      phone: `${countryCode || '+91'}${cleanPhone}`,
      expiresInMinutes: 10,
    });

    console.log(`[Email OTP] Generated code for ${targetEmail}: ${otp}`);

    // 5. Send verification code via Hostinger SMTP
    const emailResult = await sendEmailOtp({
      toEmail: targetEmail,
      recipientName: targetName,
      otp,
      expiresInMinutes: 10,
    });

    if (!emailResult.success) {
      console.warn('[Email OTP Send Warning]:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${targetEmail}.`,
    });
  } catch (err: any) {
    console.error('[Send Email OTP Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch verification code.' },
      { status: 500 }
    );
  }
}
