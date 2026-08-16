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
    <main className="min-h-screen w-full bg-[#F6EFEB] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-[#F36F21] selection:text-white font-sans">
      
      {/* ── LEFT SIDE: FORGOT PASSWORD FORM ── */}
      <section className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:pl-14 lg:pr-8 lg:py-10 xl:pl-20 xl:pr-10 xl:py-12 z-10 shrink-0">
        
        {/* Top StudioCore Brand Header with Orange SC Logo Mark */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="relative w-13 h-7.5 sm:w-16 sm:h-9 xl:w-[68px] xl:h-[38px] shrink-0 flex items-center justify-center">
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
            <span className="text-xs sm:text-[13px] xl:text-sm font-semibold text-zinc-600 tracking-normal mt-1.5 leading-none">
              Focus on Art, We Manage
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-8 lg:my-auto max-w-[420px] sm:max-w-[450px] xl:max-w-[470px] w-full mx-auto lg:mx-0">
          
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-600 hover:text-[#F36F21] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>

          <div>
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-black text-zinc-900 tracking-tight leading-tight">
              Reset Password
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-2 font-medium">
              Enter your registered email address and we will send a 15-minute secure reset link.
            </p>
          </div>

          <div className="mt-6">
            {isSubmitted ? (
              <div className="p-6 rounded-2xl bg-white border border-emerald-300 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Reset Link Dispatched
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    Check your inbox at <strong className="font-mono text-zinc-900">{email}</strong> for reset instructions.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-block px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all"
                  >
                    Return to Log In &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="Email Address"
                      required
                      className="w-full pl-12 pr-4 h-[52px] sm:h-[54px] rounded-2xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm sm:text-base font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-3 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs sm:text-sm text-red-700 font-bold">
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

          {/* Capture Manage Deliver Grow */}
          <div className="mt-8 sm:mt-10 relative w-full max-w-[360px] sm:max-w-[400px] h-12 sm:h-14 mx-auto lg:mx-0 flex items-center">
            <Image
              src="/Capture · Manage · Deliver · Grow.png"
              alt="Capture · Manage · Deliver · Grow"
              fill
              className="object-contain object-center lg:object-left select-none"
              priority
            />
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="pt-2 text-xs text-zinc-400">
          <span className="font-medium text-[11px]">
            StudioCore Security &copy; {new Date().getFullYear()}
          </span>
        </div>
      </section>

      {/* ── RIGHT SIDE: 3D PHOTOGRAPHER WORKSPACE ── */}
      <section className="w-full lg:w-[55%] xl:w-[60%] relative flex items-center justify-center bg-[#F6EFEB] overflow-hidden min-h-[380px] lg:min-h-full p-4 sm:p-8 lg:p-10 xl:p-12">
        <div className="relative w-full max-w-[660px] xl:max-w-[760px] aspect-[1292/1217] max-h-[86vh] flex items-center justify-center">
          <Image
            src="/3D Photographer.png"
            alt="3D StudioCore Photographer Workspace"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      </section>
    </main>
  );
}
