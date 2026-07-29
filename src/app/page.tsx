'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustedSection } from '@/components/landing/TrustedSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { BentoFeatures } from '@/components/landing/BentoFeatures';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { LiveShowcaseSection } from '@/components/landing/LiveShowcaseSection';
import { AutomationSection } from '@/components/landing/AutomationSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { Footer } from '@/components/landing/Footer';
import { SubPageViewer } from '@/components/landing/SubPages';

export default function RootLandingPage() {
  const [activePage, setActivePage] = useState<string>('home');

  const handleNavigate = (pageSlug: string) => {
    setActivePage(pageSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFDF9] dark:bg-[#0C0B0A] text-[#1A1917] dark:text-[#FAF8F5] font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-[#B89047]">
      
      {/* GLOBAL LANDING NAVBAR */}
      <Navbar activePage={activePage} onNavigate={handleNavigate} />

      {/* DYNAMIC VIEW ROUTER */}
      {activePage === 'home' ? (
        <main className="w-full relative overflow-x-hidden">
          {/* SECTION 1 — HERO */}
          <HeroSection onNavigate={handleNavigate} />

          {/* SECTION 2 — TRUSTED BY MARQUEE */}
          <TrustedSection />

          {/* SECTION 3 — THE DISCONNECTED PROBLEM */}
          <ProblemSection />

          {/* SECTION 4 — THE STUDIOCORE SOLUTION */}
          <SolutionSection />

          {/* SECTION 5 — BENTO GRID FEATURES */}
          <BentoFeatures />

          {/* SECTION 6 — WHY STUDIOCORE COMPARISON */}
          <ComparisonSection />

          {/* SECTION 7 — LIVE INTERACTIVE DASHBOARD SHOWCASE */}
          <LiveShowcaseSection />

          {/* SECTION 8 — AUTOMATION BLUEPRINT */}
          <AutomationSection />

          {/* SECTION 9 — STATISTICAL METRICS */}
          <StatsSection />

          {/* SECTION 10 — TESTIMONIALS */}
          <TestimonialsSection />

          {/* SECTION 11 — PRICING MATRICES */}
          <PricingSection onNavigate={handleNavigate} />

          {/* SECTION 12 — FAQ ACCORDION */}
          <FaqSection />

          {/* SECTION 13 — FINAL CALL TO ACTION */}
          <CtaSection onNavigate={handleNavigate} />
        </main>
      ) : (
        <SubPageViewer pageSlug={activePage} onNavigate={handleNavigate} />
      )}

      {/* GLOBAL LANDING FOOTER */}
      <Footer onNavigate={handleNavigate} />

    </div>
  );
}
