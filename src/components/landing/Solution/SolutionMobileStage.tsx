'use client';

import React from 'react';
import {
  ArrowUpRight,
  UserPlus,
  MessageCircle,
  FileText,
  CreditCard
} from 'lucide-react';

export const SolutionMobileStage: React.FC = () => {
  return (
    <div className="relative w-full max-w-[440px] sm:max-w-[560px] mx-auto flex items-center justify-center overflow-visible select-none my-4">
      {/* ========================================================= */}
      {/* 1. BACKGROUND: FULL-FEATURED MOBILE SOLUTION DASHBOARD */}
      {/* ========================================================= */}
      <div className="w-[335px] sm:w-[440px] bg-white rounded-[20px] border border-[#E9DFD2] p-3.5 sm:p-4 shadow-[0_20px_45px_-10px_rgba(33,27,23,0.12)] flex flex-col gap-3 relative z-10 ml-8 sm:ml-12">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE2]">
          <h4 className="font-serif text-[15px] sm:text-[18px] font-semibold text-[#211B17]">
            Dashboard
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-medium text-[#746E67]">Live Sync</span>
          </div>
        </div>

        {/* 4 Metrics (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {/* Metric 1 */}
          <div className="bg-[#FAF8F3]/90 p-1.5 sm:p-2 rounded-[8px] border border-[#F0E8DC]">
            <span className="text-[7.5px] sm:text-[9px] text-[#746E67] font-medium block">Total Leads</span>
            <div className="text-[13px] sm:text-[16px] font-bold text-[#211B17] leading-tight">342</div>
            <div className="flex items-center gap-0.5 text-[7.5px] sm:text-[8.5px] font-semibold text-[#2E7D32]">
              <ArrowUpRight className="w-2.5 h-2.5" />
              <span>+28% this month</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-[#FAF8F3]/90 p-1.5 sm:p-2 rounded-[8px] border border-[#F0E8DC]">
            <span className="text-[7.5px] sm:text-[9px] text-[#746E67] font-medium block">Bookings</span>
            <div className="text-[13px] sm:text-[16px] font-bold text-[#211B17] leading-tight">68</div>
            <div className="flex items-center gap-0.5 text-[7.5px] sm:text-[8.5px] font-semibold text-[#2E7D32]">
              <ArrowUpRight className="w-2.5 h-2.5" />
              <span>+17% this month</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-[#FAF8F3]/90 p-1.5 sm:p-2 rounded-[8px] border border-[#F0E8DC]">
            <span className="text-[7.5px] sm:text-[9px] text-[#746E67] font-medium block">Revenue</span>
            <div className="text-[13px] sm:text-[16px] font-bold text-[#211B17] leading-tight">â‚¹48,60,000</div>
            <div className="flex items-center gap-0.5 text-[7.5px] sm:text-[8.5px] font-semibold text-[#2E7D32]">
              <ArrowUpRight className="w-2.5 h-2.5" />
              <span>+31% this month</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-[#FAF8F3]/90 p-1.5 sm:p-2 rounded-[8px] border border-[#F0E8DC]">
            <span className="text-[7.5px] sm:text-[9px] text-[#746E67] font-medium block">Conversion Rate</span>
            <div className="text-[13px] sm:text-[16px] font-bold text-[#211B17] leading-tight">19%</div>
            <div className="flex items-center gap-0.5 text-[7.5px] sm:text-[8.5px] font-semibold text-[#2E7D32]">
              <ArrowUpRight className="w-2.5 h-2.5" />
              <span>+8% this month</span>
            </div>
          </div>
        </div>

        {/* Leads Overview SVG Line Chart */}
        <div className="bg-[#FAF8F3]/60 p-2 sm:p-2.5 rounded-[10px] border border-[#F0E8DC]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] sm:text-[11px] font-semibold text-[#211B17]">Leads Overview</span>
            <span className="text-[8px] sm:text-[9px] text-[#8C6D33] font-medium">â€¢ This Year</span>
          </div>

          <div className="w-full h-[65px] sm:h-[80px] relative">
            <svg viewBox="0 0 300 70" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="mobLeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid line */}
              <line x1="0" y1="35" x2="300" y2="35" stroke="#E9DFD2" strokeDasharray="3 3" strokeWidth="0.7" />

              {/* Gradient Area */}
              <polygon
                points="10,65 10,50 50,45 90,55 130,30 170,40 210,22 250,30 290,10 290,65"
                fill="url(#mobLeadGrad)"
              />

              {/* Spline */}
              <path
                d="M 10 50 L 50 45 L 90 55 L 130 30 L 170 40 L 210 22 L 250 30 L 290 10"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {[
                { cx: 10, cy: 50 },
                { cx: 50, cy: 45 },
                { cx: 90, cy: 55 },
                { cx: 130, cy: 30 },
                { cx: 170, cy: 40 },
                { cx: 210, cy: 22 },
                { cx: 250, cy: 30 },
                { cx: 290, cy: 10 },
              ].map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.cx}
                  cy={pt.cy}
                  r="2.5"
                  fill="#FFFFFF"
                  stroke="#2563EB"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </div>

          <div className="flex justify-between text-[7.5px] sm:text-[8.5px] text-[#99928A] px-1 mt-0.5 font-medium">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Aug</span>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-[#FAF8F3]/60 p-2 sm:p-2.5 rounded-[10px] border border-[#F0E8DC]">
          <span className="text-[9.5px] sm:text-[11px] font-semibold text-[#211B17] block mb-1.5">
            Recent Activity
          </span>

          <div className="space-y-1.5 text-[8px] sm:text-[9.5px]">
            {/* Item 1 */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[4px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-2.5 h-2.5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-[#211B17]">New lead from Meta Ads</span>
                <span className="text-[7px] text-[#99928A] ml-1">2m ago</span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[4px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-2.5 h-2.5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-[#211B17]">WhatsApp follow-up sent</span>
                <span className="text-[7px] text-[#99928A] ml-1">15m ago</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[4px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <FileText className="w-2.5 h-2.5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-[#211B17]">Quotation sent to Rohan & Priya</span>
                <span className="text-[7px] text-[#99928A] ml-1">45m ago</span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-[4px] bg-[#E8F8F0] text-[#00897B] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-2.5 h-2.5" />
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium text-[#211B17]">Payment received â€” Aarav & Diya</span>
                <span className="text-[7px] text-[#99928A] ml-1">1h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FOREGROUND: CONFIDENT PHOTOGRAPHER (Left Overlap) */}
      {/* ========================================================= */}
      <div className="solution-character absolute left-[-15px] sm:left-[-5px] bottom-[-15px] sm:bottom-[-20px] z-30 pointer-events-none select-none overflow-visible flex items-end justify-center">
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/solution/confident-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/solution/confident-photographer.png"
              alt="Confident StudioCore Photographer"
              className="w-auto h-[240px] sm:h-[290px] max-w-none object-contain drop-shadow-[0_15px_30px_rgba(33,27,23,0.18)]"
              loading="lazy"
            />
          </picture>
        </div>
      </div>
    </div>
  );
};
