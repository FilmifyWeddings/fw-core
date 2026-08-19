'use client';

import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';

export interface SolutionContentProps {
  className?: string;
}

export const SolutionContent = forwardRef<HTMLDivElement, SolutionContentProps>(
  ({ className = '' }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col items-start max-w-[440px] xl:max-w-[480px] z-20 select-none ${className}`}>
        {/* Gold eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6F0] border border-[#EBE2D3] mb-5">
          <span className="w-2 h-2 rounded-full bg-[#C89435] animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8C6D33]">
            The Solution
          </span>
        </div>

        {/* Editorial Headline */}
        <h2 className="font-serif text-[44px] sm:text-[54px] xl:text-[62px] font-normal leading-[1.02] tracking-[-0.015em] text-[#211B17] mb-5">
          <span>What if your entire </span>
          <span>studio just... </span>
          <span className="text-[#C89435] italic font-normal drop-shadow-[0_2px_10px_rgba(200,148,53,0.15)]">
            worked?
          </span>
        </h2>

        {/* Subtext */}
        <p className="text-[16px] sm:text-[17px] text-[#746E67] font-normal leading-[1.6] mb-8">
          One System. Everything Connected.<br />
          Automatically.
        </p>

        {/* CTA Button */}
        <a
          href="#demo"
          className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[10px] bg-[#C89435] hover:bg-[#B88228] text-white text-[15px] font-medium shadow-[0_6px_20px_rgba(200,148,53,0.32)] hover:shadow-[0_8px_25px_rgba(200,148,53,0.42)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>See How It Works</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </a>
      </div>
    );
  }
);

SolutionContent.displayName = 'SolutionContent';
