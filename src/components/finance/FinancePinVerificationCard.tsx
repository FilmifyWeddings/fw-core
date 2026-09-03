"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Key, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import type { FinanceSecuritySettings } from '@/types';

interface FinancePinVerificationCardProps {
  securitySettings: FinanceSecuritySettings | null;
  workspaceId: string;
  onSuccess: () => void;
}

export function FinancePinVerificationCard({
  securitySettings,
  workspaceId,
  onSuccess
}: FinancePinVerificationCardProps) {
  const [pinInput, setPinInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUnlockError('');
    setIsVerifying(true);

    try {
      const correctPin = securitySettings?.pin_hash || '123456';
      const correctPassword = securitySettings?.master_password_hash || '';

      if (!usePasswordMode) {
        if (!pinInput) {
          setUnlockError('Please enter your 6-digit PIN.');
          setIsVerifying(false);
          return;
        }

        if (pinInput === correctPin) {
          onSuccess();
          return;
        } else {
          setUnlockError('Incorrect PIN code. Please try again.');
          setIsVerifying(false);
          return;
        }
      } else {
        if (!passwordInput) {
          setUnlockError('Please enter your admin master password.');
          setIsVerifying(false);
          return;
        }

        if (passwordInput === correctPassword || passwordInput === correctPin) {
          onSuccess();
          return;
        } else {
          setUnlockError('Incorrect master password. Please try again.');
          setIsVerifying(false);
          return;
        }
      }
    } catch (err: any) {
      setUnlockError(err?.message || 'Verification failed. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 border border-amber-200/80 shadow-[0_20px_60px_-15px_rgba(217,119,6,0.15)] space-y-6 text-center relative overflow-hidden"
    >
      {/* Decorative Gold Glow Header */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500" />

      {/* Lock Icon */}
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto shadow-inner relative">
        <Lock className="w-8 h-8 stroke-[2.2]" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
          <ShieldCheck className="w-3 h-3" />
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Strict Security Gate</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Finance Vault Locked 🔐
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-1.5 max-w-xs mx-auto">
          {usePasswordMode
            ? 'Enter your Studio Admin Master Password to access financial records.'
            : 'Enter your 6-digit Master PIN to unlock revenue, client contracts, and invoices.'}
        </p>
      </div>

      {/* Error Alert */}
      {unlockError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2.5 text-left shadow-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{unlockError}</span>
        </motion.div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-4 text-left">
        {!usePasswordMode ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                Enter 6-Digit PIN
              </label>
              <span className="text-[10px] font-bold text-amber-600">Numbers Only</span>
            </div>
            <input
              type="password"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="• • • • • •"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
              className="w-full text-center tracking-[0.8em] text-2xl font-black px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all shadow-inner"
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                Admin Master Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter master password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all shadow-inner"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isVerifying}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Unlock className="w-4 h-4" />
          <span>Unlock Finance Suite</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </button>

        {/* Mode Switcher */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setUsePasswordMode(!usePasswordMode);
              setUnlockError('');
            }}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-4 cursor-pointer"
          >
            {usePasswordMode
              ? '← Switch to 6-Digit PIN'
              : 'Forgot PIN? Use Admin Master Password →'}
          </button>
        </div>
      </form>

      {/* Footer Security Note */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
        <Key className="w-3.5 h-3.5 text-amber-500" />
        <span>Manage or reset your PIN in Studio Settings → Security</span>
      </div>
    </motion.div>
  );
}
