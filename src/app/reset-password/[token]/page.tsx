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
      <section className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:pl-16 lg:pr-8 lg:py-12 xl:pl-24 xl:pr-10 xl:py-14 z-10 shrink-0">
        
        {/* Top StudioCore Brand Header with Orange SC Logo Mark */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-7 sm:w-14 sm:h-8 shrink-0 flex items-center justify-center">
            <Image
              src="/images/auth/sc-orange-logo.png"
              alt="StudioCore Logo"
              fill
              className="object-contain select-none"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-[26px] font-black tracking-tight text-zinc-950 font-sans leading-none">
              StudioCore
            </span>
            <span className="text-xs sm:text-[13px] font-medium text-zinc-600 tracking-normal mt-1 leading-none">
              Focus on Art, We Manage
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-8 lg:my-auto max-w-[340px] sm:max-w-[380px] w-full">
          <div>
            <h1 className="text-3xl sm:text-[34px] font-extrabold text-zinc-900 tracking-tight leading-tight">
              Set New Password
            </h1>
            <p className="text-sm text-zinc-600 mt-1.5 font-normal">
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
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* New Password */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="New Password"
                      required
                      className="w-full pl-11 pr-11 h-12 rounded-xl bg-white/90 border border-zinc-300/90 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
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
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Confirm New Password"
                      required
                      className="w-full pl-11 pr-11 h-12 rounded-xl bg-white/90 border border-zinc-300/90 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
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
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#F36F21] hover:bg-[#e06118] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
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
          <div className="mt-8 relative w-full h-10 sm:h-12 flex items-center">
            <Image
              src="/images/auth/capture-manage-deliver-grow.png"
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
      <section className="w-full lg:w-[58%] xl:w-[62%] relative flex items-center justify-center bg-[#F6EFEB] overflow-hidden min-h-[400px] lg:min-h-full">
        <div className="relative w-full h-full min-h-[440px] lg:min-h-full flex items-center justify-center p-2 sm:p-6 lg:p-10">
          <Image
            src="/images/auth/photographer-workspace-scene.webp"
            alt="3D StudioCore Photographer Workspace"
            fill
            priority
            className="object-contain object-center lg:object-right-center select-none"
            sizes="(max-width: 1024px) 100vw, 62vw"
          />
        </div>
      </section>
    </main>
  );
}
