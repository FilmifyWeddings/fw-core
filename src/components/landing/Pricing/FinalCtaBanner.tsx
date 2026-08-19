'use client';

import React from 'react';

export const FinalCtaBanner: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto mb-20 select-none overflow-visible">
      {/* ========================================================= */}
      {/* 1. MOBILE / TABLET (< 768px): POPPING-OUT HEAD & FADED BOTTOM */}
      {/* ========================================================= */}
      <div className="flex md:hidden flex-col items-center text-center bg-[#FAF4E8] border border-[#E9DCCA] rounded-[26px] pt-24 pb-7 px-5 shadow-[0_10px_28px_rgba(33,27,23,0.05)] relative overflow-visible mt-16">
        {/* Subtle floral watermark */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none rounded-[26px] overflow-hidden -z-10 bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: `url('/assets/backgrounds/solution-floral.webp')` }}
          aria-hidden="true"
        />

        {/* Character Overflowing / Head Pop-out from Top with Bottom Fade */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex justify-center">
          <picture>
            <source
              srcSet="/assets/characters/page5/cta-thumbsup-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/page5/cta-thumbsup-photographer.png"
              alt="StudioCore Photographer Thumbs Up"
              className="w-auto h-[210px] object-contain drop-shadow-[0_14px_26px_rgba(33,27,23,0.18)] [mask-image:linear-gradient(to_bottom,black_60%,transparent_98%)]"
              loading="lazy"
            />
          </picture>
        </div>

        {/* Heading & Subtitle Below the Character */}
        <div className="mt-2 mb-5">
          <h3 className="font-serif text-[23px] sm:text-[26px] font-normal leading-tight text-[#211B17] mb-1.5 px-2">
            Join 600+ Photographers Growing Their Business
          </h3>
          <p className="text-[13.5px] text-[#746E67]">
            Start your journey with StudioCore today.
          </p>
        </div>

        {/* Full-width Responsive Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={() => window.location.href = '/login'}
            className="w-full py-3.5 px-6 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white font-bold text-[14px] transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg text-center"
          >
            Start Your Free Trial
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/book-demo'}
            className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-[#FAF7F1] border border-[#E9E0D4] text-[#211B17] font-semibold text-[14px] transition-all duration-200 cursor-pointer shadow-xs text-center"
          >
            Book a Demo
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP (>= 768px): HORIZONTAL BANNER WITH LEFT CHARACTER */}
      {/* ========================================================= */}
      <div className="hidden md:flex relative bg-[#FAF4E8] border border-[#E9DCCA] rounded-[24px] p-6 sm:p-8 lg:p-10 shadow-[0_8px_24px_rgba(33,27,23,0.04)] overflow-visible min-h-[160px] sm:min-h-[180px] items-center justify-between">
        {/* Subtle floral watermark left & right */}
        <div
          className="absolute left-0 top-0 bottom-0 w-32 opacity-25 pointer-events-none -z-10 bg-contain bg-no-repeat bg-left"
          style={{ backgroundImage: `url('/assets/backgrounds/solution-floral.webp')` }}
          aria-hidden="true"
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-32 opacity-25 pointer-events-none -z-10 bg-contain bg-no-repeat bg-right transform scale-x-[-1]"
          style={{ backgroundImage: `url('/assets/backgrounds/solution-floral.webp')` }}
          aria-hidden="true"
        />

        {/* Character on Left (Thumbs-up Pose, Overflowing top & bottom) */}
        <div className="absolute left-4 sm:left-8 lg:left-12 bottom-0 z-20 pointer-events-none">
          <picture>
            <source
              srcSet="/assets/characters/page5/cta-thumbsup-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/page5/cta-thumbsup-photographer.png"
              alt="StudioCore Photographer Thumbs Up"
              className="w-auto h-[210px] sm:h-[240px] lg:h-[270px] max-w-none object-contain drop-shadow-[0_16px_28px_rgba(33,27,23,0.18)]"
              loading="lazy"
            />
          </picture>
        </div>

        {/* Text and Buttons content (Offset to the right of character) */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pl-[150px] sm:pl-[200px] lg:pl-[240px]">
          <div>
            <h3 className="font-serif text-[24px] sm:text-[28px] lg:text-[32px] font-normal leading-tight text-[#211B17] mb-1">
              Join 600+ Photographers Growing Their Business
            </h3>
            <p className="text-[13px] sm:text-[14px] text-[#746E67]">
              Start your journey with StudioCore today.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="px-6 sm:px-7 py-3 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white font-semibold text-[13.5px] transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg whitespace-nowrap"
            >
              Start Your Free Trial
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/book-demo'}
              className="px-5 sm:px-6 py-3 rounded-full bg-white hover:bg-[#FAF7F1] border border-[#E9E0D4] text-[#211B17] font-semibold text-[13.5px] transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
