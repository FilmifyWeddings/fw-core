'use client';

import React from 'react';
import { CalendarCheck, RefreshCw, ShieldCheck, Zap } from 'lucide-react';

export const PricingBenefitsStrip: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 mb-16 select-none">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 items-center justify-items-center">
        {/* Benefit 1 */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#211B17]">7-Day Free Trial</div>
            <div className="text-[11px] text-[#746E67]">No credit card required</div>
          </div>
        </div>

        {/* Benefit 2 */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#211B17]">Cancel Anytime</div>
            <div className="text-[11px] text-[#746E67]">No questions asked</div>
          </div>
        </div>

        {/* Benefit 3 */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#211B17]">100% Secure</div>
            <div className="text-[11px] text-[#746E67]">Your data is always safe</div>
          </div>
        </div>

        {/* Benefit 4 */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#211B17]">Zero Setup Fee</div>
            <div className="text-[11px] text-[#746E67]">Get started in minutes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
