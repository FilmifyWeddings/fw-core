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
    <main className="min-h-screen w-full bg-[#F5ECDD] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-orange-500 selection:text-white font-sans">
      
      {/* ── LEFT SIDE: FORGOT PASSWORD FORM ── */}
      <section className="w-full lg:w-[44%] xl:w-[40%] flex flex-col justify-between p-8 sm:p-12 md:p-14 lg:pl-16 lg:pr-10 lg:py-10 xl:pl-24 xl:pr-12 xl:py-12 z-10 shrink-0">
        
        {/* Top StudioCore Brand Header with Orange SC Logo Mark */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-7 sm:w-14 sm:h-8.5 shrink-0 flex items-center justify-center">
            <Image
              src="/images/auth/sc-orange-logo.png"
              alt="StudioCore Logo"
              fill
              className="object-contain select-none"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 font-sans leading-none">
              StudioCore
            </span>
            <span className="text-[11px] font-bold text-zinc-700 leading-tight mt-1">
              Focus on Art, We Manage
            </span>
            <span className="text-[9px] font-medium text-zinc-500 tracking-wider mt-0.5">
              Capture &middot; Manage &middot; Deliver &middot; Grow
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="my-8 lg:my-auto max-w-[420px] w-full">
          
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-orange-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
              Reset Password
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-1.5 font-medium">
              Enter your registered email address and we will send a 15-minute secure reset link.
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
                      placeholder="you@studiocore.in"
                      required
                      className="w-full pl-12 pr-4 h-12 sm:h-[50px] rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all shadow-xs"
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
                  className="w-full h-12 sm:h-[52px] rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
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
        <div className="pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-300/60">
          <div className="relative h-6 w-36 sm:w-44">
            <Image
              src="/images/auth/shoot-edit-deliver-grow.png"
              alt="Shoot Edit Deliver Grow"
              fill
              className="object-contain object-left select-none"
            />
          </div>
          <span className="font-semibold text-[11px] text-zinc-500">
            StudioCore Security
          </span>
        </div>
      </section>

      {/* ── RIGHT SIDE: 3D PHOTOGRAPHER WORKSPACE ── */}
      <section className="w-full lg:w-[56%] xl:w-[60%] relative flex items-center justify-center bg-[#F5ECDD] overflow-hidden min-h-[380px] lg:min-h-full">
        <div 
          className="relative w-full h-full min-h-[460px] lg:min-h-full flex items-center justify-center p-2 sm:p-6 lg:p-10"
          style={{
            maskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 70%, transparent 100%)',
          }}
        >
          <Image
            src="/images/auth/studio-workspace-blended.webp"
            alt="3D StudioCore Photographer Workspace"
            fill
            priority
            className="object-contain object-center select-none drop-shadow-sm"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      </section>
    </main>
  );
}
