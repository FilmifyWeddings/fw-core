'use client';

import { forwardRef } from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderKanban,
  Calendar as CalendarIcon,
  CreditCard,
  UserPlus,
  Zap,
  BarChart3,
  Settings,
  Search,
  Bell,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';

export interface HeroDashboardProps {
  // Add props if needed
}

export const HeroDashboard = forwardRef<HTMLDivElement, HeroDashboardProps>((_, ref) => {
  return (
    <div
      ref={ref}
      className="relative w-full max-w-[700px] xl:max-w-[750px] bg-white rounded-[22px] border border-[#EBE3D5] shadow-[0_30px_70px_-15px_rgba(33,27,23,0.12),0_10px_24px_-5px_rgba(33,27,23,0.04)] overflow-hidden transition-transform duration-300 pointer-events-auto"
    >
      {/* Top App Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2ECE2] bg-[#FAF8F3]/60">
        <div className="flex items-center gap-3">
          <span className="font-serif text-[22px] font-semibold text-[#211B17] tracking-tight">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <button className="p-1.5 text-[#746E67] hover:text-[#211B17] hover:bg-[#F3EEE6] rounded-full transition-colors" title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button className="relative p-1.5 text-[#746E67] hover:text-[#211B17] hover:bg-[#F3EEE6] rounded-full transition-colors" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C89435] ring-2 ring-white" />
          </button>
          <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-[#E9E1D5] bg-[#E9E1D5]">
            <img
              src="/assets/images/avatars/avatar-01.webp"
              alt="Admin Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Main App Body with Sidebar + Workspace */}
      <div className="flex min-h-[460px] bg-[#FFFDF8]/40">
        {/* Left Sidebar */}
        <aside className="w-[140px] xl:w-[155px] border-r border-[#F2ECE2] py-4 px-2.5 flex flex-col gap-0.5 bg-[#FAF8F3]/40 select-none">
          {[
            { name: 'Dashboard', icon: LayoutDashboard, active: true },
            { name: 'Leads', icon: Users, active: false },
            { name: 'Clients', icon: UserCheck, active: false },
            { name: 'Projects', icon: FolderKanban, active: false },
            { name: 'Calendar', icon: CalendarIcon, active: false },
            { name: 'Payments', icon: CreditCard, active: false },
            { name: 'Team', icon: UserPlus, active: false },
            { name: 'Automation', icon: Zap, active: false },
            { name: 'Reports', icon: BarChart3, active: false },
            { name: 'Settings', icon: Settings, active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
                  item.active
                    ? 'bg-[#FAF2E2] text-[#8C6D33] font-semibold border-l-[3px] border-[#C89435] shadow-xs'
                    : 'text-[#746E67] hover:text-[#211B17] hover:bg-[#F5EFE6]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.active ? 'text-[#C89435]' : 'text-[#746E67]'}`} />
                <span>{item.name}</span>
              </div>
            );
          })}
        </aside>

        {/* Right Dashboard Content */}
        <main className="flex-1 p-5 flex flex-col gap-5 overflow-hidden">
          {/* 4 Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1 */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)]">
              <span className="text-[11px] font-medium text-[#746E67] block mb-1">New Leads</span>
              <div className="text-[20px] font-semibold text-[#211B17] leading-tight mb-1">128</div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-[#2E7D32]">
                <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
                <span>+15% this week</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)]">
              <span className="text-[11px] font-medium text-[#746E67] block mb-1">Bookings</span>
              <div className="text-[20px] font-semibold text-[#211B17] leading-tight mb-1">42</div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-[#2E7D32]">
                <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
                <span>+12% this month</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)]">
              <span className="text-[11px] font-medium text-[#746E67] block mb-1">Revenue</span>
              <div className="text-[17px] font-semibold text-[#211B17] leading-tight mb-1 tracking-tight">₹24,80,000</div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-[#2E7D32]">
                <ArrowUpRight className="w-3 h-3 text-[#2E7D32]" />
                <span>+21% this month</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white p-3.5 rounded-[12px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)]">
              <span className="text-[11px] font-medium text-[#746E67] block mb-1">Pending Payments</span>
              <div className="text-[17px] font-semibold text-[#211B17] leading-tight mb-1 tracking-tight">₹6,45,000</div>
              <a href="#payments" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#C89435] hover:underline">
                <span>View Details</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Lower Split: Upcoming Events & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {/* Upcoming Events Box */}
            <div className="bg-white p-4 rounded-[14px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-[#211B17]">Upcoming Events</h3>
                  <a href="#calendar" className="text-[11px] text-[#746E67] hover:text-[#C89435]">View All</a>
                </div>

                <div className="space-y-2.5">
                  {/* Event 1 */}
                  <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF8F3] hover:bg-[#F5EFE6] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-[#E9E1D5]">
                        <img
                          src="/assets/images/weddings/wedding-01.webp"
                          alt="Aarav & Diya"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#211B17]">Aarav & Diya</div>
                        <div className="text-[10px] text-[#746E67]">Wedding</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#8C6D33] bg-[#FAF3E6] px-2 py-0.5 rounded-[4px]">
                      12 Sep
                    </span>
                  </div>

                  {/* Event 2 */}
                  <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF8F3] hover:bg-[#F5EFE6] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-[#E9E1D5]">
                        <img
                          src="/assets/images/weddings/wedding-02.webp"
                          alt="Rohan & Priya"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#211B17]">Rohan & Priya</div>
                        <div className="text-[10px] text-[#746E67]">Reception</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#8C6D33] bg-[#FAF3E6] px-2 py-0.5 rounded-[4px]">
                      15 Sep
                    </span>
                  </div>

                  {/* Event 3 */}
                  <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF8F3] hover:bg-[#F5EFE6] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-[#E9E1D5]">
                        <img
                          src="/assets/images/weddings/wedding-03.webp"
                          alt="Karan & Anjali"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#211B17]">Karan & Anjali</div>
                        <div className="text-[10px] text-[#746E67]">Pre-Wedding</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#8C6D33] bg-[#FAF3E6] px-2 py-0.5 rounded-[4px]">
                      18 Sep
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#F2ECE2] text-center">
                <a href="#calendar" className="text-[11px] font-medium text-[#C89435] hover:underline inline-flex items-center gap-1">
                  <span>View Calendar</span>
                  <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Recent Activity Box */}
            <div className="bg-white p-4 rounded-[14px] border border-[#F2ECE2] shadow-[0_2px_8px_rgba(33,27,23,0.02)]">
              <h3 className="text-[13px] font-semibold text-[#211B17] mb-3">Recent Activity</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#1976D2] mt-1.5 flex-shrink-0 ring-4 ring-[#1976D2]/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#211B17] font-medium truncate">New lead from Meta Ads</p>
                    <span className="text-[9px] text-[#746E67]">2m ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#2E7D32] mt-1.5 flex-shrink-0 ring-4 ring-[#2E7D32]/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#211B17] font-medium truncate">Quotation sent to Rohan & Priya</p>
                    <span className="text-[9px] text-[#746E67]">18m ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#C89435] mt-1.5 flex-shrink-0 ring-4 ring-[#C89435]/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#211B17] font-medium truncate">Payment received from Aarav & Diya</p>
                    <span className="text-[9px] text-[#746E67]">1h ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#7B1FA2] mt-1.5 flex-shrink-0 ring-4 ring-[#7B1FA2]/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#211B17] font-medium truncate">Shoot completed - Karan & Anjali</p>
                    <span className="text-[9px] text-[#746E67]">3h ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#E65100] mt-1.5 flex-shrink-0 ring-4 ring-[#E65100]/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#211B17] font-medium truncate">Album delivery started</p>
                    <span className="text-[9px] text-[#746E67]">5h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});

HeroDashboard.displayName = 'HeroDashboard';
