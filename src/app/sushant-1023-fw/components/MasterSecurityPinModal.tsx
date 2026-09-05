'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MasterSecurityPinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onLock: () => void;
}

const SESSION_STORAGE_KEY = 'sc_superadmin_god_session';
const PIN_LENGTH = 6;
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function checkIsSecurityUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const decoded = JSON.parse(atob(raw));
    if (decoded && decoded.expiresAt && Date.now() < decoded.expiresAt) {
      return true;
    }
  } catch (_) {}
  return false;
}

export function saveSecurityUnlocked() {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      unlocked: true,
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, btoa(JSON.stringify(payload)));
  } catch (_) {}
}

export function clearSecurityUnlocked() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (_) {}
}

export function getSessionRemainingSeconds(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return 0;
    const decoded = JSON.parse(atob(raw));
    if (decoded?.expiresAt) {
      const remaining = Math.max(0, Math.floor((decoded.expiresAt - Date.now()) / 1000));
      return remaining;
    }
  } catch (_) {}
  return 0;
}

export default function MasterSecurityPinModal({ isOpen, onSuccess, onLock }: MasterSecurityPinModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount / open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '102300';

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric digit
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMsg(null);

    // Auto advance
    if (index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Auto verify when 6th digit entered
      const fullPin = next.join('');
      if (fullPin.length === PIN_LENGTH) {
        verifyPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!paste) return;

    const next = Array(PIN_LENGTH).fill('');
    for (let i = 0; i < paste.length; i++) {
      next[i] = paste[i];
    }
    setDigits(next);
    setErrorMsg(null);

    if (paste.length === PIN_LENGTH) {
      verifyPin(paste);
    } else {
      inputRefs.current[paste.length]?.focus();
    }
  };

  const verifyPin = (enteredPin: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      if (enteredPin === targetPin) {
        saveSecurityUnlocked();
        setErrorMsg(null);
        setIsVerifying(false);
        onSuccess();
      } else {
        setIsVerifying(false);
        setErrorMsg('Invalid Master Passcode. Access Denied.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
        // Clear digits and focus first
        setDigits(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    }, 250);
  };

  const handleKeypadPress = (num: string) => {
    const emptyIdx = digits.findIndex((d) => d === '');
    if (emptyIdx !== -1) {
      handleDigitChange(emptyIdx, num);
    }
  };

  const handleKeypadBackspace = () => {
    let lastFilled = -1;
    for (let i = digits.length - 1; i >= 0; i--) {
      if (digits[i]) {
        lastFilled = i;
        break;
      }
    }
    if (lastFilled !== -1) {
      const next = [...digits];
      next[lastFilled] = '';
      setDigits(next);
      inputRefs.current[lastFilled]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl transition-all">
      <div
        className={`max-w-md w-full relative bg-[#09090b]/95 border ${
          errorMsg ? 'border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.3)]' : 'border-rose-500/20 shadow-[0_0_60px_rgba(244,63,94,0.12)]'
        } backdrop-blur-3xl p-8 rounded-3xl text-center space-y-6 transition-all ${
          isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" />
            Layer 2 Security Gate
          </span>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px] font-mono"
            title={showPin ? 'Mask PIN' : 'Reveal PIN'}
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPin ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {/* Lock Icon and Title */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/40">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-serif">
            GOD-MODE SECURITY GATEWAY
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Enter your 6-digit Master Security PIN to unlock full platform management & multi-tenant controls.
          </p>
        </div>

        {/* 6-Digit Boxes */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying}
                className={`w-11 h-13 md:w-12 md:h-14 text-center text-xl font-mono font-black rounded-xl bg-zinc-900/90 border transition-all focus:outline-none ${
                  digit
                    ? 'border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : errorMsg
                    ? 'border-rose-500/70 text-zinc-300'
                    : 'border-zinc-800 text-zinc-200 focus:border-rose-500/80 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                }`}
              />
            ))}
          </div>

          {/* Feedback error */}
          {errorMsg ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 font-mono">
              Auto-timeout in 30 minutes after verification
            </div>
          )}
        </div>

        {/* Numeric On-screen Touchpad */}
        <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeypadPress(n)}
              className="py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-mono font-bold text-sm transition-all active:scale-95"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDigits(Array(PIN_LENGTH).fill(''))}
            className="py-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-all"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-mono font-bold text-sm transition-all active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="py-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-all"
          >
            ⌫
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={digits.join('').length !== PIN_LENGTH || isVerifying}
          onClick={() => verifyPin(digits.join(''))}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-600 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>{isVerifying ? 'Verifying Passcode...' : 'Unlock SuperAdmin Console'}</span>
        </button>

        <div className="text-[10px] text-zinc-600 font-mono">
          SECURE PROTOCOL // ZERO-LEAK ACCESS GOVERNANCE
        </div>
      </div>
    </div>
  );
}
