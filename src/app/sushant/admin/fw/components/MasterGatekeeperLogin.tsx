'use client';

import React, { useState } from 'react';
import { Shield, Lock, KeyRound, Eye, EyeOff, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface MasterGatekeeperLoginProps {
  onSuccess: (email: string) => void;
}

export default function MasterGatekeeperLogin({ onSuccess }: MasterGatekeeperLoginProps) {
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSec, setLockoutSec] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMsg('Master passphrase or PIN is required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await fetch('/api/sushant/admin/fw/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passphrase: passphrase.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.locked && data.remainingSec) {
          setLockoutSec(data.remainingSec);
        }
        throw new Error(data.error || 'Authentication challenge failed.');
      }

      onSuccess(data.email || email);
    } catch (err: any) {
      setErrorMsg(err.message || 'Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle luxury ambient glows */}
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
              <span>Zero-Trust Gatekeeper</span>
            </div>
            <h1 className="text-2xl font-black text-[#1E2229] tracking-tight">
              StudioCore Super Admin
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Restricted platform vault. Authorized executive credentials required.
            </p>
          </div>
        </div>

        {/* Error / Lockout Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 animate-shake">
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

        {/* Challenge Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Master Executive Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sushantnawale700@gmail.com"
              className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Master Passphrase or 6-Digit PIN
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter master passphrase or PIN..."
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || (lockoutSec !== null && lockoutSec > 0)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black tracking-wide shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Cryptographic Credentials...</span>
              </span>
            ) : (
              <>
                <span>Access Super Admin Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Protected with Rate-Limiting, IP Auditing & Signed Session Cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
