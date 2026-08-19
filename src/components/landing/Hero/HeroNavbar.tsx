'use client';

import { useState, useEffect, forwardRef } from 'react';
import { ChevronDown, ArrowRight, Menu, X } from 'lucide-react';

export interface HeroNavbarProps {
  // Add props if needed
}

export const HeroNavbar = forwardRef<HTMLElement, HeroNavbarProps>((_, ref) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      ref={ref}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FFFDF8]/94 backdrop-blur-md py-2.5 shadow-[0_4px_20px_-4px_rgba(33,27,23,0.06)] border-b border-[#E9E1D5]/70'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 flex items-center justify-between">
        {/* Left: Brand Logo in Bold Minimal Premium Font */}
        <a href="/" className="flex items-center gap-3 group focus:outline-none select-none">
          <div className="flex flex-col">
            <span className="font-sans text-[26px] sm:text-[29px] lg:text-[31px] font-extrabold tracking-[-0.035em] leading-none text-[#211B17] flex items-center group-hover:opacity-90 transition-opacity">
              Studio<span className="text-[#C89435] font-extrabold ml-0.5">Core</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C89435] ml-1 mb-1 animate-pulse" />
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] uppercase tracking-[0.16em] font-semibold text-[#8C6D33] mt-1">
              FOCUS ON ART, WE MANAGE
            </span>
          </div>
        </a>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          <a
            href="#features"
            className="text-[14px] lg:text-[15px] font-medium text-[#746E67] hover:text-[#211B17] transition-colors py-1"
          >
            Features
          </a>
          <a
            href="#solution"
            className="text-[14px] lg:text-[15px] font-medium text-[#746E67] hover:text-[#211B17] transition-colors py-1"
          >
            How It Works
          </a>
          <a
            href="#solution"
            className="text-[14px] lg:text-[15px] font-medium text-[#746E67] hover:text-[#211B17] transition-colors py-1"
          >
            Solutions
          </a>
          <a
            href="#pricing"
            className="text-[14px] lg:text-[15px] font-medium text-[#746E67] hover:text-[#211B17] transition-colors py-1"
          >
            Pricing
          </a>
          <a
            href="#features"
            className="relative group cursor-pointer flex items-center gap-1 text-[14px] lg:text-[15px] font-medium text-[#746E67] hover:text-[#211B17] transition-colors py-1"
          >
            <span>Resources</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#746E67] group-hover:text-[#211B17] transition-transform duration-200 group-hover:rotate-180" />
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-5 lg:gap-7">
          <a
            href="/login"
            className="text-[14px] lg:text-[15px] font-medium text-[#211B17] hover:text-[#C89435] transition-colors px-2 py-1"
          >
            Login
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] bg-[#C89435] hover:bg-[#B68225] text-white text-[14px] font-medium shadow-[0_4px_14px_rgba(200,148,53,0.3)] hover:shadow-[0_6px_20px_rgba(200,148,53,0.4)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>Start Your Studio</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-3">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#C89435] text-white text-[13px] font-medium shadow-sm"
          >
            <span>Start</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#211B17] hover:bg-[#F3EEE6] transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF8] border-b border-[#E9E1D5] px-6 py-6 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[16px] font-medium text-[#211B17] hover:text-[#C89435] py-2 border-b border-[#F3EEE6]"
            >
              Features
            </a>
            <a
              href="#solution"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[16px] font-medium text-[#211B17] hover:text-[#C89435] py-2 border-b border-[#F3EEE6]"
            >
              How It Works
            </a>
            <a
              href="#solution"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[16px] font-medium text-[#211B17] hover:text-[#C89435] py-2 border-b border-[#F3EEE6]"
            >
              Solutions
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[16px] font-medium text-[#211B17] hover:text-[#C89435] py-2 border-b border-[#F3EEE6]"
            >
              Pricing
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[16px] font-medium text-[#211B17] hover:text-[#C89435] py-2 border-b border-[#F3EEE6]"
            >
              Resources
            </a>
            <div className="pt-2 flex flex-col gap-3">
              <a
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 text-[15px] font-medium text-[#211B17] border border-[#E9E1D5] rounded-lg"
              >
                Login
              </a>
              <a
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 text-[15px] font-medium text-white bg-[#C89435] rounded-lg shadow-md"
              >
                Start Your Studio →
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

HeroNavbar.displayName = 'HeroNavbar';
