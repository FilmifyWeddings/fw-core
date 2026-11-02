'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

export function QuotationNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FAF8F4]/90 backdrop-blur-md border-b border-[#EAE3D2]/70 shadow-xs py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo matching reference screenshot */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black tracking-tight text-[#1E1A17] font-serif">
                Studio<span className="text-[#C58B27]">Core</span>
              </span>
              <span className="text-[10px] font-bold text-[#C58B27] align-super -mt-2">®</span>
            </div>
            <span className="text-[8px] font-bold tracking-[0.22em] text-[#786E65] uppercase -mt-0.5 font-sans">
              FOCUS ON ART, WE MANAGE.
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#29231F]">
          <Link
            href="/features"
            className="hover:text-[#C58B27] transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-[#C58B27] transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/workspace/quotations"
            className="text-[#C58B27] font-semibold flex items-center gap-1.5 transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/pricing"
            className="hover:text-[#C58B27] transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#29231F] hover:text-[#C58B27] transition-colors"
          >
            Login
          </Link>

          <Link
            href="/free-trial"
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D8B46A] via-[#C58B27] to-[#B47B1E] text-white text-xs font-bold tracking-wide shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#29231F] hover:text-[#C58B27] transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF8F4] border-b border-[#EAE3D2] px-6 py-5 space-y-4 shadow-xl">
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#29231F] hover:text-[#C58B27]"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#29231F] hover:text-[#C58B27]"
          >
            How It Works
          </Link>
          <Link
            href="/workspace/quotations"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#C58B27]"
          >
            Templates
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-[#29231F] hover:text-[#C58B27]"
          >
            Pricing
          </Link>
          <div className="pt-3 border-t border-[#EAE3D2] flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-sm font-semibold text-[#29231F]"
            >
              Login
            </Link>
            <Link
              href="/free-trial"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-3 rounded-full bg-gradient-to-r from-[#D8B46A] via-[#C58B27] to-[#B47B1E] text-white text-xs font-bold tracking-wide shadow-md"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
