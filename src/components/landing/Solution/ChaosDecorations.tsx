'use client';

import React from 'react';

export const ChaosDecorations: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10 select-none overflow-hidden">
      {/* Full-width Warm Parchment Vignette Glow */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#F5EEE4]/85 via-[#FAF4EA]/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute top-[5%] left-0 right-0 h-[450px] bg-gradient-to-r from-[#EFE4D2]/40 via-[#F5EEE4]/60 to-[#EFE4D2]/40 blur-3xl"
        aria-hidden="true"
      />

      {/* Far Left Scattered Paper Stack 1 */}
      <div
        className="absolute top-[130px] left-[6%] 2xl:left-[8%] w-[200px] h-[140px] bg-white/80 rounded-[6px] border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.05)] transform -rotate-15 opacity-75 flex flex-col p-3 gap-1.5"
        aria-hidden="true"
      >
        <div className="w-1/3 h-2 bg-[#DECDB5] rounded-full" />
        <div className="w-full h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-4/5 h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-2/3 h-1.5 bg-[#EFE6D8] rounded-full" />
      </div>

      {/* Mid Left Scattered Paper Stack 2 */}
      <div
        className="absolute top-[250px] left-[10%] 2xl:left-[13%] w-[220px] h-[130px] bg-white/75 rounded-[6px] border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.04)] transform rotate-8 opacity-70 flex flex-col p-3 gap-1.5"
        aria-hidden="true"
      >
        <div className="w-2/5 h-2 bg-[#DECDB5] rounded-full" />
        <div className="w-full h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-3/4 h-1.5 bg-[#EFE6D8] rounded-full" />
      </div>

      {/* Center Flying Sheet Behind Left Arm */}
      <div
        className="absolute top-[100px] left-[31%] w-[150px] h-[180px] bg-white/70 rounded-[6px] border border-[#E4D7C4] shadow-[0_6px_16px_rgba(33,27,23,0.03)] transform -rotate-8 opacity-60 flex flex-col p-3 gap-2"
        aria-hidden="true"
      >
        <div className="w-1/2 h-2 bg-[#DECDB5] rounded-full" />
        <div className="w-full h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-4/5 h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-3/4 h-1.5 bg-[#EFE6D8] rounded-full" />
      </div>

      {/* Center Flying Sheet Behind Right Arm */}
      <div
        className="absolute top-[120px] right-[30%] w-[160px] h-[170px] bg-white/65 rounded-[6px] border border-[#E4D7C4] shadow-[0_6px_16px_rgba(33,27,23,0.03)] transform rotate-10 opacity-60 flex flex-col p-3 gap-2"
        aria-hidden="true"
      >
        <div className="w-2/5 h-2 bg-[#DECDB5] rounded-full" />
        <div className="w-full h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-4/5 h-1.5 bg-[#EFE6D8] rounded-full" />
      </div>

      {/* Far Right Scattered Paper Stack */}
      <div
        className="absolute top-[180px] right-[6%] 2xl:right-[8%] w-[210px] h-[140px] bg-white/75 rounded-[6px] border border-[#E4D7C4] shadow-[0_8px_20px_rgba(33,27,23,0.04)] transform -rotate-6 opacity-70 flex flex-col p-3 gap-1.5"
        aria-hidden="true"
      >
        <div className="w-1/3 h-2 bg-[#DECDB5] rounded-full" />
        <div className="w-full h-1.5 bg-[#EFE6D8] rounded-full" />
        <div className="w-4/5 h-1.5 bg-[#EFE6D8] rounded-full" />
      </div>
    </div>
  );
};
