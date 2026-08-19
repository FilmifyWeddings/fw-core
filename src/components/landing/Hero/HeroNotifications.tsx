'use client';

import { forwardRef } from 'react';
import type { FloatingNotification } from '../../../types';

const notificationCards: FloatingNotification[] = [
  {
    id: 'lead-1',
    title: 'New Lead',
    subtitle: 'Rahul & Priya',
    tag: 'Via Meta Ads',
    time: '2m ago',
    icon: '/assets/icons/lead.svg',
    iconBg: 'bg-[#E3F2FD] text-[#1976D2] border-[#BBDEFB]',
    offset: 0,
    delay: 0,
  },
  {
    id: 'whatsapp-1',
    title: 'WhatsApp Follow-up',
    subtitle: 'Message sent',
    time: '10m ago',
    icon: '/assets/icons/whatsapp.svg',
    iconBg: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    offset: 15,
    delay: 0.1,
  },
  {
    id: 'quote-1',
    title: 'Quotation Sent',
    subtitle: 'Rahul & Priya',
    amount: '₹1,80,000',
    time: '25m ago',
    icon: '/assets/icons/quotation.svg',
    iconBg: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]',
    offset: -5,
    delay: 0.2,
  },
  {
    id: 'payment-1',
    title: 'Payment Received',
    subtitle: 'Aarav & Diya',
    amount: '₹50,000',
    time: '1h ago',
    icon: '/assets/icons/rupee.svg',
    iconBg: 'bg-[#E8F8F0] text-[#00897B] border-[#B2DFDB]',
    offset: 20,
    delay: 0.3,
  },
  {
    id: 'team-1',
    title: 'Team Assigned',
    subtitle: 'Wedding Shoot',
    tag: '12 May 2026',
    time: '2h ago',
    icon: '/assets/icons/team.svg',
    iconBg: 'bg-[#F3E5F5] text-[#7B1FA2] border-[#E1BEE7]',
    offset: 5,
    delay: 0.4,
  },
  {
    id: 'editing-1',
    title: 'Editing Started',
    subtitle: 'Aarav & Diya',
    tag: 'Wedding Film',
    time: '3h ago',
    icon: '/assets/icons/editing.svg',
    iconBg: 'bg-[#E8EAF6] text-[#3F51B5] border-[#C5CAE9]',
    offset: 15,
    delay: 0.5,
  },
];

export interface HeroNotificationsProps {
  // Add props if needed
}

export const HeroNotifications = forwardRef<HTMLDivElement, HeroNotificationsProps>((_, ref) => {
  return (
    <div
      ref={ref}
      className="flex flex-col gap-3 pointer-events-auto select-none"
    >
      {notificationCards.map((card, index) => {
        // Subtle floating bounce animation class for each card
        const floatAnimationClass =
          index % 3 === 0
            ? 'animate-float-slow'
            : index % 3 === 1
            ? 'animate-float-delayed'
            : 'animate-float-fast';

        return (
          <div
            key={card.id}
            className={`notification-card w-[250px] xl:w-[275px] bg-white/95 backdrop-blur-sm rounded-[14px] p-3.5 border border-[#EBE3D5] shadow-[0_12px_28px_-6px_rgba(33,27,23,0.08),0_4px_10px_-2px_rgba(33,27,23,0.03)] hover:shadow-[0_18px_36px_-6px_rgba(33,27,23,0.12)] transition-all duration-300 transform hover:-translate-y-1 ${floatAnimationClass}`}
            style={{
              marginLeft: `${card.offset}px`,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Icon Container */}
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center border flex-shrink-0 ${card.iconBg}`}
              >
                <img src={card.icon} alt={card.title} className="w-5 h-5 object-contain" />
              </div>

              {/* Card Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-[13px] font-semibold text-[#211B17] truncate leading-tight">
                    {card.title}
                  </h4>
                  <span className="text-[10px] text-[#99928A] flex-shrink-0 font-normal">
                    {card.time}
                  </span>
                </div>

                <p className="text-[12px] text-[#746E67] font-medium truncate mb-1">
                  {card.subtitle}
                </p>

                {/* Amount or Tag */}
                {card.amount && (
                  <span className="inline-block text-[12px] font-semibold text-[#211B17] tracking-tight bg-[#FAF8F3] px-2 py-0.5 rounded-[4px] border border-[#F2ECE2]">
                    {card.amount}
                  </span>
                )}

                {card.tag && (
                  <span className="inline-block text-[10px] font-medium text-[#746E67] bg-[#FAF8F3] px-2 py-0.5 rounded-[4px] border border-[#F2ECE2]">
                    {card.tag}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

HeroNotifications.displayName = 'HeroNotifications';
