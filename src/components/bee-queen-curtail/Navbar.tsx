'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, Globe, Menu, X, Sparkles, ChevronDown } from 'lucide-react';
import { soundCtrl } from './SoundController';
import { useCurrency, CurrencyCode } from './CurrencyContext';

interface NavbarProps {
  onOpenBooking: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleAudio = () => {
    const newMuted = soundCtrl.toggleMute();
    setIsMuted(newMuted);
  };

  const navLinks = [
    { name: 'Runway 3D', href: '#runway' },
    { name: 'The Atelier', href: '#atelier' },
    { name: 'Virtual Fitting', href: '#virtual-fitting' },
    { name: 'Heritage', href: '#heritage' },
    { name: 'VIP Services', href: '#vip-services' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out px-4 sm:px-8 py-3.5 ${
          scrolled
            ? 'bg-[#FBF8F3]/85 backdrop-blur-md border-b border-[#EADCC9]/60 shadow-[0_10px_30px_-10px_rgba(42,39,35,0.05)] py-3'
            : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Identity / Wordmark */}
          <Link
            href="#hero"
            onClick={() => soundCtrl.playClick()}
            className="group flex flex-col items-start select-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.28em] uppercase text-[#D4AF37] font-serif font-light">
                बी क्वीन कर्टेल
              </span>
              <span className="h-[1px] w-6 bg-[#D4AF37]/40 transition-all duration-300 group-hover:w-10 group-hover:bg-[#D4AF37]" />
            </div>
            <span
              className="text-lg sm:text-2xl font-serif font-normal tracking-[0.16em] text-[#2A2723] uppercase transition-colors duration-300 group-hover:text-[#D4AF37]"
              style={{ fontFamily: "'Cormorant Garamond', 'Instrument Serif', Georgia, serif" }}
            >
              BEE QUEEN CURTAIL
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => soundCtrl.playClick()}
                className="text-[13px] tracking-[0.18em] uppercase text-[#2A2723]/75 hover:text-[#2A2723] font-medium transition-colors relative py-1 group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#D4AF37] transition-all duration-300 ease-out group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Interactive Controls & CTA */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs tracking-wider uppercase transition-all duration-300 ${
                !isMuted
                  ? 'bg-[#FAF5EC] border-[#D4AF37] text-[#2A2723] shadow-xs'
                  : 'bg-[#FBF8F3]/60 border-[#EADCC9] text-[#2A2723]/60 hover:text-[#2A2723] hover:border-[#D4AF37]/60'
              }`}
              title={isMuted ? 'Turn Soundscape On' : 'Mute Soundscape'}
              aria-label="Soundscape toggle"
            >
              {!isMuted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="hidden md:inline font-sans text-[11px] font-medium">Sound On</span>
                  {/* Subtle soundwave bars */}
                  <span className="flex items-end gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 h-1.5 bg-[#D4AF37] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#D4AF37] animate-pulse delay-75" />
                    <span className="w-0.5 h-2 bg-[#D4AF37] animate-pulse delay-150" />
                  </span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 opacity-60" />
                  <span className="hidden md:inline font-sans text-[11px] font-light">Sound</span>
                </>
              )}
            </button>

            {/* Currency Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  soundCtrl.playClick();
                  setCurrencyDropdownOpen(!currencyDropdownOpen);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#EADCC9] bg-[#FBF8F3]/60 hover:border-[#D4AF37]/60 text-xs font-medium text-[#2A2723] transition-all"
              >
                <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-sans text-[11px] font-semibold">{currency}</span>
                <ChevronDown className="w-3 h-3 text-[#2A2723]/60" />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#FBF8F3] border border-[#EADCC9] rounded-xl shadow-xl py-1 z-50 backdrop-blur-md">
                  {(['INR', 'USD', 'EUR', 'GBP', 'AED'] as CurrencyCode[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCurrency(c);
                        setCurrencyDropdownOpen(false);
                        soundCtrl.playClick();
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs font-sans flex items-center justify-between hover:bg-[#FAF5EC] transition-colors ${
                        currency === c ? 'text-[#D4AF37] font-bold bg-[#FAF5EC]/70' : 'text-[#2A2723]/80'
                      }`}
                    >
                      <span>{c}</span>
                      {currency === c && <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIP Booking CTA Button */}
            <button
              onClick={() => {
                soundCtrl.playClick();
                onOpenBooking();
              }}
              className="relative group overflow-hidden px-4 sm:px-5 py-2 rounded-full bg-[#2A2723] text-[#FAF8F3] text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase shadow-sm border border-[#2A2723] hover:border-[#D4AF37] transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span className="font-sans font-semibold">VIP Salon</span>
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-[#38332E] via-[#D4AF37]/30 to-[#38332E] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => {
                soundCtrl.playClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden p-2 rounded-full border border-[#EADCC9] bg-[#FBF8F3]/60 text-[#2A2723]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-xl flex flex-col justify-center items-center px-6 lg:hidden">
          <div className="text-center mb-8">
            <p className="text-xs tracking-[0.3em] uppercase text-[#D4AF37] font-serif mb-1">
              बी क्वीन कर्टेल
            </p>
            <h2 className="text-2xl font-serif tracking-[0.14em] text-[#2A2723] uppercase">
              BEE QUEEN CURTAIL
            </h2>
          </div>
          <nav className="flex flex-col space-y-6 items-center text-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => {
                  soundCtrl.playClick();
                  setMobileMenuOpen(false);
                }}
                className="text-lg uppercase tracking-[0.2em] font-serif text-[#2A2723] hover:text-[#D4AF37] transition-colors"
              >
                {link.name}
              </a>
            ))}
            <button
              onClick={() => {
                soundCtrl.playClick();
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="mt-6 px-8 py-3 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-semibold tracking-[0.2em] uppercase border border-[#D4AF37]/50 shadow-md"
            >
              Book Private Salon
            </button>
          </nav>
        </div>
      )}
    </>
  );
};
