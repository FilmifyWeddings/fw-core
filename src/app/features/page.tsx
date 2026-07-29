'use client';

import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { SubPageViewer } from '@/components/landing/SubPages';
import { Footer } from '@/components/landing/Footer';
import { useRouter } from 'next/navigation';

export default function FeaturesPage() {
  const router = useRouter();
  const handleNav = (slug: string) => {
    if (slug === 'home') router.push('/');
    else router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1A1917]">
      <Navbar activePage="features" onNavigate={handleNav} />
      <SubPageViewer pageSlug="features" onNavigate={handleNav} />
      <Footer onNavigate={handleNav} />
    </div>
  );
}
