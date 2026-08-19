'use client';

import { forwardRef } from 'react';
import {
  UserCheck,
  Workflow,
  FileSpreadsheet,
  Users,
  Wallet,
  Clapperboard,
  CheckCircle2,
  ArrowDown,
  MessageCircle,
  Calendar
} from 'lucide-react';

export const FeatureCardsRow = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full mb-10 lg:mb-14 select-none">
      {/* ========================================================= */}
      {/* 1. MOBILE & TABLET: TALL STACKING CARD STICKY SCROLL (< 1024px) */}
      {/* ========================================================= */}
      <div className="flex lg:hidden flex-col gap-6 relative pb-10">
        {/* Card 1: Smart CRM */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_12px_36px_rgba(33,27,23,0.08)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '75px', zIndex: 11 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#FFEBEE] text-[#E53935] flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">01 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Smart CRM</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Manage leads, conversations & follow-ups in one centralized pipeline.
            </p>
          </div>

          {/* CRM Rows Stack */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1976D2]" />
                <span className="font-medium text-[#211B17]">New Lead</span>
              </div>
              <span className="text-[9.5px] text-[#99928A]">Meta Ads</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7B1FA2]" />
                <span className="font-medium text-[#211B17]">Contacted</span>
              </div>
              <span className="text-[9.5px] text-[#99928A]">WhatsApp</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E65100]" />
                <span className="font-medium text-[#211B17]">Quotation Sent</span>
              </div>
              <span className="text-[9.5px] text-[#E65100] font-semibold">₹1,80,000</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5E35B1]" />
                <span className="font-medium text-[#211B17]">Follow-up</span>
              </div>
              <span className="text-[9.5px] text-[#5E35B1] font-semibold">Today</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span className="font-medium text-[#211B17]">Booked</span>
              </div>
              <span className="text-[9.5px] text-[#2E7D32] font-semibold">Advance Done</span>
            </div>
          </div>
        </div>

        {/* Card 2: Automation */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_14px_38px_rgba(33,27,23,0.09)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '88px', zIndex: 12 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <Workflow className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">02 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Automation</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Automated follow-ups, brochures, reminders & client notifications.
            </p>
          </div>

          {/* Vertical Workflow Flow */}
          <div className="flex flex-col items-center gap-1.5 text-[11px]">
            <div className="w-full text-center py-2 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] font-semibold text-[#211B17]">
              ⚡ New Lead Discovered
            </div>
            <ArrowDown className="w-3.5 h-3.5 text-[#99928A]" />
            <div className="w-full flex items-center justify-center gap-2 py-2 rounded-[7px] bg-[#E8F5E9] border border-[#C8E6C9] font-semibold text-[#2E7D32]">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Auto-Send WhatsApp Brochure (3s)</span>
            </div>
            <ArrowDown className="w-3.5 h-3.5 text-[#99928A]" />
            <div className="w-full text-center py-2 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] font-medium text-[#746E67]">
              Wait 1 Day & Check Read Status
            </div>
            <ArrowDown className="w-3.5 h-3.5 text-[#99928A]" />
            <div className="w-full flex items-center justify-center gap-2 py-2 rounded-[7px] bg-[#E8F5E9] border border-[#C8E6C9] font-semibold text-[#2E7D32]">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send Gentle Follow-up Message</span>
            </div>
          </div>
        </div>

        {/* Card 3: Quotations */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_16px_40px_rgba(33,27,23,0.1)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '101px', zIndex: 13 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">03 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Quotations</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Create luxury customized wedding proposals in just 60 seconds.
            </p>
          </div>

          {/* 2 Stacked Quotation Cards with Real Posters */}
          <div className="space-y-2">
            {/* Quotation 1 */}
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC] flex items-center justify-between gap-2">
              <div>
                <div className="text-[8.5px] uppercase text-[#99928A] font-bold">#INV-1023</div>
                <div className="text-[13px] font-bold text-[#211B17]">Rahul & Neha</div>
                <div className="text-[13px] font-bold text-[#C89435]">₹1,80,000</div>
                <div className="text-[9.5px] text-[#746E67]">20 Dec 2024 · 3 Days Shoot</div>
              </div>
              <div className="w-13 h-16 rounded-[6px] overflow-hidden flex-shrink-0 border border-[#E9E0D4] shadow-xs">
                <img
                  src="/assets/images/quotations/wedding-quotation.webp"
                  alt="Rahul & Neha"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Quotation 2: Mehul & Shifa Luxury Proposal Poster */}
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC] flex items-center justify-between gap-2">
              <div>
                <div className="text-[8.5px] uppercase text-[#99928A] font-bold">#INV-1024</div>
                <div className="text-[13px] font-bold text-[#211B17]">Mehul & Shifa</div>
                <div className="text-[13px] font-bold text-[#C89435]">₹2,40,000</div>
                <div className="text-[9.5px] text-[#746E67]">15 Jan 2025 · Royal Destination</div>
              </div>
              <div className="w-13 h-16 rounded-[6px] overflow-hidden flex-shrink-0 border border-[#E9E0D4] shadow-xs">
                <img
                  src="/assets/images/quotations/mehul-shifa-quotation.webp"
                  alt="Mehul & Shifa"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Clients */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_18px_42px_rgba(33,27,23,0.11)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '114px', zIndex: 14 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">04 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Clients</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Everything about your client contracts, events & milestones in one place.
            </p>
          </div>

          {/* 2 Stacked Client Cards with Unique Real Person Profiles */}
          <div className="space-y-2">
            {/* Client 1: Rohan & Priya */}
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <img
                  src="/assets/images/weddings/wedding-01.webp"
                  alt="Rohan & Priya"
                  className="w-8 h-8 rounded-full object-cover border border-[#E9E0D4] flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-bold text-[#211B17]">Rohan & Priya</div>
                  <div className="text-[9.5px] text-[#746E67]">Udaipur Destination · Total: ₹1.8L</div>
                </div>
              </div>
              <div className="w-full h-2 bg-[#E8F5E9] rounded-full overflow-hidden mb-1">
                <div className="w-[75%] h-full bg-[#2E7D32] rounded-full" />
              </div>
              <div className="flex justify-between text-[9.5px] text-[#2E7D32] font-bold">
                <span>3/4 Payments Done</span>
                <span>75% Completed</span>
              </div>
            </div>

            {/* Client 2: Karan & Anjali (Indian Couple / Girl Avatar) */}
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC]">
              <div className="flex items-center gap-2.5 mb-1.5">
                <img
                  src="/assets/images/weddings/wedding-02.webp"
                  alt="Karan & Anjali"
                  className="w-8 h-8 rounded-full object-cover border border-[#E9E0D4] flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-bold text-[#211B17]">Karan & Anjali</div>
                  <div className="text-[9.5px] text-[#746E67]">Jaipur Palace · Total: ₹2.1L</div>
                </div>
              </div>
              <div className="w-full h-2 bg-[#E8F5E9] rounded-full overflow-hidden mb-1">
                <div className="w-[50%] h-full bg-[#2E7D32] rounded-full" />
              </div>
              <div className="flex justify-between text-[9.5px] text-[#2E7D32] font-bold">
                <span>2/4 Payments Done</span>
                <span>50% Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Team Management */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_20px_44px_rgba(33,27,23,0.12)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '127px', zIndex: 15 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">05 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Team Management</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Assign shooters, editors & manage dates without schedule conflicts.
            </p>
          </div>

          {/* 2 Stacked Team Event Cards */}
          <div className="space-y-2 text-[10.5px]">
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#C89435] text-[11px] pb-1 border-b border-[#E9E0D4]/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>22 May · Mumbai Grand Ballroom</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Lead Photographer:</span>
                <span className="font-bold text-[#211B17]">Rahul Sharma</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Cinematographer:</span>
                <span className="font-bold text-[#211B17]">Amit Verma</span>
              </div>
            </div>

            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#C89435] text-[11px] pb-1 border-b border-[#E9E0D4]/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>14 Jun · Goa Beach Resort</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Photographer:</span>
                <span className="font-bold text-[#211B17]">Vikram Rao</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Drone Pilot:</span>
                <span className="font-bold text-[#211B17]">Karan Johar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Payments */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_22px_46px_rgba(33,27,23,0.13)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '140px', zIndex: 16 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">06 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Payments & Dues</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Track advances, milestone installments & outstanding balances effortlessly.
            </p>
          </div>

          {/* 2 Stacked Payment Cards */}
          <div className="space-y-2">
            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC]">
              <div className="font-bold text-[#211B17] text-[12.5px] mb-1">Rohan & Priya · Royal Wedding</div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#2E7D32] font-bold">✓ Paid: ₹1,10,000</span>
                <span className="text-[#E65100] font-bold">Due: ₹70,000</span>
              </div>
            </div>

            <div className="bg-[#FAF8F3] rounded-[10px] p-2.5 border border-[#F0E8DC]">
              <div className="font-bold text-[#211B17] text-[12.5px] mb-1">Aarav & Diya · Pre-Wed & Wedding</div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#2E7D32] font-bold">✓ Paid: ₹2,00,000</span>
                <span className="text-[#E65100] font-bold">Due: ₹40,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 7: Post-production */}
        <div
          className="sticky bg-[#FFFCF8] rounded-[22px] border border-[#E9E0D4] p-5 sm:p-6 shadow-[0_24px_48px_rgba(33,27,23,0.14)] flex flex-col justify-between min-h-[330px] sm:min-h-[360px] transition-all"
          style={{ top: '153px', zIndex: 17 }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <Clapperboard className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-[#C89435] bg-[#FAF3E6] px-2.5 py-0.5 rounded-full border border-[#E9E0D4]">07 / 07</span>
            </div>
            <h4 className="text-[16px] font-bold text-[#211B17] mb-1">Post-production</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Track every project milestone from RAW backup to final album delivery.
            </p>
          </div>

          {/* 5 Vertical Post-Production Milestone Rows */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>RAW BACKUP</span>
              </div>
              <span className="text-[9.5px] font-normal text-[#746E67]">Done</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>CULLING & SELECTION</span>
              </div>
              <span className="text-[9.5px] font-normal text-[#746E67]">Done</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>COLOR EDITING</span>
              </div>
              <span className="text-[9.5px] font-normal text-[#746E67]">Done</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FFF3E0] border border-[#FFE0B2] text-[#E65100] font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E65100] animate-pulse" />
                <span>ALBUM DESIGN</span>
              </div>
              <span className="text-[9.5px] text-[#E65100]">In Progress</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-[7px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#746E67] font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border border-[#99928A]" />
                <span>FINAL DELIVERY</span>
              </div>
              <span className="text-[9.5px] font-normal text-[#99928A]">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP: 7-COLUMNS ROW (>= 1024px) */}
      {/* ========================================================= */}
      <div className="hidden lg:grid lg:grid-cols-7 gap-3.5 items-stretch">
        {/* 1. Smart CRM */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#FFEBEE] text-[#E53935] flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Smart CRM</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Manage leads, conversations & follow-ups in one place.
            </p>
          </div>

          {/* CRM Rows */}
          <div className="space-y-1 text-[9px] mt-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1976D2]" />
              <span className="font-medium text-[#211B17]">New Lead</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B1FA2]" />
              <span className="font-medium text-[#211B17]">Contacted</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E65100]" />
              <span className="font-medium text-[#211B17]">Quotation Sent</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E35B1]" />
              <span className="font-medium text-[#211B17]">Follow-up</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              <span className="font-medium text-[#211B17]">Booked</span>
            </div>
          </div>
        </div>

        {/* 2. Automation */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <Workflow className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Automation</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Automated follow-ups, reminders & notifications.
            </p>
          </div>

          {/* Workflow steps */}
          <div className="flex flex-col items-center gap-0.5 text-[9px] mt-auto">
            <div className="w-full text-center py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] font-medium text-[#211B17]">
              New Lead
            </div>
            <ArrowDown className="w-2 h-2 text-[#99928A]" />
            <div className="w-full flex items-center justify-center gap-1 py-0.5 rounded-[5px] bg-[#E8F5E9] border border-[#C8E6C9] font-medium text-[#2E7D32]">
              <MessageCircle className="w-2 h-2" />
              <span>Send WhatsApp</span>
            </div>
            <ArrowDown className="w-2 h-2 text-[#99928A]" />
            <div className="w-full text-center py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] font-medium text-[#746E67]">
              Wait 1 Day
            </div>
            <ArrowDown className="w-2 h-2 text-[#99928A]" />
            <div className="w-full flex items-center justify-center gap-1 py-0.5 rounded-[5px] bg-[#E8F5E9] border border-[#C8E6C9] font-medium text-[#2E7D32]">
              <MessageCircle className="w-2 h-2" />
              <span>Send Follow-up</span>
            </div>
          </div>
        </div>

        {/* 3. Quotations */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Quotations</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Create beautiful quotations in just a few clicks.
            </p>
          </div>

          {/* 2 Quotation Cards with Real Posters */}
          <div className="space-y-1.5 mt-auto">
            {/* Quotation 1 */}
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC] flex items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="text-[7px] uppercase text-[#99928A] font-semibold">#INV-1023</div>
                <div className="text-[9.5px] font-bold text-[#211B17] truncate">Rahul & Neha</div>
                <div className="text-[10px] font-bold text-[#C89435]">₹1,80,000</div>
                <div className="text-[7.5px] text-[#746E67]">20 Dec 2024</div>
              </div>
              <div className="w-8 h-10 rounded-[4px] overflow-hidden flex-shrink-0 border border-[#E9E0D4] shadow-xs">
                <img
                  src="/assets/images/quotations/wedding-quotation.webp"
                  alt="Rahul & Neha"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Quotation 2: Mehul & Shifa Luxury Proposal Poster */}
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC] flex items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="text-[7px] uppercase text-[#99928A] font-semibold">#INV-1024</div>
                <div className="text-[9.5px] font-bold text-[#211B17] truncate">Mehul & Shifa</div>
                <div className="text-[10px] font-bold text-[#C89435]">₹2,40,000</div>
                <div className="text-[7.5px] text-[#746E67]">15 Jan 2025</div>
              </div>
              <div className="w-8 h-10 rounded-[4px] overflow-hidden flex-shrink-0 border border-[#E9E0D4] shadow-xs">
                <img
                  src="/assets/images/quotations/mehul-shifa-quotation.webp"
                  alt="Mehul & Shifa"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Clients */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Clients</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Everything about your client in one workspace.
            </p>
          </div>

          {/* 2 Client Cards with Unique Real Person Profiles */}
          <div className="space-y-1.5 mt-auto">
            {/* Client 1: Rohan & Priya */}
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC]">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src="/assets/images/weddings/wedding-01.webp"
                  alt="Rohan & Priya"
                  className="w-5 h-5 rounded-full object-cover border border-[#E9E0D4]"
                />
                <div className="min-w-0">
                  <div className="text-[9.5px] font-bold text-[#211B17] truncate">Rohan & Priya</div>
                  <div className="text-[7.5px] text-[#746E67]">Udaipur · ₹1.8L</div>
                </div>
              </div>
              <div className="w-full h-1 bg-[#E8F5E9] rounded-full overflow-hidden">
                <div className="w-[75%] h-full bg-[#2E7D32] rounded-full" />
              </div>
              <div className="text-[7px] text-[#2E7D32] font-semibold mt-0.5">3/4 Payments Done</div>
            </div>

            {/* Client 2: Karan & Anjali (Indian Couple / Girl Avatar) */}
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC]">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src="/assets/images/weddings/wedding-02.webp"
                  alt="Karan & Anjali"
                  className="w-5 h-5 rounded-full object-cover border border-[#E9E0D4]"
                />
                <div className="min-w-0">
                  <div className="text-[9.5px] font-bold text-[#211B17] truncate">Karan & Anjali</div>
                  <div className="text-[7.5px] text-[#746E67]">Jaipur · ₹2.1L</div>
                </div>
              </div>
              <div className="w-full h-1 bg-[#E8F5E9] rounded-full overflow-hidden">
                <div className="w-[50%] h-full bg-[#2E7D32] rounded-full" />
              </div>
              <div className="text-[7px] text-[#2E7D32] font-semibold mt-0.5">2/4 Payments Done</div>
            </div>
          </div>
        </div>

        {/* 5. Team Management */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Team</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Assign team & manage every event smoothly.
            </p>
          </div>

          {/* 2 Team Event Cards */}
          <div className="space-y-1.5 text-[8px] mt-auto">
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC] space-y-0.5">
              <div className="flex items-center gap-1 font-semibold text-[#C89435] text-[8.5px] pb-0.5 border-b border-[#E9E0D4]/60">
                <Calendar className="w-2.5 h-2.5" />
                <span>22 May · Mumbai</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Photo:</span>
                <span className="font-semibold text-[#211B17]">Rahul</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Video:</span>
                <span className="font-semibold text-[#211B17]">Amit</span>
              </div>
            </div>

            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC] space-y-0.5">
              <div className="flex items-center gap-1 font-semibold text-[#C89435] text-[8.5px] pb-0.5 border-b border-[#E9E0D4]/60">
                <Calendar className="w-2.5 h-2.5" />
                <span>14 Jun · Goa</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Photo:</span>
                <span className="font-semibold text-[#211B17]">Vikram</span>
              </div>
              <div className="flex justify-between text-[#746E67]">
                <span>Drone:</span>
                <span className="font-semibold text-[#211B17]">Karan</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Payments */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Payments</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Track payments, expenses & dues easily.
            </p>
          </div>

          {/* 2 Payment Breakdown Cards */}
          <div className="space-y-1.5 text-[8.5px] mt-auto">
            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC]">
              <div className="font-semibold text-[#211B17] truncate">Rohan & Priya · ₹1.8L</div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[#2E7D32] font-semibold">Paid: ₹1.1L</span>
                <span className="text-[#E65100] font-semibold">Due: ₹70k</span>
              </div>
            </div>

            <div className="bg-[#FAF8F3] rounded-[8px] p-1.5 border border-[#F0E8DC]">
              <div className="font-semibold text-[#211B17] truncate">Aarav & Diya · ₹2.4L</div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[#2E7D32] font-semibold">Paid: ₹2.0L</span>
                <span className="text-[#E65100] font-semibold">Due: ₹40k</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Post-production */}
        <div className="bg-[#FFFCF8] rounded-[18px] border border-[#E9E0D4] p-3 flex flex-col gap-2 shadow-[0_6px_18px_rgba(33,27,23,0.03)] hover:shadow-[0_12px_28px_rgba(33,27,23,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-[5px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <Clapperboard className="w-3 h-3" />
              </div>
              <h4 className="text-[12.5px] font-bold text-[#211B17]">Post-production</h4>
            </div>
            <p className="text-[9.5px] text-[#746E67] leading-tight">
              Track every project from RAW to final delivery.
            </p>
          </div>

          {/* Milestone checklist */}
          <div className="space-y-0.5 text-[9px] mt-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#2E7D32]" />
              <span>RAW</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#2E7D32]" />
              <span>CULLING</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#2E7D32]" />
              <span>EDITING</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FFF3E0] border border-[#FFE0B2] text-[#E65100] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E65100] animate-pulse" />
              <span>ALBUM DESIGN</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] bg-[#FAF8F3] border border-[#F2ECE2] text-[#2E7D32] font-semibold">
              <CheckCircle2 className="w-2.5 h-2.5 text-[#2E7D32]" />
              <span>DELIVERY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FeatureCardsRow.displayName = 'FeatureCardsRow';
