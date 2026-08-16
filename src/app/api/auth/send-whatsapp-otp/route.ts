import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreOtp, isPhoneRegistered, normalizePhoneNumber } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-whatsapp-otp
 * Generates and triggers 6-digit WhatsApp OTP to the user's mobile number.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, email, name, type = 'signup' } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, error: 'Mobile / WhatsApp number is required' }, { status: 400 });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    // If signup, enforce unique mobile number constraint
    if (type === 'signup') {
      const alreadyRegistered = await isPhoneRegistered(cleanPhone);
      if (alreadyRegistered) {
        return NextResponse.json(
          { success: false, error: 'This mobile number is already registered. Please log in instead.' },
          { status: 409 }
        );
      }
    }

    // Generate and store OTP (10-minute validity)
    const { otp, expiresAt } = await generateAndStoreOtp({
      phone: cleanPhone,
      email,
      type,
      metadata: { name, email },
      expiresInMinutes: 10,
    });

    const formattedMessage = `📸 *STUDIO Verification Code*\n\nHello *${name || 'Creator'}*,\nYour 6-digit verification code is:\n\n👉 *${otp}*\n\n⏱️ Valid for 10 minutes.\nDo not share this code with anyone.`;

    let waDelivered = false;

    // 1. Attempt sending via WhastBoost API Gateway
    const appKey = process.env.WHASTBOOST_APP_KEY;
    const authKey = process.env.WHASTBOOST_AUTH_KEY;
    const apiUrl = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';

    if (appKey && authKey && !authKey.includes('mock')) {
      try {
        const formData = new FormData();
        formData.append('appkey', appKey);
        formData.append('authkey', authKey);
        formData.append('to', cleanPhone);
        formData.append('message', formattedMessage);

        const wbRes = await fetch(`${apiUrl}/send-message`, {
          method: 'POST',
          body: formData,
        });

        const wbJson = await wbRes.json().catch(() => ({}));
        if (wbRes.ok && wbJson.status === 200) {
          waDelivered = true;
        }
      } catch (wbErr) {
        console.warn('[Whastboost OTP Send Error]:', wbErr);
      }
    }

    console.log(`[AUTH OTP GENERATED] Phone: +${cleanPhone} | OTP: ${otp} | Expires: ${expiresAt.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to +${cleanPhone} via WhatsApp`,
      phone: cleanPhone,
      expiresAt: expiresAt.toISOString(),
      // Include debug OTP in development mode so developers can test without waiting for WhatsApp
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err: any) {
    console.error('[API Send WhatsApp OTP Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to send WhatsApp OTP. Please try again.' },
      { status: 500 }
    );
  }
}
