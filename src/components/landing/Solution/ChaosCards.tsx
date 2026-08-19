'use client';

import { forwardRef } from 'react';
import {
  ChevronRight,
  UserPlus,
  MessageCircle,
  Clapperboard,
  CheckCircle2,
  X,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';

export interface ChaosCardsProps {
  mouseOffset?: { x: number; y: number };
}

export const ChaosCards = forwardRef<HTMLDivElement, ChaosCardsProps>(
  ({ mouseOffset = { x: 0, y: 0 } }, ref) => {
    return (
      <div ref={ref} className="absolute inset-0 pointer-events-none select-none z-20 overflow-visible">
        {/* 1. Card: New Lead (Far Upper Left) */}
        <div
          className="chaos-card absolute left-[16%] xl:left-[18%] 2xl:left-[20%] top-[15px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_10px_25px_-5px_rgba(33,27,23,0.08)] transform -rotate-2 hover:-translate-y-1 transition-all duration-300 w-[180px] xl:w-[200px]"
          style={{
            transform: `translate3d(${mouseOffset.x * 4}px, ${mouseOffset.y * 3}px, 0px) rotate(-2deg)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[7px] bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center border border-[#BBDEFB] flex-shrink-0">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold text-[#211B17] truncate">New Lead</div>
                <div className="text-[10px] text-[#746E67] truncate">Rahul & Priya</div>
                <div className="text-[8.5px] text-[#99928A]">Wedding Â· 12m ago</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#99928A]" />
          </div>
        </div>

        {/* 2. Card: WhatsApp (Far Mid Left) */}
        <div
          className="chaos-card absolute left-[16%] xl:left-[18%] 2xl:left-[20%] top-[105px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_10px_25px_-5px_rgba(33,27,23,0.08)] transform rotate-1 hover:-translate-y-1 transition-all duration-300 w-[175px] xl:w-[195px]"
          style={{
            transform: `translate3d(${mouseOffset.x * -3}px, ${mouseOffset.y * -2}px, 0px) rotate(1deg)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[7px] bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center border border-[#C8E6C9] flex-shrink-0">
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold text-[#211B17]">WhatsApp</div>
                <div className="text-[9.5px] text-[#746E67] font-medium">30 Unread Messages</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#99928A]" />
          </div>
        </div>

        {/* 3. Card: Quick Client Questions (Far Left) */}
        <div
          className="chaos-card absolute left-[15%] xl:left-[17%] 2xl:left-[19%] top-[190px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_12px_28px_-6px_rgba(33,27,23,0.08)] transform -rotate-1 hover:-translate-y-1 transition-all duration-300 w-[180px] xl:w-[200px]"
          style={{
            transform: `translate3d(${mouseOffset.x * 5}px, ${mouseOffset.y * 3}px, 0px) rotate(-1deg)`,
          }}
        >
          <div className="space-y-1 divide-y divide-[#F5EFE6] text-[10px]">
            <div className="flex items-center justify-between py-1 text-[#211B17] font-medium hover:text-[#C89435] cursor-pointer">
              <span>Can you share packages?</span>
              <ChevronRight className="w-2.5 h-2.5 text-[#99928A]" />
            </div>
            <div className="flex items-center justify-between py-1 text-[#211B17] font-medium hover:text-[#C89435] cursor-pointer">
              <span>Are you available on 13th Dec?</span>
              <ChevronRight className="w-2.5 h-2.5 text-[#99928A]" />
            </div>
            <div className="flex items-center justify-between py-1 text-[#211B17] font-medium hover:text-[#C89435] cursor-pointer">
              <span>Can you send quotation?</span>
              <ChevronRight className="w-2.5 h-2.5 text-[#99928A]" />
            </div>
            <div className="flex items-center justify-between py-1 text-[#211B17] font-medium hover:text-[#C89435] cursor-pointer">
              <span>Any update?</span>
              <ChevronRight className="w-2.5 h-2.5 text-[#99928A]" />
            </div>
          </div>
        </div>

        {/* 4. Card: Client Widget (Mid-Left, Clear of Face & Hair) */}
        <div
          className="chaos-card absolute left-[28%] xl:left-[29%] 2xl:left-[31%] top-[65px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 border border-[#E4D7C4] shadow-[0_12px_28px_-6px_rgba(33,27,23,0.08)] transform rotate-2 hover:-translate-y-1 transition-all duration-300 w-[155px] xl:w-[170px] z-10"
          style={{
            transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px) rotate(2deg)`,
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#F2ECE2]">
            <span className="text-[10.5px] font-semibold text-[#211B17]">Client</span>
            <span className="text-[8.5px] text-[#8C6D33] bg-[#FAF3E6] px-1.5 py-0.5 rounded-[4px]">
              3 New
            </span>
          </div>
          <div className="space-y-1 text-[9.5px]">
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/images/avatars/avatar-01.webp"
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Aarav & Diya</div>
                <div className="text-[8px] text-[#99928A]">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/images/avatars/avatar-02.webp"
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Rohan & Priya</div>
                <div className="text-[8px] text-[#99928A]">5 hours ago</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/images/avatars/avatar-03.webp"
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Karan & Anjali</div>
                <div className="text-[8px] text-[#99928A]">1 day ago</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Card: Team Schedule (Left of Torso / Arm, Clear of Camera) */}
        <div
          className="chaos-card absolute left-[24%] xl:left-[25%] 2xl:left-[27%] top-[225px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_14px_32px_-6px_rgba(33,27,23,0.1)] transform -rotate-2 hover:-translate-y-1 transition-all duration-300 w-[175px] xl:w-[190px] z-25"
          style={{
            transform: `translate3d(${mouseOffset.x * 4}px, ${mouseOffset.y * 3}px, 0px) rotate(-2deg)`,
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#F2ECE2]">
            <span className="text-[10.5px] font-semibold text-[#211B17]">Team Schedule</span>
            <X className="w-3 h-3 text-[#99928A]" />
          </div>
          <div className="space-y-1 text-[9.5px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#211B17]">Rahul</span>
              <span className="text-[8px] font-medium text-[#E65100] bg-[#FFF3E0] px-1.5 py-0.5 rounded-[4px]">
                In Photoshoot
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#211B17]">Pooja</span>
              <span className="text-[8px] font-medium text-[#1976D2] bg-[#E3F2FD] px-1.5 py-0.5 rounded-[4px]">
                Editing
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#211B17]">Vikram</span>
              <span className="text-[8px] font-medium text-[#746E67] bg-[#F5EFE6] px-1.5 py-0.5 rounded-[4px]">
                Offline
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#211B17]">Devanshu</span>
              <span className="text-[8px] font-medium text-[#1976D2] bg-[#E3F2FD] px-1.5 py-0.5 rounded-[4px]">
                Editing
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#211B17]">Karan</span>
              <span className="text-[8px] font-medium text-[#E65100] bg-[#FFF3E0] px-1.5 py-0.5 rounded-[4px]">
                Photoshoot
              </span>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-[#F2ECE2] text-[8.5px] text-[#99928A] text-center font-medium">
            + 3 more
          </div>
        </div>

        {/* 6. Card: Follow-up Sticky Stack (Hanging lower left) */}
        <div
          className="chaos-card absolute left-[16%] xl:left-[18%] 2xl:left-[20%] top-[375px] pointer-events-auto transform rotate-2 hover:-translate-y-1 transition-all duration-300 w-[150px] z-30"
          style={{
            transform: `translate3d(${mouseOffset.x * -5}px, ${mouseOffset.y * -3}px, 0px) rotate(2deg)`,
          }}
        >
          {/* Note 1 */}
          <div className="bg-[#FFF9C4] p-2 rounded-[5px] shadow-[0_6px_14px_rgba(0,0,0,0.06)] border border-[#FFF176]/50 mb-1 transform -rotate-2">
            <div className="font-handwriting text-[12px] font-bold text-[#5D4037]">
              Follow-up Today
            </div>
            <div className="font-handwriting text-[10.5px] text-[#6D4C41] space-y-0.5 pl-1">
              <div>â€¢ Leads</div>
              <div>â€¢ Rohan</div>
              <div>â€¢ Karan</div>
            </div>
          </div>

          {/* Note 2 */}
          <div className="bg-[#FFFDE7] p-2 rounded-[5px] shadow-[0_4px_10px_rgba(0,0,0,0.04)] border border-[#FFF59D]/40 mb-1 transform rotate-1">
            <div className="font-handwriting text-[11.5px] font-bold text-[#5D4037]">
              Follow-up Tomorrow
            </div>
            <div className="font-handwriting text-[10.5px] text-[#6D4C41] space-y-0.5 pl-1">
              <div>â€¢ Calls</div>
              <div>â€¢ Messages</div>
            </div>
          </div>

          {/* Note 3 */}
          <div className="bg-[#FFCDD2] p-2 rounded-[5px] shadow-[0_6px_14px_rgba(0,0,0,0.06)] border border-[#EF9A9A]/50 transform -rotate-1">
            <div className="font-handwriting text-[11.5px] font-bold text-[#B71C1C]">
              Unsent Follow-ups
            </div>
            <div className="font-handwriting text-[10.5px] text-[#C62828] space-y-0.5 pl-1">
              <div>â€¢ 3 Leads</div>
              <div>â€¢ 2 Clients</div>
            </div>
          </div>
        </div>

        {/* 7. Card: Editing Pending (Upper Right of Hand, Clear of Head) */}
        <div
          className="chaos-card absolute right-[28%] xl:right-[29%] 2xl:right-[31%] top-[25px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_10px_25px_-5px_rgba(33,27,23,0.08)] transform rotate-1 hover:-translate-y-1 transition-all duration-300 w-[165px] xl:w-[180px]"
          style={{
            transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px) rotate(1deg)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[7px] bg-[#EDE7F6] text-[#5E35B1] flex items-center justify-center border border-[#D1C4E9] flex-shrink-0">
                <Clapperboard className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold text-[#211B17]">Editing Pending</div>
                <div className="text-[9.5px] text-[#746E67]">3 Projects Â· Need Review</div>
              </div>
            </div>
            <span className="w-4 h-4 rounded-full bg-[#D32F2F] text-white text-[8.5px] font-bold flex items-center justify-center">
              3
            </span>
          </div>
        </div>

        {/* 8. Card: Payment Tracking (Far Upper Right) */}
        <div
          className="chaos-card absolute right-[13%] xl:right-[15%] 2xl:right-[17%] top-[20px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[16px] p-3 border border-[#E4D7C4] shadow-[0_14px_32px_-6px_rgba(33,27,23,0.1)] transform rotate-2 hover:-translate-y-1 transition-all duration-300 w-[195px] xl:w-[215px]"
          style={{
            transform: `translate3d(${mouseOffset.x * 6}px, ${mouseOffset.y * 4}px, 0px) rotate(2deg)`,
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#F2ECE2]">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#C89435]" />
              <span className="text-[10.5px] font-semibold text-[#211B17]">Payment Tracking</span>
            </div>
          </div>
          <div className="space-y-1 text-[9.5px]">
            <div className="flex items-center justify-between">
              <span className="text-[#746E67]">Advance</span>
              <span className="font-medium text-[#211B17]">â‚¹18,000</span>
              <span className="text-[8.5px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.5 rounded-[3px]">Paid</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#746E67]">Second Payment</span>
              <span className="font-medium text-[#211B17]">â‚¹68,000</span>
              <span className="text-[8.5px] font-medium text-[#D32F2F]">Pending</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#746E67]">Final Payment</span>
              <span className="font-medium text-[#211B17]">â‚¹76,000</span>
              <span className="text-[8.5px] font-medium text-[#D32F2F]">Pending</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#746E67]">Album Payment</span>
              <span className="font-medium text-[#211B17]">â‚¹12,000</span>
              <span className="text-[8.5px] font-medium text-[#D32F2F]">Pending</span>
            </div>
          </div>
        </div>

        {/* 9. Card: Invoice #INV-1023 (Right of Arm / Strap, Clear of Camera) */}
        <div
          className="chaos-card absolute right-[23%] xl:right-[24%] 2xl:right-[26%] top-[145px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[16px] p-3 border border-[#E4D7C4] shadow-[0_16px_36px_-6px_rgba(33,27,23,0.12)] transform -rotate-1 hover:-translate-y-1 transition-all duration-300 w-[195px] xl:w-[215px] z-25"
          style={{
            transform: `translate3d(${mouseOffset.x * 4}px, ${mouseOffset.y * 3}px, 0px) rotate(-1deg)`,
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-[#F2ECE2]">
            <div>
              <div className="text-[8px] uppercase tracking-wider text-[#99928A] font-semibold">Invoice</div>
              <div className="text-[10.5px] font-bold text-[#211B17]">#INV-1023</div>
            </div>
            <span className="text-[8.5px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#C8E6C9]">
              PAID
            </span>
          </div>

          <div className="mb-1.5">
            <div className="text-[10.5px] font-semibold text-[#211B17]">Aarav & Diya</div>
            <div className="text-[9px] text-[#746E67]">Wedding Photography</div>
          </div>

          <div className="bg-[#FAF8F3] p-1.5 rounded-[7px] mb-2">
            <div className="text-[8px] uppercase tracking-wider text-[#99928A] font-semibold">Total Amount</div>
            <div className="text-[14px] font-bold text-[#211B17]">â‚¹1,80,000</div>
          </div>

          <button className="w-full py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[9.5px] font-semibold rounded-[7px] shadow-xs flex items-center justify-center gap-1 transition-colors">
            <MessageCircle className="w-3 h-3" />
            <span>Send on WhatsApp</span>
          </button>
        </div>

        {/* 10. Card: Client Deliverables (Far Lower Right) */}
        <div
          className="chaos-card absolute right-[15%] xl:right-[17%] 2xl:right-[19%] top-[295px] pointer-events-auto bg-white/95 backdrop-blur-sm rounded-[14px] p-2.5 sm:p-3 border border-[#E4D7C4] shadow-[0_12px_28px_-6px_rgba(33,27,23,0.08)] transform rotate-2 hover:-translate-y-1 transition-all duration-300 w-[175px] xl:w-[195px] z-25"
          style={{
            transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px) rotate(2deg)`,
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#F2ECE2]">
            <span className="text-[10.5px] font-semibold text-[#211B17]">Client Deliverables</span>
            <X className="w-3 h-3 text-[#99928A]" />
          </div>
          <div className="space-y-1 text-[9.5px]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Aarav & Diya</div>
                <div className="text-[8px] text-[#746E67]">Wedding Highlights</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#FFF3E0] text-[#E65100] flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-2.5 h-2.5" />
              </div>
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Rohan & Priya</div>
                <div className="text-[8px] text-[#746E67]">Teaser Video</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-2.5 h-2.5" />
              </div>
              <div className="truncate">
                <div className="font-medium text-[#211B17] truncate">Karan & Anjali</div>
                <div className="text-[8px] text-[#746E67]">Album Design</div>
              </div>
            </div>
          </div>
        </div>

        {/* 11. Right Sticky Note */}
        <div
          className="chaos-card absolute right-[16%] xl:right-[18%] 2xl:right-[20%] top-[215px] pointer-events-auto bg-[#FFF9C4] p-2 rounded-[4px] shadow-[0_6px_14px_rgba(0,0,0,0.06)] border border-[#FFF176]/50 transform rotate-6 w-[80px]"
          style={{
            transform: `translate3d(${mouseOffset.x * 5}px, ${mouseOffset.y * 3}px, 0px) rotate(6deg)`,
          }}
        >
          <div className="font-handwriting text-[9.5px] text-[#5D4037] leading-tight font-medium">
            Don't forget Dr. Radheesh photo shoot with album...
          </div>
        </div>
      </div>
    );
  }
);

ChaosCards.displayName = 'ChaosCards';
