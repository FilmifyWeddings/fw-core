import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  MASTER_ADMIN_EMAIL,
  verifyTripleLockCredentials,
  createAdminSessionToken,
  recordFailedAttempt,
  resetRateLimit,
  checkRateLimit,
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
 * Native HTML Form POST handler:
 * Allows 100% reliable login even if client JavaScript has errors or fails to hydrate.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.isLocked) {
      const lockRedirect = new URL('/sushant/admin/fw', req.url);
      lockRedirect.searchParams.set('error', 'Too many failed attempts. Vault locked for 15 minutes.');
      return NextResponse.redirect(lockRedirect, { status: 303 });
    }

    let email = '';
    let pin = '';
    let secretCode = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      email = (formData.get('superadmin_vault_email') || formData.get('email') || '').toString().trim();
      pin = (formData.get('superadmin_vault_pin') || formData.get('pin') || formData.get('passphrase') || '').toString().trim();
      secretCode = (formData.get('superadmin_vault_code') || formData.get('secretCode') || '').toString().trim();
    } else {
      const body = await req.json().catch(() => ({}));
      email = (body.email || body.superadmin_vault_email || '').trim();
      pin = (body.pin || body.passphrase || body.superadmin_vault_pin || '').trim();
      secretCode = (body.secretCode || body.superadmin_vault_code || '').trim();
    }

    const isValid = verifyTripleLockCredentials(email, pin, secretCode);

    if (!isValid) {
      const failed = recordFailedAttempt(ip);
      const remainingTries = Math.max(0, 5 - failed.attempts);
      const failRedirect = new URL('/sushant/admin/fw', req.url);
      failRedirect.searchParams.set(
        'error',
        `Triple-Lock verification failed. ${remainingTries} attempts remaining.`
      );
      return NextResponse.redirect(failRedirect, { status: 303 });
    }

    // Success: Reset rate limit
    resetRateLimit(ip);

    const token = createAdminSessionToken(MASTER_ADMIN_EMAIL, 12);

    // Redirect to super admin dashboard cleanly without query parameters
    const successRedirect = new URL('/sushant/admin/fw', req.url);
    const response = NextResponse.redirect(successRedirect, { status: 303 });

    // Set HttpOnly, Secure, SameSite=Lax cookie (Lax works seamlessly on redirects)
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
    const errRedirect = new URL('/sushant/admin/fw', req.url);
    errRedirect.searchParams.set('error', err.message || 'Authentication error');
    return NextResponse.redirect(errRedirect, { status: 303 });
  }
}
