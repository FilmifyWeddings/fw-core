'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Check, ArrowRight, Play, ChevronDown } from 'lucide-react';

export function QuotationHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Smooth mouse parallax for 3D depth
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const cardsX = useTransform(smoothMouseX, [-300, 300], [-10, 10]);
  const cardsY = useTransform(smoothMouseY, [-300, 300], [-8, 8]);

  const charX = useTransform(smoothMouseX, [-300, 300], [8, -8]);
  const charY = useTransform(smoothMouseY, [-300, 300], [6, -6]);

  const badgeX = useTransform(smoothMouseX, [-300, 300], [16, -16]);
  const badgeY = useTransform(smoothMouseY, [-300, 300], [12, -12]);

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
      className="relative pt-24 pb-8 lg:pt-32 lg:pb-12 overflow-hidden"
    >
      {/* Background Soft Organic Waves matching reference image */}
      <div className="absolute top-0 right-0 w-[650px] h-[650px] bg-gradient-to-bl from-[#FDEBC7]/40 via-[#FDF5E6]/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-[#FDF0D5]/50 via-[#FAF5EA]/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* ================= LEFT COLUMN: HERO COPY & ACTIONS ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6 text-left z-10"
          >
            {/* AI Quotation Studio Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-block"
            >
              <Image 
                src="/assets/quotation/gold_ai_badge.png"
                alt="AI Quotation Studio"
                width={250}
                height={50}
                className="h-9 sm:h-10 w-auto object-contain drop-shadow-xs"
                priority
              />
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black leading-[1.08] text-[#29231F] font-serif tracking-tight">
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
            <div className="space-y-3 pt-1 pb-1">
              {checklistItems.map((item, index) => (
                <motion.div 
                  key={item}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.08, duration: 0.4 }}
                  className="flex items-center gap-3 text-sm font-bold text-[#29231F]"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons matching reference design */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link
                href="/workspace/quotations/builder"
                className="group px-7 py-3.5 rounded-full bg-gradient-to-r from-[#C58B27] via-[#D8B46A] to-[#B47B1E] text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(197,139,39,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(197,139,39,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
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

          {/* ================= RIGHT COLUMN: EXACT 3D HERO VISUAL ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[420px] sm:min-h-[500px] lg:min-h-[580px] select-none">
            
            {/* Background Three Quotation Cards Mockup */}
            <motion.div
              style={{ x: cardsX, y: cardsY }}
              initial={{ opacity: 0, scale: 0.92, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className="absolute top-0 sm:top-2 right-0 sm:right-4 w-[340px] sm:w-[460px] lg:w-[560px] z-10 pointer-events-none"
            >
              <Image
                src="/assets/quotation/hero_quotation_cards.png"
                alt="Three Wedding Quotation Mockups"
                width={879}
                height={466}
                className="w-full h-auto object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.14)]"
                priority
              />
            </motion.div>

            {/* Front 3D Photographer Character (pointing up behind laptop) */}
            <motion.div
              style={{ x: charX, y: charY }}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 mt-16 sm:mt-24 lg:mt-28 w-[290px] sm:w-[390px] lg:w-[460px] pointer-events-auto"
            >
              <Image
                src="/assets/quotation/hero_photographer.png"
                alt="StudioCore AI Wedding Photographer Character"
                width={553}
                height={516}
                className="w-full h-auto object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                priority
              />
            </motion.div>

            {/* Floating Badge: Generated in 1 Minute! */}
            <motion.div
              style={{ x: badgeX, y: badgeY }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5, type: 'spring', stiffness: 200 }}
              className="absolute right-0 sm:right-2 bottom-[18%] sm:bottom-[22%] z-30 pointer-events-auto cursor-pointer"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                className="filter drop-shadow-[0_12px_24px_rgba(217,119,6,0.3)]"
              >
                <Image
                  src="/assets/quotation/badge_generated_1_minute.png"
                  alt="Generated in 1 Minute!"
                  width={481}
                  height={190}
                  className="w-[170px] sm:w-[220px] lg:w-[245px] h-auto object-contain"
                  priority
                />
              </motion.div>
            </motion.div>

          </div>

        </div>

        {/* Scroll to Explore Indicator matching reference image */}
        <div className="flex flex-col items-center justify-center pt-8 sm:pt-12 pb-2">
          <div className="w-7 h-7 rounded-full bg-white border border-[#EAE3D2] shadow-xs flex items-center justify-center text-[#29231F] mb-1.5 animate-bounce">
            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black tracking-[0.22em] text-[#8C827A] uppercase font-sans">
            SCROLL TO EXPLORE
          </span>
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
