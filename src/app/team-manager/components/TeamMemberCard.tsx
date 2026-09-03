'use client';

import React from 'react';
import { FWTeamMember } from '@/types';
import { Phone, Mail, ChevronRight, Award } from 'lucide-react';

export interface TeamMemberCardProps {
  member: FWTeamMember;
  totalShoots: number;
  completedCount: number;
  upcomingCount: number;
  roleCounts: Record<string, number>;
  onClick: () => void;
}

export default function TeamMemberCard({
  member,
  totalShoots,
  completedCount,
  upcomingCount,
  roleCounts,
  onClick,
}: TeamMemberCardProps) {
  const cleanMName = member.name ? member.name.replace(/\.\.\./g, '').trim() : 'Team Member';

  return (
    <div
      onClick={onClick}
      className="bg-slate-50/80 hover:bg-white border-2 border-slate-200/90 hover:border-indigo-400 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group select-none"
    >
      {/* MEMBER IDENTITY */}
      <div className="flex items-center gap-3.5 min-w-[220px]">
        {member.avatar_url ? (
          // eslint-disable-next-next/no-img-element
          <img
            src={member.avatar_url}
            alt={cleanMName}
            className="w-12 h-12 rounded-full object-cover border-2 border-white ring-2 ring-purple-400 shadow-sm shrink-0 group-hover:scale-105 transition"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanMName)}`;
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center border-2 border-white ring-2 ring-indigo-200 shadow-sm shrink-0 group-hover:scale-105 transition">
            {cleanMName.slice(0, 2).toUpperCase() || 'TM'}
          </div>
        )}

        <div>
          <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-2">
            {cleanMName}
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black uppercase">
              {member.primary_role}
            </span>
          </h4>
          <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
            {member.country_code || '+91'} {member.phone_number}
          </span>
        </div>
      </div>

      {/* ROLE DISTRIBUTION BADGES */}
      <div className="flex-1 flex items-center gap-1.5 flex-wrap">
        {Object.entries(roleCounts).length === 0 ? (
          <span className="text-xs text-slate-400 italic">No shoots assigned in this scope</span>
        ) : (
          Object.entries(roleCounts).map(([role, count]) => (
            <span key={role} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs">
              {role}: <span className="text-purple-600 font-extrabold">{count}x</span>
            </span>
          ))
        )}
      </div>

      {/* STATS COUNTS & DRILL-DOWN ACTION BUTTON */}
      <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
        <div className="text-left md:text-right">
          <span className="text-lg font-black text-indigo-600 block leading-none">{totalShoots}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
            {completedCount} Done • {upcomingCount} Up
          </span>
        </div>

        <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center transition shadow-2xs shrink-0">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
