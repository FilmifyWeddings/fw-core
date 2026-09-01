'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, clearAllSupabaseAuthCookies } from '@/lib/supabase';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Phone,
  Mail,
  ArrowRight,
  Building2,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Heart,
  ShieldCheck,
  CreditCard,
  Headphones,
  Zap,
  Star,
} from 'lucide-react';
import OtpModal from '@/components/auth/OtpModal';
import { pruneClientCookies } from '@/lib/cookie-cleaner';

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
      pruneClientCookies();
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

  // Handle Login Submit (Direct Supabase Cloud + Server Fallback to guarantee zero 502 failures)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    pruneClientCookies();

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    if (!cleanIdentifier || !cleanPassword) {
      setError('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);

    try {
      // Purge any stale/corrupted cookie chunks before fresh login
      clearAllSupabaseAuthCookies();

      const redirectTo = searchParams.get('redirectTo') || '/workspace';

      // 1. Direct Supabase Cloud Login for Email (Bypasses server & prevents any 502 Bad Gateway)
      if (cleanIdentifier.includes('@')) {
        try {
          const { data: directData, error: directErr } = await supabase.auth.signInWithPassword({
            email: cleanIdentifier.toLowerCase(),
            password: cleanPassword,
          });

          if (!directErr && directData?.session) {
            console.log('[Login] Direct Supabase auth successful:', directData.user?.email);
            window.location.href = redirectTo;
            return;
          }

          if (directErr && directErr.message !== 'Failed to fetch') {
            console.warn('[Direct Supabase Auth Notice]:', directErr.message);
          }
        } catch (directCatchErr) {
          console.warn('[Direct Supabase Auth Catch]:', directCatchErr);
        }
      }

      // 2. Server-side login route (supports phone number lookups & server cookie setting)
      const apiRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanIdentifier,
          password: cleanPassword,
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
        // If server gave 502 but client couldn't authenticate, show specific credentials guidance
        if (apiRes.status === 502) {
          // Last attempt direct client auth
          if (cleanIdentifier.includes('@')) {
            const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
              email: cleanIdentifier.toLowerCase(),
              password: cleanPassword,
            });
            if (!retryErr && retryData?.session) {
              window.location.href = redirectTo;
              return;
            }
          }
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError(apiJson.error || 'Invalid email/phone or password. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('[Login Error]:', err);
      // Fallback direct attempt on network error
      if (cleanIdentifier.includes('@')) {
        try {
          const { data: fallbackData, error: fallbackErr } = await supabase.auth.signInWithPassword({
            email: cleanIdentifier.toLowerCase(),
            password: cleanPassword,
          });
          if (!fallbackErr && fallbackData?.session) {
            window.location.href = searchParams.get('redirectTo') || '/workspace';
            return;
          }
        } catch (_) {}
      }
      setError('Invalid credentials or connection error. Please check your password.');
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

    const isIndia = selectedCountry.code === '+91' || selectedCountry.iso === 'in';

    if (isIndia) {
      if (cleanPhoneDigits.length !== 10) {
        setError('Indian mobile number must be exactly 10 digits (e.g. 9876543210).');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhoneDigits)) {
        setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (!cleanPhoneDigits || cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 15) {
        setError('Please enter a valid mobile number (7 to 15 digits).');
        return;
      }
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
      const redirectTo = searchParams.get('redirectTo') || '/workspace?onboarding=true';

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
        try {
          localStorage.setItem('sc_show_onboarding_celebration', 'true');
        } catch (e) {}
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
    <div className="min-h-screen w-full bg-[#FAF7F2] text-zinc-900 font-sans relative overflow-x-hidden flex flex-col justify-between selection:bg-[#F36F21] selection:text-white">
      
      {/* ── TOP LUXURY NAVIGATION BAR ── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-2 group transition-transform">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            <Image
              src="/images/auth/sc-orange-logo.png"
              alt="StudioCore Logo"
              fill
              unoptimized
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-[28px] font-serif font-black tracking-tight text-[#bf7304] leading-none">
              StudioCore
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 tracking-tight mt-0.5">
              All-in-One Studio Management
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs lg:text-sm font-semibold text-zinc-600">
          <Link href="/features" className="hover:text-[#bf7304] transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-[#bf7304] transition-colors">How It Works</Link>
          <Link href="/#solutions" className="hover:text-[#bf7304] transition-colors">Solutions</Link>
          <Link href="/pricing" className="hover:text-[#bf7304] transition-colors">Pricing</Link>
          <div className="flex items-center gap-1 cursor-pointer hover:text-[#bf7304] transition-colors">
            <span>Resources</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </div>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-xs sm:text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
          >
            {authMode === 'login' ? 'Create Account' : 'Login'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
            }}
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-800/15 hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            Start Your Studio
          </button>
        </div>
      </header>

      {/* ── MAIN HERO SECTION ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 items-center">
          
          {/* ═══════════════════════════════════════════════════════════════
              LEFT COLUMN: HEADLINE & FEATURE PILLS (Desktop Only / Top on Large)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 flex-col justify-center space-y-4 sm:space-y-5 text-left order-2 lg:order-1">
            
            {/* Welcome Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-[#92400e] text-xs sm:text-sm font-bold shadow-xs w-fit">
              <span>👋</span>
              <span>{authMode === 'login' ? 'Welcome Back!' : 'Start 7-Day Free Trial'}</span>
              <span>👋</span>
            </div>

            {/* Typography Heading */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-serif font-black text-zinc-900 tracking-tight leading-[1.12]">
                Manage Your Studio.
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-serif font-black text-[#bf7304] tracking-tight leading-[1.12] mt-0.5">
                Grow Your Business.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 max-w-md font-medium leading-relaxed">
                {authMode === 'login'
                  ? 'Login to your StudioCore account and continue where you left off.'
                  : 'Empower your photography studio with quotations, lead pipeline & instant delivery.'}
              </p>
            </div>

            {/* 4 Feature Value Pills (Glassy Box) */}
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-3.5 sm:p-4 border border-amber-100/80 shadow-sm space-y-2.5 max-w-md">
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-800">
                  Save time with automation
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-800">
                  Stay organized & stress-free
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100/80 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                  <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-800">
                  Grow your photography business
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                  <Heart className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-zinc-800">
                  Loved by 600+ photographers
                </span>
              </div>

            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════
              CENTER COLUMN: 3D PHOTOGRAPHER CHARACTER WITH BOTTOM FADE
              ═══════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 items-end justify-center relative min-h-[360px] lg:min-h-[500px] xl:min-h-[540px] order-1 lg:order-2">
            
            {/* Soft Ambient Warm Glow Behind Character */}
            <div className="absolute w-72 h-72 bg-amber-400/15 rounded-full filter blur-3xl animate-soft-glow pointer-events-none -translate-y-8" />

            {/* 3D Photographer Character (42.png) with Smooth Bottom Fade */}
            <div
              className="relative w-full max-w-[320px] lg:max-w-[400px] xl:max-w-[440px] aspect-[4/5] z-10 animate-subtle-float select-none"
              style={{
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 98%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 98%)',
              }}
            >
              <Image
                src="/images/auth/42.png"
                alt="StudioCore 3D Photographer Character"
                fill
                unoptimized
                priority
                className="object-contain object-bottom drop-shadow-xl"
              />
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════
              RIGHT COLUMN / MOBILE HERO: ELEVATED AUTHENTICATION FORM CARD
              ═══════════════════════════════════════════════════════════════ */}
          <div className="w-full lg:col-span-4 xl:col-span-4 flex justify-center lg:justify-end order-1 lg:order-3">
            <div className="w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-amber-200/60 shadow-xl shadow-amber-950/5">
              
              {/* 3D Character Header on Mobile (Standing directly on the divider line, no circle) */}
              <div className="flex lg:hidden items-end justify-between pb-3 mb-3.5 border-b border-zinc-200/80 relative">
                <div className="flex items-end gap-3">
                  {/* 3D Photographer Character standing on the bottom line */}
                  <div className="relative w-16 h-20 -mb-3 shrink-0 select-none pointer-events-none">
                    <Image
                      src="/images/auth/42.png"
                      alt="StudioCore Photographer"
                      fill
                      unoptimized
                      priority
                      className="object-contain object-bottom drop-shadow-md"
                    />
                  </div>

                  <div className="pb-0.5">
                    <h3 className="text-base font-serif font-black text-zinc-900 leading-tight">
                      StudioCore
                    </h3>
                    <p className="text-[11px] text-[#bf7304] font-bold">
                      Focus on Art, We Manage
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100/90 border border-amber-200 text-[#92400e] text-[10px] font-bold shadow-2xs mb-0.5">
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </div>
              </div>

              {/* Card Header */}
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-zinc-900 tracking-tight flex items-center gap-1.5">
                    <span>{authMode === 'login' ? 'Welcome Back!' : 'Create Studio'}</span>
                    <span className="text-lg">👋</span>
                  </h2>
                  <div className="flex p-0.5 bg-zinc-100 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setError(null); }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        authMode === 'login' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setError(null); }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        authMode === 'signup' ? 'bg-white text-[#bf7304] shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  {authMode === 'login' ? 'Login to your StudioCore account' : 'Enter your details to create your studio'}
                </p>
              </div>

              {/* ── FORM BODY ── */}
              {authMode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-3.5" autoComplete="off">
                  
                  {/* Email Address / Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">Email or Mobile Number</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                        placeholder="Enter email or mobile"
                        className="w-full pl-10 pr-4 h-10 sm:h-11 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700">Password</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 stroke-[2]" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 h-10 sm:h-11 rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-600 hover:text-zinc-900">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-[#bf7304] focus:ring-[#bf7304] accent-[#bf7304] cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-xs font-semibold">Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] sm:text-xs font-bold text-[#bf7304] hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 sm:h-11.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-md shadow-amber-900/15 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      'Logging in...'
                    ) : (
                      <>
                        <span>Login to StudioCore</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>

                  {/* Footer Switch */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-600 font-medium">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setError(null); }}
                        className="font-bold text-[#bf7304] hover:underline cursor-pointer"
                      >
                        Start Free Trial
                      </button>
                    </p>
                  </div>

                  {/* Crew Portal Entry Badge */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 text-center">
                    <Link
                      href="/team/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-amber-50 border border-zinc-200 hover:border-amber-200 text-zinc-600 hover:text-amber-800 text-xs font-semibold transition-all group"
                    >
                      <span>Are you a Crew / Freelancer?</span>
                      <span className="font-bold text-[#b45309] group-hover:translate-x-0.5 transition-transform">Team Portal Login →</span>
                    </Link>
                  </div>
                </form>
              ) : (
                /* SIGNUP FORM */
                <form onSubmit={handleSignupSubmit} className="space-y-2.5" autoComplete="off">
                  
                  {/* Honeypot hidden fields */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="fake_user_name_trap" tabIndex={-1} autoComplete="off" />
                    <input type="password" name="fake_pwd_trap" tabIndex={-1} autoComplete="off" />
                  </div>

                  {/* 1. Full Name */}
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
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-9 sm:h-[40px] rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* 2. Studio Name */}
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
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-9 sm:h-[40px] rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* 3. Email Address */}
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
                      className="w-full pl-9 sm:pl-10 pr-3.5 h-9 sm:h-[40px] rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                    />
                  </div>

                  {/* 4. Country Code + Mobile Number */}
                  <div className="flex items-center gap-1.5 relative">
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCountryOpen(!isCountryOpen)}
                        className="h-9 sm:h-[40px] px-2 sm:px-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-800 hover:border-[#bf7304] transition-all cursor-pointer shrink-0"
                      >
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

                      {isCountryOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-64 max-h-60 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden flex flex-col">
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
                                    ? 'bg-amber-50 text-[#bf7304] font-bold'
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

                    <div className="relative flex-1 flex items-center">
                      <div className="absolute left-3 pointer-events-none text-zinc-400">
                        <Phone className="w-3.5 h-3.5 stroke-[2]" />
                      </div>
                      <input
                        type="tel"
                        name="sc_signup_phone_input"
                        autoComplete="off"
                        value={signupPhone}
                        maxLength={selectedCountry.code === '+91' || selectedCountry.iso === 'in' ? 10 : 15}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setSignupPhone(digitsOnly);
                          setError(null);
                        }}
                        placeholder="Mobile Number (10 digits) *"
                        required
                        className={`w-full pl-8.5 sm:pl-9 pr-3.5 h-9 sm:h-[40px] rounded-xl bg-zinc-50/80 border text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:outline-none transition-all ${
                          (selectedCountry.code === '+91' || selectedCountry.iso === 'in') && signupPhone.length > 0 && signupPhone.length < 10
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 ring-1 ring-red-400'
                            : (selectedCountry.code === '+91' || selectedCountry.iso === 'in') && signupPhone.length === 10
                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            : 'border-zinc-200 focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 10-Digit Mobile Alert / Success */}
                  {(selectedCountry.code === '+91' || selectedCountry.iso === 'in') && signupPhone.length > 0 && signupPhone.length < 10 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-600 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Mobile number 10 digit ka hona chahiye ({signupPhone.length}/10)</span>
                    </div>
                  )}
                  {(selectedCountry.code === '+91' || selectedCountry.iso === 'in') && signupPhone.length === 10 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>✓ 10-Digit Mobile Number Valid</span>
                    </div>
                  )}

                  {/* 5. Password */}
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
                      className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-[40px] rounded-xl bg-zinc-50/80 border border-zinc-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:bg-white focus:border-[#bf7304] focus:ring-2 focus:ring-[#bf7304]/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {signupPassword && (
                    <div className="pt-0.5 space-y-1 transition-all duration-300">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                        {[1, 2, 3, 4].map((step) => {
                          const active = pwdStrength.barCount >= step;
                          return (
                            <div
                              key={step}
                              className={`h-full rounded-full transition-all duration-500 ${
                                active ? pwdStrength.color + ' shadow-xs' : 'bg-zinc-200'
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
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-md shadow-amber-900/15 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? (
                      'Sending Verification Code...'
                    ) : (
                      <>
                        <span>Create Studio Account</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>

                  {/* Switch to Login */}
                  <div className="text-center pt-1">
                    <p className="text-xs text-zinc-600 font-medium">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setError(null); }}
                        className="font-bold text-[#bf7304] hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── BOTTOM TRUST & BENEFIT BAR ── */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        
        {/* Trust Badges Container */}
        <div className="w-full bg-white/90 backdrop-blur-xs rounded-2xl border border-amber-100/80 shadow-sm p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
          
          {/* Badge 1: 100% Secure */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900">100% Secure</h4>
              <p className="text-[11px] text-zinc-500 font-medium">Your data is always safe</p>
            </div>
          </div>

          {/* Badge 2: No Credit Card */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900">No Credit Card</h4>
              <p className="text-[11px] text-zinc-500 font-medium">7-day free trial</p>
            </div>
          </div>

          {/* Badge 3: 24/7 Support */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
              <Headphones className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900">24/7 Support</h4>
              <p className="text-[11px] text-zinc-500 font-medium">We&apos;re here to help</p>
            </div>
          </div>

          {/* Badge 4: Quick Setup */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:px-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
              <Zap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900">Quick Setup</h4>
              <p className="text-[11px] text-zinc-500 font-medium">Get started in minutes</p>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="text-center mt-4">
          <p className="text-[11px] font-medium text-zinc-400">
            © 2026 StudioCore. All rights reserved.
          </p>
        </div>

      </footer>

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

    </div>
  );
}

