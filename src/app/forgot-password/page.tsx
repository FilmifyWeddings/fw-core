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
    <main className="min-h-screen w-full bg-[#F6EFEB] selection:bg-[#F36F21] selection:text-white font-sans flex flex-col justify-between py-6 px-4 sm:px-8 lg:px-12 lg:h-screen lg:overflow-hidden">
      
      {/* ── CENTERED CONTAINER ── */}
      <div className="w-full max-w-[1360px] mx-auto flex-1 flex flex-col justify-between">
        
        {/* Top Header */}
        <header className="pt-2 sm:pt-4 lg:pt-2">
          <div className="relative w-[165px] sm:w-[180px] xl:w-[205px] h-[40px] sm:h-[44px] xl:h-[50px] select-none">
            <Image
              src="/images/auth/studiocore-logo-transparent.png"
              alt="StudioCore - Focus on Art, We Manage"
              fill
              className="object-contain object-left select-none"
              priority
            />
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="my-auto py-6 lg:py-0 grid grid-cols-1 lg:grid-cols-[40%_60%] xl:grid-cols-[38%_62%] items-center gap-8 lg:gap-10 xl:gap-14 min-h-[calc(100vh-140px)] lg:min-h-0">
          
          {/* Left Form */}
          <div className="w-full max-w-[380px] mx-auto lg:mx-0 justify-self-start">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-[#F36F21] transition-colors mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                Reset Password
              </h1>
              <p className="text-sm text-zinc-600 mt-1.5 font-normal">
                Enter your registered email address and we will send a 15-minute secure reset link.
              </p>
            </div>

            <div className="mt-5">
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
                        <Mail className="w-4.5 h-4.5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder="Email Address"
                        required
                        className="w-full pl-11 pr-4 h-12 rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                      <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#F36F21] hover:bg-[#e06118] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
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
            <div className="mt-8 sm:mt-9 relative w-[175px] sm:w-[185px] xl:w-[210px] h-[58px] sm:h-[62px] xl:h-[70px] mx-auto flex items-center justify-center select-none">
              <Image
                src="/Capture · Manage · Deliver · Grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* Right: 3D Photographer */}
          <div className="w-full max-w-[620px] xl:max-w-[680px] aspect-[1292/1217] max-h-[78vh] mx-auto flex items-center justify-center relative">
            <Image
              src="/3D Photographer.png"
              alt="3D StudioCore Photographer Workspace"
              fill
              priority
              className="object-contain object-center select-none"
              sizes="(max-width: 1024px) 90vw, (max-width: 1440px) 50vw, 680px"
            />
          </div>

        </div>

        {/* Footer */}
        <footer className="pt-2 text-center lg:text-left text-xs text-zinc-400">
          <span className="font-medium text-[11px]">
            StudioCore Security &copy; {new Date().getFullYear()}
          </span>
        </footer>

      </div>
    </main>
  );
}
