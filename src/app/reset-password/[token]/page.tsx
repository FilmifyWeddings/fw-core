'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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

          {/* Form Block */}
          <div className="my-auto pt-3 sm:pt-5 lg:pt-0 lg:mt-10 xl:mt-12 flex flex-col">
            <div>
              <h1 className="text-2xl sm:text-3xl xl:text-[36px] font-black text-zinc-900 tracking-tight leading-tight">
                Set New Password
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5 font-normal">
                Choose a strong, secure password for your account.
              </p>
            </div>

            <div className="mt-3 sm:mt-4">
              {isSuccess ? (
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-emerald-300 text-center space-y-2.5 shadow-sm">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-base font-extrabold text-zinc-900">
                      Password Updated
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-600 mt-0.5 leading-relaxed">
                      Your password has been updated. Redirecting to login...
                    </p>
                  </div>
                  <div className="pt-1">
                    <Link
                      href="/login"
                      className="inline-block px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all"
                    >
                      Login Now &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
                  {/* New Password */}
                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="New Password"
                        className="w-full pl-10 pr-10 h-10 sm:h-[48px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {password && (
                      <div className="pt-1 space-y-0.5">
                        <div className="h-1 w-full bg-zinc-200 rounded-full overflow-hidden">
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
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        placeholder="Confirm New Password"
                        className="w-full pl-10 pr-10 h-10 sm:h-[48px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-1.5 text-xs text-red-700 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 sm:h-[48px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 touch-manipulation"
                  >
                    {loading ? (
                      <span>Updating Password...</span>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Capture graphic */}
            <div className="mt-3 sm:mt-4 lg:mt-8 relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[450px] h-[46px] sm:h-[58px] lg:h-[78px] mx-auto">
              <Image
                src="/Capture · Manage · Deliver · Grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* Mobile 3D Photographer */}
          <div className="block lg:hidden w-full max-w-[340px] sm:max-w-[400px] aspect-[1292/1217] max-h-[33vh] sm:max-h-[36vh] mx-auto mt-1 sm:mt-2 relative shrink-0">
            <Image
              src="/3D Photographer.png"
              alt="3D Photographer Workspace"
              fill
              className="object-contain object-bottom select-none"
              sizes="(max-width: 1024px) 400px, 0px"
              priority
            />
          </div>

        </div>

        {/* Right: 3D Photographer (Desktop Only) */}
        <div className="hidden lg:flex w-full max-w-[780px] xl:max-w-[860px] aspect-[1292/1217] max-h-[86vh] mx-auto items-center justify-center relative">
          <Image
            src="/3D Photographer.png"
            alt="3D StudioCore Photographer Workspace"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 0vw, (max-width: 1440px) 64vw, 860px"
          />
        </div>

      </div>
    </main>
  );
}
