'use client';

import React, { forwardRef } from 'react';
import { ArrowRight, Play, Star } from 'lucide-react';

export interface HeroContentProps {
  headlineRef?: React.RefObject<HTMLHeadingElement | null>;
  descriptionRef?: React.RefObject<HTMLParagraphElement | null>;
  buttonsRef?: React.RefObject<HTMLDivElement | null>;
  trustRef?: React.RefObject<HTMLDivElement | null>;
}

export const HeroContent = forwardRef<HTMLDivElement, HeroContentProps>(
  ({ headlineRef, descriptionRef, buttonsRef, trustRef }, ref) => {
    return (
      <div ref={ref} className="flex flex-col items-center lg:items-start max-w-[580px] z-20 text-center lg:text-left">
        {/* Editorial Serif Headline */}
        <h1
          ref={headlineRef}
          className="font-serif text-[38px] sm:text-[54px] lg:text-[76px] xl:text-[84px] font-normal leading-[1.02] lg:leading-[0.98] tracking-[-0.015em] text-[#211B17] mb-4 sm:mb-6 select-none"
        >
          <span className="block headline-line">Your Entire</span>
          <span className="block headline-line">Photography</span>
          <span className="block headline-line">Business.</span>
          <span className="block headline-line">
            Finally,{' '}
            <span className="text-[#C89435] italic font-normal tracking-normal drop-shadow-[0_2px_10px_rgba(200,148,53,0.15)]">
              In One System.
            </span>
          </span>
        </h1>

        {/* Subtitle / Description */}
        <p
          ref={descriptionRef}
          className="text-[14px] sm:text-[15.5px] lg:text-[17px] text-[#746E67] font-normal leading-[1.6] lg:leading-[1.65] max-w-[460px] mb-6 sm:mb-8"
        >
          From leads and follow-ups to bookings, payments, team management and post-production — run your entire photography studio from one powerful platform.
        </p>

        {/* Call to Actions */}
        <div
          ref={buttonsRef}
          className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-6 sm:mb-8 w-full sm:w-auto"
        >
          <a
            href="/login"
            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-[10px] bg-[#C89435] hover:bg-[#B88228] text-white text-[14.5px] sm:text-[15px] font-medium shadow-[0_6px_20px_rgba(200,148,53,0.32)] hover:shadow-[0_8px_25px_rgba(200,148,53,0.42)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto text-center cursor-pointer"
          >
            <span>Start Your Studio</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>

          <a
            href="#solution"
            className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[10px] bg-white/80 hover:bg-white text-[#211B17] text-[14.5px] sm:text-[15px] font-medium border border-[#E9E1D5] hover:border-[#D4A853]/60 shadow-[0_2px_8px_rgba(33,27,23,0.04)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto text-center cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-[#FAF8F3] border border-[#E9E1D5] flex items-center justify-center group-hover:bg-[#C89435] group-hover:border-[#C89435] transition-colors">
              <Play className="w-2.5 h-2.5 fill-[#746E67] text-[#746E67] ml-0.5 group-hover:fill-white group-hover:text-white transition-colors" />
            </div>
            <span>See How It Works</span>
          </a>
        </div>

        {/* Trust Section */}
        <div ref={trustRef} className="flex items-center justify-center lg:justify-start gap-3 sm:gap-3.5 mb-2">
          {/* Avatar stack */}
          <div className="flex -space-x-2.5 overflow-hidden p-0.5">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={`/assets/images/avatars/avatar-0${i}.webp`}
                alt={`Photographer ${i}`}
                className="inline-block w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-[#FFFDF8] object-cover bg-[#E9E1D5]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-${1534528741775 + i * 1000}?w=100&auto=format&fit=crop&q=80`;
                }}
              />
            ))}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[12.5px] sm:text-[13px] font-medium text-[#211B17] tracking-tight">
              Trusted by 600+ Photographers
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {[...Array(5)].map((_, idx) => (
                <Star
                  key={idx}
                  className="w-3 h-3 fill-[#C89435] text-[#C89435]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

HeroContent.displayName = 'HeroContent';
