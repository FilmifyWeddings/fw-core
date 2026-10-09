'use client';

/**
 * Lightweight Google Identity Platform / Firebase Phone Auth helper
 * Uses Google's official Identity Toolkit REST API directly via fetch().
 * Zero external heavy npm dependencies to prevent VPS build OOM crashes.
 */

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
  );
};

export interface GoogleSendOtpResult {
  success: boolean;
  sessionInfo?: string;
  error?: string;
}

export interface GoogleVerifyOtpResult {
  success: boolean;
  phoneNumber?: string;
  idToken?: string;
  error?: string;
}

/**
 * Dispatches 6-digit SMS OTP using Google Identity Toolkit REST API
 */
export async function sendGooglePhoneVerification(
  phoneNumber: string,
  recaptchaToken: string = ''
): Promise<GoogleSendOtpResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Google Firebase API Key not configured' };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        recaptchaToken: recaptchaToken || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Google SMS OTP dispatch failed',
      };
    }

    return {
      success: true,
      sessionInfo: data.sessionInfo,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error calling Google Identity service',
    };
  }
}

/**
 * Verifies 6-digit SMS OTP using Google Identity Toolkit REST API
 */
export async function verifyGooglePhoneCode(
  sessionInfo: string,
  code: string
): Promise<GoogleVerifyOtpResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Google Firebase API Key not configured' };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionInfo,
        code: code.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Invalid or expired Google OTP code',
      };
    }

    return {
      success: true,
      phoneNumber: data.phoneNumber,
      idToken: data.idToken,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error verifying Google code',
    };
  }
}
