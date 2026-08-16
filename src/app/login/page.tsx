'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Building2, Phone, ArrowRight, Camera, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CharacterStage, { CharacterState } from '@/components/auth/CharacterStage';
import OtpModal from '@/components/auth/OtpModal';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Interactive 3D Character state
  const [charState, setCharState] = useState<CharacterState>('idle');

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Phone for login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Specific Fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formShake, setFormShake] = useState(false);

  // WhatsApp OTP Verification Modal State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);

  // Staging environment checks (if applicable)
  const allowedStagingEmailsRaw = process.env.NEXT_PUBLIC_ALLOWED_STAGING_EMAILS || '';
  const isStagingDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('staging') ||
    window.location.hostname.includes('test') ||
    process.env.NEXT_PUBLIC_IS_STAGING === 'true'
  );
  const allowedStagingEmails = allowedStagingEmailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Auto check session or read URL errors on load
  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam === 'unauthorized_staging') {
      setError('Access Denied: This staging environment is restricted to authorized testing accounts only.');
      setCharState('error');
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
      setCharState('error');
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const redirectTo = searchParams.get('redirectTo') || '/workspace';
        router.push(redirectTo);
      }
    };
    checkSession();
  }, [router, searchParams]);

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setError('Please enter your email/phone and password');
      triggerErrorAnimation();
      return;
    }

    setLoading(true);
    setCharState('submitting');

    try {
      const redirectTo = searchParams.get('redirectTo') || '/workspace';

      // Hit server-side login API
      const apiRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanIdentifier,
          password,
          rememberMe,
        }),
      });

      const apiJson = await apiRes.json().catch(() => ({}));

      if (apiRes.ok && apiJson.success) {
        setCharState('success');
        if (apiJson.session) {
          await supabase.auth.setSession(apiJson.session).catch(() => {});
        }

        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1800);
        return;
      } else {
        const errMsg = apiJson.error || 'Authentication failed. Please check credentials.';
        setError(errMsg);
        triggerErrorAnimation();
      }
    } catch (err: any) {
      console.error('[Login Catch Error]:', err);
      setError(err.message || 'Unable to connect to login service.');
      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up (Starts WhatsApp OTP flow)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword) {
      setError('Please fill in all required fields');
      triggerErrorAnimation();
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      triggerErrorAnimation();
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number for WhatsApp verification');
      triggerErrorAnimation();
      return;
    }

    setLoading(true);
    setCharState('submitting');

    try {
      // Step 1: Trigger WhatsApp OTP via backend API
      const otpRes = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          email: signupEmail.trim().toLowerCase(),
          name: fullName.trim(),
          type: 'signup',
        }),
      });

      const otpJson = await otpRes.json().catch(() => ({}));

      if (!otpRes.ok || !otpJson.success) {
        setError(otpJson.error || 'Failed to send WhatsApp OTP.');
        triggerErrorAnimation();
        setLoading(false);
        return;
      }

      // Store signup data payload for verification step
      setPendingSignupData({
        name: fullName.trim(),
        businessName: businessName.trim() || `${fullName.trim()}'s Studio`,
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        phone: cleanPhone,
      });

      // Open OTP Modal popup
      setIsOtpOpen(true);
      setCharState('idle');
    } catch (err: any) {
      console.error('[Signup OTP Send Catch]:', err);
      setError(err.message || 'Error triggering WhatsApp OTP.');
      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP Callback from OtpModal
  const handleVerifyOtp = async (code: string) => {
    if (!pendingSignupData) return false;

    setLoading(true);
    setCharState('submitting');

    try {
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: pendingSignupData.phone,
          otp: code,
          signupData: pendingSignupData,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setCharState('success');
        if (json.session) {
          await supabase.auth.setSession(json.session).catch(() => {});
        }

        setTimeout(() => {
          setIsOtpOpen(false);
          window.location.href = json.redirectUrl || '/workspace';
        }, 1200);
        return true;
      } else {
        throw new Error(json.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setCharState('error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Callback
  const handleResendOtp = async () => {
    if (!pendingSignupData) return;

    await fetch('/api/auth/send-whatsapp-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: pendingSignupData.phone,
        email: pendingSignupData.email,
        name: pendingSignupData.name,
        type: 'signup',
      }),
    });
  };

  // Soft form shake and character error state
  const triggerErrorAnimation = () => {
    setCharState('error');
    setFormShake(true);
    setTimeout(() => setFormShake(false), 600);
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F6] flex flex-col justify-between selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* ── TOP AMBIENT ACCENT GLOW ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-orange-400/10 via-amber-300/5 to-transparent blur-3xl pointer-events-none" />

      {/* ── MAIN RESPONSIVE CONTAINER ── */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-12 z-10">
        <div className="w-full max-w-6xl bg-white/80 backdrop-blur-2xl rounded-3xl sm:rounded-[36px] shadow-[0_20px_70px_rgba(0,0,0,0.06)] border border-white/80 overflow-hidden flex flex-col lg:flex-row items-stretch">

          {/* ── LEFT COLUMN: AUTH FORM CARD ── */}
          <div className="w-full lg:w-[48%] p-6 sm:p-10 md:p-12 flex flex-col justify-between relative bg-white/70">
            
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

              {/* Tab Selector: Login vs Sign Up */}
              <div className="mt-8 flex items-center bg-zinc-100/80 p-1 rounded-2xl border border-zinc-200/60 max-w-xs">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); setCharState('idle'); }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setError(null); setCharState('idle'); }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Headline */}
              <div className="mt-6">
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Studio Account'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
                  {authMode === 'login'
                    ? 'Log in to manage your shoots, clients & memories.'
                    : 'Join thousands of professional creators & studios.'}
                </p>
              </div>
            </div>

            {/* Mobile Hero Viewport (Visible on < lg screens) */}
            <div className="block lg:hidden my-4">
              <CharacterStage charState={charState} isMobileCompact={true} />
            </div>

            {/* Form Body with Soft Shake on Error */}
            <motion.div
              animate={{ x: formShake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6"
            >
              {authMode === 'login' ? (
                /* ── LOGIN FORM ── */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email or Phone Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Email or Phone
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                        onFocus={() => setCharState('focus-email')}
                        onBlur={() => setCharState('idle')}
                        placeholder="name@studio.com or +91 9876543210"
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Password
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
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-zinc-600">
                        Remember Me
                      </span>
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                    >
                      Forgot Password?
                    </Link>
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
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ── SIGN UP FORM ── */
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  {/* Name & Studio Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                        Full Name *
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                          <User className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setError(null); }}
                          onFocus={() => setCharState('focus-email')}
                          onBlur={() => setCharState('idle')}
                          placeholder="Your Name"
                          required
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                        Studio / Business
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                          <Building2 className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => { setBusinessName(e.target.value); setError(null); }}
                          onFocus={() => setCharState('focus-email')}
                          onBlur={() => setCharState('idle')}
                          placeholder="e.g. Royal Arts"
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Email Address *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                        onFocus={() => setCharState('focus-email')}
                        onBlur={() => setCharState('idle')}
                        placeholder="you@domain.com"
                        required
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Mobile / WhatsApp Number with +91 indicator */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      WhatsApp Mobile Number *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1 text-zinc-500 font-bold text-xs pointer-events-none">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={signupPhone}
                        onChange={(e) => { setSignupPhone(e.target.value.replace(/\D/g, '')); setError(null); }}
                        onFocus={() => setCharState('focus-email')}
                        onBlur={() => setCharState('idle')}
                        placeholder="98765 43210"
                        required
                        className="w-full pl-16 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium pl-1">
                      We will send a 6-digit verification code to this WhatsApp number.
                    </p>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Password *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => { setSignupPassword(e.target.value); setError(null); }}
                        onFocus={() => setCharState('focus-password')}
                        onBlur={() => setCharState('idle')}
                        placeholder="Min 6 characters"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      >
                        {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                        className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold"
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
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform active:scale-98 disabled:opacity-60 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Sending WhatsApp OTP...</span>
                      </div>
                    ) : (
                      <>
                        <span>Continue with WhatsApp Verification</span>
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

              <span className="text-[11px] font-bold text-zinc-400">
                Built for Creators
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: 3D PHOTOGRAPHER STAGE (DESKTOP) ── */}
          <div className="hidden lg:flex w-full lg:w-[52%] bg-gradient-to-br from-[#FAFAFC] via-[#F5F5F8] to-[#ECECEF] items-center justify-center relative border-l border-zinc-100/80">
            <CharacterStage charState={charState} />
          </div>

        </div>
      </div>

      {/* ── WHATSAPP OTP VERIFICATION MODAL ── */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        phone={pendingSignupData?.phone || ''}
        name={pendingSignupData?.name}
        onVerify={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        loading={loading}
      />
    </div>
  );
}
