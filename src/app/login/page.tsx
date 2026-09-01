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
} from 'lucide-react';
import OtpModal from '@/components/auth/OtpModal';

// Comprehensive Country Code Data with 3D Flag Emoji & ISO
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

export const StudioCoreBrandIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded-2xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-md border border-[#F5C78E]/50 shrink-0 select-none relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-90 pointer-events-none" />
    <span className="relative z-10 text-[14px] font-black tracking-tight drop-shadow-xs font-serif">SC</span>
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
      
      {/* Background Decorative Ambient Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* ── TOP LUXURY HEADER ── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <StudioCoreBrandIcon className="w-10 h-10 shadow-sm group-hover:scale-105 transition-transform" />
          <div>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-serif flex items-center gap-1.5">
              StudioCore <span className="text-[#bf7304] text-xs">✦</span>
            </span>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 font-bold tracking-tight">
              Focus on Art, We Manage Everything
            </p>
          </div>
        </Link>

        {/* Brand Support Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-xs border border-[#EBE7DF] text-xs font-bold text-zinc-600 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ISO 27001 Certified • Bank-Grade Security</span>
        </div>
      </header>

      {/* ── MAIN DUAL PORTAL CONTAINER ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6 flex-1 flex flex-col justify-center">
        
        {/* ── 3D LIQUID GLASS ROLE SELECTOR CARDS (SIDE-BY-SIDE) ── */}
        <div className="max-w-4xl mx-auto w-full mb-6 sm:mb-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-1.5 sm:p-2 bg-zinc-200/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-inner">
            
            {/* Card 1: Studio Owner */}
            <button
              type="button"
              onClick={() => { setPortal('studio'); setError(null); }}
              className={`relative p-3.5 sm:p-5 rounded-2xl transition-all duration-300 text-left cursor-pointer flex items-center gap-3 sm:gap-4 overflow-hidden ${
                portal === 'studio'
                  ? 'bg-gradient-to-br from-white via-white to-amber-50/80 border-2 border-amber-500/80 shadow-lg shadow-amber-900/10'
                  : 'bg-white/40 hover:bg-white/70 border border-transparent'
              }`}
            >
              {portal === 'studio' && (
                <motion.div
                  layoutId="activePortalGlow"
                  className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-400/5 pointer-events-none"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
                portal === 'studio'
                  ? 'bg-gradient-to-tr from-[#d97706] to-[#b45309] text-white scale-105'
                  : 'bg-zinc-100 text-zinc-500'
              }`}>
                <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className={`text-xs sm:text-base font-black font-serif tracking-tight truncate ${
                    portal === 'studio' ? 'text-zinc-900' : 'text-zinc-600'
                  }`}>
                    Studio Owner
                  </h4>
                  {portal === 'studio' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-medium truncate mt-0.5">
                  CRM, Leads, Quotations & Finance
                </p>
              </div>
            </button>

            {/* Card 2: Team & Freelancer */}
            <button
              type="button"
              onClick={() => { setPortal('team'); setError(null); }}
              className={`relative p-3.5 sm:p-5 rounded-2xl transition-all duration-300 text-left cursor-pointer flex items-center gap-3 sm:gap-4 overflow-hidden ${
                portal === 'team'
                  ? 'bg-gradient-to-br from-white via-white to-indigo-50/80 border-2 border-indigo-500/80 shadow-lg shadow-indigo-900/10'
                  : 'bg-white/40 hover:bg-white/70 border border-transparent'
              }`}
            >
              {portal === 'team' && (
                <motion.div
                  layoutId="activePortalGlow"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-indigo-400/5 pointer-events-none"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${
                portal === 'team'
                  ? 'bg-gradient-to-tr from-[#4f46e5] to-[#4338ca] text-white scale-105'
                  : 'bg-zinc-100 text-zinc-500'
              }`}>
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className={`text-xs sm:text-base font-black font-serif tracking-tight truncate ${
                    portal === 'team' ? 'text-zinc-900' : 'text-zinc-600'
                  }`}>
                    Team & Freelancer
                  </h4>
                  {portal === 'team' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Assigned Shoots, Dates & Payouts
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* ── 2-COLUMN DISPLAY: 3D VISUALS (LEFT) & AUTH CARD (RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto w-full">
          
          {/* Left Column: Rich 3D Visual Cards */}
          <div className="lg:col-span-6 hidden lg:flex flex-col justify-center space-y-4 pr-2">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#EBE7DF] text-xs font-bold text-zinc-700 shadow-2xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{portal === 'studio' ? 'Studio Operating System' : 'Multi-Studio Freelance Network'}</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-serif font-black text-zinc-900 tracking-tight leading-tight">
              {portal === 'studio' ? (
                <>Run your entire photography business in one place.</>
              ) : (
                <>Never miss a call time, venue location or payout.</>
              )}
            </h2>

            {/* 3D Visual Cards for Studio Owner */}
            {portal === 'studio' ? (
              <div className="space-y-3 pt-2">
                {/* 3D Widget 1: Live Lead Pipeline */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-amber-950/5 hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">LIVE CRM PIPELINE</span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ₹4,85,000 Booked
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#bf7304]" />
                      <span>8 New Wedding Leads (94% Conversion)</span>
                    </span>
                    <span className="text-[11px] text-zinc-400">Auto WhatsApp Active</span>
                  </div>
                </div>

                {/* 3D Widget 2: Interactive Quotation Proposal */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-amber-950/5 hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-zinc-900 font-serif">Rohit & Ananya Wedding</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-[#92400e]">
                      PROPOSAL ACCEPTED
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">
                    3-Day Premium Cinematography & Traditional Coverage • ₹2,50,000
                  </p>
                </div>

                {/* 3D Widget 3: Crew Scheduling */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-amber-950/5 hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#b45309] flex items-center justify-center font-bold text-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800">Sangeet & Reception</p>
                        <p className="text-[10px] text-zinc-400">4 Crew Members Assigned • Live WhatsApp Alerts</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">✓ Ready</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 3D Visual Cards for Team / Freelancer */
              <div className="space-y-3 pt-2">
                {/* 3D Widget 1: Assigned Shoot & Call Time */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-indigo-950/5 hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">Filmify Weddings</span>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                      LEAD CINEMATOGRAPHER
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-zinc-900 font-serif">Kunal & Riya Wedding</h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-600 mt-2">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Call: 08:30 AM
                    </span>
                    <span className="flex items-center gap-1 truncate font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Taj Lands End, Mumbai
                    </span>
                  </div>
                </div>

                {/* 3D Widget 2: Live Payout Ledger */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-indigo-950/5 hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">LIVE PAYOUT TRACKER</span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ₹15,000 Advance Received
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-800">Total Agreed Fee: ₹25,000</span>
                    <span className="text-[#b45309]">Balance ₹10,000 on wrap</span>
                  </div>
                </div>

                {/* 3D Widget 3: Multi-Studio Switcher */}
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE7DF] shadow-md shadow-indigo-950/5 hover:border-indigo-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800">Connected to 3 Studios</p>
                        <p className="text-[10px] text-zinc-400">Switch studios from your top dropdown anytime</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">✓ Connected</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Interactive Card Form */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/5 relative overflow-hidden">
              
              {/* Card Header */}
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-zinc-900 tracking-tight flex items-center gap-1.5">
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
                    <span>This email is already registered on StudioCore!</span>
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
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-zinc-500 border-t border-[#EBE7DF]">
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
