'use client';

import React from 'react';

export const ProblemDecorations: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-15 select-none overflow-visible">
      {/* 1. Upper Left: "So many follow-ups!" + Hand-drawn Arrow */}
      <div className="absolute top-[8%] left-[25%] xl:left-[27%] flex flex-col items-center opacity-85 transform -rotate-6">
        <span className="font-handwriting text-[23px] xl:text-[27px] text-[#8C7A68] leading-none font-semibold">
          So many<br />follow-ups!
        </span>
        {/* Hand-drawn curved arrow pointing to WhatsApp / Lead */}
        <svg
          className="w-14 h-12 text-[#A89885] mt-1 -ml-4"
          viewBox="0 0 60 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 10 8 Q 20 35 48 38" />
          <path d="M 40 28 L 49 38 L 36 44" />
        </svg>
      </div>

      {/* 2. Above Character Head: Chaotic Stress Scribble / Swirl */}
      <div className="absolute top-[8%] left-[49%] xl:left-[50%] -translate-x-1/2 opacity-75">
        <svg
          className="w-16 h-16 xl:w-20 xl:h-20 text-[#3A332E]"
          viewBox="0 0 80 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 40 40 Q 25 15 50 18 Q 70 20 60 45 Q 50 70 25 55 Q 10 40 30 25 Q 55 10 65 30 Q 75 55 45 65 Q 20 70 15 45 Q 10 20 40 15 Q 65 12 60 38 Q 55 60 35 55" />
        </svg>
      </div>

      {/* 3. Upper Right: "pending payments" + Hand-drawn Arrow */}
      <div className="absolute top-[8%] right-[2%] xl:right-[4%] flex flex-col items-start opacity-85 transform rotate-3">
        <span className="font-handwriting text-[22px] xl:text-[26px] text-[#8C7A68] leading-none font-semibold">
          pending<br />payments
        </span>
        {/* Hand-drawn curved arrow pointing down-left toward spreadsheet */}
        <svg
          className="w-14 h-12 text-[#A89885] mt-1 ml-1"
          viewBox="0 0 60 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 45 8 Q 30 25 12 36" />
          <path d="M 12 24 L 10 37 L 24 38" />
        </svg>
      </div>

      {/* 4. Mid Right: "team?" + Hand-drawn Arrow */}
      <div className="absolute top-[26%] right-[2%] xl:right-[4%] flex items-center gap-1.5 opacity-80 transform -rotate-3">
        <span className="font-handwriting text-[24px] xl:text-[28px] text-[#8C7A68] font-semibold">
          team?
        </span>
        <svg
          className="w-12 h-10 text-[#A89885]"
          viewBox="0 0 50 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 42 12 Q 25 15 8 26" />
          <path d="M 16 16 L 7 26 L 18 30" />
        </svg>
      </div>

      {/* 5. Far Right: "deliveries?" + Hand-drawn Arrow */}
      <div className="absolute top-[52%] right-[0%] xl:right-[1%] flex items-center gap-1.5 opacity-80 transform rotate-2">
        <span className="font-handwriting text-[22px] xl:text-[26px] text-[#8C7A68] font-semibold">
          deliveries?
        </span>
        <svg
          className="w-12 h-10 text-[#A89885]"
          viewBox="0 0 50 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 40 10 Q 25 20 10 24" />
          <path d="M 20 16 L 8 24 L 18 30" />
        </svg>
      </div>

      {/* 6. Desk Items Left (Above Laptop on Desk) */}
      {/* Checklist Card: "Don't Forget" */}
      <div className="absolute bottom-[24%] left-[11%] xl:left-[13%] bg-white/95 rounded-[12px] p-3 border border-[#E9DFD2] shadow-[0_8px_20px_-4px_rgba(33,27,23,0.08)] transform -rotate-3 w-[115px] z-30 pointer-events-auto">
        <div className="font-handwriting text-[16px] font-bold text-[#211B17] border-b border-[#F2ECE2] pb-1 mb-1 text-center">
          Don't Forget
        </div>
        <div className="space-y-0.5 font-handwriting text-[13px] text-[#554E48]">
          <div className="flex items-center gap-1">
            <span className="text-[#C89435] font-bold">☑</span>
            <span>Follow-up</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#C89435] font-bold">☑</span>
            <span>Payment</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#C89435] font-bold">☑</span>
            <span>Shoot</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#C89435] font-bold">☑</span>
            <span>Edit</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#C89435] font-bold">☑</span>
            <span>Album</span>
          </div>
        </div>
      </div>

      {/* Yellow Sticky Note: "Too Many Things!" */}
      <div className="absolute bottom-[20%] left-[20%] xl:left-[22%] bg-[#FFF59D] rounded-[4px] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.08)] transform rotate-4 w-[95px] h-[90px] flex items-center justify-center text-center z-30 pointer-events-auto">
        <span className="font-handwriting text-[18px] font-bold text-[#423C37] leading-tight">
          Too Many<br />Things!
        </span>
      </div>

      {/* 7. Desk Items Right (Beside Camera / Mug) */}
      {/* Pink Sticky Note: "Send Quotation Today!" */}
      <div className="absolute bottom-[18%] right-[11%] xl:right-[13%] bg-[#FFCDD2] rounded-[4px] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.08)] transform -rotate-3 w-[92px] h-[92px] flex items-center justify-center text-center z-30 pointer-events-auto">
        <span className="font-handwriting text-[16px] font-bold text-[#5C2B29] leading-tight">
          Send<br />Quotation<br />Today!
        </span>
      </div>

      {/* Yellow Sticky Note: "Call back Rohan 7 PM" */}
      <div className="absolute bottom-[36%] right-[5%] xl:right-[7%] bg-[#FFF9C4] rounded-[4px] p-2.5 shadow-[0_6px_14px_rgba(0,0,0,0.06)] transform rotate-6 w-[88px] flex items-center justify-center text-center z-30 pointer-events-auto">
        <span className="font-handwriting text-[14px] font-semibold text-[#5D4037] leading-tight">
          Call back<br />Rohan<br />7 PM
        </span>
      </div>
    </div>
  );
};
