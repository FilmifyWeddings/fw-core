import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

interface OtpRecord {
  phone?: string;
  email?: string;
  otp: string;
  type: string;
  metadata?: any;
  expiresAt: number;
  verified: boolean;
}

interface ResetTokenRecord {
  email: string;
  userId?: string;
  token: string;
  otp?: string;
  expiresAt: number;
  used: boolean;
}

// In-memory fallback caches in case tables aren't populated yet
declare global {
  var __authOtpCache: Map<string, OtpRecord> | undefined;
  var __emailOtpCache: Map<string, OtpRecord> | undefined;
  var __passwordResetCache: Map<string, ResetTokenRecord> | undefined;
}

const otpCache = global.__authOtpCache || (global.__authOtpCache = new Map<string, OtpRecord>());
const emailOtpCache = global.__emailOtpCache || (global.__emailOtpCache = new Map<string, OtpRecord>());
const resetCache = global.__passwordResetCache || (global.__passwordResetCache = new Map<string, ResetTokenRecord>());

// Common temporary/throwaway email domains blacklist
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', '10minutemail.com', 'mailinator.com',
  'guerrillamail.com', 'sharklasers.com', 'getairmail.com', 'throwawaymail.com',
  'dispostable.com', 'yopmail.com', 'fakeinbox.com', 'trashmail.com',
  'mohmal.com', 'tempinbox.com', 'generator.email', 'crazymailing.com',
  'mytemp.email', 'dropmail.me', 'trashmail.net', 'minuteinbox.com'
]);

/**
 * Checks if an email uses a disposable / temporary email domain
 */
export function isDisposableEmail(rawEmail: string): boolean {
  if (!rawEmail || !rawEmail.includes('@')) return true;
  const domain = rawEmail.trim().toLowerCase().split('@')[1];
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Standardize phone number format
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Check if a phone number is already registered in active profiles
 */
export async function isPhoneRegistered(rawPhone: string): Promise<boolean> {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits || digits.length < 7) return false;
  const raw10 = digits.slice(-10);

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .or(`phone.eq.${digits},phone.eq.+${digits},phone.ilike.%${raw10}%`)
      .limit(1);

    if (!error && profiles && profiles.length > 0) {
      return true;
    }
  } catch (err) {
    console.error('[isPhoneRegistered Check Error]:', err);
  }

  return false;
}

/**
 * Check if an email is already registered in active profiles
 */
export async function isEmailRegistered(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (!error && profiles && profiles.length > 0) {
      return true;
    }
  } catch (err) {
    console.error('[isEmailRegistered Check Error]:', err);
  }

  return false;
}

/**
 * Store an OTP code (in-memory + database fallback)
 */
export async function storeOtp({
  phone,
  email,
  otp,
  type = 'signup',
  metadata = {},
  expiresInMinutes = 10,
}: {
  phone?: string;
  email?: string;
  otp: string;
  type?: string;
  metadata?: any;
  expiresInMinutes?: number;
}): Promise<void> {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const record: OtpRecord = { phone, email, otp, type, metadata, expiresAt, verified: false };

  if (phone) {
    otpCache.set(phone, record);
  }
  if (email) {
    emailOtpCache.set(email.toLowerCase(), record);
  }

  try {
    await supabaseAdmin.from('auth_otps').insert({
      phone: phone || null,
      email: email ? email.toLowerCase() : null,
      otp,
      type,
      metadata,
      expires_at: new Date(expiresAt).toISOString(),
      verified: false,
    });
  } catch (err) {
    console.warn('[storeOtp DB fallback to in-memory]:', err);
  }
}

/**
 * Generate a 6-digit OTP and store it for email verification
 */
export async function generateAndStoreEmailOtp({
  email: rawEmail,
  name,
  phone,
  type = 'signup',
  metadata = {},
  expiresInMinutes = 10,
}: {
  email: string;
  name?: string;
  phone?: string;
  type?: 'signup' | 'login' | 'verify';
  metadata?: any;
  expiresInMinutes?: number;
}): Promise<{ otp: string; expiresAt: Date }> {
  const email = rawEmail.trim().toLowerCase();
  const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  emailOtpCache.set(email, {
    email,
    phone,
    otp,
    type,
    metadata: { ...metadata, name, phone },
    expiresAt: expiresAt.getTime(),
    verified: false,
  });

  try {
    await supabaseAdmin.from('auth_otps').insert({
      email,
      phone: phone || null,
      otp,
      type,
      metadata: { ...metadata, name, phone },
      verified: false,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn('[auth_otps Email DB fallback to cache]:', err);
  }

  return { otp, expiresAt };
}

/**
 * Verify a 6-digit Email OTP
 */
export async function verifyEmailOtp({
  email: rawEmail,
  otp,
}: {
  email: string;
  otp: string;
}): Promise<{ valid: boolean; error?: string; metadata?: any }> {
  const email = rawEmail.trim().toLowerCase();
  const cleanOtp = (otp || '').trim();

  // 1. Check in-memory cache
  const cached = emailOtpCache.get(email);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      emailOtpCache.delete(email);
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (cached.otp === cleanOtp) {
      cached.verified = true;
      emailOtpCache.delete(email);
      return { valid: true, metadata: cached.metadata };
    }
  }

  // 2. Check Supabase auth_otps table
  try {
    const { data, error } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', cleanOtp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      await supabaseAdmin
        .from('auth_otps')
        .update({ verified: true })
        .eq('id', data.id);

      return { valid: true, metadata: data.metadata };
    }
  } catch (err) {
    console.warn('[verifyEmailOtp DB check error]:', err);
  }

  return { valid: false, error: 'Invalid verification code. Please check your email and try again.' };
}

/**
 * Generate and store a 6-digit WhatsApp OTP
 */
export async function generateAndStoreOtp({
  phone: rawPhone,
  email,
  type = 'signup',
  metadata = {},
  expiresInMinutes = 10,
}: {
  phone: string;
  email?: string;
  type?: 'signup' | 'login' | 'reset' | 'verify';
  metadata?: any;
  expiresInMinutes?: number;
}): Promise<{ otp: string; expiresAt: Date }> {
  const phone = normalizePhoneNumber(rawPhone);
  const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  otpCache.set(phone, {
    phone,
    email,
    otp,
    type,
    metadata,
    expiresAt: expiresAt.getTime(),
    verified: false,
  });

  try {
    await supabaseAdmin.from('auth_otps').insert({
      phone,
      email: email || null,
      otp,
      type,
      metadata,
      verified: false,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn('[auth_otps DB fallback to cache]:', err);
  }

  return { otp, expiresAt };
}

/**
 * Verify a 6-digit WhatsApp OTP
 */
export async function verifyOtp({
  phone: rawPhone,
  otp,
}: {
  phone: string;
  otp: string;
}): Promise<{ valid: boolean; error?: string; metadata?: any; email?: string }> {
  const phone = normalizePhoneNumber(rawPhone);
  const cleanOtp = otp.trim();

  const cached = otpCache.get(phone);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      otpCache.delete(phone);
      return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (cached.otp === cleanOtp) {
      cached.verified = true;
      otpCache.delete(phone);
      return { valid: true, metadata: cached.metadata, email: cached.email };
    }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('phone', phone)
      .eq('otp', cleanOtp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      await supabaseAdmin
        .from('auth_otps')
        .update({ verified: true })
        .eq('id', data.id);

      return { valid: true, metadata: data.metadata, email: data.email };
    }
  } catch (err) {
    console.warn('[verifyOtp DB check error]:', err);
  }

  return { valid: false, error: 'Invalid or expired OTP code. Please check and try again.' };
}

/**
 * Generate a 15-minute Password Reset Token & 6-Digit Code
 */
export async function generateAndStoreResetToken({
  email: rawEmail,
  userId,
  expiresInMinutes = 15,
}: {
  email: string;
  userId?: string;
  expiresInMinutes?: number;
}): Promise<{ token: string; otp: string; expiresAt: Date }> {
  const email = rawEmail.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  resetCache.set(token, {
    email,
    userId,
    token,
    otp,
    expiresAt: expiresAt.getTime(),
    used: false,
  });

  resetCache.set(`otp_${email}_${otp}`, {
    email,
    userId,
    token,
    otp,
    expiresAt: expiresAt.getTime(),
    used: false,
  });

  try {
    await supabaseAdmin.from('password_resets').insert({
      email,
      user_id: userId || null,
      token,
      used: false,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn('[password_resets DB fallback to cache]:', err);
  }

  return { token, otp, expiresAt };
}

/**
 * Validate a Password Reset Token
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string; userId?: string; error?: string }> {
  const cleanToken = token.trim();

  const cached = resetCache.get(cleanToken);
  if (cached) {
    if (cached.used) {
      return { valid: false, error: 'This reset token has already been used.' };
    }
    if (Date.now() > cached.expiresAt) {
      resetCache.delete(cleanToken);
      return { valid: false, error: 'This password reset link has expired (15-min limit).' };
    }
    return { valid: true, email: cached.email, userId: cached.userId };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('token', cleanToken)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return { valid: true, email: data.email, userId: data.user_id };
    }
  } catch (err) {
    console.warn('[validateResetToken DB query error]:', err);
  }

  return { valid: false, error: 'Invalid or expired password reset link.' };
}

/**
 * Validate either a reset token OR a 6-digit OTP code + email
 */
export async function validateResetTokenOrOtp({
  token,
  email: rawEmail,
  otp,
}: {
  token?: string;
  email?: string;
  otp?: string;
}): Promise<{ valid: boolean; email?: string; userId?: string; token?: string; error?: string }> {
  if (token) {
    const res = await validateResetToken(token);
    return { ...res, token };
  }

  if (rawEmail && otp) {
    const email = rawEmail.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const key = `otp_${email}_${cleanOtp}`;
    const cached = resetCache.get(key);

    if (cached) {
      if (cached.used) {
        return { valid: false, error: 'This verification code has already been used.' };
      }
      if (Date.now() > cached.expiresAt) {
        resetCache.delete(key);
        return { valid: false, error: 'This verification code has expired (15-min limit).' };
      }
      return { valid: true, email: cached.email, userId: cached.userId, token: cached.token };
    }
  }

  return { valid: false, error: 'Invalid or expired reset code. Please check your email.' };
}

/**
 * Mark reset token as used
 */
export async function markResetTokenUsed(token: string): Promise<void> {
  const cleanToken = token.trim();
  const cached = resetCache.get(cleanToken);
  if (cached) {
    cached.used = true;
    if (cached.otp && cached.email) {
      resetCache.delete(`otp_${cached.email}_${cached.otp}`);
    }
  }

  try {
    await supabaseAdmin
      .from('password_resets')
      .update({ used: true })
      .eq('token', cleanToken);
  } catch (_) {}
}
