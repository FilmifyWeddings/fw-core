'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, Camera, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

    if (!token) {
      setError('Invalid or missing password reset token.');
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
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password. Link may have expired.');
      }
    } catch (err: any) {
      console.error('[Reset Password Error]:', err);
      setError(err.message || 'Unable to connect to password reset service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6EFE5] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-orange-500 selection:text-white font-sans">
      
      {/* ── LEFT SIDE: RESET PASSWORD FORM ── */}
      <div className="w-full lg:w-[44%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-12 xl:p-16 z-10">
        
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-lg font-black tracking-widest text-zinc-900 block leading-none">
              STUDIO.
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 block mt-0.5">
              Capturing Moments
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-8 lg:my-auto max-w-md w-full">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-medium">
              Choose a strong, secure password for your Studio account.
            </p>
          </div>

          <div className="mt-8">
            {isSuccess ? (
              <div className="p-6 rounded-2xl bg-white border border-emerald-300 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Password Reset Complete
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    Your password has been successfully updated. Redirecting to login...
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-block px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all"
                  >
                    Login Now &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {password && (
                    <div className="pt-1.5 space-y-1">
                      <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strength <= 25
                              ? 'w-1/4 bg-red-500'
                              : strength <= 50
                              ? 'w-2/4 bg-amber-500'
                              : strength <= 75
                              ? 'w-3/4 bg-blue-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="pt-4 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-300/40">
          <span className="font-serif italic tracking-wide text-zinc-500 text-sm">
            Shoot &middot; Edit &middot; Deliver &middot; Grow
          </span>
          <div className="flex items-center gap-1 font-semibold text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit Encrypted</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE: 3D PHOTOGRAPHER WORKSPACE ── */}
      <div className="w-full lg:w-[56%] xl:w-[58%] relative flex items-center justify-center bg-[#F6EFE5] overflow-hidden min-h-[380px] lg:min-h-full">
        <div className="relative w-full h-full min-h-[420px] lg:min-h-full flex items-center justify-center p-4 lg:p-10">
          <Image
            src="/images/auth/studio-workspace-desk.webp"
            alt="3D Studio Photographer Workspace"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      </div>
    </div>
  );
}
