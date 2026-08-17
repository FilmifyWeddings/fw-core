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
      
      // 1. Check for error in hash
      if (hash.includes('error=')) {
        if (isMounted) {
          setError('This password reset link is invalid or has expired. Please request a fresh reset link.');
          setValidating(false);
        }
        return;
      }

      // 2. Check for Supabase Auth recovery token in URL hash
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

      // 3. Check for custom token in query params
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

      // 4. No valid recovery token found
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

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      let accessToken: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const match = hash.match(/access_token=([^&]+)/);
        if (match) accessToken = match[1];
      }

      // Update password directly in Supabase database using Server Admin API
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: accessToken || undefined,
          token: token || undefined,
          email: userEmail || undefined,
          password: password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        // Clear any stale local auth state
        await supabase.auth.signOut().catch(() => {});
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to update password in Supabase. Link may have expired.');
      }
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      setError(err.message || 'Unable to connect to password reset service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#F6EFEB] selection:bg-[#F36F21] selection:text-white font-sans flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 overflow-hidden z-10">
      
      {/* ── RESPONSIVE CONTAINER ── */}
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-[38%_62%] xl:grid-cols-[36%_64%] items-center gap-3 lg:gap-12 xl:gap-16 my-auto h-full max-h-[100dvh] lg:max-h-none justify-center">
        
        {/* Left Column */}
        <div className="w-full max-w-[360px] sm:max-w-[420px] mx-auto lg:mx-0 flex flex-col justify-between h-full max-h-[100dvh] lg:max-h-none lg:justify-center">
          
          {/* Logo (Top Left) */}
          <div className="pt-0.5 sm:pt-1">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="relative w-11 h-6 sm:w-16 sm:h-9 xl:w-[70px] xl:h-[40px] shrink-0 flex items-center justify-center">
                <Image
                  src="/images/auth/sc-orange-logo.png"
                  alt="StudioCore SC Logo"
                  fill
                  unoptimized
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-3xl xl:text-[32px] font-black tracking-tight text-zinc-950 font-sans leading-none">
                  StudioCore
                </span>
                <span className="text-[10px] sm:text-[13px] xl:text-sm font-semibold text-zinc-600 tracking-normal mt-0.5 sm:mt-1 leading-none">
                  Focus on Art, We Manage
                </span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="my-auto pt-3 sm:pt-5 lg:pt-0 lg:mt-5 xl:mt-6 flex flex-col">
            
            <div className="mb-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl xl:text-[28px] font-black text-zinc-900 tracking-tight leading-tight">
                Create New Password
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-600 mt-1 font-normal">
                Enter your new password below to update credentials for this account.
              </p>
            </div>

            {/* Validating State */}
            {validating ? (
              <div className="mt-6 p-8 rounded-2xl bg-white border border-zinc-200 text-center space-y-3 shadow-2xs">
                <div className="w-6 h-6 border-2 border-[#F36F21] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-600">Verifying secure account link...</p>
              </div>
            ) : isSuccess ? (
              /* Success State */
              <div className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950">Password Updated Successfully!</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Password for <strong>{userEmail}</strong> has been changed. Redirecting to sign in...
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
              /* Missing or Invalid Link State */
              <div className="mt-4 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Invalid or Expired Link</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  {error || 'This password reset link is invalid or has expired (15-minute limit). Please request a fresh reset link.'}
                </p>
                <div className="pt-2">
                  <Link
                    href="/forgot-password"
                    className="w-full py-2.5 px-4 bg-[#F36F21] hover:bg-[#E05E10] text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Request New Reset Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                {/* Specific Account Badge */}
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center gap-2.5 text-xs font-semibold text-orange-950">
                  <ShieldCheck className="w-4 h-4 text-[#F36F21] shrink-0" />
                  <span className="truncate">Resetting password for: <strong className="font-bold text-zinc-900">{userEmail}</strong></span>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">New Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Min. 6 characters"
                      required
                      autoFocus
                      className="w-full pl-10 pr-10 h-10 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">Confirm Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Re-enter new password"
                      required
                      className="w-full pl-10 pr-10 h-10 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                      <span>Password Strength</span>
                      <span>
                        {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength <= 25 ? 'bg-red-500 w-1/4' : strength <= 50 ? 'bg-amber-500 w-2/4' : strength <= 75 ? 'bg-yellow-500 w-3/4' : 'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 sm:h-11 rounded-xl bg-[#F36F21] hover:bg-[#E05E10] active:scale-[0.99] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer disabled:opacity-50 mt-4"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Capture graphic */}
            <div className="mt-3 sm:mt-4 lg:mt-8 relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[450px] h-[46px] sm:h-[58px] lg:h-[78px] mx-auto">
              <Image
                src="/images/auth/capture-manage-deliver-grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                unoptimized
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="pt-2 text-center text-[10px] text-zinc-500">
            © {new Date().getFullYear()} StudioCore. All rights reserved.
          </div>

        </div>

        {/* ── RIGHT COLUMN: LARGE 3D PHOTOGRAPHER (Desktop Only) ── */}
        <div className="hidden lg:flex w-full max-w-[780px] xl:max-w-[860px] aspect-[1292/1217] max-h-[86vh] mx-auto items-center justify-center relative">
          <Image
            src="/images/auth/3D-Photographer.png"
            alt="3D Photographer Character Workspace"
            fill
            unoptimized
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 0vw, (max-width: 1440px) 64vw, 860px"
          />
        </div>

      </div>

    </main>
  );
}
