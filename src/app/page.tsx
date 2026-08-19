'use client';

import React from 'react';
import { Hero } from '@/components/landing/Hero/Hero';
import { ProblemSection } from '@/components/landing/Problem/ProblemSection';
import { SolutionSection } from '@/components/landing/Solution/SolutionSection';
import { FeaturesSection } from '@/components/landing/Features/FeaturesSection';
import { PricingPage } from '@/components/landing/Pricing/PricingPage';

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#211B17] flex flex-col justify-between selection:bg-[#C89435]/20 selection:text-[#211B17]">
      <main className="w-full">
        {/* Page 01: Hero Section */}
        <Hero />

        {/* Page 02: The Reality / Problem Section */}
        <ProblemSection />

        {/* Page 03: The Solution / Transformation Section */}
        <SolutionSection />

        {/* Page 04: Everything You Need. In One Place. (Before → After Transformation) */}
        <FeaturesSection />

        {/* Page 05: Pricing, Business Stats & Testimonials */}
        <PricingPage />
      </main>
    </div>
  );
}

