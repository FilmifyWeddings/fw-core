'use client';

import { forwardRef } from 'react';
import type { ReactNode } from 'react';

export interface ProblemNotificationCardProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  tag?: string;
  time?: string;
  badge?: string | number;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProblemNotificationCard = forwardRef<HTMLDivElement, ProblemNotificationCardProps>(
  ({ icon, iconBg, title, subtitle, tag, time, badge, rotation = 0, className = '', style }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative bg-white/95 backdrop-blur-sm rounded-[16px] p-3.5 border border-[#E9DFD2] shadow-[0_12px_28px_-6px_rgba(33,27,23,0.08),0_4px_10px_-2px_rgba(33,27,23,0.03)] hover:shadow-[0_18px_36px_-6px_rgba(33,27,23,0.14)] transition-all duration-300 transform hover:-translate-y-1 select-none pointer-events-auto ${className}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          ...style,
        }}
      >
        {/* Red notification badge if any */}
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E53935] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse">
            {badge}
          </span>
        )}

        <div className="flex items-start gap-3">
          {/* Icon Box */}
          <div
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${iconBg}`}
          >
            {icon}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <h4 className="text-[13px] font-semibold text-[#211B17] truncate leading-tight">
                {title}
              </h4>
              {time && (
                <span className="text-[10px] text-[#99928A] flex-shrink-0 font-normal">
                  {time}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-[12px] text-[#554E48] font-medium leading-snug truncate">
                {subtitle}
              </p>
            )}

            {tag && (
              <span className="inline-block mt-1 text-[10px] font-medium text-[#746E67] bg-[#FAF8F3] px-2 py-0.5 rounded-[4px] border border-[#F2ECE2]">
                {tag}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ProblemNotificationCard.displayName = 'ProblemNotificationCard';
