'use client';

import React from 'react';
import {
  MessageCircle,
  PhoneCall,
  UserPlus,
  Users,
  Clock
} from 'lucide-react';

export const ProblemMobileStage: React.FC = () => {
  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[540px] h-[330px] sm:h-[400px] mx-auto flex items-center justify-center overflow-visible select-none my-4">
      {/* ========================================================= */}
      {/* 1. STICKY NOTES & HANDWRITTEN DECORATIONS (Floating Motion) */}
      {/* ========================================================= */}
      {/* Sticky Note 1 (Top Left): Don't Forget */}
      <div className="absolute left-[2%] sm:left-[5%] top-[5px] z-10 bg-[#FFF9C4] border border-[#FFF176] rounded-[6px] p-2 shadow-[0_4px_12px_rgba(33,27,23,0.08)] transform -rotate-6 w-[80px] sm:w-[95px] text-[8px] sm:text-[9px] animate-float-slow">
        <div className="font-bold text-[#8C6D33] text-[9px] sm:text-[10px] mb-1">Don't Forget</div>
        <div className="space-y-0.5 text-[#5D4037]">
          <div>â˜‘ Follow-up</div>
          <div>â˜‘ Payment</div>
          <div>â˜‘ Edit</div>
          <div>â˜‘ Album</div>
        </div>
      </div>

      {/* Sticky Note 2 (Top Left Center): Too Many Things! */}
      <div className="absolute left-[25%] sm:left-[28%] top-[10px] z-10 bg-[#FFEB3B]/80 border border-[#FDD835] rounded-[4px] px-2 py-1 shadow-sm transform rotate-3 text-[8.5px] sm:text-[10px] font-bold text-[#E65100] animate-float-fast">
        Too Many Things!
      </div>

      {/* Sticky Note 3 (Top Right): Send Quotation */}
      <div className="absolute right-[12%] sm:right-[15%] top-[5px] z-10 bg-[#FFCDD2] border border-[#EF9A9A] rounded-[6px] p-1.5 shadow-[0_4px_12px_rgba(33,27,23,0.08)] transform rotate-6 w-[75px] sm:w-[90px] text-[8px] sm:text-[9px] text-[#C62828] font-semibold animate-float-delayed">
        Send Quotation Today!
      </div>

      {/* Sticky Note 4 (Far Top Right): Call back */}
      <div className="absolute right-[1%] sm:right-[3%] top-[15px] z-10 bg-[#FFF59D] border border-[#FFEE58] rounded-[4px] p-1 shadow-xs transform -rotate-3 text-[7.5px] sm:text-[8.5px] text-[#F57F17] font-medium animate-float-slow">
        Call back Rohan 7 PM
      </div>

      {/* ========================================================= */}
      {/* 2. FLOATING CHAOS NOTIFICATION CARDS (Floating Motion) */}
      {/* ========================================================= */}
      {/* Card: New Lead (Upper Left) */}
      <div className="absolute left-[-5px] sm:left-[10px] top-[70px] z-15 bg-white/95 backdrop-blur-md rounded-[10px] border border-[#E9E1D5] p-1.5 shadow-[0_8px_20px_rgba(33,27,23,0.08)] flex items-center gap-1.5 w-[130px] sm:w-[155px] transform -rotate-2 animate-float-fast">
        <div className="w-5 h-5 rounded-[5px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">New Lead</div>
          <div className="text-[7.5px] sm:text-[8.5px] text-[#746E67] truncate">Rahul & Priya</div>
        </div>
      </div>

      {/* Card: WhatsApp (Mid Left) */}
      <div className="absolute left-[-10px] sm:left-[5px] top-[125px] z-15 bg-white/95 backdrop-blur-md rounded-[10px] border border-[#E9E1D5] p-1.5 shadow-[0_8px_20px_rgba(33,27,23,0.08)] flex items-center gap-1.5 w-[140px] sm:w-[165px] transform rotate-2 animate-float-slow">
        <div className="w-5 h-5 rounded-[5px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">WhatsApp</div>
          <div className="text-[7px] sm:text-[8px] text-[#746E67] truncate">Share your packages?</div>
        </div>
      </div>

      {/* Card: Missed Call (Lower Left) */}
      <div className="absolute left-[-5px] sm:left-[10px] top-[180px] z-15 bg-white/95 backdrop-blur-md rounded-[10px] border border-[#E9E1D5] p-1.5 shadow-[0_8px_20px_rgba(33,27,23,0.08)] flex items-center gap-1.5 w-[130px] sm:w-[155px] transform -rotate-1 animate-float-delayed">
        <div className="w-5 h-5 rounded-[5px] bg-[#F3E5F5] text-[#7B1FA2] flex items-center justify-center flex-shrink-0">
          <PhoneCall className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">Missed Call</div>
          <div className="text-[7px] sm:text-[8px] text-[#746E67] truncate">Akshay & Sneha</div>
        </div>
      </div>

      {/* Card: Payment Tracking (Upper Right) */}
      <div className="absolute right-[-5px] sm:right-[10px] top-[55px] z-15 bg-white/95 backdrop-blur-md rounded-[10px] border border-[#E9E1D5] p-2 shadow-[0_8px_20px_rgba(33,27,23,0.08)] w-[145px] sm:w-[175px] transform rotate-2 animate-float-fast">
        <div className="flex items-center justify-between pb-1 border-b border-[#F0E8DC] mb-1">
          <span className="text-[8px] sm:text-[9px] font-bold text-[#211B17]">Payment Tracking.xlsx</span>
        </div>
        <div className="text-[7px] sm:text-[8px] space-y-0.5">
          <div className="flex justify-between text-[#746E67]">
            <span>Aarav & Diya</span>
            <span className="text-[#C62828] font-semibold">â‚¹1,30,000 due</span>
          </div>
          <div className="flex justify-between text-[#746E67]">
            <span>Rohan & Priya</span>
            <span className="text-[#C62828] font-semibold">â‚¹1,40,000 due</span>
          </div>
        </div>
      </div>

      {/* Card: Team Group (Mid Right) */}
      <div className="absolute right-[-10px] sm:right-[5px] top-[125px] z-15 bg-white/95 backdrop-blur-md rounded-[10px] border border-[#E9E1D5] p-1.5 shadow-[0_8px_20px_rgba(33,27,23,0.08)] flex items-center gap-1.5 w-[140px] sm:w-[165px] transform -rotate-1 animate-float-slow">
        <div className="w-5 h-5 rounded-[5px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
          <Users className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17] truncate">Team Group</div>
          <div className="text-[7px] sm:text-[8px] text-[#746E67] truncate">Who is available on 12th?</div>
        </div>
      </div>

      {/* Card: Follow-up Reminder (Foreground Right) */}
      <div className="absolute right-[5px] sm:right-[25px] bottom-[15px] z-30 bg-white/95 backdrop-blur-md rounded-[12px] border border-[#E9E1D5] p-2 shadow-[0_12px_28px_rgba(33,27,23,0.12)] w-[145px] sm:w-[170px] animate-float-delayed">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[#F0E8DC] mb-1">
          <Clock className="w-3 h-3 text-[#C89435]" />
          <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#211B17]">Follow-up Reminder</span>
        </div>
        <div className="space-y-1 text-[7.5px] sm:text-[8.5px]">
          <div className="flex justify-between items-center text-[#746E67]">
            <span>Rohan & Priya</span>
            <span className="px-1 py-0.2 bg-[#FFEBEE] text-[#C62828] font-bold rounded text-[7px]">Today</span>
          </div>
          <div className="flex justify-between items-center text-[#746E67]">
            <span>Aarav & Diya</span>
            <span className="px-1 py-0.2 bg-[#FFF8E1] text-[#F57F17] font-bold rounded text-[7px]">Tomorrow</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CENTER: STRESSED PHOTOGRAPHER AT DESK */}
      {/* ========================================================= */}
      <div className="problem-character absolute left-1/2 -translate-x-1/2 bottom-[-10px] z-20 pointer-events-none select-none flex items-end justify-center">
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/problem/problem-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/problem/problem-photographer.png"
              alt="Stressed Photographer overwhelmed by disconnected tools"
              className="w-auto h-[260px] sm:h-[320px] max-w-none object-contain drop-shadow-[0_12px_28px_rgba(33,27,23,0.14)]"
              loading="eager"
            />
          </picture>
        </div>
      </div>
    </div>
  );
};
