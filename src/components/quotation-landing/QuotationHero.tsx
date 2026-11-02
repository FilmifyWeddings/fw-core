'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, ArrowRight, Play, Sparkles } from 'lucide-react';

export function QuotationHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Mouse Parallax Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Different parallax depth layers
  const cardLeftX = useTransform(smoothMouseX, [-300, 300], [-15, 15]);
  const cardLeftY = useTransform(smoothMouseY, [-300, 300], [-10, 10]);

  const cardCenterX = useTransform(smoothMouseX, [-300, 300], [-8, 8]);
  const cardCenterY = useTransform(smoothMouseY, [-300, 300], [-14, 14]);

  const cardRightX = useTransform(smoothMouseX, [-300, 300], [-12, 12]);
  const cardRightY = useTransform(smoothMouseY, [-300, 300], [-8, 8]);

  const charX = useTransform(smoothMouseX, [-300, 300], [12, -12]);
  const charY = useTransform(smoothMouseY, [-300, 300], [8, -8]);

  const badgeX = useTransform(smoothMouseX, [-300, 300], [20, -20]);
  const badgeY = useTransform(smoothMouseY, [-300, 300], [15, -15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const checklistItems = [
    'Custom Wedding Packages',
    'Premium, Branded Designs',
    'Edit & Share Instantly',
    'Save in Your CRM'
  ];

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#FDF2D6]/60 via-[#FDF8EE]/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-gradient-to-bl from-[#FDE8BA]/40 via-[#FAF6ED]/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ================= LEFT COLUMN: COPY & CTA ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6 text-left z-10"
          >
            {/* Top AI Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#FDE68A] shadow-xs text-xs font-black tracking-widest text-[#92400E] uppercase"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97706] animate-pulse" />
              <span>AI QUOTATION STUDIO</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black leading-[1.08] text-[#29231F] font-serif tracking-tight">
              Create Premium <br />
              Wedding Quotations <br />
              in Just{' '}
              <span className="italic font-serif font-normal bg-gradient-to-r from-[#C58B27] via-[#D97706] to-[#B45309] bg-clip-text text-transparent drop-shadow-xs">
                1 Minute.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#5A524A] font-medium leading-relaxed max-w-xl">
              AI-powered, editable and beautifully designed quotations for photographers.
            </p>

            {/* Feature Checklist */}
            <div className="space-y-3 pt-2 pb-2">
              {checklistItems.map((item, index) => (
                <motion.div 
                  key={item}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3 text-sm font-bold text-[#29231F]"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/workspace/quotations/builder"
                className="group px-7 py-3.5 rounded-full bg-gradient-to-r from-[#D8B46A] via-[#C58B27] to-[#B47B1E] text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(197,139,39,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(197,139,39,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Create Quotation Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#EAE3D2] text-[#29231F] font-bold text-sm shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shadow-xs">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Watch 1 Min Demo</span>
              </button>
            </div>
          </motion.div>

          {/* ================= RIGHT COLUMN: 3D PHOTOGRAPHER & CARDS ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] select-none">
            
            {/* Floating Gold Sunburst Rays / Sparkles behind character */}
            <motion.div 
              style={{ x: cardCenterX, y: cardCenterY }}
              className="absolute -top-6 right-1/4 pointer-events-none opacity-80"
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            >
              <Image 
                src="/assets/quotation/gold_sparkles.png"
                alt="Gold sparkles"
                width={200}
                height={200}
                className="w-32 h-32 lg:w-44 lg:h-44 object-contain filter drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                priority
              />
            </motion.div>

            {/* THREE WEDDING QUOTATION CARDS (3D Layered Fan Layout) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              
              {/* Card 1: Left Dark Luxury Cinematic Quotation */}
              <motion.div
                style={{ x: cardLeftX, y: cardLeftY }}
                initial={{ opacity: 0, x: -60, rotate: -14 }}
                animate={{ opacity: 1, x: 0, rotate: -8 }}
                transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                className="absolute left-[2%] sm:left-[8%] top-[8%] sm:top-[6%] w-[180px] sm:w-[230px] lg:w-[260px] pointer-events-auto cursor-pointer"
                whileHover={{ scale: 1.05, rotate: -4, zIndex: 30 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
                  <Image
                    src="/assets/quotation/hero_luxury_quotation.png"
                    alt="Luxury Wedding Quotation"
                    width={520}
                    height={740}
                    className="w-full h-auto object-cover rounded-2xl"
                    priority
                  />
                </div>
              </motion.div>

              {/* Card 3: Right Minimal Blush-Pink Quotation */}
              <motion.div
                style={{ x: cardRightX, y: cardRightY }}
                initial={{ opacity: 0, x: 60, rotate: 14 }}
                animate={{ opacity: 1, x: 0, rotate: 9 }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className="absolute right-[2%] sm:right-[6%] top-[12%] sm:top-[10%] w-[170px] sm:w-[220px] lg:w-[250px] pointer-events-auto cursor-pointer"
                whileHover={{ scale: 1.05, rotate: 5, zIndex: 30 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
                  <Image
                    src="/assets/quotation/hero_minimal_quotation.png"
                    alt="Minimal Floral Wedding Quotation"
                    width={520}
                    height={740}
                    className="w-full h-auto object-cover rounded-2xl"
                    priority
                  />
                </div>
              </motion.div>

              {/* Card 2: Center Elevated Floral Arch Quotation (FILMIFY WEDDINGS) */}
              <motion.div
                style={{ x: cardCenterX, y: cardCenterY }}
                initial={{ opacity: 0, y: -40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                className="absolute right-[22%] sm:right-[26%] top-[2%] sm:top-[0%] w-[200px] sm:w-[260px] lg:w-[290px] z-10 pointer-events-auto cursor-pointer"
                whileHover={{ scale: 1.06, y: -8, zIndex: 35 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(217,119,6,0.3)] transition-all duration-300">
                  <Image
                    src="/assets/quotation/hero_floral_quotation.png"
                    alt="Filmify Weddings Floral Quotation"
                    width={520}
                    height={740}
                    className="w-full h-auto object-cover rounded-2xl"
                    priority
                  />
                </div>
              </motion.div>
            </div>

            {/* 3D PHOTOGRAPHER CHARACTER (Front Anchor) */}
            <motion.div
              style={{ x: charX, y: charY }}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 mt-12 sm:mt-16 lg:mt-20 w-[280px] sm:w-[380px] lg:w-[460px] pointer-events-auto"
            >
              <Image
                src="/assets/quotation/hero_photographer.png"
                alt="StudioCore AI Wedding Photographer"
                width={800}
                height={1000}
                className="w-full h-auto object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                priority
              />
            </motion.div>

            {/* FLOATING BADGE: Generated in 1 Minute! */}
            <motion.div
              style={{ x: badgeX, y: badgeY }}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, type: 'spring', stiffness: 200 }}
              className="absolute right-0 sm:right-[4%] bottom-[14%] sm:bottom-[18%] z-30 pointer-events-auto cursor-pointer"
              whileHover={{ scale: 1.08 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                className="filter drop-shadow-[0_15px_30px_rgba(217,119,6,0.25)]"
              >
                <Image
                  src="/assets/quotation/badge_generated_1_minute.png"
                  alt="Generated in 1 Minute"
                  width={340}
                  height={110}
                  className="w-[180px] sm:w-[220px] lg:w-[250px] h-auto object-contain"
                  priority
                />
              </motion.div>
            </motion.div>

          </div>

        </div>
      </div>

      {/* Demo Video Modal Popup */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-[#EAE3D2] shadow-2xl relative">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-black text-[#29231F] font-serif mb-2">
              StudioCore AI Quotation Studio Demo
            </h3>
            <p className="text-xs text-[#786E65] mb-4">
              Watch how professional studios generate ₹1L–₹5L wedding proposals in under 60 seconds.
            </p>
            <div className="w-full aspect-video rounded-2xl bg-[#1E1A17] flex items-center justify-center text-white text-center p-6 border border-[#EAE3D2]">
              <div className="space-y-3">
                <Play className="w-12 h-12 text-[#D97706] mx-auto animate-pulse" />
                <p className="text-sm font-semibold text-[#D4AF37]">
                  Instant 1-Minute Walkthrough Video
                </p>
                <p className="text-xs text-slate-400 max-w-md">
                  Click 'Create Quotation Now' to experience the live AI quotation generator directly inside your StudioCore workspace.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Link
                href="/workspace/quotations/builder"
                onClick={() => setIsDemoModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-[#C58B27] hover:bg-[#B47B1E] text-white text-xs font-bold"
              >
                Try Interactive Builder →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
