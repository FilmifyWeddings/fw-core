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
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-[38%_62%] xl:grid-cols-[36%_64%] items-center gap-2 sm:gap-4 lg:gap-12 xl:gap-16 my-auto h-full max-h-[100dvh] lg:max-h-none justify-center">
        
        {/* Left Column */}
        <div className="w-full max-w-[360px] sm:max-w-[420px] mx-auto lg:mx-0 flex flex-col justify-between my-auto h-full max-h-[100dvh] lg:max-h-none lg:justify-center">
          
          <div>
            {/* StudioCore Logo */}
            <div className="mb-2 sm:mb-4 lg:mb-12">
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

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#F36F21] transition-colors mb-2 sm:mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>

            <div>
              <h1 className="text-xl sm:text-3xl xl:text-[36px] font-black text-zinc-900 tracking-tight leading-tight">
                Reset Password
              </h1>
              <p className="text-[11px] sm:text-sm text-zinc-600 mt-0.5 font-normal">
                Enter your email address to receive a secure reset link.
              </p>
            </div>

            <div className="mt-2 sm:mt-4">
              {isSubmitted ? (
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-emerald-300 text-center space-y-2.5 shadow-sm">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-base font-extrabold text-zinc-900">
                      Reset Link Dispatched
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-600 mt-0.5 leading-relaxed">
                      Check your inbox at <strong className="font-mono text-zinc-900">{email}</strong> for instructions.
                    </p>
                  </div>
                  <div className="pt-1">
                    <Link
                      href="/login"
                      className="inline-block px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all"
                    >
                      Return to Log In &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3.5">
                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder="Email Address"
                        className="w-full pl-10 pr-3 h-10 sm:h-[48px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
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
            <div className="mt-2.5 sm:mt-4 lg:mt-8 relative w-full max-w-[290px] sm:max-w-[360px] lg:max-w-[450px] h-[44px] sm:h-[58px] lg:h-[78px] mx-auto">
              <Image
                src="/Capture · Manage · Deliver · Grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* Mobile 3D Photographer (Larger size with bottom 20% natural clipping) */}
          <div className="block lg:hidden w-full max-w-[320px] sm:max-w-[380px] h-[190px] sm:h-[230px] mx-auto -mb-6 sm:-mb-8 relative overflow-hidden shrink-0">
            <Image
              src="/3D Photographer.png"
              alt="3D Photographer Workspace"
              fill
              className="object-contain object-top"
              sizes="(max-width: 1024px) 380px, 0px"
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
