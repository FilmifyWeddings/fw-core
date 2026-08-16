import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

interface OtpRecord {
  phone: string;
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
  expiresAt: number;
  used: boolean;
}

// In-memory fallback caches in case tables aren't populated yet
declare global {
  var __authOtpCache: Map<string, OtpRecord> | undefined;
  var __passwordResetCache: Map<string, ResetTokenRecord> | undefined;
}

const otpCache = global.__authOtpCache || (global.__authOtpCache = new Map<string, OtpRecord>());
const resetCache = global.__passwordResetCache || (global.__passwordResetCache = new Map<string, ResetTokenRecord>());

/**
 * Standardize phone number format (removes +, spaces, dashes; ensures clean digits)
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  // If 10-digit Indian number without country code, prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Check if a phone number is already registered in profiles or user metadata
 */
export async function isPhoneRegistered(rawPhone: string): Promise<boolean> {
  const phone = normalizePhoneNumber(rawPhone);
  const raw10 = phone.slice(-10);

  try {
    // Check in profiles table
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .or(`phone.eq.${phone},phone.eq.+${phone},phone.ilike.%${raw10}%`)
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
  // Generate cryptographically secure 6-digit numeric code
  const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Store in memory cache first for immediate low-latency availability
  otpCache.set(phone, {
    phone,
    email,
    otp,
    type,
    metadata,
    expiresAt: expiresAt.getTime(),
    verified: false,
  });

  // Also persist to Supabase auth_otps table
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

  // 1. Check in-memory cache
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

  // 2. Check Supabase auth_otps table
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
      // Mark as verified
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
 * Generate a 15-minute Password Reset Token
 */
export async function generateAndStoreResetToken({
  email: rawEmail,
  userId,
  expiresInMinutes = 15,
}: {
  email: string;
  userId?: string;
  expiresInMinutes?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const email = rawEmail.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // In-memory cache
  resetCache.set(token, {
    email,
    userId,
    token,
    expiresAt: expiresAt.getTime(),
    used: false,
  });

  // DB persistence
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

  return { token, expiresAt };
}

/**
 * Validate a Password Reset Token
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string; userId?: string; error?: string }> {
  const cleanToken = token.trim();

  // 1. Check in-memory cache
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

  // 2. Check Supabase password_resets table
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
 * Mark reset token as used
 */
export async function markResetTokenUsed(token: string): Promise<void> {
  const cleanToken = token.trim();
  const cached = resetCache.get(cleanToken);
  if (cached) {
    cached.used = true;
  }

  try {
    await supabaseAdmin
      .from('password_resets')
      .update({ used: true })
      .eq('token', cleanToken);
  } catch (_) {}
}
