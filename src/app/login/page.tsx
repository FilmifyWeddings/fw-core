'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
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

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // WhatsApp OTP Verification Modal State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);

  // Check existing session on mount
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

  // Handle Sign Up Submit (Dispatches WhatsApp OTP)
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

  // Verify OTP Callback
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
    <main className="min-h-screen w-full bg-[#F6EFEB] selection:bg-[#F36F21] selection:text-white font-sans flex items-center justify-center p-4 sm:p-6 lg:p-10 lg:h-screen lg:overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════════
          CENTERED TWO-COLUMN CONTAINER (Exact Reference Proportions)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-[38%_62%] xl:grid-cols-[36%_64%] items-center gap-8 lg:gap-12 xl:gap-16 my-auto">
        
        {/* ── LEFT COLUMN: LOGO + FORM + TAGLINE STACK ── */}
        <div className="w-full max-w-[400px] sm:max-w-[420px] mx-auto lg:mx-0 flex flex-col">
          
          {/* 1. Large StudioCore Brand Logo (Directly Above Welcome Back) */}
          <div className="mb-7 sm:mb-9">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="relative w-14 h-8 sm:w-16 sm:h-9 xl:w-[68px] xl:h-[39px] shrink-0 flex items-center justify-center">
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
          </div>

          {/* 2. Welcome Back Heading */}
          <div>
            <h1 className="text-3xl sm:text-4xl xl:text-[38px] font-black text-zinc-900 tracking-tight leading-tight">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm sm:text-base text-zinc-500 mt-1.5 font-normal">
              {authMode === 'login'
                ? 'Log in to continue to your dashboard'
                : 'Join StudioCore to manage your photography business'}
            </p>
          </div>

          {/* 3. Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-300/40 rounded-xl max-w-[190px] mt-5">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(null); }}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* 4. Form Container */}
          <div className="mt-5">
            {authMode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Email or Phone */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <User className="w-4.5 h-4.5 stroke-[2]" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                      placeholder="Email or Phone"
                      required
                      className="w-full pl-11 pr-4 h-12 sm:h-[50px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 pointer-events-none text-zinc-400">
                      <Lock className="w-4.5 h-4.5 stroke-[2]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Password"
                      required
                      className="w-full pl-11 pr-11 h-12 sm:h-[50px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-[#F36F21] focus:ring-[#F36F21] accent-[#F36F21] cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-zinc-700">
                      Remember Me
                    </span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs sm:text-sm font-bold text-[#F36F21] hover:text-[#d85e16] hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Inline Error Alert */}
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-[50px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] active:bg-[#c95311] text-white font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError(null); }}
                      placeholder="Full Name *"
                      required
                      className="w-full px-3.5 h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => { setBusinessName(e.target.value); setError(null); }}
                      placeholder="Studio Name"
                      className="w-full px-3.5 h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                    placeholder="Email Address *"
                    required
                    className="w-full px-3.5 h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                  />
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-zinc-500 font-bold text-xs pointer-events-none">
                      +91
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={signupPhone}
                      onChange={(e) => { setSignupPhone(e.target.value.replace(/\D/g, '')); setError(null); }}
                      placeholder="WhatsApp Mobile Number *"
                      required
                      className="w-full pl-12 pr-3.5 h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="relative flex items-center">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setError(null); }}
                      placeholder="Password (min 6 chars) *"
                      required
                      className="w-full px-3.5 pr-10 h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
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

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#F36F21] hover:bg-[#e06118] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Continue with WhatsApp Verification'}
                </button>
              </form>
            )}
          </div>

          {/* 5. Large Capture · Manage · Deliver · Grow PNG (Below Login) */}
          <div className="mt-7 sm:mt-8 relative w-full max-w-[340px] sm:max-w-[380px] h-[52px] sm:h-[58px] xl:h-[64px] mx-auto select-none">
            <Image
              src="/Capture · Manage · Deliver · Grow.png"
              alt="Capture · Manage · Deliver · Grow"
              fill
              className="object-contain object-center"
              priority
            />
          </div>

          {/* 6. Copyright */}
          <div className="pt-6 text-center lg:text-left text-xs text-zinc-400">
            <span className="font-medium text-[11px]">
              StudioCore &copy; {new Date().getFullYear()}
            </span>
          </div>

        </div>

        {/* ── RIGHT COLUMN: LARGE 3D PHOTOGRAPHER SCENE ── */}
        <div className="w-full max-w-[760px] xl:max-w-[840px] aspect-[1292/1217] max-h-[85vh] mx-auto flex items-center justify-center relative">
          <Image
            src="/3D Photographer.png"
            alt="3D Photographer Character Workspace"
            fill
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 95vw, (max-width: 1440px) 62vw, 840px"
          />
        </div>

      </div>

      {/* WhatsApp OTP Modal for Sign Up */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        phone={pendingSignupData?.phone || ''}
        name={pendingSignupData?.name}
        onVerify={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        loading={loading}
      />
    </main>
  );
}
