'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper to safely parse email from Supabase recovery JWT
function getEmailFromRecoveryToken(tokenStr: string): string | null {
  try {
    const payloadBase64 = tokenStr.split('.')[1];
    if (!payloadBase64) return null;
    const jsonStr = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    return payload?.email || payload?.user_metadata?.email || null;
  } catch {
    return null;
  }
}

export const OfficialStudioCoreLogo = () => (
  <div className="flex items-center gap-2.5 sm:gap-3 select-none">
    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-md border border-[#F5C78E]/50 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-90 pointer-events-none rounded-2xl" />
      <span className="relative z-10 text-[14px] font-black font-serif">SC</span>
    </div>
    <div className="flex flex-col">
      <span className="font-sans text-[22px] sm:text-[25px] font-extrabold tracking-[-0.035em] leading-none text-[#211B17] flex items-center">
        Studio<span className="text-[#C89435] font-extrabold ml-0.5">Core</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#C89435] ml-1 mb-1 animate-pulse" />
      </span>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-bold text-[#8C6D33] mt-0.5 sm:mt-1">
        FOCUS ON ART, WE MANAGE
      </span>
    </div>
  </div>
);

export default function ResetPasswordRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSupabaseRecovery, setIsSupabaseRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const validateAccess = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      
      if (hash.includes('error=')) {
        if (isMounted) {
          setError('This password reset link is invalid or has expired. Please request a fresh reset link.');
          setValidating(false);
        }
        return;
      }

      if (hash.includes('type=recovery') && hash.includes('access_token=')) {
        const match = hash.match(/access_token=([^&]+)/);
        const accessToken = match ? match[1] : '';
        const emailFromJwt = accessToken ? getEmailFromRecoveryToken(accessToken) : null;

        if (emailFromJwt && isMounted) {
          setIsSupabaseRecovery(true);
          setIsTokenValid(true);
          setUserEmail(emailFromJwt);
          setValidating(false);
          return;
        }
      }

      if (tokenParam) {
        try {
          const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(tokenParam)}`);
          const data = await res.json().catch(() => ({}));

          if (isMounted) {
            if (res.ok && data.valid && data.email) {
              setIsTokenValid(true);
              setToken(tokenParam);
              setUserEmail(data.email);
            } else {
              setError(data.error || 'This reset link has expired or is invalid. Please request a fresh link.');
            }
          }
        } catch {
          if (isMounted) setError('Failed to validate password reset link.');
        } finally {
          if (isMounted) setValidating(false);
        }
        return;
      }

      if (isMounted) {
        setIsTokenValid(false);
        setValidating(false);
      }
    };

    validateAccess();

    return () => {
      isMounted = false;
    };
  }, [tokenParam]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseRecovery) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateErr) throw updateErr;

        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          password: password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to update password. Link may have expired.');
      }
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      setError(err.message || 'An unexpected error occurred while updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-amber-100 relative overflow-x-hidden">
      
      {/* Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-amber-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="group">
          <OfficialStudioCoreLogo />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 px-3.5 py-1.5 rounded-xl border border-[#EBE7DF] bg-white hover:bg-zinc-50 shadow-2xs transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* ── MAIN RESET PASSWORD CONTENT ── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl mx-auto w-full">
          
          {/* Left Column: 3D Photographer with Bottom Fade Mask */}
          <div className="lg:col-span-6 hidden lg:flex flex-col items-center justify-center relative select-none pointer-events-none">
            <div 
              className="relative w-full max-w-[380px] h-[340px]"
              style={{
                maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              }}
            >
              <Image
                src="/images/auth/42.png"
                alt="StudioCore Photographer"
                fill
                unoptimized
                priority
                className="object-contain object-bottom drop-shadow-xl"
              />
            </div>
          </div>

          {/* Right Column: Reset Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/5">
              
              <div className="mb-5">
                <h1 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">
                  Create New Password
                </h1>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  {userEmail ? `Enter your new password for ${userEmail}` : 'Set your new secure account password below'}
                </p>
              </div>

              {validating ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-500">Verifying secure account link...</p>
                </div>
              ) : isSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Password Updated Successfully!</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Your password has been changed. Redirecting to sign in...
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Sign In Now →
                  </Link>
                </div>
              ) : !isTokenValid || !userEmail ? (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Invalid or Expired Link</span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed font-medium">
                    This password reset link is invalid, has expired, or has already been used.
                  </p>
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center justify-center w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Request New Reset Link →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">New Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">Confirm New Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        placeholder="Repeat new password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-900/10 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'Updating Password...' : (
                      <>
                        <span>Update Password & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-zinc-500 border-t border-[#EBE7DF]">
        StudioCore Multi-Studio Operating System • Safe Password Recovery
      </footer>
    </div>
  );
}
