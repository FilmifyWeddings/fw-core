'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, KeyRound, Mail, Eye, 
  EyeOff, AlertTriangle, ArrowRight, Sparkles 
} from 'lucide-react';

interface TripleLockGatekeeperClientProps {
  initialError?: string;
}

export default function TripleLockGatekeeperClient({ initialError }: TripleLockGatekeeperClientProps) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [secretCode, setSecretCode] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSec, setLockoutSec] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialError) {
      setErrorMsg(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    const cleanPin = pin.trim();
    const cleanSecret = secretCode.trim();

    if (!cleanEmail || !cleanPin || !cleanSecret) {
      setErrorMsg('All 3 authentication keys (Master Email, Master PIN, and Authorization Secret Code) are required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await fetch('/api/sushant/admin/fw/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail, 
          pin: cleanPin, 
          secretCode: cleanSecret 
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.locked && data.remainingSec) {
          setLockoutSec(data.remainingSec);
        }
        throw new Error(data.error || 'Triple-lock authentication failed.');
      }

      // Success: Save token into sessionStorage for multi-layer support
      if (typeof window !== 'undefined' && data.token) {
        try {
          sessionStorage.setItem('fw_admin_token', data.token);
        } catch (_) {}
      }

      // Hard reload directly to dashboard with authenticated cookie
      window.location.href = '/sushant/admin/fw';
    } catch (err: any) {
      setErrorMsg(err.message || 'Access denied.');
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans"
      suppressHydrationWarning
    >
      {/* Luxury ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-amber-200/40 via-orange-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-[#EAE5DA] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 relative z-10 space-y-6">
        
        {/* Branding & Shield Emblem */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-white">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-900 text-[10px] font-black tracking-wider uppercase mb-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Triple-Lock Zero-Trust Vault</span>
            </div>
            <h1 className="text-2xl font-black text-[#1E2229] tracking-tight">
              StudioCore Super Admin
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              High-security executive portal. 3-tier credentials required.
            </p>
          </div>
        </div>

        {/* Error / Lockout Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p>{errorMsg}</p>
              {lockoutSec && (
                <p className="text-[10px] text-rose-600 mt-0.5">
                  Security lockout: {Math.ceil(lockoutSec / 60)} minutes remaining.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Triple-Lock Challenge Form with Native HTML POST Fallback */}
        <form 
          action="/api/sushant/admin/fw/form-login" 
          method="POST" 
          onSubmit={handleSubmit} 
          className="space-y-4"
        >
          {/* Key 1: Master Executive Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Master Executive Email</span>
            </label>
            <div className="relative">
              <input
                type="email"
                name="superadmin_vault_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Master Executive Email..."
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
            </div>
          </div>

          {/* Key 2: Master Security PIN */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Master Security PIN</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                name="superadmin_vault_pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Master PIN..."
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle PIN visibility"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key 3: Authorization Secret Code */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Authorization Secret Code</span>
            </label>
            <div className="relative">
              <input
                type={showSecretCode ? 'text' : 'password'}
                name="superadmin_vault_code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Enter Authorization Secret Code..."
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretCode(!showSecretCode)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle Secret Code visibility"
              >
                {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (lockoutSec !== null && lockoutSec > 0)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black tracking-wide shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Triple-Lock Security...</span>
              </span>
            ) : (
              <>
                <span>Unlock Super Admin Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>3-Tier Authorization · IP Monitored</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/60 text-[10px]">
            v2.0 Triple-Lock
          </span>
        </div>
      </div>
    </div>
  );
}
