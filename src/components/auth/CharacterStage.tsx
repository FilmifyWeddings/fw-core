'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 3D Mouse Parallax Tracking on Desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isMobileCompact) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Trigger elegant, realistic falling confetti on 'success'
  useEffect(() => {
    if (charState === 'success') {
      try {
        const count = 180;
        const defaults = {
          origin: { y: 0.6 },
          zIndex: 9999,
          disableForReducedMotion: true,
        };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        // Elegant studio brand colors: warm orange, gold, amber, crisp white, emerald
        fire(0.25, {
          spread: 30,
          startVelocity: 50,
          ticks: 250,
          gravity: 0.85,
          scalar: 0.9,
          colors: ['#f97316', '#fb923c', '#fdba74', '#ffffff'],
        });
        fire(0.2, {
          spread: 65,
          ticks: 300,
          gravity: 0.9,
          scalar: 1.1,
          colors: ['#ea580c', '#f59e0b', '#fbbf24', '#38bdf8'],
        });
        fire(0.35, {
          spread: 100,
          decay: 0.92,
          gravity: 0.75,
          scalar: 0.8,
          colors: ['#f97316', '#ffffff', '#10b981', '#fbbf24'],
        });
        fire(0.1, {
          spread: 130,
          startVelocity: 30,
          decay: 0.92,
          gravity: 0.8,
          scalar: 1.2,
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
          gravity: 0.85,
        });
      } catch (e) {
        console.error('Confetti trigger error:', e);
      }
    }
  }, [charState]);

  // ── MOBILE COMPACT STAGE ──
  if (isMobileCompact) {
    return (
      <div className={`relative w-full overflow-hidden flex flex-col items-center justify-center pt-2 pb-1 ${className}`}>
        {/* Soft Ambient Studio Lighting Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-orange-400/20 to-transparent blur-3xl pointer-events-none" />

        {/* Mobile Character Hero Banner */}
        <div className="relative w-full max-w-[300px] h-[165px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {charState === 'success' ? (
              <motion.div
                key="mob-celebrate"
                initial={{ scale: 0.85, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="relative w-full h-full"
              >
                <Image
                  src="/images/auth/workspace-celebrate.png"
                  alt="3D Studio Photographer Celebrating Victory"
                  fill
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </motion.div>
            ) : (
              <motion.div
                key="mob-idle"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: charState === 'submitting' ? [-2, 2, -2] : [0, -1.5, 0],
                }}
                transition={{
                  duration: charState === 'submitting' ? 0.35 : 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
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
            )}
          </AnimatePresence>

          {/* Interactive Dynamic Speech Tooltip */}
          <AnimatePresence mode="wait">
            {charState === 'focus-email' && (
              <motion.div
                key="mob-email"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -top-1 right-2 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-orange-200 flex items-center gap-1.5 text-[10px] font-bold text-orange-600 z-10"
              >
                <span>👋 Welcome back!</span>
              </motion.div>
            )}

            {charState === 'focus-password' && (
              <motion.div
                key="mob-pass"
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -top-1 right-2 bg-zinc-900/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-zinc-700 flex items-center gap-1.5 text-[10px] font-bold text-zinc-100 z-10"
              >
                <span>🔒 No peeking!</span>
              </motion.div>
            )}

            {charState === 'success' && (
              <motion.div
                key="mob-success"
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 text-xs font-black tracking-wide z-10 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> <span>Login Successful! 🎉</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── DESKTOP 3D INTERACTIVE STAGE ──
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full min-h-[620px] flex items-center justify-center p-6 sm:p-10 select-none overflow-hidden perspective-[1200px] ${className}`}
    >
      {/* Background Studio Wall & Lighting */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-50/50 via-[#FAFAFC] to-orange-50/40 rounded-3xl" />

      {/* Desk Lamp Directional Warm Ambient Light Cone */}
      <motion.div
        animate={{
          opacity: charState === 'error' ? [0.3, 0.7, 0.4, 0.8] : [0.75, 0.9, 0.75],
          scale: charState === 'submitting' ? [1, 1.08, 1] : 1,
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-10 right-12 w-96 h-96 bg-gradient-to-b from-amber-300/35 via-orange-300/15 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* Main 3D Studio Workspace Interactive Composition */}
      <motion.div
        animate={{
          rotateY: mousePos.x * 6, // Subtle responsive 3D parallax tracking cursor
          rotateX: -mousePos.y * 6,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        className="relative w-full max-w-[580px] aspect-[4/3.5] flex items-center justify-center transform-gpu"
      >
        
        {/* Full 3D Desk & Props Stage (Switches to celebration render on success) */}
        <AnimatePresence mode="wait">
          {charState === 'success' ? (
            <motion.div
              key="stage-celebrate"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 18, stiffness: 250 }}
              className="relative w-full h-full"
            >
              <Image
                src="/images/auth/workspace-celebrate.png"
                alt="3D Studio Photographer Celebration"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          ) : (
            <motion.div
              key="stage-base"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                // Natural continuous breathing motion
                y: charState === 'submitting' ? [-3, 3, -3] : [0, -3, 0],
              }}
              transition={{
                duration: charState === 'submitting' ? 0.35 : 3.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
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
          )}
        </AnimatePresence>

        {/* Dynamic Head Turn Overlays for Realistic 3D Reactivity (When not in success state) */}
        {charState !== 'success' && (
          <div className="absolute right-[22%] top-[25%] w-[130px] h-[130px] pointer-events-none">
            <AnimatePresence mode="wait">
              {/* 1. Email Focus: Character Turns Head Left Towards Form & Looks at User */}
              {charState === 'focus-email' && (
                <motion.div
                  key="head-left"
                  initial={{ opacity: 0, rotateY: -30, scale: 0.92 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
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

              {/* 2. Password Focus: Character Turns Away to Monitor (Privacy Mode) */}
              {charState === 'focus-password' && (
                <motion.div
                  key="head-center"
                  initial={{ opacity: 0, rotateY: 30, scale: 0.92 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
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

              {/* 3. Submitting State: Focusing & Typing Fast on Keyboard */}
              {charState === 'submitting' && (
                <motion.div
                  key="head-down"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: [0, -3, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, repeat: Infinity }}
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
        )}

        {/* Dynamic Contextual Floating Tooltips & Badges */}
        <AnimatePresence>
          {charState === 'focus-email' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.85 }}
              className="absolute top-8 left-8 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-orange-100 flex items-center gap-2.5 z-20"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-extrabold text-zinc-800">
                Enter your email or phone!
              </span>
            </motion.div>
          )}

          {charState === 'focus-password' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.85 }}
              className="absolute top-8 right-12 bg-zinc-900/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-zinc-700 flex items-center gap-2.5 z-20 text-white"
            >
              <span className="text-sm">🔒</span>
              <span className="text-xs font-bold text-zinc-100">
                Minding my screen — no peeking!
              </span>
            </motion.div>
          )}

          {charState === 'submitting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-5 py-2 rounded-full shadow-2xl flex items-center gap-2.5 font-black text-xs tracking-wider uppercase z-20"
            >
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </motion.div>
          )}

          {/* Celebration Success Banner */}
          {charState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 25 }}
              animate={{ opacity: 1, scale: [1, 1.05, 1], y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 font-black text-sm tracking-wide uppercase z-30 border border-white/30 whitespace-nowrap"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Welcome Back! Launching Dashboard... 🎉</span>
            </motion.div>
          )}

          {charState === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: [0, -8, 8, -6, 6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-8 left-8 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs z-20"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Invalid credentials. Please try again.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient Subtle Keyboard Typing Glow when submitting */}
        {charState === 'submitting' && (
          <motion.div
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="absolute bottom-28 right-36 w-28 h-12 bg-orange-400/40 blur-xl rounded-full pointer-events-none"
          />
        )}
      </motion.div>

      {/* Floating Studio Props Highlights at Bottom */}
      <div className="absolute bottom-4 right-8 flex items-center gap-2 text-[11px] font-bold text-zinc-400 italic">
        <Camera className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />
        <span>Studio Pro 3D Workspace</span>
      </div>
    </div>
  );
}
