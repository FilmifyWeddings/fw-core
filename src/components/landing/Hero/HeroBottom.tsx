'use client';

import { forwardRef } from 'react';
import { ArrowDown } from 'lucide-react';

export interface HeroBottomProps {
  // Add props if needed
}

export const HeroBottom = forwardRef<HTMLDivElement, HeroBottomProps>((_, ref) => {
  const handleScrollClick = () => {
    window.scrollTo({
      top: window.innerHeight * 0.85,
      behavior: 'smooth',
    });
  };

  return (
    <div
      ref={ref}
      className="w-full flex flex-col items-center justify-center pt-2 sm:pt-4 pb-3 sm:pb-5 z-20 pointer-events-auto select-none"
    >
      {/* Bottom Statement */}
      <div className="text-center mb-2 sm:mb-3">
        <p className="font-serif text-[18px] sm:text-[24px] md:text-[30px] font-normal tracking-tight text-[#211B17]">
          <span>Everything. </span>
          <span className="text-[#C89435] italic">Organized. </span>
          <span className="text-[#C89435] italic">Automated. </span>
          <span>Seamless.</span>
        </p>
      </div>

      {/* Compact Scroll indicator button */}
      <button
        onClick={handleScrollClick}
        className="group flex flex-col items-center gap-1 text-[#746E67] hover:text-[#C89435] transition-colors focus:outline-none cursor-pointer"
        aria-label="Scroll to explore"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E9E1D5] bg-white flex items-center justify-center shadow-xs group-hover:border-[#C89435] group-hover:shadow-[0_4px_12px_rgba(200,148,53,0.2)] transition-all duration-300 transform group-hover:translate-y-0.5">
          <ArrowDown className="w-3.5 h-3.5 text-[#746E67] group-hover:text-[#C89435] transition-colors" />
        </div>
        <span className="text-[9px] sm:text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[#99928A]">
          Scroll to explore
        </span>
      </button>
    </div>
  );
});

HeroBottom.displayName = 'HeroBottom';
