'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import {
  Camera,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Building2,
  User,
  Phone,
} from 'lucide-react';

export const StudioCoreBrandIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-sm border border-[#F5C78E]/40 shrink-0 select-none relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-80 pointer-events-none" />
    <span className="relative z-10 text-[13px] font-black tracking-tight drop-shadow-xs">SC</span>
  </div>
);

export default function TeamLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activation flow state for invited crew
  const [isInvited, setIsInvited] = useState(false);
  const [invitedName, setInvitedName] = useState('');
  const [invitedStudios, setInvitedStudios] = useState<string[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [activationFullName, setActivationFullName] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);

  // Debounced email check for invite
  useEffect(() => {
    if (!email || !email.includes('@') || email.length < 5) {
      setIsInvited(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/team/check-invite?email=${encodeURIComponent(email.trim())}`);
        const data = await res.json();
        if (data.is_invited) {
          setIsInvited(true);
          setInvitedName(data.member_name || 'Crew Member');
          setInvitedStudios(data.studios || ['Studio Partner']);
          if (!activationFullName && data.member_name) {
            setActivationFullName(data.member_name);
          }
        } else {
          setIsInvited(false);
        }
      } catch (_) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [email, activationFullName]);

  // Handle Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInErr) {
        if (signInErr.message.includes('Invalid login credentials') || signInErr.message.includes('Email not confirmed') || isInvited) {
          // Instant dynamic invite check
          try {
            const checkRes = await fetch(`/api/team/check-invite?email=${encodeURIComponent(cleanEmail)}`);
            const checkJson = await checkRes.json();
            if (checkJson?.is_invited) {
              setIsInvited(true);
              setInvitedName(checkJson.member_name || 'Crew Member');
              setInvitedStudios(checkJson.studios || ['Studio Partner']);
              if (!activationFullName && checkJson.member_name) {
                setActivationFullName(checkJson.member_name);
              }
              setIsActivating(true);
              setError(`👋 Welcome ${checkJson.member_name || 'Partner'}! Aapka account abhi create/activate nahi hua hai. Apna password daalkar 1-click me activate karein.`);
              return;
            }
          } catch (_) {}
        }
        throw signInErr;
      }

      if (data?.user) {
        router.push('/team/dashboard');
      }
    } catch (err: any) {
      console.error('[Team Login] Error:', err);
      setError(err.message || 'Invalid email or password. Please check your credentials or click Activate Account.');
    } finally {
      setLoading(false);
    }
  };

  // Handle 1-Click Crew Account Activation
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/team/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          fullName: activationFullName || invitedName || 'Crew Member',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to activate account');
      }

      // Automatically sign in
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (loginErr) throw loginErr;

      setActivationSuccess(true);
      setTimeout(() => {
        router.push('/team/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-amber-100">
      
      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StudioCoreBrandIcon className="w-10 h-10 shadow-sm" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-1.5 font-serif">
              StudioCore <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-[#92400e] border border-amber-200 font-bold">Crew & Freelancer Portal</span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">For Photographers, Cinematographers & Team Specialists</p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-bold text-zinc-600 hover:text-zinc-900 px-3.5 py-1.5 rounded-xl border border-[#EBE7DF] bg-white hover:bg-zinc-50 transition-all shadow-2xs"
        >
          Studio Owner Login →
        </Link>
      </header>

      {/* Main Content Form */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-950/5">
          
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[#b45309] text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Assigned Shoots, Calendars & Payouts</span>
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-serif">
              {isActivating ? 'Activate Crew Account' : 'Crew Member Login'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {isActivating
                ? 'Set a secure password to activate your portal access'
                : 'Access your assigned wedding shoots and live payment ledger'}
            </p>

            {/* Mode Switcher Buttons */}
            <div className="flex p-0.5 bg-zinc-100 rounded-xl text-xs font-bold mt-4 max-w-xs mx-auto border border-[#EBE7DF]">
              <button
                type="button"
                onClick={() => { setIsActivating(false); setError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !isActivating ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsActivating(true); setError(null); }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActivating ? 'bg-white text-[#b45309] shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Activate / Register
              </button>
            </div>
          </div>

          {/* Invited Studio Notice */}
          {isInvited && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-2.5 text-xs text-[#92400e] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">🎉 Welcome, {invitedName}!</p>
                <p className="text-[11px] text-[#b45309] mt-0.5">
                  You are added by: <span className="font-bold">{invitedStudios.join(', ')}</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activationSuccess ? (
            <div className="p-6 text-center text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-base font-bold">Account Activated!</h3>
              <p className="text-xs text-emerald-600 mt-1">Redirecting to your crew dashboard...</p>
            </div>
          ) : isActivating ? (
            <form onSubmit={handleActivateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={activationFullName}
                    onChange={(e) => setActivationFullName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 border border-[#EBE7DF] text-zinc-600 text-sm cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Create Secure Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-900/10 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Activating Account...' : (
                  <>
                    <span>Activate & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsActivating(false)}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 font-semibold"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-[#EBE7DF] focus:border-[#b45309] focus:bg-white text-zinc-900 text-sm placeholder:text-zinc-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-900/10 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : (
                  <>
                    <span>Sign In to Crew Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Benefits Info */}
          <div className="mt-6 pt-5 border-t border-[#F0ECE4] grid grid-cols-2 gap-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Shoot Schedules</span>
            </div>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Live Payout Tracker</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-zinc-500">
        StudioCore Multi-Studio Crew Network • Safe & Isolated
      </footer>
    </div>
  );
}
