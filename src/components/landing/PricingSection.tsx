'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';
import UnifiedPricingCatalog from '@/components/pricing/UnifiedPricingCatalog';

interface PricingSectionProps {
  onNavigate?: (page: string) => void;
}

export function PricingSection({ onNavigate }: PricingSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] relative border-y border-[#EAE3D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Transparent Investment Plans
        </div>

        {/* HEADLINE */}
        <h2 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-[#1A1917]">
          Simple, Fair Pricing. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            Built to Scale Your Studio.
          </span>
        </h2>

        <p className="mt-4 text-base text-[#5A554E] max-w-2xl mx-auto font-medium">
          Start with a 14-day free trial on any plan. No credit card required. Upgrade as your studio grows.
        </p>

        {/* UNIFIED PRICING CATALOG (TABS + 6-MO/ANNUAL DURATION + 4 GALLERY & 3 CRM CARDS + COMPARISON MATRIX) */}
        <div className="mt-8 text-left">
          <UnifiedPricingCatalog
            variant="page"
            defaultTab="gallery"
            onStartTrial={(plan) => {
              if (onNavigate) {
                onNavigate('free-trial');
              } else {
                window.location.href = `/login?plan=${encodeURIComponent(plan.id)}`;
              }
            }}
          />
        </div>

      </div>
    </section>
  );
}
