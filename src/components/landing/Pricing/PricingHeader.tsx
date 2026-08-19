'use client';

import { forwardRef } from 'react';

export const PricingHeader = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full text-center mb-8 sm:mb-10 select-none">
      <h2 className="font-serif text-[40px] sm:text-[48px] lg:text-[54px] font-normal leading-[1.08] tracking-tight text-[#211B17] mb-3">
        <span>Simple, Transparent Pricing. </span>
        <br className="hidden sm:block" />
        <span className="text-[#C89435] italic drop-shadow-[0_2px_10px_rgba(200,148,53,0.12)]">
          Built for Every Photography Business.
        </span>
      </h2>
      <p className="text-[14px] sm:text-[15px] lg:text-[16px] text-[#746E67] max-w-2xl mx-auto leading-relaxed">
        Choose the perfect plan for your studio. Upgrade or downgrade anytime.
        <br className="hidden sm:block" />
        No hidden charges. Cancel anytime.
      </p>
    </div>
  );
});

PricingHeader.displayName = 'PricingHeader';
