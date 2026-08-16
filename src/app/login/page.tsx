'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, AlertCircle, Phone, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  // Read mode from query param if available
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') {
      setAuthMode('signup');
    }

    const errParam = searchParams.get('error');
    if (errParam === 'unauthorized_staging') {
      setError('Access Denied: Staging is restricted to authorized accounts.');
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

  // Handle Sign Up Submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhone = signupPhone.replace(/\D/g, '');

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const redirectTo = searchParams.get('redirectTo') || '/workspace';

      const apiRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          businessName: businessName.trim() || `${cleanName}'s Studio`,
          email: cleanEmail,
          phone: cleanPhone,
          password: signupPassword,
        }),
      });

      const apiJson = await apiRes.json().catch(() => ({}));

      if (apiRes.ok && apiJson.success) {
        if (apiJson.session) {
          await supabase.auth.setSession(apiJson.session).catch(() => {});
        }
        window.location.href = apiJson.redirectUrl || redirectTo;
        return;
      } else {
        setError(apiJson.error || 'Failed to create account. Please try again.');
      }
    } catch (err: any) {
      console.error('[Signup Error]:', err);
      setError(err.message || 'Error connecting to signup service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#F6EFEB] selection:bg-[#F36F21] selection:text-white font-sans flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 overflow-hidden z-10">
      
      {/* ═══════════════════════════════════════════════════════════════
          RESPONSIVE TWO-COLUMN CONTAINER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-[38%_62%] xl:grid-cols-[36%_64%] items-center gap-3 lg:gap-12 xl:gap-16 my-auto h-full max-h-[100dvh] lg:max-h-none justify-center">
        
        {/* ── LEFT COLUMN: LOGO + FORM + CAPTURE + MOBILE 3D CHARACTER ── */}
        <div className="w-full max-w-[360px] sm:max-w-[420px] mx-auto lg:mx-0 flex flex-col justify-between h-full max-h-[100dvh] lg:max-h-none lg:justify-center">
          
          {/* 1. StudioCore Brand Logo (Stays at Top Left) */}
          <div className="pt-0.5 sm:pt-1">
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

          {/* 2. Login/Signup Section (Shifted down with comfortable margin, tightly grouped) */}
          <div className="my-auto pt-3 sm:pt-5 lg:pt-0 lg:mt-10 xl:mt-12 flex flex-col">
            {/* Welcome Back / Create Account Heading */}
            <div>
              <h1 className="text-2xl sm:text-3xl xl:text-[36px] font-black text-zinc-900 tracking-tight leading-tight">
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 font-normal">
                {authMode === 'login'
                  ? 'Log in to continue to your dashboard'
                  : 'Join StudioCore to manage your studio'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-300/50 rounded-xl max-w-[190px] my-2.5 sm:my-3.5">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`flex-1 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
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
                className={`flex-1 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
                  authMode === 'signup'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form Container */}
            <div>
              {authMode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-2.5 sm:space-y-3.5">
                  {/* Email or Phone */}
                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <User className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                        placeholder="Email or Phone"
                        className="w-full pl-10 pr-3 h-10 sm:h-[48px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Password"
                        className="w-full pl-10 pr-10 h-10 sm:h-[48px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-zinc-300 text-[#F36F21] focus:ring-[#F36F21] accent-[#F36F21] cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-sm font-semibold text-zinc-700">
                        Remember Me
                      </span>
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-[11px] sm:text-sm font-bold text-[#F36F21] hover:text-[#d85e16] hover:underline transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {/* Inline Error Alert */}
                  {error && (
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-1.5 text-xs text-red-700 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 sm:h-[48px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] active:bg-[#c95311] text-white font-bold text-xs sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] touch-manipulation"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              ) : (
                /* SIGN UP FORM */
                <form onSubmit={handleSignupSubmit} className="space-y-2 sm:space-y-2.5">
                  {/* Name */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3 pointer-events-none text-zinc-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError(null); }}
                      placeholder="Full Name *"
                      className="w-full pl-9 pr-3 h-9 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3 pointer-events-none text-zinc-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                      placeholder="Email Address *"
                      className="w-full pl-9 pr-3 h-9 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3 pointer-events-none text-zinc-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={signupPhone}
                      onChange={(e) => { setSignupPhone(e.target.value.replace(/\D/g, '')); setError(null); }}
                      placeholder="Mobile Number (Optional)"
                      className="w-full pl-9 pr-3 h-9 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3 pointer-events-none text-zinc-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setError(null); }}
                      placeholder="Password (min 6 chars) *"
                      className="w-full pl-9 pr-9 h-9 sm:h-11 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {error && (
                    <div className="p-1.5 sm:p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-1.5 text-[11px] sm:text-xs text-red-700 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-9 sm:h-[48px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] active:bg-[#c95311] text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] touch-manipulation"
                  >
                    {loading ? (
                      'Creating Account...'
                    ) : (
                      <>
                        <span>Create Account & Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Capture Graphic (Centered right below login button) */}
            <div className="mt-3 sm:mt-4 lg:mt-8 relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[450px] h-[46px] sm:h-[58px] lg:h-[78px] mx-auto">
              <Image
                src="/Capture · Manage · Deliver · Grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* 3. Mobile 3D Photographer (Larger size, positioned directly below capture with minimal gap) */}
          <div className="block lg:hidden w-full max-w-[340px] sm:max-w-[400px] aspect-[1292/1217] max-h-[33vh] sm:max-h-[36vh] mx-auto mt-1 sm:mt-2 relative shrink-0">
            <Image
              src="/3D Photographer.png"
              alt="3D Photographer Workspace"
              fill
              className="object-contain object-bottom select-none"
              sizes="(max-width: 1024px) 400px, 0px"
              priority
            />
          </div>

        </div>

        {/* ── RIGHT COLUMN: LARGE 3D PHOTOGRAPHER (Desktop Only) ── */}
        <div className="hidden lg:flex w-full max-w-[780px] xl:max-w-[860px] aspect-[1292/1217] max-h-[86vh] mx-auto items-center justify-center relative">
          <Image
            src="/3D Photographer.png"
            alt="3D Photographer Character Workspace"
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
