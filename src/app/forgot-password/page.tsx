'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.error || 'Failed to send reset link. Please try again.');
      }
    } catch (err: any) {
      console.error('[Forgot Password Error]:', err);
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
          <div className="my-auto pt-4 sm:pt-6 lg:pt-0 lg:mt-6 xl:mt-8 flex flex-col">
            
            <div className="mb-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl xl:text-[30px] font-black text-zinc-900 tracking-tight leading-tight">
                Reset Your Password
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-600 mt-1 font-normal">
                Enter your registered email and we&apos;ll send you a secure link to create a new password.
              </p>
            </div>

            <div className="mt-3.5 sm:mt-4">
              {isSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reset Link Dispatched</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    If an account is associated with <strong>{email}</strong>, you will receive an email with reset instructions in a moment.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="text-xs font-bold text-[#F36F21] hover:underline flex items-center gap-1"
                    >
                      Return to login <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="Registered Email Address"
                      required
                      className="w-full pl-10 pr-4 h-10 sm:h-[46px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
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
                      <span>Sending Reset Link...</span>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
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
                src="/images/auth/capture-manage-deliver-grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                unoptimized
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* Mobile 3D Photographer */}
          <div className="block lg:hidden w-full max-w-[340px] sm:max-w-[400px] aspect-[1292/1217] max-h-[33vh] sm:max-h-[36vh] mx-auto mt-1 sm:mt-2 relative shrink-0">
            <Image
              src="/images/auth/3D-Photographer.png"
              alt="3D Photographer Workspace"
              fill
              unoptimized
              className="object-contain object-bottom select-none"
              sizes="(max-width: 1024px) 400px, 0px"
              priority
            />
          </div>

        </div>

        {/* Right: 3D Photographer (Desktop Only) */}
        <div className="hidden lg:flex w-full max-w-[780px] xl:max-w-[860px] aspect-[1292/1217] max-h-[86vh] mx-auto items-center justify-center relative">
          <Image
            src="/images/auth/3D-Photographer.png"
            alt="3D StudioCore Photographer Workspace"
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
