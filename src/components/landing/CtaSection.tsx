'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

interface CtaSectionProps {
  onNavigate?: (page: string) => void;
}

export function CtaSection({ onNavigate }: CtaSectionProps) {
  return (
    <section className="py-24 md:py-36 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] relative overflow-hidden border-t border-[#EAE3D2]">
      
      {/* BACKGROUND GLOW */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[350px] bg-gradient-to-tr from-[#D4AF37]/25 via-[#C5A059]/15 to-[#FAF8F5] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#D4AF37]/40 shadow-md text-[#B89047] text-xs font-black uppercase tracking-widest mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#B89047]" />
          Join 1,200+ High-Margin Wedding Studios
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5] leading-tight">
          Ready to Grow Your <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#1A1917] via-[#B89047] to-[#D4AF37] bg-clip-text text-transparent">
            Photography Business?
          </span>
        </h2>

        <p className="mt-6 text-lg sm:text-xl text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          Start your 14-day free trial today. Set up your workspace in 5 minutes and experience the future of studio management.
        </p>

        {/* BUTTONS */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
            className="w-full sm:w-auto px-10 py-5 text-base font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-full transition-all shadow-[0_10px_35px_rgba(212,175,55,0.4)] hover:scale-105 flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('book-demo') : window.location.href = '/book-demo'}
            className="w-full sm:w-auto px-10 py-5 text-base font-bold text-[#1A1917] dark:text-white bg-white/90 dark:bg-[#1E1C1A]/90 border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37] rounded-full transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#FAF8F5] dark:bg-[#2A2724] flex items-center justify-center text-[#B89047]">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span>Book Live Demo</span>
          </button>
        </div>

        {/* TRUST FLAGS */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7A756E] font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            14-Day Free Access
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            Instant WhatsApp & Webhook Setup
          </span>
        </div>

      </div>
    </section>
  );
}
