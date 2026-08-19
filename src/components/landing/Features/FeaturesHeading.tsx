'use client';

import { forwardRef } from 'react';

export const FeaturesHeading = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full text-center mb-8 sm:mb-10 select-none">
      <h2 className="font-serif text-[40px] sm:text-[48px] lg:text-[54px] font-normal leading-[1.05] tracking-tight text-[#211B17]">
        <span>Everything You Need. </span>
        <span className="text-[#C89435] italic drop-shadow-[0_2px_10px_rgba(200,148,53,0.12)]">
          In One Place.
        </span>
      </h2>
    </div>
  );
});

FeaturesHeading.displayName = 'FeaturesHeading';
