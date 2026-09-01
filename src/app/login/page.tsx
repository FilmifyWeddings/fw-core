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
  Camera,
  Briefcase,
  Sparkles,
  Calendar,
  Layers,
  Crown,
} from 'lucide-react';
import OtpModal from '@/components/auth/OtpModal';
import { pruneClientCookies } from '@/lib/cookie-cleaner';

// Comprehensive Country Code Data
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
];

export const StudioCoreBrandIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-sm border border-[#F5C78E]/40 shrink-0 select-none relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-80 pointer-events-none" />
    <span className="relative z-10 text-[13px] font-black tracking-tight drop-shadow-xs">SC</span>
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

  // Query parameter support (e.g. ?portal=team)
  useEffect(() => {
    const portalParam = searchParams.get('portal');
    if (portalParam === 'team' || portalParam === 'freelancer' || portalParam === 'crew') {
      setPortal('team');
    }
  }, [searchParams]);

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
        // If team portal and account not activated yet, offer 1-click activation
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
        // Target destination based on portal
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
    setLoading(true);
    setError(null);

    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhone = signupPhone.trim();

    try {
      // Trigger Supabase Signup with email OTP
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

  // 3. Handle Team Member / Freelancer Signup (Sends Email OTP & Auto-links to Studios)
  const handleTeamSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = teamEmail.trim().toLowerCase();
    const cleanPhone = teamPhone.trim();

    try {
      // Create user via Supabase signup
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: teamPassword,
        options: {
          data: {
            full_name: teamFullName.trim() || 'Crew Member',
            phone: cleanPhone ? `+91${cleanPhone}` : undefined,
            role: 'team_member',
          },
        },
      });

      if (signUpErr) {
        // If user already registered, link directly
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
      setOtpTargetPhone(cleanPhone ? `+91 ${cleanPhone}` : '');
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

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-amber-100">
      
      {/* ── TOP HEADER ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <StudioCoreBrandIcon className="w-9 h-9 sm:w-10 sm:h-10 shadow-sm group-hover:scale-105 transition-transform" />
          <div>
            <span className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight font-serif flex items-center gap-1">
              StudioCore <span className="text-[#bf7304] text-xs">✦</span>
            </span>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-bold tracking-tight">
              All-in-One Studio Operating System
            </p>
          </div>
        </Link>

        {/* Top Portal Switcher Pill */}
        <div className="flex p-1 bg-white border border-[#EBE7DF] rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => { setPortal('studio'); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              portal === 'studio'
                ? 'bg-gradient-to-r from-[#d97706] to-[#b45309] text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Studio Owner</span>
          </button>
          <button
            type="button"
            onClick={() => { setPortal('team'); setError(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              portal === 'team'
                ? 'bg-gradient-to-r from-[#4f46e5] to-[#4338ca] text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Team & Freelancer</span>
          </button>
        </div>
      </header>

      {/* ── MAIN AUTH CONTAINER ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto w-full">
          
          {/* Left Column: Role Value Proposition */}
          <div className="lg:col-span-6 hidden lg:flex flex-col justify-center pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-[#92400e] text-xs font-bold w-fit mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{portal === 'studio' ? 'For Photography & Cinema Studios' : 'For Freelancers & Crew Specialists'}</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-serif font-black text-zinc-900 tracking-tight leading-tight mb-4">
              {portal === 'studio' ? (
                <>Run your entire studio business effortlessly.</>
              ) : (
                <>Track assigned shoots, live schedules & instant payouts.</>
              )}
            </h2>

            <p className="text-sm text-zinc-600 font-medium mb-6 leading-relaxed">
              {portal === 'studio'
                ? 'Manage leads, send interactive wedding quotations, assign crew members, track album workflows, and automate WhatsApp updates.'
                : 'View wedding event details, call times, venue locations, assigned roles, and guaranteed fees across multiple studio partners.'}
            </p>

            {/* Feature List */}
            <div className="space-y-3">
              {portal === 'studio' ? [
                'Lead CRM & WhatsApp Automation',
                'Interactive Proposal & Quotation Builder',
                'Crew Scheduling & Event Calendar',
                'Client Photo Selection & Delivery',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-zinc-700">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              )) : [
                'Instant Event & Shoot Notifications',
                'Direct Call Times & Venue Location Navigation',
                'Transparent Agreed Fee & Payout Tracking',
                'Multi-Studio Freelancing from One Dashboard',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-zinc-700">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Card Form */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/5">
              
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
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        authMode === 'login' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setError(null); }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
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
                /* LOGIN FORM (Shared with Dynamic Routing) */
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email or Mobile Number</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
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
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Mobile Number (10 digits)</label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="tel"
                        value={signupPhone}
                        maxLength={10}
                        onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        required
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-[#b45309] focus:bg-white text-zinc-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Password</label>
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
                    disabled={loading}
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
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Your Name</label>
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
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-zinc-50 border border-[#EBE7DF] text-xs sm:text-sm focus:border-indigo-600 focus:bg-white text-zinc-900 outline-none"
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
                    disabled={loading}
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

              {/* Bottom Switch between Owner and Crew */}
              <div className="mt-5 pt-4 border-t border-[#F0ECE4] text-center">
                {portal === 'studio' ? (
                  <p className="text-xs text-zinc-500 font-medium">
                    Are you a hired Photographer or Crew?{' '}
                    <button
                      type="button"
                      onClick={() => { setPortal('team'); setError(null); }}
                      className="font-bold text-[#4f46e5] hover:underline cursor-pointer"
                    >
                      Open Crew Portal →
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 font-medium">
                    Do you run a photography studio?{' '}
                    <button
                      type="button"
                      onClick={() => { setPortal('studio'); setError(null); }}
                      className="font-bold text-[#bf7304] hover:underline cursor-pointer"
                    >
                      Studio Owner Login →
                    </button>
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── BOTTOM TRUST BAR ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-zinc-500 border-t border-[#EBE7DF]">
        StudioCore Multi-Studio Operating System • Hybrid Owner & Freelancer Architecture
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
