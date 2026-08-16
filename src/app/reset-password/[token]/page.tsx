'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Camera, AlertCircle, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import CharacterStage, { CharacterState } from '@/components/auth/CharacterStage';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [charState, setCharState] = useState<CharacterState>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formShake, setFormShake] = useState(false);

  // Compute simple password strength (0 to 100)
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
      triggerErrorAnimation();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      triggerErrorAnimation();
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      triggerErrorAnimation();
      return;
    }

    setLoading(true);
    setCharState('submitting');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        setCharState('success');

        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password. Link may have expired.');
        triggerErrorAnimation();
      }
    } catch (err: any) {
      console.error('[Reset Password Catch Error]:', err);
      setError(err.message || 'Unable to connect to password reset service.');
      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  const triggerErrorAnimation = () => {
    setCharState('error');
    setFormShake(true);
    setTimeout(() => setFormShake(false), 600);
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F6] flex flex-col justify-between selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* ── TOP AMBIENT GLOW ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-orange-400/10 via-amber-300/5 to-transparent blur-3xl pointer-events-none" />

      {/* ── MAIN CONTAINER ── */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-12 z-10">
        <div className="w-full max-w-5xl bg-white/80 backdrop-blur-2xl rounded-3xl sm:rounded-[36px] shadow-[0_20px_70px_rgba(0,0,0,0.06)] border border-white/80 overflow-hidden flex flex-col lg:flex-row items-stretch">

          {/* ── LEFT COLUMN: RESET FORM CARD ── */}
          <div className="w-full lg:w-[50%] p-6 sm:p-10 md:p-12 flex flex-col justify-between relative bg-white/70">
            
            {/* Top Brand Logo */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                  <Camera className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-wider uppercase text-zinc-900 leading-tight">
                    STUDIO.
                  </h1>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Capturing Moments
                  </p>
                </div>
              </div>

              {/* Headline */}
              <div className="mt-8">
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                  Set New Password
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium leading-relaxed">
                  Choose a strong, secure password to protect your studio projects and client galleries.
                </p>
              </div>
            </div>

            {/* Mobile Hero Viewport */}
            <div className="block lg:hidden my-4">
              <CharacterStage charState={charState} isMobileCompact={true} />
            </div>

            {/* Form Body or Success State */}
            <motion.div
              animate={{ x: formShake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6"
            >
              {isSuccess ? (
                /* ── SUCCESS NOTIFICATION ── */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-3xl bg-emerald-50/80 border border-emerald-200 text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950">
                      Password Updated!
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Your password has been reset successfully. Redirecting you to the login screen...
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="inline-block px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Login Now →
                    </Link>
                  </div>
                </motion.div>
              ) : (
                /* ── PASSWORD RESET FORM ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      New Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        onFocus={() => setCharState('focus-password')}
                        onBlur={() => setCharState('idle')}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
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
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                          <span>Strength</span>
                          <span className={strength >= 75 ? 'text-emerald-600' : 'text-zinc-500'}>
                            {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Confirm New Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        onFocus={() => setCharState('focus-password')}
                        onBlur={() => setCharState('idle')}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
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

                  {/* Error Notification */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 font-bold"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform active:scale-98 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Bottom Cursive Script Signature Tagline */}
            <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <span className="font-serif italic text-sm text-zinc-400 tracking-wider">
                Shoot &middot; Edit &middot; Deliver &middot; Grow
              </span>

              <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit Encrypted</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: 3D PHOTOGRAPHER STAGE ── */}
          <div className="hidden lg:flex w-full lg:w-[50%] bg-gradient-to-br from-[#FAFAFC] via-[#F5F5F8] to-[#ECECEF] items-center justify-center relative border-l border-zinc-100/80">
            <CharacterStage charState={charState} />
          </div>

        </div>
      </div>
    </div>
  );
}
