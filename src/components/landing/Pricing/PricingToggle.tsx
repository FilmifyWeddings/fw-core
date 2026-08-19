'use client';

import React from 'react';

export interface PricingToggleProps {
  isYearly: boolean;
  onChange: (isYearly: boolean) => void;
}

export const PricingToggle: React.FC<PricingToggleProps> = ({ isYearly, onChange }) => {
  return (
    <div className="flex items-center justify-center mb-10 sm:mb-12 select-none">
      <div className="bg-[#FAF7F1] p-1 rounded-full border border-[#E9E0D4] inline-flex items-center shadow-xs">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-5 sm:px-6 py-2 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 cursor-pointer ${
            !isYearly
              ? 'bg-white text-[#211B17] shadow-sm font-semibold'
              : 'text-[#746E67] hover:text-[#211B17]'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-5 sm:px-6 py-2 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            isYearly
              ? 'bg-white text-[#211B17] shadow-sm font-semibold'
              : 'text-[#746E67] hover:text-[#211B17]'
          }`}
        >
          <span>Yearly</span>
          <span className="text-[11px] font-bold text-[#C89435] bg-[#FFF8E7] px-2 py-0.5 rounded-full border border-[#F3E5C8]">
            Save 20%
          </span>
        </button>
      </div>
    </div>
  );
};
