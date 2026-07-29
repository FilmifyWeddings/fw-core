'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Camera, ShieldCheck, Star } from 'lucide-react';

export function TrustedSection() {
  const categories = [
    'Wedding Studios',
    'Freelancers',
    'Production Houses',
    'Creative Agencies',
    'Luxury Wedding Brands'
  ];

  const studioLogos = [
    'ROYAL WEDDING STORIES',
    'CINEMATIC TALES FILMS',
    'STUDIO VELVET GOA',
    'EPIC DESTINATION LENS',
    'HERITAGE WEDDINGS UDAIPUR',
    'ELYSIAN VISUALS MUMBAI',
    'MEMORY CRAFTERS DELHI',
    'THE SOULFUL SHOTS',
  ];

  return (
    <section className="py-16 bg-[#FAF8F5] dark:bg-[#100F0E] border-y border-[#EAE3D2]/70 dark:border-[#2C2926] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
        
        <p className="text-xs font-black uppercase tracking-widest text-[#B89047] dark:text-[#E6C665] flex items-center justify-center gap-2">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>TRUSTED BY 1,200+ PREMIER PHOTOGRAPHY STUDIOS & CREATORS</span>
          <Star className="w-3.5 h-3.5 fill-current" />
        </p>

        {/* CATEGORY TAGS */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat, i) => (
            <span 
              key={i} 
              className="px-3 py-1 rounded-full bg-white dark:bg-[#1A1816] border border-[#EAE3D2] dark:border-[#2C2926] text-[11px] font-bold text-[#5A554E] dark:text-[#C5C0B8] shadow-xs"
            >
              {cat}
            </span>
          ))}
        </div>

      </div>

      {/* INFINITE MARQUEE SLIDER */}
      <div className="relative w-full flex overflow-x-hidden mask-gradient">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          className="flex items-center gap-12 whitespace-nowrap"
        >
          {[...studioLogos, ...studioLogos].map((logo, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/60 dark:bg-[#181614]/60 border border-[#EAE3D2]/50 dark:border-[#2C2926] shadow-xs hover:border-[#D4AF37] transition-colors group cursor-default"
            >
              <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/15 text-[#B89047] flex items-center justify-center font-bold text-xs group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black tracking-wider text-[#3A3630] dark:text-[#E5DFD5] font-serif">
                {logo}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

    </section>
  );
}
