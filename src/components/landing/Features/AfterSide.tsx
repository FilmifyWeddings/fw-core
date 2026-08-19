'use client';

import { forwardRef } from 'react';
import {
  Users,
  Workflow,
  FileText,
  UserCheck,
  CircleDollarSign,
  Users2,
  Calendar,
  Film,
  FileBarChart2,
  TrendingUp,
} from 'lucide-react';

export const AfterSide = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="flex flex-col items-start select-none w-full max-w-[340px]">
      {/* After Badge & Heading */}
      <div className="mb-3.5">
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-[10px] font-bold tracking-wider uppercase mb-1">
          After
        </span>
        <h3 className="font-serif text-[20px] sm:text-[22px] lg:text-[24px] font-normal leading-tight text-[#211B17]">
          One System. Total Control.
        </h3>
      </div>

      {/* 5 x 2 StudioCore Modules Grid */}
      <div className="grid grid-cols-5 gap-1.5 w-full">
        {/* 1. CRM */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center">
            <Users className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">CRM</span>
        </div>

        {/* 2. Automation */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <Workflow className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8px] font-medium text-[#211B17]">Automation</span>
        </div>

        {/* 3. Quotations */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center">
            <FileText className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8px] font-medium text-[#211B17]">Quotations</span>
        </div>

        {/* 4. Clients */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#FFEBEE] text-[#E53935] flex items-center justify-center">
            <UserCheck className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Clients</span>
        </div>

        {/* 5. Payments */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <CircleDollarSign className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Payments</span>
        </div>

        {/* 6. Team */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
            <Users2 className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Team</span>
        </div>

        {/* 7. Events */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center">
            <Calendar className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Events</span>
        </div>

        {/* 8. Post-production */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#FFEBEE] text-[#E53935] flex items-center justify-center">
            <Film className="w-2.5 h-2.5" />
          </div>
          <span className="text-[7.5px] font-medium text-[#211B17] text-center leading-tight">Editing</span>
        </div>

        {/* 9. Reports */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center">
            <FileBarChart2 className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Reports</span>
        </div>

        {/* 10. Growth */}
        <div className="bg-white rounded-[10px] border border-[#E9E0D4] p-1.5 flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[62px]">
          <div className="w-4 h-4 rounded-[4px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center">
            <TrendingUp className="w-2.5 h-2.5" />
          </div>
          <span className="text-[8.5px] font-medium text-[#211B17]">Growth</span>
        </div>
      </div>
    </div>
  );
});

AfterSide.displayName = 'AfterSide';
