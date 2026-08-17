'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Mail, KeyRound } from 'lucide-react';

export default function ResetPasswordRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const otpParam = searchParams.get('otp') || searchParams.get('code') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(otpParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (otpParam) setOtp(otpParam);
    if (tokenParam) setToken(tokenParam);

    // If there is an error in the hash (from old supabase links)
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      setError('The old email link expired. Please enter your 6-digit code below or request a new code.');
    }
  }, [emailParam, otpParam, tokenParam]);

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

    if (!token && (!email.trim() || !otp.trim())) {
      setError('Please provide your registered Email and 6-Digit Verification Code.');
      return;
    }

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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || undefined,
          email: email.trim().toLowerCase() || undefined,
          otp: otp.trim() || undefined,
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
        setError(data.error || 'Failed to update password. Please verify your code and try again.');
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
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Request Code</span>
              </Link>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl xl:text-[28px] font-black text-zinc-900 tracking-tight leading-tight">
                Set New Password
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-600 mt-1 font-normal">
                Enter your 6-digit verification code sent to your email and create a new secure password.
              </p>
            </div>

            {/* Success State */}
            {isSuccess ? (
              <div className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 shadow-xs">
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
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email Address (if no direct token) */}
                {!token && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">Registered Email</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder="yourname@studio.com"
                        required
                        className="w-full pl-10 pr-3.5 h-10 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 6-Digit Verification Code (if no direct token) */}
                {!token && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">6-Digit Email Code</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(null); }}
                        placeholder="e.g. 849201"
                        required
                        className="w-full pl-10 pr-3.5 h-10 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-mono tracking-widest text-sm font-bold focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
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
                      className="w-full pl-10 pr-10 h-10 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
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
                      className="w-full pl-10 pr-10 h-10 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
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
                  <div className="space-y-1 pt-1">
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

          </div>

          {/* Footer Copyright */}
          <div className="pt-2 text-center text-[10px] text-zinc-500">
            © {new Date().getFullYear()} StudioCore. All rights reserved.
          </div>

        </div>

        {/* Right Column / Visual Showcase */}
        <div className="hidden lg:flex flex-col justify-center items-center h-full relative">
          <div className="relative w-full max-w-[720px] aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 bg-zinc-900">
            <Image
              src="/studio-workspace-3d.jpg"
              alt="StudioCore Workspace"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-wider w-max mb-2">
                Production Suite Security
              </span>
              <h2 className="text-2xl font-black tracking-tight">Focus on Art, We Manage</h2>
              <p className="text-xs text-zinc-300 mt-1 max-w-lg leading-relaxed">
                Your credentials are encrypted with industry-standard hashing protocols. Recover your account anytime with instant verification.
              </p>
            </div>
          </div>
        </div>

      </div>

    </main>
  );
}
