'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Building2, Users, IndianRupee } from 'lucide-react';

export const BusinessStatsBar: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Counter state
  const [countPhotographers, setCountPhotographers] = useState(0);
  const [countStudios, setCountStudios] = useState(0);
  const [countLeads, setCountLeads] = useState(0);
  const [countPayments, setCountPayments] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const duration = 1500;
          const steps = 40;
          const intervalTime = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setCountPhotographers(Math.floor(600 * easeOut));
            setCountStudios(Math.floor(100 * easeOut));
            setCountLeads(Number((1.5 * easeOut).toFixed(1)));
            setCountPayments(Math.floor(100 * easeOut));

            if (step >= steps) {
              clearInterval(timer);
              setCountPhotographers(600);
              setCountStudios(100);
              setCountLeads(1.5);
              setCountPayments(100);
            }
          }, intervalTime);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-5xl mx-auto mb-24 select-none"
    >
      <div className="bg-[#FFFCF8] rounded-[24px] border border-[#E9E0D4] p-6 sm:p-8 shadow-[0_8px_24px_rgba(33,27,23,0.03)] grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-center divide-y sm:divide-y-0 sm:divide-x divide-[#F0E8DC]">
        {/* Stat 1: 600+ Happy Photographers */}
        <div className="flex items-center gap-3.5 pl-2 sm:pl-4 pt-2 sm:pt-0">
          <div className="w-11 h-11 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[24px] sm:text-[28px] lg:text-[32px] text-[#211B17] tracking-tight leading-none">
              {countPhotographers.toLocaleString()}+
            </div>
            <div className="text-[12.5px] sm:text-[13.5px] text-[#746E67] font-medium mt-1">
              Happy Photographers
            </div>
          </div>
        </div>

        {/* Stat 2: 100+ Studios Managed */}
        <div className="flex items-center gap-3.5 pl-2 sm:pl-6 pt-4 sm:pt-0">
          <div className="w-11 h-11 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[24px] sm:text-[28px] lg:text-[32px] text-[#211B17] tracking-tight leading-none">
              {countStudios.toLocaleString()}+
            </div>
            <div className="text-[12.5px] sm:text-[13.5px] text-[#746E67] font-medium mt-1">
              Studios Managed
            </div>
          </div>
        </div>

        {/* Stat 3: 1.5L+ Leads Managed */}
        <div className="flex items-center gap-3.5 pl-2 sm:pl-6 pt-4 sm:pt-0">
          <div className="w-11 h-11 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[24px] sm:text-[28px] lg:text-[32px] text-[#211B17] tracking-tight leading-none">
              {countLeads}L+
            </div>
            <div className="text-[12.5px] sm:text-[13.5px] text-[#746E67] font-medium mt-1">
              Leads Managed
            </div>
          </div>
        </div>

        {/* Stat 4: 100Cr+ Payments Managed */}
        <div className="flex items-center gap-3.5 pl-2 sm:pl-6 pt-4 sm:pt-0">
          <div className="w-11 h-11 rounded-full bg-[#FFF8E7] text-[#C89435] border border-[#F3E5C8] flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[24px] sm:text-[28px] lg:text-[32px] text-[#211B17] tracking-tight leading-none">
              â‚¹{countPayments}Cr+
            </div>
            <div className="text-[12.5px] sm:text-[13.5px] text-[#746E67] font-medium mt-1">
              Payments Managed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
