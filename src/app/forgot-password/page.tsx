'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, Camera, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#F6EFE5] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-orange-500 selection:text-white font-sans">
      
      {/* ── LEFT SIDE: FORGOT PASSWORD FORM ── */}
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
          
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-orange-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              Reset Password
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-medium">
              Enter your account email and we will send a 15-minute secure reset link.
            </p>
          </div>

          <div className="mt-8">
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
                    Check your inbox at <strong className="font-mono text-zinc-900">{email}</strong> for instructions.
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@studio.com"
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
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
                    <span>Sending Reset Link...</span>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
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
          <span className="font-semibold text-[11px] text-zinc-400">
            Studio Security
          </span>
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
