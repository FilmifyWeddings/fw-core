'use client';

import React, { useState } from 'react';
import { FWProject, FWTeamMember, FWSubEvent, FWAssignment } from '@/types';
import { 
  BarChart3, TrendingUp, Users, Calendar, Award, CheckCircle2, 
  AlertTriangle, DollarSign, X, Phone, Mail, MapPin, Clock, 
  FileText, Sparkles, PieChart, Activity, Briefcase, Camera, Film, Disc, Filter
} from 'lucide-react';

interface OperationsAnalyticsTabProps {
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
}

interface MemberShootItem {
  assignment: FWAssignment;
  subEvent: FWSubEvent;
  project: FWProject;
  dateObj: Date;
}

export default function OperationsAnalyticsTab({
  projects,
  teamMembers,
  format12HourTime,
  getGradientByProjectId,
}: OperationsAnalyticsTabProps) {
  const [selectedMember, setSelectedMember] = useState<{
    member: FWTeamMember;
    shoots: MemberShootItem[];
    roleCounts: Record<string, number>;
    completedCount: number;
    upcomingCount: number;
  } | null>(null);

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('All');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeProjects = projects.filter((p) => !p.is_archived);
  
  const allSubEvents = activeProjects.flatMap((p) => 
    (p.fw_sub_events || [])
      .filter((se) => {
        if (selectedMonthFilter === 'All') return true;
        const d = new Date(se.event_date);
        return !isNaN(d.getTime()) && d.getMonth() === parseInt(selectedMonthFilter, 10);
      })
      .map((se) => ({ subEvent: se, project: p }))
  );

  const allAssignments = allSubEvents.flatMap(({ subEvent, project }) => 
    (subEvent.fw_assignments || []).map((a) => ({ assignment: a, subEvent, project }))
  );

  const categories = [
    { key: 'Wedding', name: 'Wedding Ceremonies', icon: Sparkles, color: 'from-amber-500 to-orange-600', keywords: ['wedding', 'phera', 'marriage', 'vow'] },
    { key: 'Pre-wedding', name: 'Pre-Wedding Shoots', icon: Camera, color: 'from-indigo-500 to-purple-600', keywords: ['pre-wedding', 'engagement', 'save the date', 'ring'] },
    { key: 'Sangeet', name: 'Sangeet & Cocktail', icon: Disc, color: 'from-fuchsia-500 to-pink-600', keywords: ['sangeet', 'cocktail', 'party', 'dance'] },
    { key: 'Haldi', name: 'Haldi & Mehendi', icon: Film, color: 'from-yellow-400 to-amber-500', keywords: ['haldi', 'mehendi', 'myaap', 'chooda'] },
    { key: 'Corporate', name: 'Corporate & Other', icon: Briefcase, color: 'from-emerald-500 to-teal-600', keywords: ['corporate', 'commercial', 'portfolio', 'birthday'] },
  ];

  const categoryStats = categories.map((cat) => {
    const count = allSubEvents.filter(({ subEvent }) => {
      const title = subEvent.event_title.toLowerCase();
      return cat.keywords.some((kw) => title.includes(kw)) || (cat.key === 'Wedding' && !title.includes('pre') && !title.includes('sangeet') && !title.includes('haldi'));
    }).length;
    return { ...cat, count };
  });

  const totalShootsCount = allSubEvents.length;

  const monthsList = [
    { label: 'Jan', val: '0' },
    { label: 'Feb', val: '1' },
    { label: 'Mar', val: '2' },
    { label: 'Apr', val: '3' },
    { label: 'May', val: '4' },
    { label: 'Jun', val: '5' },
    { label: 'Jul', val: '6' },
    { label: 'Aug', val: '7' },
    { label: 'Sep', val: '8' },
    { label: 'Oct', val: '9' },
    { label: 'Nov', val: '10' },
    { label: 'Dec', val: '11' },
  ];

  const monthlyShoots = monthsList.map((m) => {
    const count = activeProjects.flatMap(p => p.fw_sub_events || []).filter((se) => {
      const d = new Date(se.event_date);
      return !isNaN(d.getTime()) && d.getMonth() === parseInt(m.val, 10);
    }).length;
    return { month: m.label, val: m.val, count };
  });
  const maxMonthlyCount = Math.max(...monthlyShoots.map((m) => m.count), 1);

  const memberAnalyticsList = teamMembers.map((member) => {
    const memberAssignments = allAssignments.filter(({ assignment }) => assignment.assigned_member_id === member.id);
    
    const roleCounts: Record<string, number> = {};
    let completedCount = 0;
    let upcomingCount = 0;

    const shoots: MemberShootItem[] = memberAssignments.map(({ assignment, subEvent, project }) => {
      const d = new Date(subEvent.event_date);
      const isValid = !isNaN(d.getTime());
      if (isValid && d < today) {
        completedCount++;
      } else {
        upcomingCount++;
      }

      const role = assignment.required_role || 'Ass';
      roleCounts[role] = (roleCounts[role] || 0) + 1;

      return {
        assignment,
        subEvent,
        project,
        dateObj: isValid ? d : new Date(),
      };
    });

    shoots.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    return {
      member,
      totalShoots: shoots.length,
      completedCount,
      upcomingCount,
      roleCounts,
      shoots,
    };
  });

  memberAnalyticsList.sort((a, b) => b.totalShoots - a.totalShoots);

  const totalSlots = allAssignments.length;
  const assignedSlots = allAssignments.filter(({ assignment }) => assignment.assigned_member_id !== null).length;
  const unassignedSlots = totalSlots - assignedSlots;
  const allocationRate = totalSlots > 0 ? Math.round((assignedSlots / totalSlots) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* FILTER & TOP EXECUTIVE CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900">Operations Analytics & Dynamic Filters</h4>
            <p className="text-xs text-slate-500 font-bold">Filter operations breakdown by specific month or entire year</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Month Filter:</label>
          <select
            value={selectedMonthFilter}
            onChange={(e) => setSelectedMonthFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Months (Year 2026)</option>
            {monthsList.map((m) => (
              <option key={m.val} value={m.val}>{m.label} 2026</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: TOP EXECUTIVE KPIs SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-700/50 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-200 uppercase tracking-wider">Scheduled Events</span>
            <Calendar className="w-5 h-5 text-indigo-300" />
          </div>
          <h3 className="text-3xl font-black text-white mt-2">{totalShootsCount}</h3>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-indigo-200">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/30">Active Shoots</span>
            <span>Across {activeProjects.length} Clients</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Crew Roster</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{teamMembers.length}</h3>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-emerald-600">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>100% Operational Roster</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Crew Allocation Rate</span>
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{allocationRate}%</h3>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${allocationRate}%` }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Unassigned Pending Slots</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-3xl font-black text-rose-600 mt-2">{unassignedSlots}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-rose-600">
            <span>{unassignedSlots === 0 ? 'All Slots Filled 🎉' : 'Action Required in Roster'}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: 3D MONTH-BY-MONTH SHOOT VOLUME & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">2026 Monthly Shoot Volume</h4>
                <p className="text-xs text-slate-500 font-bold">Click any month bar to filter stats</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black border border-slate-200">
              Year 2026
            </span>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 pt-8 px-2 border-b border-slate-200">
            {monthlyShoots.map(({ month, val, count }) => {
              const heightPercent = Math.round((count / maxMonthlyCount) * 100);
              const isSelected = selectedMonthFilter === val;

              return (
                <div
                  key={month}
                  onClick={() => setSelectedMonthFilter(isSelected ? 'All' : val)}
                  className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap">
                    {count} {count === 1 ? 'Shoot' : 'Shoots'}
                  </span>

                  <div
                    style={{ height: `${Math.max(heightPercent, 8)}%` }}
                    className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 shadow-md flex items-start justify-center pt-1 ${
                      isSelected
                        ? 'bg-gradient-to-t from-amber-500 via-orange-500 to-amber-400 ring-2 ring-amber-400'
                        : 'bg-gradient-to-t from-indigo-700 via-indigo-500 to-purple-400 group-hover:from-indigo-800 group-hover:to-purple-500'
                    }`}
                  >
                    {count > 0 && <span className="text-[10px] font-black text-white">{count}</span>}
                  </div>

                  <span className={`text-xs font-extrabold mt-2 ${isSelected ? 'text-amber-600 font-black' : 'text-slate-600'}`}>
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Category Breakdown</h4>
              <p className="text-xs text-slate-500 font-bold">Shoots by sub-event category</p>
            </div>
          </div>

          <div className="space-y-3">
            {categoryStats.map((cat) => {
              const IconComp = cat.icon;
              const percent = totalShootsCount > 0 ? Math.round((cat.count / totalShootsCount) * 100) : 0;

              return (
                <div key={cat.key} className="bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl space-y-2 hover:border-indigo-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-xs`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-slate-900">{cat.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{cat.count} Shoots</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className={`bg-gradient-to-r ${cat.color} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: TEAM MEMBER DEEP ANALYTICS ROSTER WITH CLICKABLE DRILL-DOWN POPUPS */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Team Crew Performance & Role Distribution</h3>
              <p className="text-xs text-slate-500 font-bold">
                Click any team member card to open full shoot timeline, location maps, and pay summary
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberAnalyticsList.map(({ member, totalShoots, completedCount, upcomingCount, roleCounts, shoots }) => {
            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember({ member, shoots, roleCounts, completedCount, upcomingCount })}
                className="bg-slate-50/80 hover:bg-white border-2 border-slate-200/90 hover:border-indigo-400 rounded-3xl p-5 transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer space-y-4 group"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar_url ? (
                      // eslint-disable-next-next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400 shadow-sm shrink-0 group-hover:scale-105 transition"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center border-2 border-white ring-2 ring-indigo-200 shadow-sm shrink-0 group-hover:scale-105 transition">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition">{member.name}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase tracking-wider">
                        {member.primary_role}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-indigo-600 block leading-none">{totalShoots}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Total Shoots</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Role Assignments</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.entries(roleCounts).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No shoots assigned yet</span>
                    ) : (
                      Object.entries(roleCounts).map(([role, count]) => (
                        <span key={role} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs">
                          {role}: <span className="text-indigo-600">{count}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="text-emerald-600 font-extrabold">{completedCount} Completed</span>
                  <span className="text-indigo-600 font-extrabold">{upcomingCount} Upcoming</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: CLICKABLE TEAM MEMBER DRILL-DOWN MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                {selectedMember.member.avatar_url ? (
                  // eslint-disable-next-next/no-img-element
                  <img
                    src={selectedMember.member.avatar_url}
                    alt={selectedMember.member.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400 shadow-md shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.member.name)}`;
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center border-2 border-white ring-2 ring-indigo-200 shadow-md shrink-0">
                    {selectedMember.member.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    {selectedMember.member.name}
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black uppercase">
                      {selectedMember.member.primary_role}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {selectedMember.member.country_code || '+91'} {selectedMember.member.phone_number}</span>
                    {selectedMember.member.email && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-500" /> {selectedMember.member.email}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">Total Shoots Assigned</span>
                <h4 className="text-2xl font-black text-indigo-950 mt-1">{selectedMember.shoots.length}</h4>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">Completed Shoots</span>
                <h4 className="text-2xl font-black text-emerald-950 mt-1">{selectedMember.completedCount}</h4>
              </div>

              <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Upcoming Shoots</span>
                <h4 className="text-2xl font-black text-purple-950 mt-1">{selectedMember.upcomingCount}</h4>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Assigned Shoot Timeline ({selectedMember.shoots.length})
              </h4>

              {selectedMember.shoots.length === 0 ? (
                <div className="bg-slate-50 p-6 rounded-2xl text-center text-xs font-bold text-slate-400">
                  No shoots assigned to this team member yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMember.shoots.map(({ subEvent, project, assignment, dateObj }) => {
                    return (
                      <div
                        key={assignment.id}
                        className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-xl bg-indigo-900 text-white text-xs font-black">
                              Client: {project.client_name}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm">
                              {subEvent.event_title}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-black">
                              Role: {assignment.required_role}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{subEvent.event_date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
                          {subEvent.roll_call_time && (
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{format12HourTime(subEvent.roll_call_time)}</span>
                            </div>
                          )}

                          {subEvent.venue_name && (
                            <a
                              href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-indigo-600 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:underline"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{subEvent.venue_name}</span>
                            </a>
                          )}
                        </div>

                        {subEvent.operational_notes && (
                          <div className="bg-amber-50 border-l-4 border-amber-400 p-2.5 rounded-r-xl text-xs text-amber-950 font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Notes: {subEvent.operational_notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl transition cursor-pointer"
              >
                Close Member Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
