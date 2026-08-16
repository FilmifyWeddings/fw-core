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
    <main className="min-h-screen w-full bg-[#F6EFEB] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-[#F36F21] selection:text-white font-sans">
      
      {/* ── LEFT SIDE: RESET PASSWORD FORM ── */}
      <section className="w-full lg:w-[46%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:pl-16 lg:pr-8 lg:py-10 xl:pl-24 xl:pr-12 xl:py-12 z-10 shrink-0">
        
        {/* Top StudioCore Brand Header with Larger Orange SC Logo */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-8 sm:w-16 sm:h-9.5 xl:w-[70px] xl:h-[40px] shrink-0 flex items-center justify-center">
            <Image
              src="/images/auth/sc-orange-logo.png"
              alt="StudioCore SC Logo"
              fill
              className="object-contain select-none"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl xl:text-[32px] font-black tracking-tight text-zinc-950 font-sans leading-none">
              StudioCore
            </span>
            <span className="text-xs sm:text-sm font-semibold text-zinc-600 tracking-normal mt-1.5 leading-none">
              Focus on Art, We Manage
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-8 lg:my-auto max-w-[420px] sm:max-w-[450px] xl:max-w-[470px] w-full">
          <div>
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-black text-zinc-900 tracking-tight leading-tight">
              Set New Password
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-2 font-medium">
              Choose a strong, secure password for your StudioCore account.
            </p>
          </div>

          <div className="mt-6">
            {isSuccess ? (
              <div className="p-6 rounded-2xl bg-white border border-emerald-300 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Password Updated
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
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4.5 h-4.5 stroke-[2]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="New Password"
                      required
                      className="w-full pl-12 pr-12 h-[52px] sm:h-[54px] rounded-2xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm sm:text-base font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-3 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4.5 h-4.5 stroke-[2]" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Confirm New Password"
                      required
                      className="w-full pl-12 pr-12 h-[52px] sm:h-[54px] rounded-2xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm sm:text-base font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-3 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] sm:h-[54px] rounded-2xl bg-[#F36F21] hover:bg-[#e06118] text-white font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
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

          {/* Capture Manage Deliver Grow */}
          <div className="mt-8 sm:mt-10 relative w-full max-w-[360px] sm:max-w-[400px] h-12 sm:h-14 mx-auto lg:mx-0 flex items-center">
            <Image
              src="/Capture · Manage · Deliver · Grow.png"
              alt="Capture · Manage · Deliver · Grow"
              fill
              className="object-contain object-left select-none"
              priority
            />
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="pt-2 text-xs text-zinc-400">
          <span className="font-medium text-[11px]">
            StudioCore &copy; {new Date().getFullYear()}
          </span>
        </div>
      </section>

      {/* ── RIGHT SIDE: 3D PHOTOGRAPHER WORKSPACE ── */}
      <section className="w-full lg:w-[54%] xl:w-[58%] relative flex items-center justify-center bg-[#F6EFEB] overflow-hidden min-h-[380px] lg:min-h-full p-4 sm:p-8 lg:p-12">
        <div className="relative w-full max-w-[560px] xl:max-w-[620px] aspect-[1292/1217] max-h-[82vh] flex items-center justify-center">
          <Image
            src="/3D Photographer.png"
            alt="3D StudioCore Photographer Workspace"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 100vw, 56vw"
          />
        </div>
      </section>
    </main>
  );
}
