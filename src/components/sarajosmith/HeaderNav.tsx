'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';

interface HeaderNavProps {
  activeSection?: string;
  onOpenMenu: () => void;
  onNavigate: (sectionId: string) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeSection = 'hero',
  onOpenMenu,
  onNavigate,
}) => {
  const { config, activeDeviceView } = useSaraJoSmith();
  const isMobileSim = activeDeviceView === 'mobile';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Floating Menu Button (Top Right Fixed Stamp Badge) */}
      <div className="fixed top-4 right-4 md:top-6 md:right-8 z-40">
        <button
          onClick={onOpenMenu}
          className="group relative flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          {/* Stamp Graphic Background */}
          <div className="relative w-12 h-16 md:w-16 md:h-22 drop-shadow-md">
            <Image
              src={config.assets.stampMenuBadge}
              alt="Menu Badge"
              fill
              className="object-contain pointer-events-none"
              sizes="64px"
              priority
            />
            {/* Sun/Star Icon overlaid */}
            <div className="absolute inset-0 flex items-center justify-center pb-2">
              <div className="relative w-7 h-7 md:w-9 md:h-9 transition-transform duration-500 group-hover:rotate-45">
                <Image
                  src={config.assets.sunElement}
                  alt="Emblem"
                  fill
                  className="object-contain"
                  sizes="36px"
                />
              </div>
            </div>
          </div>
          {/* "menu" label below stamp */}
          <span className="font-sjs-body text-[9px] md:text-[11px] uppercase tracking-[0.15em] text-[#292421] font-semibold mt-1 group-hover:opacity-80 transition-opacity">
            menu
          </span>
        </button>
      </div>

      {/* Floating Header Bar for smooth desktop navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'bg-[#EFECE3]/90 backdrop-blur-md py-3 shadow-xs border-b border-[#292421]/10'
            : 'bg-transparent py-5 pointer-events-none'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between pointer-events-auto">
          {/* Left Nav items */}
          <nav className={isMobileSim ? 'hidden' : 'hidden md:flex items-center space-x-10'}>
            <button
              onClick={() => onNavigate('hero')}
              className={`font-sjs-body text-xs uppercase tracking-[0.18em] transition-colors relative py-1 cursor-pointer ${
                activeSection === 'hero' ? 'text-[#292421] font-medium' : 'text-[#292421]/75 hover:text-[#292421]'
              }`}
            >
              home
              {activeSection === 'hero' && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#292421]" />
              )}
            </button>
            <button
              onClick={() => onNavigate('collections')}
              className={`font-sjs-body text-xs uppercase tracking-[0.18em] transition-colors relative py-1 cursor-pointer ${
                activeSection === 'collections' ? 'text-[#292421] font-medium' : 'text-[#292421]/75 hover:text-[#292421]'
              }`}
            >
              collections
              {activeSection === 'collections' && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#292421]" />
              )}
            </button>
          </nav>

          {/* Center Monogram Logo */}
          <div
            onClick={() => onNavigate('hero')}
            className="cursor-pointer transition-opacity hover:opacity-80 mx-auto md:mx-0"
          >
            <div className="relative w-16 h-8 md:w-20 md:h-10">
              <Image
                src={config.assets.monogramHeader}
                alt="Sara Jo Smith Logo"
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
          </div>

          {/* Right Nav items */}
          <nav className={isMobileSim ? 'hidden' : 'hidden md:flex items-center space-x-10 pr-20'}>
            <button
              onClick={() => onNavigate('portfolio')}
              className={`font-sjs-body text-xs uppercase tracking-[0.18em] transition-colors relative py-1 cursor-pointer ${
                activeSection === 'portfolio' ? 'text-[#292421] font-medium' : 'text-[#292421]/75 hover:text-[#292421]'
              }`}
            >
              portfolio
              {activeSection === 'portfolio' && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#292421]" />
              )}
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className={`font-sjs-body text-xs uppercase tracking-[0.18em] transition-colors relative py-1 cursor-pointer ${
                activeSection === 'contact' ? 'text-[#292421] font-medium' : 'text-[#292421]/75 hover:text-[#292421]'
              }`}
            >
              contact
              {activeSection === 'contact' && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#292421]" />
              )}
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};
