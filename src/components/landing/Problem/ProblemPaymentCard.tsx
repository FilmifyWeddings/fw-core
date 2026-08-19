'use client';

import { forwardRef } from 'react';
import { FileSpreadsheet } from 'lucide-react';

export interface ProblemPaymentCardProps {
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProblemPaymentCard = forwardRef<HTMLDivElement, ProblemPaymentCardProps>(
  ({ rotation = 1.5, className = '', style }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white/95 backdrop-blur-sm rounded-[18px] p-4 border border-[#E9DFD2] shadow-[0_16px_36px_-8px_rgba(33,27,23,0.1),0_4px_12px_-2px_rgba(33,27,23,0.04)] hover:shadow-[0_22px_45px_-8px_rgba(33,27,23,0.16)] transition-all duration-300 transform hover:-translate-y-1 select-none pointer-events-auto w-[290px] xl:w-[320px] ${className}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          ...style,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-[#F2ECE2]">
          <div className="w-8 h-8 rounded-[8px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0 border border-[#C8E6C9]">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[#211B17] leading-tight">
              Payment Tracking.xlsx
            </h4>
            <span className="text-[10px] text-[#99928A]">Modified just now</span>
          </div>
        </div>

        {/* Table */}
        <div className="w-full text-left">
          <div className="grid grid-cols-12 text-[10px] uppercase font-semibold text-[#8C847B] pb-1.5 border-b border-[#F2ECE2]">
            <span className="col-span-4">Client</span>
            <span className="col-span-3 text-right">Total</span>
            <span className="col-span-2 text-right">Paid</span>
            <span className="col-span-3 text-right">Pending</span>
          </div>

          <div className="divide-y divide-[#F7F2EA] text-[11px]">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-1.5 items-center">
              <span className="col-span-4 font-medium text-[#211B17] truncate">Aarav & Diya</span>
              <span className="col-span-3 text-right text-[#746E67]">â‚¹1,80,000</span>
              <span className="col-span-2 text-right text-[#2E7D32]">â‚¹50k</span>
              <span className="col-span-3 text-right font-medium text-[#D32F2F]">â‚¹1,30,000</span>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-1.5 items-center">
              <span className="col-span-4 font-medium text-[#211B17] truncate">Rohan & Priya</span>
              <span className="col-span-3 text-right text-[#746E67]">â‚¹2,20,000</span>
              <span className="col-span-2 text-right text-[#2E7D32]">â‚¹80k</span>
              <span className="col-span-3 text-right font-medium text-[#D32F2F]">â‚¹1,40,000</span>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-1.5 items-center">
              <span className="col-span-4 font-medium text-[#211B17] truncate">Karan & Anjali</span>
              <span className="col-span-3 text-right text-[#746E67]">â‚¹1,50,000</span>
              <span className="col-span-2 text-right text-[#2E7D32]">â‚¹20k</span>
              <span className="col-span-3 text-right font-medium text-[#D32F2F]">â‚¹1,30,000</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProblemPaymentCard.displayName = 'ProblemPaymentCard';
