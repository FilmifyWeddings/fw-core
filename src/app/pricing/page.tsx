'use client';

import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { Footer } from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const handleNav = (slug: string) => {
    if (slug === 'home') router.push('/');
    else router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1A1917] pt-20">
      <Navbar activePage="pricing" onNavigate={handleNav} />
      <PricingSection onNavigate={handleNav} />
      <FaqSection />
      <Footer onNavigate={handleNav} />
    </div>
  );
}
