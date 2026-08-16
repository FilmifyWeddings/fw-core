'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Camera, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

export type CharacterState = 'idle' | 'focus-email' | 'focus-password' | 'submitting' | 'success' | 'error';

interface CharacterStageProps {
  charState: CharacterState;
  className?: string;
  isMobileCompact?: boolean;
}

export default function CharacterStage({
  charState,
  className = '',
  isMobileCompact = false,
}: CharacterStageProps) {
  // Fire canvas confetti when character state reaches 'success'
  useEffect(() => {
    if (charState === 'success') {
      try {
        const count = 200;
        const defaults = {
          origin: { y: 0.65 },
          zIndex: 9999,
        };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
          colors: ['#f97316', '#fb923c', '#fdba74', '#ffffff', '#22c55e'],
        });
        fire(0.2, {
          spread: 60,
          colors: ['#f97316', '#ea580c', '#38bdf8', '#a855f7'],
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      } catch (e) {
        console.error('Confetti trigger error:', e);
      }
    }
  }, [charState]);

  // If compact mobile hero is requested
  if (isMobileCompact) {
    return (
      <div className={`relative w-full overflow-hidden flex flex-col items-center justify-center pt-2 pb-1 ${className}`}>
        {/* Soft Ambient Studio Lighting Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-orange-400/20 to-transparent blur-3xl pointer-events-none" />

        {/* Mobile Character Hero Banner */}
        <div className="relative w-full max-w-[280px] h-[150px] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative w-full h-full"
          >
            <Image
              src="/images/auth/workspace-photographer.png"
              alt="3D Studio Photographer at Work"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </motion.div>

          {/* Interactive Dynamic Speech Tooltip */}
          <AnimatePresence mode="wait">
            {charState === 'focus-email' && (
              <motion.div
                key="mob-email"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -top-1 right-2 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-orange-200 flex items-center gap-1 text-[10px] font-bold text-orange-600 z-10"
              >
                <span>👋 Welcome!</span>
              </motion.div>
            )}

            {charState === 'focus-password' && (
              <motion.div
                key="mob-pass"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -top-1 right-2 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-zinc-200 flex items-center gap-1 text-[10px] font-bold text-zinc-700 z-10"
              >
                <span>🔒 No peeking!</span>
              </motion.div>
            )}

            {charState === 'success' && (
              <motion.div
                key="mob-success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-2 bg-emerald-500 text-white px-3 py-1 rounded-full shadow-xl flex items-center gap-1.5 text-xs font-black tracking-wide z-10"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> <span>Logged In!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Full Desktop 3D Interactive Stage
  return (
    <div className={`relative w-full h-full min-h-[580px] flex items-center justify-center p-6 select-none overflow-hidden ${className}`}>
      {/* Background Soft Studio Atmosphere */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-50/40 via-[#FAFAFC] to-orange-50/30 rounded-3xl" />

      {/* Desk Lamp Ambient Warm Light Cone */}
      <motion.div
        animate={{
          opacity: charState === 'error' ? [0.3, 0.7, 0.4, 0.8] : [0.75, 0.85, 0.75],
          scale: charState === 'submitting' ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-12 right-16 w-80 h-80 bg-gradient-to-b from-amber-300/30 via-orange-300/15 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Main 3D Studio Workspace Composition */}
      <div className="relative w-full max-w-[560px] aspect-[4/3.5] flex items-center justify-center">
        
        {/* Full 3D Desk & Props Render (Base Stage) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative w-full h-full"
        >
          <Image
            src="/images/auth/workspace-photographer.png"
            alt="3D Studio Photographer Workspace"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>

        {/* Dynamic Head Turn Overlays for 3D Interaction */}
        <div className="absolute right-[22%] top-[25%] w-[130px] h-[130px] pointer-events-none">
          <AnimatePresence mode="wait">
            {/* 1. Email Focus: Character Turns Head Left Towards Form */}
            {charState === 'focus-email' && (
              <motion.div
                key="head-left"
                initial={{ opacity: 0, rotateY: -25, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-[115px] h-[95px] rounded-full overflow-hidden shadow-sm">
                  <Image
                    src="/images/auth/head-look-left.jpg"
                    alt="Looking at Email Input"
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            )}

            {/* 2. Password Focus: Character Turns Away to Screen (Back of Head) */}
            {charState === 'focus-password' && (
              <motion.div
                key="head-center"
                initial={{ opacity: 0, rotateY: 25, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-[115px] h-[95px] rounded-full overflow-hidden shadow-sm">
                  <Image
                    src="/images/auth/head-look-center.jpg"
                    alt="Looking at Center Screen"
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            )}

            {/* 3. Submitting State: Focusing / Typing fast */}
            {charState === 'submitting' && (
              <motion.div
                key="head-down"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: [0, -3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-[115px] h-[95px] rounded-full overflow-hidden shadow-sm">
                  <Image
                    src="/images/auth/head-look-down.jpg"
                    alt="Working enthusiastically"
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Contextual Badges / Tooltips */}
        <AnimatePresence>
          {charState === 'focus-email' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="absolute top-8 left-12 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-xl border border-orange-100 flex items-center gap-2 z-20"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-extrabold text-zinc-800">
                Type your email or phone!
              </span>
            </motion.div>
          )}

          {charState === 'focus-password' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="absolute top-8 right-16 bg-zinc-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl border border-zinc-700 flex items-center gap-2 z-20 text-white"
            >
              <span className="text-sm">🔒</span>
              <span className="text-xs font-bold text-zinc-200">
                Minding my screen — no peeking!
              </span>
            </motion.div>
          )}

          {charState === 'submitting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 font-black text-xs tracking-wider uppercase z-20"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Authenticating Studio...</span>
            </motion.div>
          )}

          {charState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: [1, 1.08, 1], y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 font-black text-xs tracking-wide uppercase z-20 border border-white/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Welcome Back! Launching Studio...</span>
            </motion.div>
          )}

          {charState === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-8 left-12 bg-red-50 text-red-700 border border-red-200 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs z-20"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Oops! Please check your credentials.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient Subtle Keyboard Typing Glow when submitting */}
        {charState === 'submitting' && (
          <motion.div
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="absolute bottom-28 right-36 w-24 h-10 bg-orange-400/30 blur-xl rounded-full pointer-events-none"
          />
        )}
      </div>

      {/* Floating Studio Props Highlights at Corners */}
      <div className="absolute bottom-4 right-8 flex items-center gap-2 text-[11px] font-bold text-zinc-400 italic">
        <Camera className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />
        <span>Studio Pro 3D Workspace</span>
      </div>
    </div>
  );
}
