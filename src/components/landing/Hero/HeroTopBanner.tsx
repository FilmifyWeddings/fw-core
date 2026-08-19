'use client';

import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const HeroTopBanner: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center mb-6 sm:mb-8 pt-1 select-none z-20">
      {/* 1. Attractive Luxury #1 Tagline Pill */}
      <div className="inline-flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#FAF6F0] via-[#FFF9ED] to-[#FAF6F0] border border-[#E8DCC6] shadow-[0_4px_18px_rgba(200,148,53,0.12)] hover:border-[#C89435] transition-all duration-300 transform hover:-translate-y-0.5">
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#D4A03D] to-[#C89435] text-white text-[10.5px] sm:text-[11px] font-bold tracking-wider shadow-xs">
          <Sparkles className="w-3 h-3 text-white" />
          <span>#1</span>
        </div>
        <span className="text-[11px] sm:text-[12.5px] lg:text-[13px] uppercase tracking-[0.12em] font-extrabold text-[#7A5B20]">
          CRM & AUTOMATION OPERATING SYSTEM FOR PHOTOGRAPHERS
        </span>
      </div>

      {/* 2. Made with Love in India */}
      <div className="flex items-center justify-center gap-1.5 mt-2 text-[12px] sm:text-[12.5px] font-medium text-[#746E67]">
        <span>Made with</span>
        <Heart className="w-3.5 h-3.5 fill-[#E53935] text-[#E53935] inline-block animate-pulse" />
        <span className="font-semibold text-[#211B17]">in India</span>
        <span className="text-[13px]">🇮🇳</span>
      </div>
    </div>
  );
};
