'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
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
  Camera,
  Briefcase,
  Sparkles,
  Calendar,
  Layers,
  Crown,
  MapPin,
  IndianRupee,
  Check,
  ArrowUpRight,
  X,
  Target,
  Users2,
  CheckCheck,
} from 'lucide-react';
import OtpModal from '@/components/auth/OtpModal';

// Comprehensive Country Code Data with Flag Emojis & ISO
const COUNTRIES = [
  { code: '+91', iso: 'in', name: 'India', flag: '🇮🇳' },
  { code: '+1', iso: 'us', name: 'United States', flag: '🇺🇸' },
  { code: '+44', iso: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', iso: 'ae', name: 'UAE', flag: '🇦🇪' },
  { code: '+1', iso: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: '+61', iso: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: '+65', iso: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', iso: 'qa', name: 'Qatar', flag: '🇶🇦' },
  { code: '+965', iso: 'kw', name: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', iso: 'om', name: 'Oman', flag: '🇴🇲' },
  { code: '+973', iso: 'bh', name: 'Bahrain', flag: '🇧🇭' },
  { code: '+977', iso: 'np', name: 'Nepal', flag: '🇳🇵' },
  { code: '+880', iso: 'bd', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', iso: 'lk', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+60', iso: 'my', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+49', iso: 'de', name: 'Germany', flag: '🇩🇪' },
];

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal Choice: 'studio' | 'team'
  const [portal, setPortal] = useState<'studio' | 'team'>('studio');

  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Studio Signup Fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Team Signup / Activation Fields
  const [teamFullName, setTeamFullName] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPhone, setTeamPhone] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [showTeamPassword, setShowTeamPassword] = useState(false);

  // Real-time Email Already Registered State
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const [registeredRole, setRegisteredRole] = useState('');

  // Invite state for team member
  const [isInvited, setIsInvited] = useState(false);
  const [invitedStudios, setInvitedStudios] = useState<string[]>([]);
  const [invitedName, setInvitedName] = useState('');

  // Country dropdown state
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpTargetPhone, setOtpTargetPhone] = useState('');
  const [otpPendingMeta, setOtpPendingMeta] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Query parameter support (e.g. ?portal=team)
  useEffect(() => {
    const portalParam = searchParams.get('portal');
    if (portalParam === 'team' || portalParam === 'freelancer' || portalParam === 'crew') {
      setPortal('team');
    }
  }, [searchParams]);

  // Real-Time Check: Email Already Registered (in Sign Up Mode)
  useEffect(() => {
    const currentEmail = authMode === 'signup' ? (portal === 'studio' ? signupEmail : teamEmail) : '';
    if (!currentEmail || !currentEmail.includes('@') || currentEmail.length < 5) {
      setIsEmailRegistered(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(currentEmail.trim())}`);
        const data = await res.json();
        if (data.exists) {
          setIsEmailRegistered(true);
          setRegisteredRole(data.role || 'user');
        } else {
          setIsEmailRegistered(false);
        }
      } catch (_) {
        setIsEmailRegistered(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [signupEmail, teamEmail, authMode, portal]);

  // Debounced check for team email invitation
  useEffect(() => {
    const checkEmail = portal === 'team' ? (authMode === 'login' ? identifier : teamEmail) : '';
    if (!checkEmail || !checkEmail.includes('@') || checkEmail.length < 5) {
      setIsInvited(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/team/check-invite?email=${encodeURIComponent(checkEmail.trim())}`);
        const data = await res.json();
        if (data?.is_invited) {
          setIsInvited(true);
          setInvitedName(data.member_name || 'Crew Member');
          setInvitedStudios(data.studios || ['Studio Partner']);
          if (!teamFullName && data.member_name) {
            setTeamFullName(data.member_name);
          }
        } else {
          setIsInvited(false);
        }
      } catch (_) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [identifier, teamEmail, portal, authMode, teamFullName]);

  // 1. Handle Studio / Team Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanIdent = identifier.trim().toLowerCase();

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanIdent,
        password: password,
      });

      if (authErr) {
        if (portal === 'team' && authErr.message.includes('Invalid login credentials')) {
          try {
            const checkRes = await fetch(`/api/team/check-invite?email=${encodeURIComponent(cleanIdent)}`);
            const checkJson = await checkRes.json();
            if (checkJson?.is_invited) {
              setIsInvited(true);
              setTeamEmail(cleanIdent);
              setTeamFullName(checkJson.member_name || '');
              setAuthMode('signup');
              setError(`👋 Welcome ${checkJson.member_name || 'Partner'}! You are invited by ${checkJson.studios?.join(', ')}. Set your password to activate your account.`);
              return;
            }
          } catch (_) {}
        }
        throw authErr;
      }

      if (data?.user) {
        if (portal === 'team') {
          router.push('/team/dashboard');
        } else {
          router.push('/workspace');
        }
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Studio Owner Signup (Sends Email OTP)
  const handleStudioSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmailRegistered) {
      setError('This email is already registered. Please switch to Login.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhone = signupPhone.trim();

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: fullName.trim(),
            workspace_name: businessName.trim(),
            phone: `${selectedCountry.code}${cleanPhone}`,
            role: 'owner',
          },
        },
      });

      if (signUpErr) throw signUpErr;

      setOtpTargetEmail(cleanEmail);
      setOtpTargetPhone(`${selectedCountry.code} ${cleanPhone}`);
      setOtpPendingMeta({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        role: 'owner',
      });
      setShowOtpModal(true);
    } catch (err: any) {
      console.error('[Studio Signup] Error:', err);
      setError(err.message || 'Failed to initiate signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Team Member / Freelancer Signup
  const handleTeamSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = teamEmail.trim().toLowerCase();
    const cleanPhone = teamPhone.trim();

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: teamPassword,
        options: {
          data: {
            full_name: teamFullName.trim() || 'Crew Member',
            phone: cleanPhone ? `${selectedCountry.code}${cleanPhone}` : undefined,
            role: 'team_member',
          },
        },
      });

      if (signUpErr) {
        if (signUpErr.message.includes('already registered') || (signUpErr as any).code === 'email_exists') {
          const linkRes = await fetch('/api/team/link-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: teamPassword,
              fullName: teamFullName.trim(),
              phone: cleanPhone,
            }),
          });
          const linkJson = await linkRes.json();
          if (linkJson.success) {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: teamPassword,
            });
            router.push('/team/dashboard');
            return;
          }
        }
        throw signUpErr;
      }

      setOtpTargetEmail(cleanEmail);
      setOtpTargetPhone(cleanPhone ? `${selectedCountry.code} ${cleanPhone}` : '');
      setOtpPendingMeta({
        fullName: teamFullName.trim() || 'Crew Member',
        role: 'team_member',
        isTeamPortal: true,
      });
      setShowOtpModal(true);
    } catch (err: any) {
      console.error('[Team Signup] Error:', err);
      setError(err.message || 'Failed to start crew registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification Success
  const handleOtpVerified = async () => {
    setShowOtpModal(false);
    if (portal === 'team' || otpPendingMeta?.isTeamPortal) {
      router.push('/team/dashboard');
    } else {
      router.push('/workspace');
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-amber-100 relative overflow-x-hidden">
      
      {/* Background Subtle Ambient Highlights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP LUXURY BRAND HEADER ── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
        <Link href="/" className="group">
          <OfficialStudioCoreLogo />
        </Link>

        {/* Brand Security Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EBE7DF] text-xs font-bold text-zinc-600 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ISO 27001 Certified • Bank-Grade Security</span>
        </div>
      </header>

      {/* ── MAIN DUAL PORTAL CONTAINER ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6 flex-1 flex flex-col justify-center">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-6xl mx-auto w-full">
          
          {/* ── LEFT COLUMN: POINT-WISE FEATURE LIST & 3D FADED PHOTOGRAPHER ── */}
          <div className="lg:col-span-6 hidden lg:flex flex-col justify-between space-y-6 pt-2">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EBE7DF] text-xs font-bold text-zinc-800 shadow-2xs w-fit">
                <Sparkles className="w-3.5 h-3.5 text-[#bf7304]" />
                <span>{portal === 'studio' ? 'Complete Studio Operating System' : 'Multi-Studio Freelance Network'}</span>
              </div>

              <h2 className="text-3xl xl:text-[38px] font-serif font-black text-zinc-900 tracking-tight leading-[1.15]">
                {portal === 'studio' ? (
                  <>Focus on Your Art. <br /><span className="text-[#bf7304]">We Handle Your Business.</span></>
                ) : (
                  <>Track Every Shoot & Call Time. <br /><span className="text-indigo-600">Get Guaranteed Payouts.</span></>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                {portal === 'studio'
                  ? 'The single platform trusted by premium wedding photographers to automate leads, assign crew, send live quotations, and track studio finances.'
                  : 'Join the StudioCore Freelancer Network. Access assigned wedding schedules, venue GPS navigation, and transparent live payment ledgers.'}
              </p>

              {/* Point-wise Features with 3D Styled Badges */}
              <div className="space-y-3 pt-2">
                {portal === 'studio' ? [
                  {
                    icon: Target,
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    title: 'Smart CRM & Automated WhatsApp Follow-ups',
                    desc: 'Never let a wedding lead go cold with auto-responders & status pipelines.',
                  },
                  {
                    icon: FileText,
                    color: 'text-amber-600 bg-amber-50 border-amber-200',
                    title: 'Interactive Proposal & Quotation Builder',
                    desc: 'Send modern luxury quotations that couples can review & accept in 1-click.',
                  },
                  {
                    icon: Calendar,
                    color: 'text-sky-600 bg-sky-50 border-sky-200',
                    title: 'Crew Assignment & Smart Scheduling',
                    desc: 'Assign lead photographers & drone pilots with live WhatsApp call sheets.',
                  },
                  {
                    icon: IndianRupee,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                    title: 'Studio Profit & Financial Ledger',
                    desc: 'Track client advances, pending dues, crew costs, and automated GST billing.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/70 border border-[#EBE7DF] shadow-2xs hover:bg-white transition-all">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{item.title}</h4>
                      <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                )) : [
                  {
                    icon: Calendar,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
                    title: 'Live Wedding Shoot Schedules & Call Times',
                    desc: 'Direct access to event timings, couple details & venue GPS location.',
                  },
                  {
                    icon: IndianRupee,
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    title: 'Transparent Live Payout Ledger',
                    desc: 'Track your agreed fees, advance receipts & pending balance per event.',
                  },
                  {
                    icon: Layers,
                    color: 'text-amber-600 bg-amber-50 border-amber-200',
                    title: 'Multi-Studio Freelance Network',
                    desc: 'Seamlessly switch between multiple studios hiring you from 1 account.',
                  },
                  {
                    icon: Zap,
                    color: 'text-sky-600 bg-sky-50 border-sky-200',
                    title: '1-Click Instant Activation',
                    desc: 'Get assigned shoots automatically synced as soon as you sign in.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/70 border border-[#EBE7DF] shadow-2xs hover:bg-white transition-all">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">{item.title}</h4>
                      <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D Photographer PNG with Bottom-Fade Mask */}
            <div className="relative w-full max-w-[420px] h-48 xl:h-56 mx-auto -mt-2 overflow-hidden select-none pointer-events-none">
              <div 
                className="relative w-full h-full"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
                }}
              >
                <Image
                  src="/images/auth/42.png"
                  alt="StudioCore 3D Photographer"
                  fill
                  unoptimized
                  priority
                  className="object-contain object-bottom drop-shadow-xl"
                />
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: CUBICAL 3D CARDS + AUTH FORM ── */}
          <div className="lg:col-span-6 w-full max-w-[460px] mx-auto space-y-4">
            
            {/* ── 3D CUBICAL / SQUARE ROLE SELECTOR CARDS (TOP OF LOGIN) ── */}
            <div className="grid grid-cols-2 gap-3.5">
              
              {/* CUBICAL CARD 1: Studio Owner */}
              <button
                type="button"
                onClick={() => { setPortal('studio'); setError(null); }}
                className={`relative p-4 rounded-3xl transition-all duration-300 text-left cursor-pointer flex flex-col justify-between aspect-[1.25/1] sm:aspect-[1.3/1] shadow-md ${
                  portal === 'studio'
                    ? 'bg-gradient-to-br from-white via-amber-50/70 to-amber-100/60 border-2 border-amber-500 shadow-amber-900/15 ring-2 ring-amber-400/20'
                    : 'bg-white/80 hover:bg-white border border-[#EBE7DF] hover:border-zinc-300 shadow-2xs'
                }`}
              >
                {/* 3D Top Header with Icon Box */}
                <div className="flex items-center justify-between w-full">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
                    portal === 'studio'
                      ? 'bg-gradient-to-tr from-[#d97706] to-[#b45309] text-white scale-105 border border-amber-300/40'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    <Crown className="w-5 h-5" />
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    portal === 'studio'
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {portal === 'studio' ? 'Active' : 'Select'}
                  </span>
                </div>

                {/* Card Titles */}
                <div>
                  <h3 className={`text-sm sm:text-base font-black font-serif tracking-tight leading-tight ${
                    portal === 'studio' ? 'text-zinc-900' : 'text-zinc-700'
                  }`}>
                    Studio Owner
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
                    For Studio Owners & Management
                  </p>
                </div>
              </button>

              {/* CUBICAL CARD 2: Team & Freelancer */}
              <button
                type="button"
                onClick={() => { setPortal('team'); setError(null); }}
                className={`relative p-4 rounded-3xl transition-all duration-300 text-left cursor-pointer flex flex-col justify-between aspect-[1.25/1] sm:aspect-[1.3/1] shadow-md ${
                  portal === 'team'
                    ? 'bg-gradient-to-br from-white via-indigo-50/70 to-indigo-100/60 border-2 border-indigo-600 shadow-indigo-900/15 ring-2 ring-indigo-400/20'
                    : 'bg-white/80 hover:bg-white border border-[#EBE7DF] hover:border-zinc-300 shadow-2xs'
                }`}
              >
                {/* 3D Top Header with Icon Box */}
                <div className="flex items-center justify-between w-full">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
                    portal === 'team'
                      ? 'bg-gradient-to-tr from-[#4f46e5] to-[#4338ca] text-white scale-105 border border-indigo-300/40'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    <Camera className="w-5 h-5" />
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    portal === 'team'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {portal === 'team' ? 'Active' : 'Select'}
                  </span>
                </div>

                {/* Card Titles */}
                <div>
                  <h3 className={`text-sm sm:text-base font-black font-serif tracking-tight leading-tight ${
                    portal === 'team' ? 'text-zinc-900' : 'text-zinc-700'
                  }`}>
                    Team & Freelancer
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
                    For Photographers & Crew
                  </p>
                </div>
              </button>

            </div>

            {/* ── MAIN AUTH FORM CARD ── */}
            <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-7 shadow-xl shadow-amber-950/5 relative">
              
              {/* Form Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-black text-zinc-900 tracking-tight flex items-center gap-1.5">
                    <span>
                      {portal === 'studio'
                        ? (authMode === 'login' ? 'Studio Owner Login' : 'Create Studio')
                        : (authMode === 'login' ? 'Crew Member Login' : 'Crew Registration')}
                    </span>
                    <span className="text-lg">👋</span>
                  </h3>

                  {/* Mode Toggle (Login vs Sign Up) */}
                  <div className="flex p-0.5 bg-zinc-100 rounded-xl text-xs font-bold border border-[#EBE7DF]">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setError(null); }}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        authMode === 'login' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setError(null); }}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        authMode === 'signup'
                          ? portal === 'studio' ? 'bg-white text-[#bf7304] shadow-2xs' : 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  {portal === 'studio'
                    ? (authMode === 'login' ? 'Access your studio CRM and operational tools' : 'Start your 7-day free studio trial')
                    : (authMode === 'login' ? 'View your assigned shoots and payment status' : 'Register your crew account with email OTP')}
                </p>
              </div>

              {/* Real-time Email Already Registered Alert */}
              {isEmailRegistered && authMode === 'signup' && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-2 text-xs text-rose-700 font-bold animate-pulse">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>This email is already registered!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier(portal === 'studio' ? signupEmail : teamEmail);
                      setAuthMode('login');
                      setError(null);
                    }}
                    className="underline text-rose-800 hover:text-rose-900 shrink-0 cursor-pointer font-black"
                  >
                    Login Now →
                  </button>
                </div>
              )}

              {/* Invited Notice for Freelancer */}
              {isInvited && portal === 'team' && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-2.5 text-xs text-[#92400e] font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">🎉 Welcome, {invitedName}!</p>
                    <p className="text-[11px] text-[#b45309] mt-0.5">
                      You are invited by: <span className="font-bold">{invitedStudios.join(', ')}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* ── FORMS ROUTER ── */}
              {authMode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                        placeholder="your.email@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-zinc-700">Password</label>
                      <Link href="/forgot-password" className="text-[11px] font-bold text-[#bf7304] hover:underline">
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 mt-2 ${
                      portal === 'studio'
                        ? 'bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] shadow-amber-900/10'
                        : 'bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] shadow-indigo-900/10'
                    }`}
                  >
                    {loading ? 'Signing in...' : (
                      <>
                        <span>Login to {portal === 'studio' ? 'Studio Dashboard' : 'Crew Portal'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : portal === 'studio' ? (
                /* STUDIO OWNER SIGNUP FORM */
                <form onSubmit={handleStudioSignupSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Full Name</label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sushant Nawale"
                        required
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Studio / Brand Name</label>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Filmify Weddings"
                        required
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="studio@example.com"
                        required
                        className={`w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border text-xs sm:text-sm focus:bg-white text-zinc-900 outline-none transition-all ${
                          isEmailRegistered
                            ? 'border-red-500 focus:border-red-500 ring-1 ring-red-400'
                            : 'border-[#EBE7DF] focus:border-[#b45309]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Country Code + Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Mobile Number</label>
                    <div className="flex items-center gap-1.5 relative">
                      
                      {/* Country Dropdown */}
                      <div className="relative" ref={countryDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsCountryOpen(!isCountryOpen)}
                          className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] flex items-center gap-1 text-xs sm:text-sm font-bold text-zinc-800 hover:border-[#bf7304] transition-all cursor-pointer shrink-0"
                        >
                          <span className="text-base">{selectedCountry.flag}</span>
                          <span className="font-mono">{selectedCountry.code}</span>
                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                        </button>

                        {isCountryOpen && (
                          <div className="absolute left-0 top-full mt-1.5 w-60 max-h-56 bg-white border border-[#EBE7DF] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-zinc-100 flex items-center gap-1.5 bg-zinc-50">
                              <Search className="w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                placeholder="Search country..."
                                className="w-full text-xs bg-transparent outline-none font-medium"
                              />
                            </div>
                            <div className="overflow-y-auto flex-1 p-1">
                              {filteredCountries.map((c) => (
                                <button
                                  key={c.code + c.name}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountry(c);
                                    setIsCountryOpen(false);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-amber-50 text-left font-medium cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span>{c.flag}</span>
                                    <span className="truncate">{c.name}</span>
                                  </span>
                                  <span className="font-mono text-zinc-400">{c.code}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative flex-1 flex items-center">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={signupPhone}
                          maxLength={selectedCountry.code === '+91' ? 10 : 15}
                          onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          required
                          className="w-full pl-8.5 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Create Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full pl-10 pr-10 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isEmailRegistered}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-900/10 transition-all cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {loading ? 'Sending Verification OTP...' : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* TEAM MEMBER / FREELANCER SIGNUP FORM */
                <form onSubmit={handleTeamSignupSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Your Full Name</label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={teamFullName}
                        onChange={(e) => setTeamFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-indigo-600 focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={teamEmail}
                        onChange={(e) => setTeamEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        required
                        className={`w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border text-xs sm:text-sm focus:bg-white text-zinc-900 outline-none transition-all ${
                          isEmailRegistered
                            ? 'border-red-500 focus:border-red-500 ring-1 ring-red-400'
                            : 'border-[#EBE7DF] focus:border-indigo-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Mobile Number (Optional)</label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="tel"
                        value={teamPhone}
                        maxLength={10}
                        onChange={(e) => setTeamPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit number"
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-indigo-600 focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Create Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type={showTeamPassword ? 'text' : 'password'}
                        value={teamPassword}
                        onChange={(e) => setTeamPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full pl-10 pr-10 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-indigo-600 focus:bg-white text-zinc-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeamPassword(!showTeamPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showTeamPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isEmailRegistered}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-900/10 transition-all cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {loading ? 'Sending OTP Verification...' : (
                      <>
                        <span>Activate Crew Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── BOTTOM TRUST BAR ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-zinc-500 border-t border-[#EBE7DF]">
        StudioCore Multi-Studio Operating System • Hybrid Studio Owner & Freelancer Architecture
      </footer>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        email={otpTargetEmail}
        phone={otpTargetPhone}
        onSuccess={handleOtpVerified}
      />
    </div>
  );
}
