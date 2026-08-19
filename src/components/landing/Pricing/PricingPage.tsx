'use client';

import React, { useState } from 'react';
import { PricingHeader } from './PricingHeader';
import { PricingToggle } from './PricingToggle';
import { PricingCardsGrid } from './PricingCardsGrid';
import { PricingBenefitsStrip } from './PricingBenefitsStrip';
import { PricingCtaBanner } from './PricingCtaBanner';
import { BusinessStatsBar } from './BusinessStatsBar';
import { TestimonialsSection } from './TestimonialsSection';
import { FinalCtaBanner } from './FinalCtaBanner';
import { FooterSection } from './FooterSection';

export const PricingPage: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="pricing-page relative w-full bg-[#FFFDF8] pt-14 sm:pt-18 lg:pt-20 overflow-x-clip overflow-y-visible border-t border-[#F2ECE2]/80 select-none"
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none -z-20 bg-[#FFFDF8] w-full">
        <div className="absolute inset-0 opacity-[0.35] subtle-paper-texture" aria-hidden="true" />
        
        {/* Soft Ambient Warm Glow */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-br from-[#F7EEDA]/35 via-[#FAF4EB]/20 to-transparent blur-3xl -z-10 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Main Section Content */}
      <div className="w-full max-w-[1520px] 2xl:max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col">
        {/* 1. Header */}
        <PricingHeader />

        {/* 2. Monthly / Yearly Toggle */}
        <PricingToggle isYearly={isYearly} onChange={setIsYearly} />

        {/* 3. 4 Pricing Cards */}
        <PricingCardsGrid isYearly={isYearly} />

        {/* 4. Trust / Feature Benefits Strip */}
        <PricingBenefitsStrip />

        {/* 5. Character CTA Banner (Camera Photographer on Left) */}
        <PricingCtaBanner />

        {/* 6. NEW â€” Business Stats Bar (Animated Count-Up) */}
        <BusinessStatsBar />

        {/* 7. Testimonials Hero & 5 Cards Carousel */}
        <TestimonialsSection />

        {/* 8. Final Character CTA Banner (Thumbs-up Photographer on Left) */}
        <FinalCtaBanner />
      </div>

      {/* 9. Footer */}
      <FooterSection />
    </section>
  );
};
