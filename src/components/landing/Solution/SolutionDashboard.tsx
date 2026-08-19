'use client';

import { forwardRef } from 'react';
import {
  ArrowUpRight,
  UserPlus,
  MessageCircle,
  FileText,
  CreditCard,
  Camera,
  ChevronDown
} from 'lucide-react';

export interface SolutionDashboardProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SolutionDashboard = forwardRef<HTMLDivElement, SolutionDashboardProps>(
  ({ className = '', style }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-[22px] border border-[#E9DFD2] p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(33,27,23,0.1),0_8px_20px_-4px_rgba(33,27,23,0.03)] select-none pointer-events-auto w-full max-w-[680px] xl:max-w-[740px] ${className}`}
        style={style}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F2ECE2]">
          <h4 className="font-serif text-[22px] sm:text-[24px] font-semibold text-[#211B17]">
            Dashboard
          </h4>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="text-[11px] font-medium text-[#746E67]">Live Sync</span>
          </div>
        </div>

        {/* 4 Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
          {/* Card 1 */}
          <div className="bg-[#FAF8F3]/70 p-3 rounded-[12px] border border-[#F0E8DC]">
            <span className="text-[10px] text-[#746E67] font-medium block mb-1">Total Leads</span>
            <div className="text-[18px] sm:text-[20px] font-bold text-[#211B17] leading-tight mb-1">342</div>
            <div className="flex items-center gap-0.5 text-[9.5px] font-medium text-[#2E7D32]">
              <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
              <span>+28% this month</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FAF8F3]/70 p-3 rounded-[12px] border border-[#F0E8DC]">
            <span className="text-[10px] text-[#746E67] font-medium block mb-1">Bookings</span>
            <div className="text-[18px] sm:text-[20px] font-bold text-[#211B17] leading-tight mb-1">68</div>
            <div className="flex items-center gap-0.5 text-[9.5px] font-medium text-[#2E7D32]">
              <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
              <span>+17% this month</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#FAF8F3]/70 p-3 rounded-[12px] border border-[#F0E8DC]">
            <span className="text-[10px] text-[#746E67] font-medium block mb-1">Revenue</span>
            <div className="text-[16px] sm:text-[18px] font-bold text-[#211B17] leading-tight mb-1 tracking-tight">₹48,60,000</div>
            <div className="flex items-center gap-0.5 text-[9.5px] font-medium text-[#2E7D32]">
              <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
              <span>+31% this month</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FAF8F3]/70 p-3 rounded-[12px] border border-[#F0E8DC]">
            <span className="text-[10px] text-[#746E67] font-medium block mb-1">Conversion Rate</span>
            <div className="text-[18px] sm:text-[20px] font-bold text-[#211B17] leading-tight mb-1">19%</div>
            <div className="flex items-center gap-0.5 text-[9.5px] font-medium text-[#2E7D32]">
              <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
              <span>+8% this month</span>
            </div>
          </div>
        </div>

        {/* Lower Split: Leads Overview Line Chart + Recent Activity Feed */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Chart Area (7 Cols) */}
          <div className="md:col-span-7 bg-[#FAF8F3]/50 p-3.5 rounded-[14px] border border-[#F0E8DC] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-[#211B17]">Leads Overview</span>
              <div className="flex items-center gap-2 text-[10px] text-[#746E67]">
                <div className="flex items-center gap-0.5 cursor-pointer hover:text-[#211B17]">
                  <span>6 Months</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
                <span className="w-1 h-1 rounded-full bg-[#99928A]" />
                <span className="text-[#8C6D33] font-medium">• This Year</span>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="w-full h-[150px] relative">
              <svg viewBox="0 0 320 130" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="leadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2="320" y2="20" stroke="#E9DFD2" strokeDasharray="3 3" strokeWidth="0.8" />
                <line x1="0" y1="55" x2="320" y2="55" stroke="#E9DFD2" strokeDasharray="3 3" strokeWidth="0.8" />
                <line x1="0" y1="90" x2="320" y2="90" stroke="#E9DFD2" strokeDasharray="3 3" strokeWidth="0.8" />

                {/* Filled Area */}
                <polygon
                  points="20,110 20,85 60,75 100,90 140,55 180,68 220,40 260,52 300,22 300,110"
                  fill="url(#leadGrad)"
                />

                {/* Spline Path */}
                <path
                  d="M 20 85 L 60 75 L 100 90 L 140 55 L 180 68 L 220 40 L 260 52 L 300 22"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {[
                  { cx: 20, cy: 85 },
                  { cx: 60, cy: 75 },
                  { cx: 100, cy: 90 },
                  { cx: 140, cy: 55 },
                  { cx: 180, cy: 68 },
                  { cx: 220, cy: 40 },
                  { cx: 260, cy: 52 },
                  { cx: 300, cy: 22 },
                ].map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="3.5"
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              {/* Month Labels */}
              <div className="flex justify-between text-[9px] text-[#99928A] px-1 mt-1 font-medium">
                <span>Jan</span>
                <span>Feb</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
              </div>
            </div>
          </div>

          {/* Right Recent Activity (5 Cols) */}
          <div className="md:col-span-5 bg-[#FAF8F3]/50 p-3.5 rounded-[14px] border border-[#F0E8DC]">
            <span className="text-[12px] font-semibold text-[#211B17] block mb-2.5">
              Recent Activity
            </span>

            <div className="space-y-2 text-[10.5px]">
              {/* Activity 1 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserPlus className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#211B17] truncate leading-tight">New lead from Meta Ads</div>
                  <div className="text-[8.5px] text-[#99928A]">2 min ago</div>
                </div>
              </div>

              {/* Activity 2 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageCircle className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#211B17] truncate leading-tight">WhatsApp follow-up sent</div>
                  <div className="text-[8.5px] text-[#99928A]">15 min ago</div>
                </div>
              </div>

              {/* Activity 3 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#211B17] truncate leading-tight">Quotation sent to Rohan & Priya</div>
                  <div className="text-[8.5px] text-[#99928A]">45 min ago</div>
                </div>
              </div>

              {/* Activity 4 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#E8F8F0] text-[#00897B] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#211B17] truncate leading-tight">Payment received from Aarav & Diya</div>
                  <div className="text-[8.5px] text-[#99928A]">1 hr ago</div>
                </div>
              </div>

              {/* Activity 5 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-[5px] bg-[#F3E5F5] text-[#7B1FA2] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Camera className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[#211B17] truncate leading-tight">Shoot completed — Karan & Anjali</div>
                  <div className="text-[8.5px] text-[#99928A]">3 hrs ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SolutionDashboard.displayName = 'SolutionDashboard';
