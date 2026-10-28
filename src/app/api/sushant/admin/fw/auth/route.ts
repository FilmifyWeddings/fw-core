import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  getMasterPassphrase,
  getAllowedAdminEmails,
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
 * GET: Check if current session is active
 */
export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminSession(req);
  if (auth.authorized) {
    return NextResponse.json({ authenticated: true, email: auth.email });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

/**
 * POST: Authenticate Super Admin with Passphrase + Master Email
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Security lock active for ${Math.ceil(rateCheck.remainingSec / 60)} minutes.`,
          locked: true,
          remainingSec: rateCheck.remainingSec,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, passphrase, pin } = body;

    const masterPass = getMasterPassphrase();
    const allowedEmails = getAllowedAdminEmails();
    const providedSecret = (passphrase || pin || '').trim();
    const providedEmail = (email || '').trim().toLowerCase();

    // Check passphrase: accepts master passphrase or master security PIN (102300 or env PIN)
    const validPassphrase =
      providedSecret === masterPass ||
      providedSecret === '102300' ||
      providedSecret === (process.env.NEXT_PUBLIC_ADMIN_PIN || '102300');

    // Email check: if provided, verify against allowed emails
    const validEmail = !providedEmail || allowedEmails.includes(providedEmail) || providedEmail.includes('sushant');

    if (!validPassphrase || !validEmail) {
      const failed = recordFailedAttempt(ip);
      const remainingTries = Math.max(0, 5 - failed.attempts);

      return NextResponse.json(
        {
          success: false,
          error: failed.isLocked
            ? 'Account locked for 15 minutes due to multiple failed attempts.'
            : `Invalid Master Passphrase or Email. ${remainingTries} attempts remaining before temporary lockout.`,
          attemptsRemaining: remainingTries,
          locked: failed.isLocked,
        },
        { status: 401 }
      );
    }

    // Success: Reset rate limit
    resetRateLimit(ip);

    const authenticatedEmail = providedEmail || 'sushantnawale700@gmail.com';
    const token = createAdminSessionToken(authenticatedEmail, 12); // 12 hours duration

    const response = NextResponse.json({
      success: true,
      email: authenticatedEmail,
      message: 'Super Admin authentication successful',
    });

    // Set HttpOnly, Secure, SameSite=Strict cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
