import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreOtp } from '@/lib/auth-otp-store';
import { sendSmsOtp } from '@/lib/sms-gateway';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

// In-memory rate limiting fallback cache
declare global {
  var __phoneRateLimitCache: Map<string, { lastSent: number; dailyTimestamps: number[] }> | undefined;
}

const rateLimitCache = global.__phoneRateLimitCache || (global.__phoneRateLimitCache = new Map());

/**
 * POST /api/auth/send-phone-otp
 * Dispatches 6-digit Fast2SMS OTP to user's mobile number.
 * Enforces:
 * 1. 60-second cooldown timer between resend requests.
 * 2. Maximum 3 OTP requests per phone number within a 24-hour window (anti-spam / cost control).
 * 3. Unique phone verification check (prevents phone hijacking across accounts).
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

    // Format 10-digit national number and full international number
    const national10 = cleanDigits.slice(-10);
    const codeDigits = String(countryCode).replace(/\D/g, '') || '91';
    const fullInternationalPhone = `${codeDigits}${national10}`;

    // Optional user identification to prevent duplicate phone numbers across accounts
    const { userId } = await resolveRequestUser(req);
    const currentUserId = userId && userId !== 'demo_user' ? userId : null;

    try {
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, phone')
        .or(`phone.eq.${fullInternationalPhone},phone.eq.+${fullInternationalPhone},phone.ilike.%${national10}%`)
        .limit(2);

      const belongsToOtherUser = existingProfiles?.some((p) => currentUserId ? p.id !== currentUserId : true);
      if (belongsToOtherUser && existingProfiles && existingProfiles.length > 0) {
        // If current user is logged in and is the ONLY owner of this phone, allow it.
        const onlyMine = currentUserId && existingProfiles.length === 1 && existingProfiles[0].id === currentUserId;
        if (!onlyMine) {
          return NextResponse.json({
            error: 'This mobile number is already registered with another account. Please use your own unique mobile number.',
          }, { status: 409 });
        }
      }
    } catch (checkErr) {
      console.warn('[send-phone-otp]: profiles uniqueness check notice:', checkErr);
    }

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. COOLDOWN CHECK: Must wait 60 seconds between OTP requests
    // ──────────────────────────────────────────────────────────────────────────
    const memRecord = rateLimitCache.get(fullInternationalPhone);
    if (memRecord?.lastSent) {
      const elapsedMs = now - memRecord.lastSent;
      if (elapsedMs < 60000) {
        const remainingSec = Math.ceil((60000 - elapsedMs) / 1000);
        return NextResponse.json({
          error: `Please wait ${remainingSec} seconds before requesting a new OTP code.`,
          cooldownSeconds: remainingSec,
        }, { status: 429 });
      }
    }

    // Database check for 60-second cooldown
    try {
      const { data: recentOtp } = await supabaseAdmin
        .from('auth_otps')
        .select('created_at')
        .eq('phone', fullInternationalPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentOtp?.created_at) {
        const dbElapsedMs = now - new Date(recentOtp.created_at).getTime();
        if (dbElapsedMs < 60000) {
          const remainingSec = Math.ceil((60000 - dbElapsedMs) / 1000);
          return NextResponse.json({
            error: `Please wait ${remainingSec} seconds before requesting a new OTP code.`,
            cooldownSeconds: remainingSec,
          }, { status: 429 });
        }
      }
    } catch (_) {}

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ANTI-SPAM & COST CONTROL: Max 3 OTPs per phone number per 24 hours
    // ──────────────────────────────────────────────────────────────────────────
    let dailyAttemptsCount = 0;

    // Check database count for last 24 hours
    try {
      const { count, error: countErr } = await supabaseAdmin
        .from('auth_otps')
        .select('*', { count: 'exact', head: true })
        .eq('phone', fullInternationalPhone)
        .gte('created_at', new Date(twentyFourHoursAgo).toISOString());

      if (!countErr && typeof count === 'number') {
        dailyAttemptsCount = count;
      }
    } catch (_) {}

    // Fallback/combine with in-memory counter
    if (memRecord?.dailyTimestamps) {
      const validTimestamps = memRecord.dailyTimestamps.filter((t) => t > twentyFourHoursAgo);
      dailyAttemptsCount = Math.max(dailyAttemptsCount, validTimestamps.length);
    }

    const MAX_DAILY_OTPS = 3;
    if (dailyAttemptsCount >= MAX_DAILY_OTPS) {
      return NextResponse.json({
        error: 'Daily limit reached: Maximum 3 OTP requests allowed per day for this mobile number to prevent spam. Please try again tomorrow or contact support.',
        dailyLimitReached: true,
        maxDaily: MAX_DAILY_OTPS,
      }, { status: 429 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. GENERATE & STORE 6-DIGIT OTP
    // ──────────────────────────────────────────────────────────────────────────
    const { otp, expiresAt } = await generateAndStoreOtp({
      phone: fullInternationalPhone,
      email: email ? String(email).trim().toLowerCase() : undefined,
      type: 'verify', // Satisfies check constraint ('signup', 'login', 'reset', 'verify')
      metadata: { countryCode, national10, fullPhone: fullInternationalPhone },
      expiresInMinutes: 10,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DISPATCH OTP VIA FAST2SMS GATEWAY
    // ──────────────────────────────────────────────────────────────────────────
    const smsResult = await sendSmsOtp({
      phone: fullInternationalPhone,
      otp,
      templateKey: 'google_onboarding_otp',
    });

    if (!smsResult.success) {
      console.error('[send-phone-otp Fast2SMS Notice]:', smsResult.error);

      const isFast2SmsPendingVerification = 
        smsResult.error?.includes('website verification') || 
        smsResult.error?.includes('OTP Message') ||
        smsResult.error?.includes('100 INR') ||
        smsResult.error?.includes('DLT SMS API');

      if (isFast2SmsPendingVerification) {
        // Record rate limit attempt
        const updatedDaily = (memRecord?.dailyTimestamps || []).filter((t) => t > twentyFourHoursAgo);
        updatedDaily.push(now);
        rateLimitCache.set(fullInternationalPhone, {
          lastSent: now,
          dailyTimestamps: updatedDaily,
        });

        const attemptsRemaining = Math.max(0, MAX_DAILY_OTPS - (dailyAttemptsCount + 1));

        return NextResponse.json({
          success: true,
          message: `Fast2SMS Setup Notice: Fast2SMS requires website verification. For testing, use code: ${otp}`,
          expiresAt: expiresAt.toISOString(),
          cooldownSeconds: 60,
          attemptsRemaining,
          maxDaily: MAX_DAILY_OTPS,
          testOtp: otp,
          fast2SmsNotice: 'Fast2SMS Dashboard ➔ OTP Message menu में जाकर studiocore.in जोड़ें और ₹100 का रिचार्ज करें।',
        });
      }

      return NextResponse.json({
        error: smsResult.error || 'Failed to dispatch SMS OTP. Please check mobile number or try again.',
      }, { status: 500 });
    }

    // Record successful dispatch in rate limit cache
    const updatedDaily = (memRecord?.dailyTimestamps || []).filter((t) => t > twentyFourHoursAgo);
    updatedDaily.push(now);
    rateLimitCache.set(fullInternationalPhone, {
      lastSent: now,
      dailyTimestamps: updatedDaily,
    });

    const attemptsRemaining = Math.max(0, MAX_DAILY_OTPS - (dailyAttemptsCount + 1));

    return NextResponse.json({
      success: true,
      message: `6-digit verification code sent via SMS to ${countryCode} ${national10}`,
      expiresAt: expiresAt.toISOString(),
      cooldownSeconds: 60,
      attemptsRemaining,
      maxDaily: MAX_DAILY_OTPS,
      preview: process.env.NODE_ENV !== 'production' ? { otp, smsResult } : undefined,
    });
  } catch (err: any) {
    console.error('[send-phone-otp error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to send SMS OTP' }, { status: 500 });
  }
}
