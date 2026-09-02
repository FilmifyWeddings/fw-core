'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const OfficialStudioCoreLogo = () => (
  <div className="flex items-center gap-2.5 sm:gap-3 select-none">
    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-md border border-[#F5C78E]/50 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-90 pointer-events-none rounded-2xl" />
      <span className="relative z-10 text-[14px] font-black font-serif">SC</span>
    </div>
    <div className="flex flex-col">
      <span className="font-sans text-[22px] sm:text-[25px] font-extrabold tracking-[-0.035em] leading-none text-[#211B17] flex items-center">
        Studio<span className="text-[#C89435] font-extrabold ml-0.5">Core</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#C89435] ml-1 mb-1 animate-pulse" />
      </span>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-bold text-[#8C6D33] mt-0.5 sm:mt-1">
        FOCUS ON ART, WE MANAGE
      </span>
    </div>
  </div>
);

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
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-amber-100 relative overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-amber-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="group">
          <OfficialStudioCoreLogo />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 px-3.5 py-1.5 rounded-xl border border-[#EBE7DF] bg-white hover:bg-zinc-50 shadow-2xs transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* ── MAIN FORGOT PASSWORD CONTENT ── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl mx-auto w-full">
          
          {/* Left Column: 3D Photographer with Bottom Fade Mask */}
          <div className="lg:col-span-6 hidden lg:flex flex-col items-center justify-center relative select-none pointer-events-none">
            <div 
              className="relative w-full max-w-[380px] h-[340px]"
              style={{
                maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              }}
            >
              <Image
                src="/images/auth/42.png"
                alt="StudioCore Photographer"
                fill
                unoptimized
                priority
                className="object-contain object-bottom drop-shadow-xl"
              />
            </div>
          </div>

          {/* Right Column: Reset Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/5">
              
              <div className="mb-5">
                <h1 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">
                  Reset Password
                </h1>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  Enter your registered account email and we&apos;ll send you a secure password reset link.
                </p>
              </div>

              {isSubmitted ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Reset Link Sent!</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      We sent a secure link to <strong>{email}</strong>. Please check your inbox and spam folder.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Resend / Try Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">Registered Email</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        placeholder="your.email@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-900/10 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'Sending Reset Link...' : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      Remembered password? Sign In →
                    </Link>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-zinc-500 border-t border-[#EBE7DF]">
        StudioCore Multi-Studio Operating System • Safe Password Recovery
      </footer>
    </div>
  );
}
