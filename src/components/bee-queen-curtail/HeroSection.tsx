'use client';

import React from 'react';
import { HeroCanvas } from './HeroCanvas';
import { soundCtrl } from './SoundController';
import { ArrowDown, Sparkles, Crown, Compass, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick }) => {
  return (
    <section
      id="hero"
      className="relative w-full h-screen min-h-[720px] overflow-hidden bg-[#FBF8F3] flex items-center justify-center select-none"
    >
      {/* 3D WebGL Three.js Canvas Layer */}
      <HeroCanvas />

      {/* Ambient Vignette & Gradient Overlays (Preserving Warm Alabaster Aesthetic) */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#FBF8F3] via-transparent to-[#FBF8F3]/40 z-10" />
      <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-transparent to-[#2A2723]/5 z-10" />

      {/* Top Heritage Badge */}
      <div className="absolute top-20 sm:top-24 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF5EC]/85 border border-[#D4AF37]/35 shadow-xs backdrop-blur-xs">
        <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.22em] text-[#2A2723] uppercase">
          Imperial Bridal & Indo-Western Haute Couture
        </span>
      </div>

      {/* Central Floating Branding & Editorial Typography */}
      <div className="relative z-20 max-w-5xl mx-auto px-6 text-center pointer-events-none flex flex-col items-center mt-12 sm:mt-8">
        
        {/* Devanagari Title */}
        <p className="text-xs sm:text-sm tracking-[0.4em] uppercase text-[#D4AF37] font-serif font-light mb-2">
          बी क्वीन कर्टेल • राजसी विरासत
        </p>

        {/* Grand Headline with Golden Shimmer Shader Effect */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[0.14em] uppercase leading-[1.08] text-[#2A2723] font-serif"
          style={{ fontFamily: "'Cormorant Garamond', 'Instrument Serif', Georgia, serif" }}
        >
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-[#2A2723] via-[#856C2B] to-[#2A2723] bg-clip-text text-transparent">
              BEE QUEEN
            </span>
          </span>
          <br className="hidden sm:inline" />
          <span className="italic font-light tracking-[0.2em] ml-0 sm:ml-4 text-[#D4AF37]">
            CURTAIL
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl font-light text-[#2A2723]/80 tracking-[0.12em] max-w-2xl font-serif">
          The Royal Silhouette of Timeless Couture
        </p>

        {/* Floating Atelier Spec Tags */}
        <div className="mt-5 hidden md:flex items-center gap-6 text-[11px] font-sans tracking-[0.18em] text-[#2A2723]/60 uppercase">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Pure Varanasi Katan Silk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Antique Muted Gold Zari
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            420+ Atelier Handwork Hours
          </span>
        </div>

        {/* Floating Magnetic CTA Pill Button */}
        <div className="mt-8 sm:mt-10 pointer-events-auto">
          <button
            onClick={() => {
              soundCtrl.playChime(792);
              soundCtrl.playClick();
              onExploreClick();
            }}
            className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#FAF6F0]/90 hover:bg-[#FAF6F0] text-[#2A2723] border border-[#D4AF37] shadow-[0_12px_32px_-8px_rgba(212,175,55,0.25)] transition-all duration-500 hover:scale-105 active:scale-95"
          >
            <Compass className="w-4 h-4 text-[#D4AF37] transition-transform duration-700 group-hover:rotate-180" />
            <span className="text-xs sm:text-sm font-sans font-semibold tracking-[0.22em] uppercase">
              Explore The Realm
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Bottom Editorial Details & Mouse Drag Instruction */}
      <div className="absolute bottom-6 left-0 right-0 z-20 px-6 sm:px-12 flex items-center justify-between pointer-events-none text-[#2A2723]/60 text-[11px] font-sans tracking-[0.18em] uppercase">
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-[1px] bg-[#D4AF37]" />
          <span>Move Cursor To Tilt Royal Light</span>
        </div>

        {/* Center Scroll Pill */}
        <button
          onClick={() => {
            soundCtrl.playClick();
            onExploreClick();
          }}
          className="pointer-events-auto mx-auto sm:mx-0 flex flex-col items-center gap-1.5 text-[#2A2723]/70 hover:text-[#D4AF37] transition-colors"
        >
          <span className="text-[10px] tracking-[0.24em]">Scroll To Enter</span>
          <div className="w-5 h-8 rounded-full border border-[#D4AF37]/50 flex items-start justify-center p-1">
            <span className="w-1 h-2 rounded-full bg-[#D4AF37] animate-bounce" />
          </div>
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span>Edition 2026 / 27</span>
          <span className="w-2 h-[1px] bg-[#D4AF37]" />
        </div>
      </div>
    </section>
  );
};
