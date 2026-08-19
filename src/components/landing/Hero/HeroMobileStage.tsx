'use client';

import React, { forwardRef } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CheckCircle2,
  Bell,
  Search,
  MessageSquare
} from 'lucide-react';

export interface HeroMobileStageProps {
  characterRef?: React.RefObject<HTMLDivElement | null>;
}

export const HeroMobileStage = forwardRef<HTMLDivElement, HeroMobileStageProps>(
  ({ characterRef }, _) => {
    return (
      <div className="relative w-full max-w-[420px] sm:max-w-[500px] h-[255px] sm:h-[300px] mx-auto flex items-center justify-center overflow-visible select-none my-5">
        {/* ========================================================= */}
        {/* 1. BACKGROUND: MOBILE SAAS DASHBOARD (Clearly Visible on Right) */}
        {/* ========================================================= */}
        <div className="w-[320px] sm:w-[420px] h-[220px] sm:h-[270px] bg-white rounded-[16px] border border-[#EBE3D5] shadow-[0_16px_36px_-8px_rgba(33,27,23,0.12)] overflow-hidden flex flex-col justify-between relative z-10 ml-8 sm:ml-12">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#F2ECE2] bg-[#FAF8F3]/80">
            <span className="font-serif text-[13.5px] sm:text-[15.5px] font-semibold text-[#211B17]">
              Dashboard
            </span>
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#746E67]" />
              <Bell className="w-3.5 h-3.5 text-[#746E67]" />
              <div className="w-4 h-4 rounded-full overflow-hidden border border-[#E9E1D5]">
                <img
                  src="/assets/images/avatars/avatar-01.webp"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 p-2 gap-2 bg-[#FFFDF8]/50 overflow-hidden">
            {/* Mini Sidebar */}
            <div className="w-[62px] sm:w-[82px] flex flex-col gap-1 border-r border-[#F2ECE2] pr-1 text-[8px] sm:text-[9.5px]">
              <div className="flex items-center gap-1 px-1 py-0.5 rounded-[4px] bg-[#FFF8E7] text-[#C89435] font-semibold">
                <LayoutDashboard className="w-2 h-2" />
                <span>Overview</span>
              </div>
              <div className="flex items-center gap-1 px-1 py-0.5 text-[#746E67]">
                <Users className="w-2 h-2" />
                <span>Leads</span>
              </div>
              <div className="flex items-center gap-1 px-1 py-0.5 text-[#746E67]">
                <CreditCard className="w-2 h-2" />
                <span>Payments</span>
              </div>
            </div>

            {/* Workspace Content (Visible Metrics & Lists) */}
            <div className="flex-1 flex flex-col gap-1.5 pl-1">
              {/* Stat Pills */}
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-[#FAF8F3] p-1.5 rounded-[6px] border border-[#F0E8DC]">
                  <div className="text-[7px] uppercase font-semibold text-[#99928A]">Bookings</div>
                  <div className="text-[11.5px] sm:text-[13.5px] font-bold text-[#211B17]">
                    42 <span className="text-[7.5px] text-[#2E7D32]">+12%</span>
                  </div>
                </div>
                <div className="bg-[#FAF8F3] p-1.5 rounded-[6px] border border-[#F0E8DC]">
                  <div className="text-[7px] uppercase font-semibold text-[#99928A]">Revenue</div>
                  <div className="text-[11.5px] sm:text-[13.5px] font-bold text-[#211B17]">
                    ₹24.8L
                  </div>
                </div>
              </div>

              {/* Mini Activities */}
              <div className="bg-[#FAF8F3] p-1.5 rounded-[6px] border border-[#F0E8DC] space-y-0.5 text-[8px] sm:text-[9.5px]">
                <div className="flex items-center justify-between font-semibold text-[#211B17] pb-0.5 border-b border-[#F0E8DC]">
                  <span>Recent Leads</span>
                  <span className="text-[#C89435]">View All</span>
                </div>
                <div className="flex items-center justify-between text-[#746E67]">
                  <span>Rohan & Priya</span>
                  <span className="text-[#2E7D32] font-semibold">₹1.8L</span>
                </div>
                <div className="flex items-center justify-between text-[#746E67]">
                  <span>Aarav & Diya</span>
                  <span className="text-[#2E7D32] font-semibold">₹2.4L</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. FOREGROUND: 3D PHOTOGRAPHER (Bigger & Balanced) */}
        {/* ========================================================= */}
        <div
          ref={characterRef}
          className="hero-character absolute left-[-10px] sm:left-[-2px] bottom-[-15px] sm:bottom-[-20px] z-30 pointer-events-none select-none overflow-visible flex items-end justify-center"
        >
          <div
            className="relative animate-character-idle overflow-visible"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
            }}
          >
            <picture>
              <source
                srcSet="/assets/characters/main-photographer/photographer-hero.webp"
                type="image/webp"
              />
              <img
                src="/assets/characters/main-photographer/photographer-hero.png"
                alt="StudioCore Photographer"
                className="w-auto h-[225px] sm:h-[265px] max-w-none object-contain drop-shadow-[0_12px_24px_rgba(33,27,23,0.18)]"
                loading="eager"
              />
            </picture>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. FLOATING NOTIFICATIONS (Far Right Side) */}
        {/* ========================================================= */}
        <div className="absolute right-[-8px] sm:right-[0px] top-[10px] z-35 flex flex-col gap-1.5 w-[128px] sm:w-[155px] pointer-events-none">
          {/* Card 1: New Lead */}
          <div className="bg-white/95 backdrop-blur-md rounded-[8px] border border-[#E9E1D5] p-1.5 shadow-[0_6px_16px_rgba(33,27,23,0.08)] flex items-center gap-1.5 transform rotate-1">
            <div className="w-4 h-4 rounded-[4px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
              <Users className="w-2.5 h-2.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[8.5px] font-bold text-[#211B17] truncate">New Lead</div>
              <div className="text-[7.5px] text-[#746E67] truncate">Rahul & Priya</div>
            </div>
          </div>

          {/* Card 2: Quotation Sent */}
          <div className="bg-white/95 backdrop-blur-md rounded-[8px] border border-[#E9E1D5] p-1.5 shadow-[0_6px_16px_rgba(33,27,23,0.08)] flex items-center gap-1.5 transform -rotate-1">
            <div className="w-4 h-4 rounded-[4px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[8.5px] font-bold text-[#211B17] truncate">Quotation</div>
              <div className="text-[8px] font-bold text-[#C89435]">₹1,80,000</div>
            </div>
          </div>

          {/* Card 3: Payment Received */}
          <div className="bg-white/95 backdrop-blur-md rounded-[8px] border border-[#E9E1D5] p-1.5 shadow-[0_6px_16px_rgba(33,27,23,0.08)] flex items-center gap-1.5 transform rotate-1">
            <div className="w-4 h-4 rounded-[4px] bg-[#E8F8F0] text-[#00897B] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[8.5px] font-bold text-[#211B17] truncate">Payment</div>
              <div className="text-[8px] font-bold text-[#2E7D32]">₹50,000</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

HeroMobileStage.displayName = 'HeroMobileStage';
