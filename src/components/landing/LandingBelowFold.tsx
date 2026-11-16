'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ProblemSection = dynamic(
  () => import('@/components/landing/Problem/ProblemSection').then((m) => m.ProblemSection),
  { ssr: false, loading: () => <div className="min-h-[400px] w-full bg-[#FAF9F6]/40" /> }
);

const SolutionSection = dynamic(
  () => import('@/components/landing/Solution/SolutionSection').then((m) => m.SolutionSection),
  { ssr: false, loading: () => <div className="min-h-[400px] w-full bg-[#FFFDF8]" /> }
);

const FeaturesSection = dynamic(
  () => import('@/components/landing/Features/FeaturesSection').then((m) => m.FeaturesSection),
  { ssr: false, loading: () => <div className="min-h-[400px] w-full bg-[#FAF9F6]/40" /> }
);

const PricingPage = dynamic(
  () => import('@/components/landing/Pricing/PricingPage').then((m) => m.PricingPage),
  { ssr: false, loading: () => <div className="min-h-[400px] w-full bg-[#FFFDF8]" /> }
);

export function LandingBelowFold() {
  return (
    <>
      {/* Page 02: The Reality / Problem Section */}
      <ProblemSection />

      {/* Page 03: The Solution / Transformation Section */}
      <SolutionSection />

      {/* Page 04: Everything You Need. In One Place. */}
      <FeaturesSection />

      {/* Page 05: Pricing, Business Stats & Testimonials */}
      <PricingPage />
    </>
  );
}
