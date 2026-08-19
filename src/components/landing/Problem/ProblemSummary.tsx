'use client';

import { forwardRef } from 'react';
import {
  Users,
  MessageCircle,
  FileText,
  Clock,
  CreditCard,
  UserCheck,
  Clapperboard,
} from 'lucide-react';

const problemItems = [
  {
    id: '01',
    title: 'Leads Everywhere',
    desc: 'Leads from Meta Ads, Instagram, Website. No proper system.',
    icon: Users,
    iconBg: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]',
  },
  {
    id: '02',
    title: 'Manual Follow-ups',
    desc: 'Following up on WhatsApp, calls and messages takes all your time.',
    icon: MessageCircle,
    iconBg: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
  },
  {
    id: '03',
    title: 'Quotations Take Time',
    desc: 'Creating quotations in Canva, correcting, sending again and again.',
    icon: FileText,
    iconBg: 'bg-[#FFEBEE] text-[#D32F2F] border-[#FFCDD2]',
  },
  {
    id: '04',
    title: 'Follow-ups Missed',
    desc: 'Too many leads. Too many follow-ups. Too easy to forget.',
    icon: Clock,
    iconBg: 'bg-[#F3E5F5] text-[#7B1FA2] border-[#E1BEE7]',
  },
  {
    id: '05',
    title: 'Payment Tracking',
    desc: 'Advance, Second Payment, Final Payment... Always a headache.',
    icon: CreditCard,
    iconBg: 'bg-[#FAF2E2] text-[#C89435] border-[#EEDFCA]',
  },
  {
    id: '06',
    title: 'Team Management',
    desc: 'Who is shooting where? Who is available? Always confusing.',
    icon: UserCheck,
    iconBg: 'bg-[#E3F2FD] text-[#1976D2] border-[#BBDEFB]',
  },
  {
    id: '07',
    title: 'Post-production Chaos',
    desc: 'Files everywhere. Projects stuck. No visibility. Clients asking.',
    icon: Clapperboard,
    iconBg: 'bg-[#E8EAF6] text-[#3F51B5] border-[#C5CAE9]',
  },
];

export interface ProblemSummaryProps {
  className?: string;
}

export const ProblemSummary = forwardRef<HTMLDivElement, ProblemSummaryProps>(
  ({ className = '' }, ref) => {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`w-full max-w-[1440px] mx-auto bg-[#FFFCF7] rounded-[24px] border border-[#E9DFD2] p-5 sm:p-8 lg:p-10 shadow-[0_12px_36px_-8px_rgba(33,27,23,0.06),0_2px_8px_0_rgba(33,27,23,0.02)] select-none ${className}`}
        >
          {/* Panel Heading */}
          <h3 className="font-serif text-[21px] sm:text-[30px] lg:text-[36px] font-normal text-center text-[#211B17] tracking-tight mb-5 sm:mb-10 px-2">
            Every Photographer Struggles With The Same Problems
          </h3>

          {/* 2-Columns Grid on Mobile (2-2 layout with comfortable spacing), 7-Columns on Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-6 lg:gap-0 lg:divide-x lg:divide-[#EBE0D2]">
            {problemItems.map((item, idx) => {
              const Icon = item.icon;
              const isLast = idx === problemItems.length - 1;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col items-start lg:items-center text-left lg:text-center p-3 sm:p-4 lg:p-0 px-3 lg:px-4 xl:px-5 group bg-[#FAF8F3]/60 lg:bg-transparent rounded-[14px] lg:rounded-none border border-[#F0E8DC] lg:border-none shadow-xs lg:shadow-none transition-all duration-200 ${
                    isLast ? 'col-span-2 md:col-span-1 lg:col-span-1' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[10px] sm:rounded-[12px] flex items-center justify-center border mb-2 sm:mb-3.5 group-hover:scale-105 transition-transform duration-200 ${item.iconBg}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  {/* Title */}
                  <h4 className="text-[12px] sm:text-[14px] font-bold text-[#211B17] mb-1 leading-snug">
                    {item.title}
                  </h4>

                  {/* Description */}
                  <p className="text-[10px] sm:text-[12px] text-[#746E67] leading-[1.45] sm:leading-[1.55] font-normal">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

ProblemSummary.displayName = 'ProblemSummary';
