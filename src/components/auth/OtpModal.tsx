'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  name?: string;
  onVerify: (otp: string) => Promise<boolean | void>;
  onResendOtp: () => Promise<void>;
  loading?: boolean;
}

export default function OtpModal({
  isOpen,
  onClose,
  phone,
  name,
  onVerify,
  onResendOtp,
  loading = false,
}: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setTimer(60);
      setCanResend(false);
      setError(null);
      setIsSuccess(false);

      // Auto focus first digit
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (!isOpen || timer <= 0) {
      if (timer <= 0) setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle single character
    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Advance focus to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If all 6 filled, trigger verification
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        handleCompleteSubmit(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
        handleCompleteSubmit(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleCompleteSubmit = async (code: string) => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit OTP code');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const res = await onVerify(code);
      if (res !== false) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);
    try {
      await onResendOtp();
      setTimer(60);
      setCanResend(false);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Format phone number nicely (e.g. +91 98765 43210)
  const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: shake ? [0, -10, 10, -10, 10, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-100 overflow-hidden z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / WhatsApp Badge */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <MessageSquare className="w-7 h-7 fill-white/20 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-zinc-900">
                  Verify WhatsApp OTP
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-[300px]">
                  We sent a 6-digit verification code to your WhatsApp at{' '}
                  <span className="font-bold text-zinc-800">{formattedPhone}</span>
                </p>
              </div>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="my-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading || isSuccess}
                    className={`w-11 h-13 sm:w-13 sm:h-14 text-center text-xl font-black rounded-2xl border transition-all outline-none ${
                      digit
                        ? 'border-orange-500 bg-orange-50/40 text-orange-950 ring-2 ring-orange-500/20'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20'
                    }`}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-bold mt-3 text-center"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            {/* Verification Button */}
            <button
              type="button"
              disabled={loading || digits.join('').length !== 6 || isSuccess}
              onClick={() => handleCompleteSubmit(digits.join(''))}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activating Studio...</span>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified!</span>
                </div>
              ) : (
                <>
                  <span>Verify & Create Account</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Resend OTP Footer */}
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Didn&apos;t receive code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>Resend OTP</span>
                </button>
              ) : (
                <span className="font-semibold text-zinc-400">
                  Resend in <strong className="text-zinc-600 font-mono">{timer}s</strong>
                </span>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Direct WhatsApp End-to-End Delivery</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
