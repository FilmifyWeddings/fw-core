'use client';

import { forwardRef } from 'react';
import { PhoneCall, CreditCard } from 'lucide-react';
import {
  GoogleSheetsIcon,
  NotesIcon,
  TeamGroupsIcon,
  RandomFilesIcon,
} from './PlatformIcons';

export const BeforeSide = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="flex flex-col items-start select-none w-full max-w-[340px]">
      {/* Before Badge & Heading */}
      <div className="mb-3.5">
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828] text-[10px] font-bold tracking-wider uppercase mb-1">
          Before
        </span>
        <h3 className="font-serif text-[20px] sm:text-[22px] lg:text-[24px] font-normal leading-tight text-[#211B17]">
          Too Many Tools. Too Much Chaos.
        </h3>
      </div>

      {/* 5 x 2 Platform Cards Grid with Real Logos */}
      <div className="grid grid-cols-5 gap-1.5 w-full">
        {/* 1. Meta / Facebook Ads (Real PNG) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <img
            src="/assets/characters/problem/facebook.png"
            alt="Meta Ads"
            className="w-5 h-5 object-contain"
          />
          <span className="text-[8.5px] font-medium text-[#211B17]">Meta Ads</span>
        </div>

        {/* 2. WhatsApp (Real PNG) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <img
            src="/assets/characters/problem/Whatsapp.png"
            alt="WhatsApp"
            className="w-5 h-5 object-contain"
          />
          <span className="text-[8.5px] font-medium text-[#211B17]">WhatsApp</span>
        </div>

        {/* 3. Calls (Guaranteed Green Phone Dialer Badge) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <div className="w-5 h-5 rounded-[5px] bg-[#22C55E] flex items-center justify-center flex-shrink-0 shadow-xs">
            <PhoneCall className="w-3 h-3 text-white" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Calls</span>
        </div>

        {/* 4. Canva (Real PNG) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <img
            src="/assets/characters/problem/canva-seeklogo.png"
            alt="Canva"
            className="w-5 h-5 object-contain"
          />
          <span className="text-[8.5px] font-medium text-[#211B17]">Canva</span>
        </div>

        {/* 5. Sheets */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <GoogleSheetsIcon className="w-5 h-5" />
          <span className="text-[8.5px] font-medium text-[#211B17]">Sheets</span>
        </div>

        {/* 6. Notes */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <NotesIcon className="w-5 h-5" />
          <span className="text-[8.5px] font-medium text-[#211B17]">Notes</span>
        </div>

        {/* 7. Payments (Guaranteed Gradient Payment Card Badge) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <div className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-[#0284C7] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-xs">
            <CreditCard className="w-3 h-3 text-white" />
          </div>
          <span className="text-[7.5px] font-medium text-[#211B17] text-center leading-tight">Payments</span>
        </div>

        {/* 8. Team Groups */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <TeamGroupsIcon className="w-5 h-5" />
          <span className="text-[7.5px] font-medium text-[#211B17] text-center leading-tight">Team Groups</span>
        </div>

        {/* 9. Google Drive (Real PNG) */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <img
            src="/assets/characters/problem/google-drive.png"
            alt="Google Drive"
            className="w-5 h-5 object-contain"
          />
          <span className="text-[8.5px] font-medium text-[#211B17]">Drive</span>
        </div>

        {/* 10. Random Files */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[64px]">
          <RandomFilesIcon className="w-5 h-5" />
          <span className="text-[7.5px] font-medium text-[#211B17] text-center leading-tight">Files</span>
        </div>
      </div>
    </div>
  );
});

BeforeSide.displayName = 'BeforeSide';
