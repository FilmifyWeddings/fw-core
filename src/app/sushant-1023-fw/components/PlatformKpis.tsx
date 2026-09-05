'use client';

import React from 'react';
import {
  Building2,
  Crown,
  Sparkles,
  Radio,
  ShieldBan,
  HardDrive,
  CalendarCheck,
  Users2,
  FileText,
} from 'lucide-react';

export interface PlatformKpisData {
  totalStudios: number;
  activePaid: number;
  trialStudios: number;
  activeToday: number;
  suspendedCount: number;
  totalStorageBytes: number;
  totalBookings: number;
  totalTeamMembers: number;
  totalQuotations: number;
}

interface PlatformKpisProps {
  kpis: PlatformKpisData;
  isLoading?: boolean;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function PlatformKpis({ kpis, isLoading }: PlatformKpisProps) {
  const cards = [
    {
      title: 'Total Studios',
      value: kpis.totalStudios,
      subtitle: 'Registered accounts',
      icon: Building2,
      color: 'from-zinc-400 to-zinc-200',
      borderGlow: 'hover:border-zinc-500/40 hover:shadow-zinc-900/40',
      badge: 'All Tenants',
      badgeBg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
      iconColor: 'text-zinc-300 bg-zinc-800/80 border-zinc-700',
    },
    {
      title: 'Paid Subscribers',
      value: kpis.activePaid,
      subtitle: 'Pro, Business & Enterprise',
      icon: Crown,
      color: 'from-amber-300 via-amber-400 to-amber-500',
      borderGlow: 'hover:border-amber-500/40 hover:shadow-amber-950/30',
      badge: `${kpis.totalStudios ? Math.round((kpis.activePaid / kpis.totalStudios) * 100) : 0}% Conversion`,
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Trial Studios',
      value: kpis.trialStudios,
      subtitle: '14-Day onboarding pipeline',
      icon: Sparkles,
      color: 'from-rose-400 via-rose-300 to-pink-400',
      borderGlow: 'hover:border-rose-500/40 hover:shadow-rose-950/30',
      badge: 'Prospective',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      title: 'Active Today',
      value: kpis.activeToday,
      subtitle: 'Activity in last 24 hrs',
      icon: Radio,
      color: 'from-emerald-300 via-emerald-400 to-teal-400',
      borderGlow: 'hover:border-emerald-500/40 hover:shadow-emerald-950/30',
      badge: 'Live Operations',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      pulse: true,
    },
    {
      title: 'Suspended / Blocked',
      value: kpis.suspendedCount,
      subtitle: 'Access governance hold',
      icon: ShieldBan,
      color: 'from-red-400 to-rose-600',
      borderGlow: 'hover:border-red-500/40 hover:shadow-red-950/30',
      badge: kpis.suspendedCount > 0 ? 'Restricted' : 'Clean',
      badgeBg: kpis.suspendedCount > 0 ? 'bg-red-500/15 text-red-300 border-red-500/40' : 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
      iconColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary 5 God-Mode KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-zinc-950/70 border border-zinc-850/80 backdrop-blur-xl shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${card.borderGlow} flex flex-col justify-between group relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.iconColor}`}>
                  <Icon className={`w-4 h-4 ${card.pulse ? 'animate-pulse' : ''}`} />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl md:text-3xl font-black font-sans bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                    {isLoading ? '...' : card.value}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-850">
                  <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                    {card.subtitle}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${card.badgeBg}`}>
                    {card.badge}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Aggregate Bar: Storage, Bookings, Team, Quotations */}
      <div className="p-3.5 rounded-2xl bg-zinc-950/50 border border-zinc-850/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Storage */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Total R2 Storage</div>
              <div className="text-sm font-bold font-mono text-white">
                {isLoading ? '...' : formatBytes(kpis.totalStorageBytes)}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          {/* Bookings */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Bookings & Projects</div>
              <div className="text-sm font-bold font-mono text-white">
                {isLoading ? '...' : kpis.totalBookings.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          {/* Team Members */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Crew & Members</div>
              <div className="text-sm font-bold font-mono text-white">
                {isLoading ? '...' : kpis.totalTeamMembers.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          {/* Quotations */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Quotations Made</div>
              <div className="text-sm font-bold font-mono text-white">
                {isLoading ? '...' : kpis.totalQuotations.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Live Network Health Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 ml-auto">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-zinc-300 font-semibold">Network: All Nodes Nominal</span>
        </div>
      </div>
    </div>
  );
}
