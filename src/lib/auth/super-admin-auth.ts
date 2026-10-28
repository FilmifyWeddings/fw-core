import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'fw_admin_session';

// Strict Triple-Lock Master Credentials (Single Source of Truth)
export const MASTER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_MASTER_EMAIL || 'sushantnawale1cr@gmail.com').toLowerCase().trim();
export const MASTER_ADMIN_PIN = process.env.SUPER_ADMIN_MASTER_PIN || 'Sush102310#';
export const MASTER_SECRET_CODE = process.env.SUPER_ADMIN_SECRET_CODE || 'Shiva';

// In-Memory Rate Limiter Map for IP protection
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function getSecretKey(): string {
  return process.env.SUPER_ADMIN_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fw_super_admin_vault_secret_2026';
}

/**
 * Constant-time comparison to protect against timing attacks
 */
export function secureTimingCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the exact 3 master credentials:
 * 1. Master Email === sushantnawale1cr@gmail.com
 * 2. Master PIN === Sush102310#
 * 3. Secret Code === Shiva
 */
export function verifyTripleLockCredentials(
  email: string | undefined,
  pin: string | undefined,
  secretCode: string | undefined
): boolean {
  if (!email || !pin || !secretCode) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPin = pin.trim();
  const normalizedSecret = secretCode.trim();

  const isEmailValid = secureTimingCompare(normalizedEmail, MASTER_ADMIN_EMAIL);
  const isPinValid = secureTimingCompare(normalizedPin, MASTER_ADMIN_PIN);
  const isSecretValid = secureTimingCompare(normalizedSecret, MASTER_SECRET_CODE);

  return isEmailValid && isPinValid && isSecretValid;
}

/**
 * Check if IP is currently rate-limited (Max 5 failed attempts per 15 mins)
 */
export function checkRateLimit(ip: string): { isLocked: boolean; remainingSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) return { isLocked: false, remainingSec: 0 };

  if (record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSec };
  }

  // Lock expired
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    rateLimitMap.delete(ip);
  }
  return { isLocked: false, remainingSec: 0 };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(ip: string): { attempts: number; isLocked: boolean; remainingSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { attempts: 0, lockedUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= 5) {
    // Lock for 15 minutes
    record.lockedUntil = now + 15 * 60 * 1000;
    rateLimitMap.set(ip, record);
    return { attempts: record.attempts, isLocked: true, remainingSec: 15 * 60 };
  }

  rateLimitMap.set(ip, record);
  return { attempts: record.attempts, isLocked: false, remainingSec: 0 };
}

/**
 * Reset rate limit counter on successful login
 */
export function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

/**
 * Create a tamper-proof HMAC signed session token
 */
export function createAdminSessionToken(email: string, durationHours = 12): string {
  const payload = {
    email: email.toLowerCase().trim(),
    role: 'superadmin',
    createdAt: Date.now(),
    expiresAt: Date.now() + durationHours * 3600 * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a tamper-proof session token
 */
export function verifyAdminSessionToken(tokenString: string | null | undefined): { valid: boolean; email?: string } {
  if (!tokenString) return { valid: false };
  try {
    const [payloadB64, signature] = tokenString.split('.');
    if (!payloadB64 || !signature) return { valid: false };

    const expectedSig = crypto
      .createHmac('sha256', getSecretKey())
      .update(payloadB64)
      .digest('base64url');

    if (!secureTimingCompare(signature, expectedSig)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!payload || !payload.expiresAt || Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    // Must strictly be the verified master email
    if (payload.email !== MASTER_ADMIN_EMAIL) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Comprehensive Gatekeeper verification for API requests
 */
export async function verifySuperAdminSession(req: NextRequest): Promise<{ authorized: boolean; email?: string; error?: string }> {
  try {
    // 1. Check HTTP-Only Session Cookie
    const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (cookieToken) {
      const verified = verifyAdminSessionToken(cookieToken);
      if (verified.valid && verified.email) {
        return { authorized: true, email: verified.email };
      }
    }

    // 2. Check Bearer Token in Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (bearerToken) {
      const verified = verifyAdminSessionToken(bearerToken);
      if (verified.valid && verified.email) {
        return { authorized: true, email: verified.email };
      }
    }

    return { authorized: false, error: 'Unauthorized: Super Admin access required' };
  } catch (err: any) {
    return { authorized: false, error: err.message || 'Internal security verification error' };
  }
}
