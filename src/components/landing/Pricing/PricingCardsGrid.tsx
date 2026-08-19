'use client';

import React from 'react';
import { Sprout, TrendingUp, Crown, Building2, CheckCircle2 } from 'lucide-react';

export interface PricingCardsGridProps {
  isYearly: boolean;
}

export const PricingCardsGrid: React.FC<PricingCardsGridProps> = ({ isYearly }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mb-12 select-none items-stretch">
      {/* 1. Starter */}
      <div className="bg-[#FFFCF8] rounded-[20px] border border-[#E9E0D4] p-6 lg:p-7 flex flex-col justify-between shadow-[0_8px_24px_rgba(33,27,23,0.03)] hover:shadow-[0_14px_32px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
        <div>
          <div className="w-8 h-8 rounded-[8px] bg-[#FFF8E7] text-[#C89435] flex items-center justify-center mb-4">
            <Sprout className="w-4 h-4" />
          </div>
          <h3 className="text-[20px] font-bold text-[#211B17] mb-1">Starter</h3>
          <p className="text-[12px] text-[#746E67] leading-relaxed mb-6">
            Perfect for solo photographers just getting started.
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[34px] lg:text-[38px] font-bold text-[#211B17]">
                {isYearly ? 'â‚¹799' : 'â‚¹999'}
              </span>
              <span className="text-[13px] text-[#746E67]">/month</span>
            </div>
            <div className="text-[11px] text-[#99928A] mt-0.5">
              {isYearly ? 'Billed annually (â‚¹9,588/yr)' : 'Billed monthly'}
            </div>
          </div>

          <div className="space-y-2.5 text-[12.5px] text-[#4A443E] pt-4 border-t border-[#F0E8DC]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>Lead Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>Client Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>Quotations & Invoices</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>Basic Reports</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>WhatsApp Integration</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89435] flex-shrink-0" />
              <span>Email Support</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = '/login'}
          className="w-full mt-8 py-2.5 rounded-full border border-[#E9E0D4] bg-white hover:bg-[#FAF7F1] text-[#211B17] font-semibold text-[13px] transition-all duration-200 cursor-pointer shadow-xs"
        >
          Start Free Trial
        </button>
      </div>

      {/* 2. Growth (MOST POPULAR) */}
      <div className="bg-[#FFFCF8] rounded-[20px] border-2 border-[#C89435] p-6 lg:p-7 flex flex-col justify-between shadow-[0_12px_36px_rgba(200,148,53,0.12)] relative hover:-translate-y-1 transition-all duration-300">
        {/* Most Popular Badge */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] px-3 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase shadow-xs">
          Most Popular
        </div>

        <div>
          <div className="w-8 h-8 rounded-[8px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mb-4">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-[20px] font-bold text-[#211B17] mb-1">Growth</h3>
          <p className="text-[12px] text-[#746E67] leading-relaxed mb-6">
            Ideal for growing studios and small teams.
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[34px] lg:text-[38px] font-bold text-[#211B17]">
                {isYearly ? 'â‚¹1,999' : 'â‚¹2,499'}
              </span>
              <span className="text-[13px] text-[#746E67]">/month</span>
            </div>
            <div className="text-[11px] text-[#99928A] mt-0.5">
              {isYearly ? 'Billed annually (â‚¹23,988/yr)' : 'Billed monthly'}
            </div>
          </div>

          <div className="text-[11.5px] font-semibold text-[#211B17] mb-2.5 pt-4 border-t border-[#F0E8DC]">
            Everything in Starter, plus:
          </div>

          <div className="space-y-2.5 text-[12.5px] text-[#4A443E]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Advanced Automation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Team Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Payment Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Post-production Workflow</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Custom Reports</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
              <span>Priority Support</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = '/login'}
          className="w-full mt-8 py-2.5 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white font-semibold text-[13px] transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
        >
          Start Free Trial
        </button>
      </div>

      {/* 3. Pro */}
      <div className="bg-[#FFFCF8] rounded-[20px] border border-[#E9E0D4] p-6 lg:p-7 flex flex-col justify-between shadow-[0_8px_24px_rgba(33,27,23,0.03)] hover:shadow-[0_14px_32px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
        <div>
          <div className="w-8 h-8 rounded-[8px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center mb-4">
            <Crown className="w-4 h-4" />
          </div>
          <h3 className="text-[20px] font-bold text-[#211B17] mb-1">Pro</h3>
          <p className="text-[12px] text-[#746E67] leading-relaxed mb-6">
            For established studios with multiple teams.
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[34px] lg:text-[38px] font-bold text-[#211B17]">
                {isYearly ? 'â‚¹3,999' : 'â‚¹4,999'}
              </span>
              <span className="text-[13px] text-[#746E67]">/month</span>
            </div>
            <div className="text-[11px] text-[#99928A] mt-0.5">
              {isYearly ? 'Billed annually (â‚¹47,988/yr)' : 'Billed monthly'}
            </div>
          </div>

          <div className="text-[11.5px] font-semibold text-[#211B17] mb-2.5 pt-4 border-t border-[#F0E8DC]">
            Everything in Growth, plus:
          </div>

          <div className="space-y-2.5 text-[12.5px] text-[#4A443E]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>Multi-studio Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>Advanced Permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>Inventory Management</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>Advanced Reports</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>API Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5E35B1] flex-shrink-0" />
              <span>Phone Support</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = '/login'}
          className="w-full mt-8 py-2.5 rounded-full border border-[#E9E0D4] bg-white hover:bg-[#FAF7F1] text-[#211B17] font-semibold text-[13px] transition-all duration-200 cursor-pointer shadow-xs"
        >
          Start Free Trial
        </button>
      </div>

      {/* 4. Enterprise */}
      <div className="bg-[#FFFCF8] rounded-[20px] border border-[#E9E0D4] p-6 lg:p-7 flex flex-col justify-between shadow-[0_8px_24px_rgba(33,27,23,0.03)] hover:shadow-[0_14px_32px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
        <div>
          <div className="w-8 h-8 rounded-[8px] bg-[#FFEBEE] text-[#E53935] flex items-center justify-center mb-4">
            <Building2 className="w-4 h-4" />
          </div>
          <h3 className="text-[20px] font-bold text-[#211B17] mb-1">Enterprise</h3>
          <p className="text-[12px] text-[#746E67] leading-relaxed mb-6">
            For large studios and enterprises with advanced needs.
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[34px] lg:text-[38px] font-bold text-[#211B17]">
                Custom
              </span>
            </div>
            <div className="text-[11px] text-[#99928A] mt-0.5">
              Billed annually
            </div>
          </div>

          <div className="text-[11.5px] font-semibold text-[#211B17] mb-2.5 pt-4 border-t border-[#F0E8DC]">
            Everything in Pro, plus:
          </div>

          <div className="space-y-2.5 text-[12.5px] text-[#4A443E]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>Dedicated Account Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>Custom Integrations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>White-label Options</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>Advanced Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>SLA & Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E53935] flex-shrink-0" />
              <span>Onboarding & Training</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = '/book-demo'}
          className="w-full mt-8 py-2.5 rounded-full border border-[#E9E0D4] bg-white hover:bg-[#FAF7F1] text-[#211B17] font-semibold text-[13px] transition-all duration-200 cursor-pointer shadow-xs"
        >
          Contact Sales
        </button>
      </div>
    </div>
  );
};
