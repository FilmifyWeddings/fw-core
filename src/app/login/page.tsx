'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, AlertCircle, Phone, Mail, ArrowRight, Building2, ChevronDown, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import OtpModal from '@/components/auth/OtpModal';

// Comprehensive Country Code Data with ISO for Flag Images
const COUNTRIES = [
  { code: '+91', iso: 'in', name: 'India' },
  { code: '+1', iso: 'us', name: 'United States' },
  { code: '+44', iso: 'gb', name: 'United Kingdom' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+1', iso: 'ca', name: 'Canada' },
  { code: '+61', iso: 'au', name: 'Australia' },
  { code: '+65', iso: 'sg', name: 'Singapore' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia' },
  { code: '+974', iso: 'qa', name: 'Qatar' },
  { code: '+965', iso: 'kw', name: 'Kuwait' },
  { code: '+968', iso: 'om', name: 'Oman' },
  { code: '+973', iso: 'bh', name: 'Bahrain' },
  { code: '+977', iso: 'np', name: 'Nepal' },
  { code: '+880', iso: 'bd', name: 'Bangladesh' },
  { code: '+94', iso: 'lk', name: 'Sri Lanka' },
  { code: '+60', iso: 'my', name: 'Malaysia' },
  { code: '+66', iso: 'th', name: 'Thailand' },
  { code: '+49', iso: 'de', name: 'Germany' },
  { code: '+33', iso: 'fr', name: 'France' },
  { code: '+39', iso: 'it', name: 'Italy' },
  { code: '+34', iso: 'es', name: 'Spain' },
  { code: '+31', iso: 'nl', name: 'Netherlands' },
  { code: '+41', iso: 'ch', name: 'Switzerland' },
  { code: '+27', iso: 'za', name: 'South Africa' },
  { code: '+64', iso: 'nz', name: 'New Zealand' },
  { code: '+81', iso: 'jp', name: 'Japan' },
  { code: '+82', iso: 'kr', name: 'South Korea' },
  { code: '+55', iso: 'br', name: 'Brazil' },
  { code: '+52', iso: 'mx', name: 'Mexico' },
  { code: '+62', iso: 'id', name: 'Indonesia' },
  { code: '+63', iso: 'ph', name: 'Philippines' },
  { code: '+84', iso: 'vn', name: 'Vietnam' },
  { code: '+92', iso: 'pk', name: 'Pakistan' },
  { code: '+20', iso: 'eg', name: 'Egypt' },
  { code: '+90', iso: 'tr', name: 'Turkey' },
  { code: '+7', iso: 'ru', name: 'Russia' },
];

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

  // Signup Specific Fields (All 5 Required)
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default: India (+91)
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Country Dropdown state
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-200', barCount: 0, textColor: 'text-zinc-400', dot: 'bg-zinc-300' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) {
      return { score: 1, label: 'Weak (Add numbers & minimum 6 characters)', color: 'bg-rose-500', barCount: 1, textColor: 'text-rose-600', dot: 'bg-rose-500' };
    }
    if (score === 2) {
      return { score: 2, label: 'Moderate (Add uppercase letters or symbols)', color: 'bg-amber-500', barCount: 2, textColor: 'text-amber-600', dot: 'bg-amber-500' };
    }
    if (score === 3) {
      return { score: 3, label: 'Strong password', color: 'bg-blue-500', barCount: 3, textColor: 'text-blue-600', dot: 'bg-blue-500' };
    }
    return { score: 4, label: 'Very strong & secure password', color: 'bg-emerald-500', barCount: 4, textColor: 'text-emerald-600', dot: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(signupPassword);

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

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

  // Handle Sign Up Submit: Validates fields & sends 6-digit Email OTP instantly
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanStudioName = businessName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhoneDigits = signupPhone.replace(/\D/g, '');

    if (!cleanName) {
      setError('Full Name is required.');
      return;
    }

    if (!cleanStudioName) {
      setError('Studio Name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('A valid Email Address is required.');
      return;
    }

    if (!cleanPhoneDigits || cleanPhoneDigits.length < 7) {
      setError('A valid Mobile Number is required.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 1. Dispatch 6-Digit Verification Code to Email
      const otpRes = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          businessName: cleanStudioName,
          email: cleanEmail,
          countryCode: selectedCountry.code,
          phone: cleanPhoneDigits,
          password: signupPassword,
        }),
      });

      const otpJson = await otpRes.json().catch(() => ({}));

      if (otpRes.ok && otpJson.success) {
        setShowOtpModal(true);
      } else {
        setError(otpJson.error || 'Failed to dispatch verification code. Please check your email.');
      }
    } catch (err: any) {
      console.error('[Send OTP Error]:', err);
      setError(err.message || 'Error connecting to verification service.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and complete account registration
  const handleVerifyOtp = async (otpCode: string) => {
    setOtpLoading(true);
    try {
      const cleanName = fullName.trim();
      const cleanStudioName = businessName.trim();
      const cleanEmail = signupEmail.trim().toLowerCase();
      const cleanPhoneDigits = signupPhone.replace(/\D/g, '');
      const redirectTo = searchParams.get('redirectTo') || '/workspace';

      const apiRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          businessName: cleanStudioName,
          email: cleanEmail,
          countryCode: selectedCountry.code,
          phone: cleanPhoneDigits,
          password: signupPassword,
          otp: otpCode,
        }),
      });

      const apiJson = await apiRes.json().catch(() => ({}));

      if (apiRes.ok && apiJson.success) {
        if (apiJson.session) {
          await supabase.auth.setSession(apiJson.session).catch(() => {});
        }
        setShowOtpModal(false);
        window.location.href = apiJson.redirectUrl || redirectTo;
      } else {
        throw new Error(apiJson.error || 'Invalid verification code.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    const cleanName = fullName.trim();
    const cleanStudioName = businessName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhoneDigits = signupPhone.replace(/\D/g, '');

    const otpRes = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        businessName: cleanStudioName,
        email: cleanEmail,
        countryCode: selectedCountry.code,
        phone: cleanPhoneDigits,
        password: signupPassword,
      }),
    });

    const otpJson = await otpRes.json().catch(() => ({}));
    if (!otpRes.ok || !otpJson.success) {
      throw new Error(otpJson.error || 'Failed to resend code.');
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
                  unoptimized
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

          {/* 2. Authentication Form Card */}
          <div className="my-auto pt-2 sm:pt-4 lg:pt-0 lg:mt-6 xl:mt-8 flex flex-col">
            
            {/* Pill Tabs: Sign In / Sign Up */}
            <div className="flex p-1 bg-zinc-200/80 rounded-xl max-w-[240px] mb-2 sm:mb-3">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`flex-1 py-1.5 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(null); }}
                className={`flex-1 py-1.5 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white text-[#F36F21] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Heading & Subheading */}
            <div>
              <h1 className="text-xl sm:text-2xl xl:text-[30px] font-black text-zinc-900 tracking-tight leading-tight">
                {authMode === 'login' ? 'Welcome Back' : 'Create Studio Account'}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-600 mt-0.5 font-normal">
                {authMode === 'login'
                  ? 'Access your studio quotations and workspace'
                  : 'Start managing inquiries, quotations & team with StudioCore'}
              </p>
            </div>

            {/* Forms Container */}
            <div className="mt-2.5 sm:mt-3.5">
              {authMode === 'login' ? (
                /* ── LOGIN FORM ── */
                <form onSubmit={handleLoginSubmit} className="space-y-2 sm:space-y-3" autoComplete="off">
                  {/* Email or Phone */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <User className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                      placeholder="Email or Mobile Number"
                      className="w-full pl-10 pr-4 h-9 sm:h-[46px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4 stroke-[2]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Password"
                      className="w-full pl-10 pr-10 h-9 sm:h-[46px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-0.5 pb-0.5 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-600 hover:text-zinc-900">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-[#F36F21] focus:ring-[#F36F21] accent-[#F36F21] cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-xs font-semibold">Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] sm:text-xs font-bold text-[#F36F21] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Error Notification */}
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
                    className="w-full h-9 sm:h-[46px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] active:bg-[#c95311] text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] touch-manipulation"
                  >
                    {loading ? (
                      'Signing in...'
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ── SIGN UP FORM (5 REQUIRED FIELDS + PASSWORD STRENGTH METER) ── */
                <form onSubmit={handleSignupSubmit} className="space-y-2 sm:space-y-2.5" autoComplete="off">
                  
                  {/* Honeypot hidden fields to trap browser password managers */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="fake_user_name_trap" tabIndex={-1} autoComplete="off" />
                    <input type="password" name="fake_pwd_trap" tabIndex={-1} autoComplete="off" />
                  </div>

                  {/* 1. Full Name (Required) */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                    </div>
                    <input
                      type="text"
                      name="sc_signup_full_name"
                      autoComplete="off"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError(null); }}
                      placeholder="Full Name *"
                      required
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-8.5 sm:h-[42px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* 2. Studio / Business Name (Required) */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                    </div>
                    <input
                      type="text"
                      name="sc_signup_studio_name"
                      autoComplete="off"
                      value={businessName}
                      onChange={(e) => { setBusinessName(e.target.value); setError(null); }}
                      placeholder="Studio / Business Name *"
                      required
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-8.5 sm:h-[42px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* 3. Email Address (Required) */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                    </div>
                    <input
                      type="email"
                      name="sc_signup_email_address"
                      autoComplete="off"
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setError(null); }}
                      placeholder="Email Address *"
                      required
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-8.5 sm:h-[42px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  {/* 4. Country Code (HD Flag) + Mobile Number (Required) */}
                  <div className="flex items-center gap-1.5 relative">
                    
                    {/* Interactive Country Dropdown Button with HD Flag */}
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCountryOpen(!isCountryOpen)}
                        className="h-8.5 sm:h-[42px] px-2 sm:px-2.5 rounded-xl bg-white/95 border border-zinc-300 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-800 hover:border-[#F36F21] transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        {/* High Definition Flag Image */}
                        <img
                          src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                          alt={selectedCountry.name}
                          width={20}
                          height={14}
                          className="rounded-xs object-cover shadow-2xs"
                        />
                        <span>{selectedCountry.code}</span>
                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                      </button>

                      {/* Dropdown Menu */}
                      {isCountryOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-64 max-h-60 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden flex flex-col">
                          {/* Search */}
                          <div className="p-2 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50">
                            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search country..."
                              className="w-full text-xs bg-transparent border-none focus:outline-none text-zinc-800 font-medium"
                              autoFocus
                            />
                          </div>

                          {/* Country List */}
                          <div className="overflow-y-auto flex-1 p-1">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code + country.name}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(country);
                                  setIsCountryOpen(false);
                                  setCountrySearch('');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                  selectedCountry.iso === country.iso
                                    ? 'bg-orange-50 text-[#F36F21] font-bold'
                                    : 'text-zinc-700 hover:bg-zinc-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`https://flagcdn.com/w40/${country.iso}.png`}
                                    alt={country.name}
                                    width={20}
                                    height={14}
                                    className="rounded-xs object-cover shadow-2xs"
                                  />
                                  <span>{country.name}</span>
                                </div>
                                <span className="font-mono text-zinc-400">{country.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phone Number Input */}
                    <div className="relative flex-1 flex items-center">
                      <div className="absolute left-3 pointer-events-none text-zinc-400">
                        <Phone className="w-3.5 h-3.5 stroke-[2]" />
                      </div>
                      <input
                        type="tel"
                        name="sc_signup_phone_input"
                        autoComplete="off"
                        value={signupPhone}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setSignupPhone(digitsOnly);
                          setError(null);
                        }}
                        placeholder="Mobile Number *"
                        required
                        className="w-full pl-8.5 sm:pl-9 pr-3.5 h-8.5 sm:h-[42px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* 5. Password (Required) */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                    </div>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      name="sc_signup_unique_pwd"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setError(null); }}
                      placeholder="Password (min. 6 characters) *"
                      required
                      className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 h-8.5 sm:h-[42px] rounded-xl bg-white/95 border border-zinc-300 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer touch-manipulation"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                  </div>

                  {/* 🎨 Animated Colorful Password Strength Meter */}
                  {signupPassword && (
                    <div className="pt-0.5 space-y-1 transition-all duration-300">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                        {[1, 2, 3, 4].map((step) => {
                          const active = pwdStrength.barCount >= step;
                          return (
                            <div
                              key={step}
                              className={`h-full rounded-full transition-all duration-500 ${
                                active ? pwdStrength.color + ' shadow-sm' : 'bg-zinc-200'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pwdStrength.dot}`} />
                        <span className={pwdStrength.textColor}>{pwdStrength.label}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
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
                    className="w-full h-9 sm:h-[46px] rounded-xl bg-[#F36F21] hover:bg-[#e06118] active:bg-[#c95311] text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99] touch-manipulation"
                  >
                    {loading ? (
                      'Sending Verification Code...'
                    ) : (
                      <>
                        <span>Create Studio Account</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Capture Graphic (Centered right below login button) */}
            <div className="mt-2.5 sm:mt-3.5 lg:mt-8 relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[450px] h-[44px] sm:h-[54px] lg:h-[78px] mx-auto">
              <Image
                src="/images/auth/capture-manage-deliver-grow.png"
                alt="Capture · Manage · Deliver · Grow"
                fill
                unoptimized
                className="object-contain object-center"
                priority
              />
            </div>
          </div>

          {/* 3. Mobile 3D Photographer (Directly below capture with minimal gap) */}
          <div className="block lg:hidden w-full max-w-[340px] sm:max-w-[400px] aspect-[1292/1217] max-h-[30vh] sm:max-h-[34vh] mx-auto mt-1 sm:mt-2 relative shrink-0">
            <Image
              src="/images/auth/3D-Photographer.png"
              alt="3D Photographer Workspace"
              fill
              unoptimized
              className="object-contain object-bottom select-none"
              sizes="(max-width: 1024px) 400px, 0px"
              priority
            />
          </div>

        </div>

        {/* ── RIGHT COLUMN: LARGE 3D PHOTOGRAPHER (Desktop Only) ── */}
        <div className="hidden lg:flex w-full max-w-[780px] xl:max-w-[860px] aspect-[1292/1217] max-h-[86vh] mx-auto items-center justify-center relative">
          <Image
            src="/images/auth/3D-Photographer.png"
            alt="3D Photographer Character Workspace"
            fill
            unoptimized
            priority
            className="object-contain object-center select-none"
            sizes="(max-width: 1024px) 0vw, (max-width: 1440px) 64vw, 860px"
          />
        </div>

      </div>

      {/* ── 6-DIGIT EMAIL OTP VERIFICATION MODAL ── */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        targetAddress={signupEmail}
        name={fullName}
        channel="email"
        onVerify={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        loading={otpLoading}
      />
    </main>
  );
}
