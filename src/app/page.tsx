import React from 'react';
import { Hero } from '@/components/landing/Hero/Hero';
import { LandingBelowFold } from '@/components/landing/LandingBelowFold';

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#211B17] flex flex-col justify-between selection:bg-[#C89435]/20 selection:text-[#211B17]">
      <main className="w-full">
        {/* Page 01: Hero Section (Rendered immediately for fast FCP/LCP) */}
        <Hero />

        {/* Below-the-fold landing sections dynamically code-split for ultra-low initial JS bundle & near-zero TBT */}
        <LandingBelowFold />
      </main>
    </div>
  );
}
