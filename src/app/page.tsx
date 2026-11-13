import React from 'react';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/landing/Hero/Hero';

// Below-the-fold landing sections dynamically code-split for ultra-low initial JS bundle & near-zero TBT
const ProblemSection = dynamic(
  () => import('@/components/landing/Problem/ProblemSection').then((m) => m.ProblemSection),
  { ssr: true }
);

const SolutionSection = dynamic(
  () => import('@/components/landing/Solution/SolutionSection').then((m) => m.SolutionSection),
  { ssr: true }
);

const FeaturesSection = dynamic(
  () => import('@/components/landing/Features/FeaturesSection').then((m) => m.FeaturesSection),
  { ssr: true }
);

const PricingPage = dynamic(
  () => import('@/components/landing/Pricing/PricingPage').then((m) => m.PricingPage),
  { ssr: true }
);

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] text-[#211B17] flex flex-col justify-between selection:bg-[#C89435]/20 selection:text-[#211B17]">
      <main className="w-full">
        {/* Page 01: Hero Section (Rendered immediately for fast FCP/LCP) */}
        <Hero />

        {/* Page 02: The Reality / Problem Section (Code-split chunk) */}
        <ProblemSection />

        {/* Page 03: The Solution / Transformation Section (Code-split chunk) */}
        <SolutionSection />

        {/* Page 04: Everything You Need. In One Place. (Code-split chunk) */}
        <FeaturesSection />

        {/* Page 05: Pricing, Business Stats & Testimonials (Code-split chunk) */}
        <PricingPage />
      </main>
    </div>
  );
}
