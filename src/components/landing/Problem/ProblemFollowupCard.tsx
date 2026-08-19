'use client';

import { forwardRef } from 'react';
import { Clock, Check } from 'lucide-react';

export interface ProblemFollowupCardProps {
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProblemFollowupCard = forwardRef<HTMLDivElement, ProblemFollowupCardProps>(
  ({ rotation = -1, className = '', style }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white/95 backdrop-blur-sm rounded-[18px] p-3.5 border border-[#E9DFD2] shadow-[0_16px_36px_-8px_rgba(33,27,23,0.1),0_4px_12px_-2px_rgba(33,27,23,0.04)] hover:shadow-[0_22px_45px_-8px_rgba(33,27,23,0.16)] transition-all duration-300 transform hover:-translate-y-1 select-none pointer-events-auto w-[230px] xl:w-[250px] ${className}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          ...style,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#F2ECE2]">
          <div className="w-7 h-7 rounded-[8px] bg-[#FEF6E6] text-[#C89435] flex items-center justify-center flex-shrink-0 border border-[#F6E3B8]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[13px] font-semibold text-[#211B17] leading-tight">
            Follow-up Reminder
          </h4>
        </div>

        {/* Task Items */}
        <div className="space-y-2 text-[11px]">
          {/* Item 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FAF4EA] text-[#C89435] flex items-center justify-center text-[9px]">
                <Check className="w-2.5 h-2.5" />
              </span>
              <span className="font-medium text-[#211B17] truncate">Rohan & Priya</span>
            </div>
            <span className="text-[9px] font-semibold text-[#D32F2F] bg-[#FFEBEE] px-1.5 py-0.5 rounded-[4px]">
              Today
            </span>
          </div>

          {/* Item 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FAF4EA] text-[#C89435] flex items-center justify-center text-[9px]">
                <Check className="w-2.5 h-2.5" />
              </span>
              <span className="font-medium text-[#211B17] truncate">Aarav & Diya</span>
            </div>
            <span className="text-[9px] font-medium text-[#746E67] bg-[#F5EFE6] px-1.5 py-0.5 rounded-[4px]">
              Tomorrow
            </span>
          </div>

          {/* Item 3 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FAF4EA] text-[#C89435] flex items-center justify-center text-[9px]">
                <Check className="w-2.5 h-2.5" />
              </span>
              <span className="font-medium text-[#211B17] truncate">Karan & Anjali</span>
            </div>
            <span className="text-[9px] font-semibold text-[#D32F2F] bg-[#FFEBEE] px-1.5 py-0.5 rounded-[4px]">
              Overdue
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-1.5 border-t border-[#F2ECE2] text-[10px] text-[#99928A] font-medium text-center">
          + 8 more
        </div>
      </div>
    );
  }
);

ProblemFollowupCard.displayName = 'ProblemFollowupCard';
