'use client';

import React from 'react';
import { QuotationNavbar } from './QuotationNavbar';
import { QuotationHero } from './QuotationHero';
import { QuotationComparison } from './QuotationComparison';

export function QuotationLandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#29231F] selection:bg-[#C58B27]/25 selection:text-[#1E1A17] flex flex-col font-sans relative overflow-x-hidden">
      {/* 1. Global Navigation matching StudioCore reference */}
      <QuotationNavbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        {/* Section A: Hero Section with 3D Photographer Character & 3 Quotation Cards */}
        <QuotationHero />

        {/* Section B: Old Workflow vs StudioCore AI Workflow Comparison */}
        <QuotationComparison />
      </main>

      {/* Minimal Footer Signature adhering strictly to 2 sections mandate */}
      <footer className="py-6 text-center text-xs text-[#8C827A] border-t border-[#EAE3D2]/60">
        <p>© {new Date().getFullYear()} StudioCore. Focus on art, we manage.</p>
      </footer>
    </div>
  );
}
