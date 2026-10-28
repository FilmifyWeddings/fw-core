import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  MASTER_ADMIN_EMAIL,
  verifyTripleLockCredentials,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  createAdminSessionToken,
  verifySuperAdminSession,
} from '@/lib/auth/super-admin-auth';

export const dynamic = 'force-dynamic';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * GET: Check if current session is active and valid
 */
export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminSession(req);
  if (auth.authorized) {
    return NextResponse.json({ authenticated: true, email: auth.email });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

/**
 * POST: Authenticate Super Admin with Strict Triple-Lock:
 * 1. Master Email (sushantnawale1cr@gmail.com)
 * 2. Master PIN (Sush102310#)
 * 3. Authorization Secret Code (Shiva)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Vault locked. Too many failed attempts. Security lock active for ${Math.ceil(rateCheck.remainingSec / 60)} minutes.`,
          locked: true,
          remainingSec: rateCheck.remainingSec,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, pin, passphrase, secretCode } = body;

    const providedEmail = (email || '').trim().toLowerCase();
    const providedPin = (pin || passphrase || '').trim();
    const providedSecret = (secretCode || '').trim();

    // Strict Triple-Lock Verification (All 3 must match simultaneously)
    const isTripleValid = verifyTripleLockCredentials(providedEmail, providedPin, providedSecret);

    if (!isTripleValid) {
      const failed = recordFailedAttempt(ip);
      const remainingTries = Math.max(0, 5 - failed.attempts);

      return NextResponse.json(
        {
          success: false,
          error: failed.isLocked
            ? 'Vault locked for 15 minutes due to multiple failed verification attempts.'
            : `Triple-Lock verification failed. Please verify Email, Master PIN, and Authorization Secret Code. (${remainingTries} attempts remaining before temporary lockout)`,
          attemptsRemaining: remainingTries,
          locked: failed.isLocked,
        },
        { status: 401 }
      );
    }

    // Success: Reset rate limit for this IP
    resetRateLimit(ip);

    const token = createAdminSessionToken(MASTER_ADMIN_EMAIL, 12); // 12 hours duration

    const response = NextResponse.json({
      success: true,
      email: MASTER_ADMIN_EMAIL,
      token,
      message: 'Triple-Lock Super Admin vault access granted',
    });

    // Set HttpOnly, Secure, SameSite=Lax cookie (Lax reliably preserves cookie across redirects)
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 3600,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Invalidate Super Admin Session & clear cookie
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Super Admin session terminated successfully',
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
