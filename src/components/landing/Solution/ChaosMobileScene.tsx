'use client';

import React from 'react';
import {
  UserPlus,
  MessageCircle,
  Clapperboard,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

export const ChaosMobileScene: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center select-none pt-2 pb-6">
      {/* 1. Top Editorial Headlines */}
      <div className="w-full text-center max-w-sm sm:max-w-md mx-auto mb-3">
        <h3 className="font-serif text-[26px] sm:text-[32px] font-normal leading-[1.08] text-[#211B17] tracking-tight">
          You didn't start photography to{' '}
          <span className="italic text-[#C89435]">manage spreadsheets.</span>
        </h3>
        <p className="font-serif text-[17px] sm:text-[20px] font-normal text-[#746E67] mt-1">
          You started to create memories.
        </p>
      </div>

      {/* 2. Unified Responsive Chaos Stage (Character + Floating Cards on Sides) */}
      <div className="relative w-full max-w-[420px] sm:max-w-[540px] h-[330px] sm:h-[390px] mx-auto flex items-center justify-center overflow-visible my-1">
        {/* ========================================================= */}
        {/* LEFT FLOATING CARDS & STICKY NOTES */}
        {/* ========================================================= */}
        {/* 1. New Lead */}
        <div className="absolute left-[-10px] sm:left-[5px] top-[25px] z-25 bg-white/95 backdrop-blur-sm rounded-[10px] p-2 border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.08)] transform -rotate-2 w-[130px] sm:w-[155px] animate-float-slow">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-[5px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-3 h-3" />
            </div>
            <div className="min-w-0">
              <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">New Lead</div>
              <div className="text-[7.5px] sm:text-[8.5px] text-[#746E67] truncate">Rahul & Priya</div>
            </div>
          </div>
        </div>

        {/* 2. WhatsApp */}
        <div className="absolute left-[-15px] sm:left-[0px] top-[95px] z-25 bg-white/95 backdrop-blur-sm rounded-[10px] p-2 border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.08)] transform rotate-1 w-[135px] sm:w-[160px] animate-float-fast">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-[5px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17]">WhatsApp</div>
                <div className="text-[7px] sm:text-[8px] text-[#746E67] truncate">30 Unread</div>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 text-[#99928A]" />
          </div>
        </div>

        {/* 3. Follow-up Sticky Note Stack */}
        <div className="absolute left-[-8px] sm:left-[10px] bottom-[20px] z-30 bg-[#FFF9C4] p-2 rounded-[6px] border border-[#FFF176] shadow-[0_6px_16px_rgba(33,27,23,0.08)] transform -rotate-3 w-[110px] sm:w-[130px] animate-float-delayed">
          <div className="font-handwriting text-[10.5px] sm:text-[12px] font-bold text-[#5D4037] mb-0.5">
            Follow-up Today
          </div>
          <div className="font-handwriting text-[9px] sm:text-[10px] text-[#6D4C41] space-y-0.5 pl-0.5">
            <div>â€¢ Leads (3)</div>
            <div>â€¢ Rohan & Priya</div>
            <div>â€¢ Karan (Shoot)</div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT FLOATING CARDS & STICKY NOTES */}
        {/* ========================================================= */}
        {/* 4. Editing Pending */}
        <div className="absolute right-[-10px] sm:right-[5px] top-[20px] z-25 bg-white/95 backdrop-blur-sm rounded-[10px] p-2 border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.08)] transform rotate-1 w-[135px] sm:w-[160px] animate-float-fast">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-[5px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center flex-shrink-0">
                <Clapperboard className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">Editing</div>
                <div className="text-[7.5px] sm:text-[8.5px] text-[#746E67] truncate">3 Projects</div>
              </div>
            </div>
            <span className="w-3.5 h-3.5 rounded-full bg-[#D32F2F] text-white text-[7.5px] font-bold flex items-center justify-center">
              3
            </span>
          </div>
        </div>

        {/* 5. Invoice #INV-1023 (Paid) */}
        <div className="absolute right-[-15px] sm:right-[0px] top-[85px] z-25 bg-white/95 backdrop-blur-sm rounded-[12px] p-2 border border-[#E4D7C4] shadow-[0_10px_24px_rgba(33,27,23,0.1)] transform -rotate-1 w-[140px] sm:w-[165px] animate-float-slow">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#F2ECE2]">
            <span className="text-[8px] font-bold text-[#211B17]">#INV-1023</span>
            <span className="text-[7.5px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.2 rounded-full border border-[#C8E6C9]">
              PAID
            </span>
          </div>
          <div className="text-[8px] font-semibold text-[#211B17] truncate">Aarav & Diya</div>
          <div className="text-[11px] sm:text-[12px] font-bold text-[#211B17] mt-0.5">â‚¹1,80,000</div>
        </div>

        {/* 6. Client Deliverables */}
        <div className="absolute right-[-8px] sm:right-[10px] bottom-[20px] z-30 bg-white/95 backdrop-blur-sm rounded-[10px] p-2 border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.08)] transform rotate-2 w-[135px] sm:w-[160px] animate-float-delayed">
          <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-[#F2ECE2]">
            <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
            <span className="text-[8px] sm:text-[9px] font-bold text-[#211B17]">Deliverables</span>
          </div>
          <div className="space-y-0.5 text-[7.5px] sm:text-[8.5px]">
            <div className="flex items-center gap-1 text-[#746E67]">
              <FileSpreadsheet className="w-2.5 h-2.5 text-[#E65100]" />
              <span className="truncate">Rohan & Priya (Teaser)</span>
            </div>
            <div className="flex items-center gap-1 text-[#746E67]">
              <FileSpreadsheet className="w-2.5 h-2.5 text-[#1976D2]" />
              <span className="truncate">Aarav & Diya (Album)</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER: STRESSED PHOTOGRAPHER */}
        {/* ========================================================= */}
        <div className="chaos-character absolute left-1/2 -translate-x-1/2 bottom-[-10px] z-20 pointer-events-none select-none flex items-end justify-center">
          <div
            className="relative animate-character-idle overflow-visible"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            }}
          >
            <picture>
              <source
                srcSet="/assets/characters/solution/chaos-photographer.webp"
                type="image/webp"
              />
              <img
                src="/assets/characters/solution/chaos-photographer.png"
                alt="Stressed Photographer overwhelmed with spreadsheets and tools"
                className="w-auto h-[260px] sm:h-[320px] max-w-none object-contain drop-shadow-[0_15px_30px_rgba(33,27,23,0.16)]"
                loading="eager"
              />
            </picture>
          </div>
        </div>
      </div>
    </div>
  );
};
