'use client';

import React from 'react';

export const PricingCtaBanner: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto mb-20 select-none overflow-visible">
      {/* ========================================================= */}
      {/* 1. MOBILE / TABLET (< 768px): CLEAN CENTERED STACK */}
      {/* ========================================================= */}
      <div className="flex md:hidden flex-col items-center text-center bg-[#FAF4E8] border border-[#E9DCCA] rounded-[24px] p-6 shadow-[0_8px_24px_rgba(33,27,23,0.04)] relative overflow-hidden">
        {/* Subtle floral watermark */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none -z-10 bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: `url('/assets/backgrounds/solution-floral.webp')` }}
          aria-hidden="true"
        />

        {/* Text */}
        <h3 className="font-serif text-[22px] sm:text-[26px] font-normal leading-tight text-[#211B17] mb-1.5">
          Not sure which plan is right for you?
        </h3>
        <p className="text-[13px] text-[#746E67] mb-4">
          We'll help you find the perfect plan for your studio.
        </p>

        {/* Character Center */}
        <div className="my-2 pointer-events-none">
          <picture>
            <source
              srcSet="/assets/characters/page5/cta-camera-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/page5/cta-camera-photographer.png"
              alt="StudioCore Photographer"
              className="w-auto h-[190px] object-contain drop-shadow-[0_12px_24px_rgba(33,27,23,0.15)]"
              loading="lazy"
            />
          </picture>
        </div>

        {/* Full-width Responsive Button */}
        <div className="w-full mt-2">
          <button
            type="button"
            onClick={() => window.location.href = '/book-demo'}
            className="w-full py-3.5 px-6 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white font-bold text-[14px] transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg text-center"
          >
            Book a Free Demo
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

        {/* Character on Left (Overflowing top & bottom) */}
        <div className="absolute left-4 sm:left-8 lg:left-12 bottom-0 z-20 pointer-events-none">
          <picture>
            <source
              srcSet="/assets/characters/page5/cta-camera-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/page5/cta-camera-photographer.png"
              alt="StudioCore Photographer"
              className="w-auto h-[210px] sm:h-[240px] lg:h-[270px] max-w-none object-contain drop-shadow-[0_16px_28px_rgba(33,27,23,0.18)]"
              loading="lazy"
            />
          </picture>
        </div>

        {/* Text and Button content (Offset to the right of the character) */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pl-[150px] sm:pl-[200px] lg:pl-[240px]">
          <div>
            <h3 className="font-serif text-[24px] sm:text-[28px] lg:text-[32px] font-normal leading-tight text-[#211B17] mb-1">
              Not sure which plan is right for you?
            </h3>
            <p className="text-[13px] sm:text-[14px] text-[#746E67]">
              We'll help you find the perfect plan for your studio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.href = '/book-demo'}
            className="flex-shrink-0 px-6 sm:px-8 py-3 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white font-semibold text-[13.5px] transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg whitespace-nowrap"
          >
            Book a Free Demo
          </button>
        </div>
      </div>
    </div>
  );
};
