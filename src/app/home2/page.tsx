'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Lightbulb,
  PartyPopper,
  Calendar,
  Layers,
  ChevronDown,
  Clock,
  FileText,
  UserCheck,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Users,
  MessageCircle,
  Camera,
  Play,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Send,
  Building2
} from 'lucide-react';

// ─── Interactive Eye Tracker Component ─────────────────────────────────────────
function InteractiveEyes() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - eyeCenterX;
      const deltaY = e.clientY - eyeCenterY;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(6, Math.hypot(deltaX, deltaY) / 30);
      
      setMousePos({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={eyeRef}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 flex items-center justify-center gap-2 p-2 hover:scale-105 transition-transform cursor-pointer"
    >
      {/* Left Eye */}
      <div className="w-5 h-7 sm:w-6 sm:h-8 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center relative overflow-hidden">
        <motion.div
          className="w-2.5 h-3 sm:w-3 sm:h-3.5 rounded-full bg-slate-900 absolute"
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Pupil Glint */}
          <div className="w-1 h-1 rounded-full bg-white absolute top-0.5 right-0.5" />
        </motion.div>
      </div>

      {/* Right Eye */}
      <div className="w-5 h-7 sm:w-6 sm:h-8 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center relative overflow-hidden">
        <motion.div
          className="w-2.5 h-3 sm:w-3 sm:h-3.5 rounded-full bg-slate-900 absolute"
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Pupil Glint */}
          <div className="w-1 h-1 rounded-full bg-white absolute top-0.5 right-0.5" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Main Landing Page (home2) Component ──────────────────────────────────────
export default function Home2LandingPage() {
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Chart data
  const monthlyData = [
    { label: 'Mon', height1: 45, height2: 80, height3: 35, val: 142 },
    { label: 'Tue', height1: 70, height2: 95, height3: 50, val: 188 },
    { label: 'Wed', height1: 30, height2: 60, height3: 85, val: 110 },
    { label: 'Thu', height1: 90, height2: 45, height3: 65, val: 204 },
    { label: 'Fri', height1: 65, height2: 75, height3: 40, val: 165 },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans selection:bg-[#0866FF]/20 selection:text-[#0866FF] overflow-x-hidden antialiased">

      {/* ── TOP FLOATING PILL NAVBAR ────────────────────────────────────────── */}
      <header className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <motion.nav
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-200/80 shadow-lg shadow-slate-200/40 flex items-center justify-between gap-4 sm:gap-8 max-w-4xl w-full"
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-950 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-md shadow-slate-950/20 group-hover:scale-105 transition-transform">
              SC
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
              Studio<span className="text-[#0866FF]">Core</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#hero" className="hover:text-slate-900 transition-colors">Product</a>
            <a href="#built-for-everyone" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="/features" className="hover:text-slate-900 transition-colors">Resources</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              Sign in
            </Link>
            <Link
              href="/book-demo"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md shadow-slate-950/20 transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Request a Demo
            </Link>
          </div>
        </motion.nav>
      </header>

      <main className="pt-28 sm:pt-36 pb-20 space-y-24 sm:space-y-36">

        {/* ══════════════════════════════════════════════════════════════════════
            PAGE / SECTION 1: HERO WITH CENTRAL ANIMATED NODE GRAPH
        ══════════════════════════════════════════════════════════════════════ */}
        <section id="hero" className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          
          {/* Interactive Node Graph Canvas */}
          <div className="relative w-full max-w-4xl mx-auto h-[340px] sm:h-[400px] flex items-center justify-center select-none">
            
            {/* SVG Connecting Circuit Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-300/80 dark:stroke-slate-700/80"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 800 400"
              fill="none"
            >
              {/* Left Branch Upper: Center -> Yellow Bulb */}
              <motion.path
                d="M 360 200 L 290 150 L 190 120"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
              {/* Left Branch Middle: Center -> Avatar */}
              <motion.path
                d="M 360 200 L 240 200 L 110 200"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.1, ease: 'easeInOut' }}
              />
              {/* Left Branch Lower: Center -> Cyan Balloon */}
              <motion.path
                d="M 360 200 L 290 250 L 205 280"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
              />

              {/* Right Branch Upper: Center -> Red Shield */}
              <motion.path
                d="M 440 200 L 510 150 L 610 120"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
              {/* Right Branch Middle: Center -> Eyes */}
              <motion.path
                d="M 440 200 L 560 200 L 690 200"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.1, ease: 'easeInOut' }}
              />
              {/* Right Branch Lower: Center -> Bride Avatar */}
              <motion.path
                d="M 440 200 L 510 250 L 615 280"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
              />

              {/* Purple Circuit Joint Pulse Dots */}
              <circle cx="290" cy="150" r="3.5" fill="#8B5CF6" className="animate-pulse" />
              <circle cx="290" cy="250" r="3.5" fill="#8B5CF6" className="animate-pulse" />
              <circle cx="510" cy="150" r="3.5" fill="#8B5CF6" className="animate-pulse" />
              <circle cx="510" cy="250" r="3.5" fill="#8B5CF6" className="animate-pulse" />
            </svg>

            {/* ─── NODE 1: CENTER SQUIRCLE WITH CHECKMARK (HERO HUB) ───────── */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
              whileHover={{ scale: 1.08 }}
              className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white flex items-center justify-center shadow-2xl shadow-[#8B5CF6]/50 border-4 border-white cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40">
                <Check className="w-7 h-7 stroke-[3.5] text-white drop-shadow-sm group-hover:rotate-12 transition-transform" />
              </div>

              {/* Subtle ambient glow ping */}
              <div className="absolute inset-0 rounded-[28px] bg-[#8B5CF6] -z-10 animate-ping opacity-20" />
            </motion.div>

            {/* ─── NODE 2: LEFT TOP — YELLOW BULB CARD (CREATIVE VISION) ────── */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute left-[14%] sm:left-[16%] top-[12%] sm:top-[16%] z-10"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-white flex items-center justify-center shadow-lg shadow-[#F59E0B]/30 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
              >
                <Lightbulb className="w-6 h-6 stroke-[2.5]" />
              </motion.div>
            </motion.div>

            {/* ─── NODE 3: LEFT MIDDLE — PHOTOGRAPHER AVATAR CARD ──────────── */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="absolute left-[2%] sm:left-[5%] top-[34%] sm:top-[38%] z-10"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border-2 border-white shadow-xl shadow-slate-200/80 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  alt="Photographer"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>

            {/* ─── NODE 4: LEFT BOTTOM — CYAN BALLOON CARD (EVENT SHOOTS) ───── */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute left-[16%] sm:left-[18%] bottom-[12%] sm:bottom-[16%] z-10"
            >
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] text-white flex items-center justify-center shadow-lg shadow-[#0EA5E9]/30 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
              >
                <PartyPopper className="w-6 h-6 stroke-[2.5]" />
              </motion.div>
            </motion.div>

            {/* ─── NODE 5: RIGHT TOP — RED SHIELD CARD (AUTOMATION & SECURITY) ─ */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute right-[16%] sm:right-[18%] top-[12%] sm:top-[16%] z-10"
            >
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#F87171] to-[#EF4444] text-white flex items-center justify-center shadow-lg shadow-[#EF4444]/30 border-2 border-white cursor-pointer hover:scale-110 transition-transform"
              >
                <Zap className="w-6 h-6 fill-current" />
              </motion.div>
            </motion.div>

            {/* ─── NODE 6: RIGHT MIDDLE — INTERACTIVE CARTOON EYES ─────────── */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="absolute right-[2%] sm:right-[5%] top-[34%] sm:top-[38%] z-10"
            >
              <InteractiveEyes />
            </motion.div>

            {/* ─── NODE 7: RIGHT BOTTOM — BRIDE & CLIENT AVATAR ────────────── */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute right-[16%] sm:right-[18%] bottom-[12%] sm:bottom-[16%] z-10"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-white shadow-lg shadow-slate-200/80 overflow-hidden cursor-pointer hover:scale-110 transition-transform"
              >
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
                  alt="Bride Lead"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>

          </div>

          {/* Main Hero Copy & Typography */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mt-6 sm:mt-10">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-950 leading-[1.1]"
            >
              All-in-one Studio &amp; CRM platform
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto font-normal leading-relaxed"
            >
              StudioCore is a modern, all-in-one CRM &amp; Production platform designed to perfectly scale your wedding &amp; creative studio.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="pt-4 flex justify-center"
            >
              <Link
                href="/free-trial"
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF5C4D] via-[#FF4B3A] to-[#F03D2E] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-[#FF4B3A]/35 hover:shadow-2xl hover:shadow-[#FF4B3A]/50 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Request a Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

        </section>


        {/* ══════════════════════════════════════════════════════════════════════
            PAGE / SECTION 2: "BUILT FOR EVERYONE" BENTO GRID
        ══════════════════════════════════════════════════════════════════════ */}
        <section id="built-for-everyone" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Built for everyone
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              Thousands of wedding studios, cinematographers, and production teams use StudioCore to handle leads, bookings, and operations.
            </p>
          </div>

          {/* 3 Main Bento Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* ── CARD 1: FOR PHOTOGRAPHERS & LEAD GEN ──────────────────────── */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Visual Demo: Animated Bar Chart */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <BarChart2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Inquiry Report</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                      +28%
                    </span>
                    <button
                      onClick={() => setChartPeriod(chartPeriod === 'monthly' ? 'weekly' : 'monthly')}
                      className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-0.5 hover:bg-slate-100"
                    >
                      <span>{chartPeriod === 'monthly' ? 'Monthly' : 'Weekly'}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Animated Bars */}
                <div className="h-28 flex items-end justify-between gap-2 pt-4 px-1">
                  {monthlyData.map((d, i) => (
                    <div
                      key={d.label}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group/bar"
                    >
                      {/* Tooltip on hover */}
                      <AnimatePresence>
                        {hoveredBar === i && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="text-[9px] font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
                          >
                            {d.val} Leads
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bar Container */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-20">
                        {/* Bar 1: Purple */}
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${d.height1}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                          className="w-2.5 rounded-t-md bg-[#8B5CF6] group-hover/bar:brightness-110 transition-all"
                        />
                        {/* Bar 2: Coral */}
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${d.height2}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.08 + 0.1 }}
                          className="w-2.5 rounded-t-md bg-[#FF5C4D] group-hover/bar:brightness-110 transition-all"
                        />
                        {/* Bar 3: Cyan */}
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${d.height3}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.08 + 0.2 }}
                          className="w-2.5 rounded-t-md bg-[#0EA5E9] group-hover/bar:brightness-110 transition-all"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  For Photographers &amp; Lead Gen
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Use a single cloud system for your Meta leads, automated WhatsApp follow-ups, and calendar booking pipelines.
                </p>
              </div>
            </motion.div>

            {/* ── CARD 2: FOR MANAGERS & LEADERS ───────────────────────────── */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Visual Demo: Concentric Pulse with Floating Elevation Card */}
              <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 mb-6 flex items-center justify-center relative min-h-[160px] overflow-hidden">
                {/* Concentric Circles */}
                <div className="absolute w-36 h-36 rounded-full border border-slate-200/60 -z-0" />
                <div className="absolute w-24 h-24 rounded-full border border-slate-200/90 -z-0" />
                <div className="absolute w-12 h-12 rounded-full border border-purple-200 -z-0" />

                {/* Floating Elevation Card */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-xl shadow-slate-200/80 flex items-center gap-3 relative z-10 max-w-[220px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900">Real-Time Insights</p>
                    <p className="text-[9px] text-slate-400 font-medium">Auto shoot sync active</p>
                  </div>
                </motion.div>
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  For Managers &amp; Studio Owners
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Get always up-to-date shoot schedules, track staff allocations, and monitor client deliverables effortlessly.
                </p>
              </div>
            </motion.div>

            {/* ── CARD 3: FOR FINANCE & QUOTATIONS ─────────────────────────── */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Visual Demo: 3D Purple Floating Document Card */}
              <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 mb-6 flex items-center justify-center relative min-h-[160px] overflow-hidden">
                {/* Background Receipt Paper */}
                <div className="w-32 h-20 rounded-xl bg-white border border-slate-200 shadow-sm rotate-6 absolute opacity-60" />

                {/* Floating 3D Purple Document Node */}
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white flex items-center justify-center shadow-xl shadow-[#7C3AED]/40 border-2 border-white relative z-10"
                >
                  <FileText className="w-7 h-7 stroke-[2.5]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] font-black">
                    ✓
                  </span>
                </motion.div>
              </div>

              {/* Text Info */}
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  For Finance &amp; Quotations
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  StudioCore helps studios streamline quotation approvals, manage contracts, and track retainer payments.
                </p>
              </div>
            </motion.div>

          </div>

          {/* Secondary 2-Column Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Automation Stepper Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FF5C4D]" />
                  Automated Workflow Pipeline
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⚡ 0.8s Execution
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { step: '1', title: 'Meta Lead Ingested', sub: 'Webhook verified via HMAC 256', color: 'bg-blue-500' },
                  { step: '2', title: 'WhatsApp Welcome Alert', sub: 'Baileys Socket Auto-Sent to Bride', color: 'bg-emerald-500' },
                  { step: '3', title: 'Google Contacts Synced', sub: 'Saved to Wedding 2026 Group', color: 'bg-purple-500' },
                ].map(item => (
                  <div key={item.step} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full ${item.color} text-white font-black text-[10px] flex items-center justify-center shrink-0`}>
                        {item.step}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-500">{item.sub}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Team Collaboration Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0EA5E9]" />
                  Multi-User Studio Workstation
                </span>
                <span className="text-[10px] font-bold text-slate-400">Isolated Tenants</span>
              </div>

              {/* Avatar Overlap Visual */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex -space-x-3 overflow-hidden">
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Team 1" />
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="Team 2" />
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Team 3" />
                  <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" alt="Team 4" />
                </div>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">4 Active Creators</p>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All Systems Live
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Empower your team with granular roles: Photographers, Editors, and Accounts can collaborate with strict data privacy.
              </p>
            </div>

          </div>

        </section>

      </main>

      {/* ── FOOTER SIMPLE ──────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 StudioCore. All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <Link href="/privacy-policy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-slate-900">Terms</Link>
            <Link href="/support" className="hover:text-slate-900">Support</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
