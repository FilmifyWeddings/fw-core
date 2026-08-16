'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, Camera, AlertCircle, ArrowRight, User, Building2, Phone, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OtpModal from '@/components/auth/OtpModal';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form Fields
  const [identifier, setIdentifier] = useState('');
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

  // States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // WhatsApp OTP Verification Modal State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);

  // Auto check session or read URL errors on mount
  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam === 'unauthorized_staging') {
      setError('Access Denied: This staging environment is restricted to authorized testing accounts only.');
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
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

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setError('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);

    try {
      const redirectTo = searchParams.get('redirectTo') || '/workspace';

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
        if (apiJson.session) {
          await supabase.auth.setSession(apiJson.session).catch(() => {});
        }
        window.location.href = redirectTo;
        return;
      } else {
        setError(apiJson.error || 'Invalid email/phone or password. Please try again.');
      }
    } catch (err: any) {
      console.error('[Login Error]:', err);
      setError(err.message || 'Unable to connect to login service.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up Submit (Triggers WhatsApp OTP)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number for WhatsApp verification.');
      return;
    }

    setLoading(true);

    try {
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
        setLoading(false);
        return;
      }

      setPendingSignupData({
        name: fullName.trim(),
        businessName: businessName.trim() || `${fullName.trim()}'s Studio`,
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        phone: cleanPhone,
      });

      setIsOtpOpen(true);
    } catch (err: any) {
      console.error('[Signup OTP Error]:', err);
      setError(err.message || 'Error sending WhatsApp verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP Callback from OtpModal
  const handleVerifyOtp = async (code: string) => {
    if (!pendingSignupData) return false;

    setLoading(true);

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
        if (json.session) {
          await supabase.auth.setSession(json.session).catch(() => {});
        }
        setIsOtpOpen(false);
        window.location.href = json.redirectUrl || '/workspace';
        return true;
      } else {
        throw new Error(json.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
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

  return (
    <div className="min-h-screen w-full bg-[#F6EFE5] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-orange-500 selection:text-white font-sans">
      
      {/* ═══════════════════════════════════════════════════════════════
          LEFT SIDE — AUTHENTICATION & LOGIN UI (42-45% Desktop)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[44%] xl:w-[42%] flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-12 xl:p-16 z-10">
        
        {/* Top Logo & Tagline */}
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

        {/* Middle Main Form Area */}
        <div className="my-8 lg:my-auto max-w-md w-full">
          
          {/* Welcome Heading */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-medium">
              {authMode === 'login'
                ? 'Log in to manage your shoots, clients & memories.'
                : 'Join Studio to streamline your photography business.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-200/60 rounded-xl max-w-[200px] mt-6">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* ── FORM ── */}
          <div className="mt-6">
            {authMode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email or Phone */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                      placeholder="Email or Phone"
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Password"
                      required
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
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

                {/* Inline Error Message */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Logging in...</span>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                {/* Full Name & Studio Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setError(null); }}
                        placeholder="Full Name *"
                        required
                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => { setBusinessName(e.target.value); setError(null); }}
                        placeholder="Studio Name"
                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                      placeholder="Email Address *"
                      required
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* WhatsApp Phone */}
                <div>
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
                      placeholder="WhatsApp Mobile Number *"
                      required
                      className="w-full pl-16 pr-3 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setError(null); }}
                      placeholder="Password (min 6 chars) *"
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Sending OTP...</span>
                  ) : (
                    <>
                      <span>Continue with WhatsApp Verification</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Tagline / Signature */}
        <div className="pt-4 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-300/40">
          <span className="font-serif italic tracking-wide text-zinc-500 text-sm">
            Shoot &middot; Edit &middot; Deliver &middot; Grow
          </span>
          <span className="font-semibold text-[11px] text-zinc-400">
            Studio SaaS &copy; {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT SIDE — 3D PHOTOGRAPHER WORKSPACE ARTWORK (56-58% Desktop)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[56%] xl:w-[58%] relative flex items-center justify-center bg-[#F6EFE5] overflow-hidden min-h-[380px] lg:min-h-full">
        <div className="relative w-full h-full min-h-[420px] lg:min-h-full flex items-center justify-center p-4 lg:p-10">
          <Image
            src="/images/auth/studio-workspace-desk.webp"
            alt="3D Studio Photographer at Workstation Desk"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      </div>

      {/* WhatsApp OTP Modal */}
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
