'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FWProject, FWTeamMember, FWSubEvent, FWAssignment } from '@/types';
import { 
  BarChart3, TrendingUp, Users, Calendar, Award, CheckCircle2, 
  AlertTriangle, DollarSign, X, Phone, Mail, MapPin, Clock, 
  FileText, Sparkles, PieChart, Activity, Briefcase, Camera, Film, Disc, Filter,
  Layers, ArrowUpRight, Check, AlertCircle, Eye, SlidersHorizontal, Search, ChevronRight,
  Building2
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend 
} from 'recharts';
import OverviewAnalytics from './OverviewAnalytics';
import MemberProfileModal from './MemberProfileModal';
import { useWorkspace } from '@/lib/context/BhamstraContext';

const STUDIO_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#3B82F6', // Blue
];

const MultiStudioCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-xl text-xs space-y-2 min-w-[200px] select-none">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-black text-slate-900">
          <span>{data.fullMonth || label}</span>
          <span className="text-[10px] text-slate-400 font-bold">Studio Workload</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="font-bold text-slate-700 truncate max-w-[130px]">{entry.name}:</span>
              </div>
              <span className="font-black text-slate-900">{entry.value} {entry.value === 1 ? 'Shoot' : 'Shoots'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface OperationsAnalyticsTabProps {
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
  activeStudioId?: string | null;
  isAllStudios?: boolean;
}

interface MemberShootItem {
  assignment: FWAssignment;
  subEvent: FWSubEvent;
  project: FWProject;
  dateObj: Date;
}

const parseSafeDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export default function OperationsAnalyticsTab({
  projects,
  teamMembers,
  format12HourTime,
  getGradientByProjectId,
  activeStudioId,
  isAllStudios: isAllStudiosProp,
}: OperationsAnalyticsTabProps) {
  const { isOwner, permissions, activeWorkspace, userEmail, userId, availableWorkspaces, workspaceId } = useWorkspace();
  const tmAccess = isOwner ? 'ALL_MANAGE' : (permissions?.team_manager_access || 'NONE');
  const isAssignedOnly = !isOwner && (
    tmAccess === 'ASSIGNED_OWN_ROLE' ||
    tmAccess === 'ASSIGNED_FULL_CREW' ||
    tmAccess === 'ASSIGNED_ONLY_VIEW' ||
    tmAccess === 'ASSIGNED_FULL_TEAM_VIEW'
  );
  const isSelfRoleOnly = !isOwner && (
    tmAccess === 'ASSIGNED_OWN_ROLE' ||
    tmAccess === 'ASSIGNED_ONLY_VIEW'
  );

  const effectiveIsAllStudios = isAllStudiosProp ?? (
    workspaceId === 'all' || 
    activeWorkspace?.workspaceId === 'all' || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('studio') === 'all')
  );

  const effectiveActiveStudioId = activeStudioId ?? (
    activeWorkspace?.workspaceId !== 'all' ? activeWorkspace?.workspaceId : null
  );

  // Strictly filter analytics to shoots where project.user_id === activeStudio.id when a single studio is selected
  const scopedProjects = useMemo(() => {
    if (!effectiveIsAllStudios && effectiveActiveStudioId && effectiveActiveStudioId !== 'all') {
      return projects.filter(p => p.user_id === effectiveActiveStudioId);
    }
    return projects;
  }, [projects, effectiveIsAllStudios, effectiveActiveStudioId]);

  const currentMember = useMemo(() => {
    return teamMembers.find(m =>
      (activeWorkspace?.memberId && m.id === activeWorkspace.memberId) ||
      (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase()) ||
      (userId && m.user_id === userId)
    );
  }, [teamMembers, activeWorkspace, userEmail, userId]);

  // 1. TIME & SCOPE FILTER STATES (Default 'all' for complete coverage)
  const [scopeMode, setScopeMode] = useState<'all' | 'month' | 'year' | 'custom'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [personalStatusFilter, setPersonalStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [showAllStudioCards, setShowAllStudioCards] = useState<boolean>(false);
  const [selectedStudioLineIds, setSelectedStudioLineIds] = useState<string[]>([]);

  // 2. CREW MEMBER SEARCH QUERY STATE
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // Drill-down Modal State
  const [selectedMember, setSelectedMember] = useState<{
    member: FWTeamMember;
    shoots: MemberShootItem[];
    roleCounts: Record<string, number>;
    completedCount: number;
    upcomingCount: number;
  } | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeProjects = useMemo(() => scopedProjects.filter((p) => !p.is_archived), [scopedProjects]);

  // All sub-events & assignments across all active projects (unscoped, for deep member profile modal)
  const allSubEventsAcrossProjects = useMemo(() => {
    return activeProjects.flatMap((p) =>
      (p.fw_sub_events || []).map((se) => ({ subEvent: se, project: p }))
    );
  }, [activeProjects]);

  const allAssignmentsAcrossProjects = useMemo(() => {
    return allSubEventsAcrossProjects.flatMap(({ subEvent, project }) =>
      (subEvent.fw_assignments || []).map((a) => ({ assignment: a, subEvent, project }))
    );
  }, [allSubEventsAcrossProjects]);

  // Filter Sub-events according to scope
  const filteredSubEvents = useMemo(() => {
    return activeProjects.flatMap((p) =>
      (p.fw_sub_events || [])
        .filter((se) => {
          const firstAssign = (se.fw_assignments || [])[0];
          const rawDate = se.event_date || (firstAssign as any)?.sub_event_date || p.main_date;
          if (!rawDate) return false;
          const d = parseSafeDate(rawDate);
          if (!d) return false;

          if (scopeMode === 'month') {
            const matchYear = d.getFullYear() === selectedYear;
            if (!matchYear) return false;
            if (selectedMonth !== 'All') {
              return d.getMonth() === parseInt(selectedMonth, 10);
            }
            return true;
          }

          if (scopeMode === 'year') {
            return d.getFullYear() === selectedYear;
          }

          if (scopeMode === 'custom') {
            if (!customStartDate && !customEndDate) return true;
            const time = d.getTime();
            const start = customStartDate ? new Date(customStartDate).getTime() : 0;
            const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Infinity;
            return time >= start && time <= end;
          }

          return true;
        })
        .map((se) => ({ subEvent: se, project: p }))
    );
  }, [activeProjects, scopeMode, selectedYear, selectedMonth, customStartDate, customEndDate]);

  const allAssignmentsInScope = useMemo(() => {
    return filteredSubEvents.flatMap(({ subEvent, project }) =>
      (subEvent.fw_assignments || []).map((a) => ({ assignment: a, subEvent, project }))
    );
  }, [filteredSubEvents]);

  // Categories Breakdown
  const categories = [
    { key: 'Wedding', name: 'Wedding Ceremonies', icon: Sparkles, color: 'from-amber-500 via-orange-500 to-amber-600', keywords: ['wedding', 'phera', 'marriage', 'vow'] },
    { key: 'Pre-wedding', name: 'Pre-Wedding Shoots', icon: Camera, color: 'from-indigo-500 via-purple-600 to-indigo-700', keywords: ['pre-wedding', 'engagement', 'save the date', 'ring'] },
    { key: 'Sangeet', name: 'Sangeet & Cocktail', icon: Disc, color: 'from-fuchsia-500 via-pink-600 to-rose-600', keywords: ['sangeet', 'cocktail', 'party', 'dance'] },
    { key: 'Haldi', name: 'Haldi & Mehendi', icon: Film, color: 'from-yellow-400 via-amber-500 to-yellow-500', keywords: ['haldi', 'mehendi', 'myaap', 'chooda'] },
    { key: 'Corporate', name: 'Corporate & Other', icon: Briefcase, color: 'from-emerald-500 via-teal-600 to-emerald-700', keywords: ['corporate', 'commercial', 'portfolio', 'birthday'] },
  ];

  const totalShootsCount = filteredSubEvents.length;

  const categoryStats = categories.map((cat) => {
    const count = filteredSubEvents.filter(({ subEvent }) => {
      const title = subEvent.event_title.toLowerCase();
      return cat.keywords.some((kw) => title.includes(kw)) || (cat.key === 'Wedding' && !title.includes('pre') && !title.includes('sangeet') && !title.includes('haldi'));
    }).length;
    return { ...cat, count };
  });

  // Monthly Volume Chart Data
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

  const monthlyShoots = useMemo(() => {
    return monthsList.map((m) => {
      const count = activeProjects.flatMap(p => (p.fw_sub_events || []).map(se => ({ se, p }))).filter(({ se, p }) => {
        const firstAssign = (se.fw_assignments || [])[0];
        const rawDate = se.event_date || (firstAssign as any)?.sub_event_date || p.main_date;
        const d = parseSafeDate(rawDate);
        return d && d.getFullYear() === selectedYear && d.getMonth() === parseInt(m.val, 10);
      }).length;
      return { month: m.label, val: m.val, count };
    });
  }, [activeProjects, selectedYear]);
  const maxMonthlyCount = Math.max(...monthlyShoots.map((m) => m.count), 1);

  // My Assignments in Scope for Crew Members
  const myAssignmentsInScope = useMemo(() => {
    return allAssignmentsInScope.filter(({ assignment }) => {
      return (
        (currentMember?.id && assignment.assigned_member_id === currentMember.id) ||
        (activeWorkspace?.memberId && assignment.assigned_member_id === activeWorkspace.memberId) ||
        (userEmail && (assignment as any).fw_team_members?.email?.toLowerCase() === userEmail.toLowerCase()) ||
        (userId && (assignment as any).fw_team_members?.user_id === userId)
      );
    });
  }, [allAssignmentsInScope, currentMember, activeWorkspace, userEmail, userId]);

  // Studio-Wise Distribution & Multi-Studio Trends
  const studioDistribution = useMemo(() => {
    const studioMap = new Map<string, {
      studioId: string;
      studioName: string;
      total: number;
      upcoming: number;
      completed: number;
      completionRate: number;
      monthlyCounts: number[];
      color: string;
    }>();

    // Map all available workspaces
    (availableWorkspaces || []).forEach((w, idx) => {
      if (w.workspaceId && w.workspaceId !== 'all') {
        studioMap.set(w.workspaceId, {
          studioId: w.workspaceId,
          studioName: w.studioName,
          total: 0,
          upcoming: 0,
          completed: 0,
          completionRate: 0,
          monthlyCounts: Array(12).fill(0),
          color: STUDIO_COLORS[idx % STUDIO_COLORS.length],
        });
      }
    });

    // Determine target items (if partner assigned only, use their assigned shoots; else all filtered subevents)
    const targetItems = isAssignedOnly ? myAssignmentsInScope : filteredSubEvents;

    targetItems.forEach((item: any) => {
      const proj = item.project;
      const subEvent = item.subEvent;
      const studioKey = proj.user_id || 'unknown';
      const fallbackName = proj.studio_name || 'Partner Studio';

      if (!studioMap.has(studioKey)) {
        const colorIdx = studioMap.size;
        studioMap.set(studioKey, {
          studioId: studioKey,
          studioName: fallbackName,
          total: 0,
          upcoming: 0,
          completed: 0,
          completionRate: 0,
          monthlyCounts: Array(12).fill(0),
          color: STUDIO_COLORS[colorIdx % STUDIO_COLORS.length],
        });
      }

      const rec = studioMap.get(studioKey)!;
      rec.total++;

      const rawDate = subEvent.event_date || item.assignment?.sub_event_date || proj.main_date;
      const d = parseSafeDate(rawDate);
      if (d && d < today) {
        rec.completed++;
      } else {
        rec.upcoming++;
      }

      if (d && d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          rec.monthlyCounts[mIdx]++;
        }
      }
    });

    const list = Array.from(studioMap.values()).filter(s => s.total > 0 || (availableWorkspaces || []).some(w => w.workspaceId === s.studioId && !w.isOwner));
    list.forEach(s => {
      s.completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    });

    return list;
  }, [availableWorkspaces, isAssignedOnly, myAssignmentsInScope, filteredSubEvents, today, selectedYear]);

  // Top 3 most active studios default for multi-studio trend line chart
  const sortedStudiosByActivity = useMemo(() => {
    return [...studioDistribution].sort((a, b) => b.total - a.total);
  }, [studioDistribution]);

  const defaultActiveStudioIds = useMemo(() => {
    return sortedStudiosByActivity.slice(0, 3).map(s => s.studioId);
  }, [sortedStudiosByActivity]);

  useEffect(() => {
    if (defaultActiveStudioIds.length > 0 && selectedStudioLineIds.length === 0) {
      setSelectedStudioLineIds(defaultActiveStudioIds);
    }
  }, [defaultActiveStudioIds, selectedStudioLineIds.length]);

  const multiStudioChartData = useMemo(() => {
    return monthsList.map((m, idx) => {
      const row: Record<string, any> = {
        month: m.label,
        fullMonth: `${m.label} ${selectedYear}`,
      };
      studioDistribution.forEach(studio => {
        row[studio.studioName] = studio.monthlyCounts[idx] || 0;
      });
      return row;
    });
  }, [monthsList, studioDistribution, selectedYear]);

  // Completed vs Upcoming
  let completedShootsCount = 0;
  let upcomingShootsCount = 0;

  filteredSubEvents.forEach(({ subEvent, project }) => {
    const firstAssign = (subEvent.fw_assignments || [])[0];
    const rawDate = subEvent.event_date || (firstAssign as any)?.sub_event_date || project.main_date;
    const d = parseSafeDate(rawDate);
    if (d && d < today) {
      completedShootsCount++;
    } else {
      upcomingShootsCount++;
    }
  });

  // Team Member Performance & Role Distribution Analytics
  const memberAnalyticsList = useMemo(() => {
    return teamMembers.map((member) => {
      const memberAssignments = allAssignmentsInScope.filter(({ assignment }) => assignment.assigned_member_id === member.id);

      const roleCounts: Record<string, number> = {};
      let memberCompletedCount = 0;
      let memberUpcomingCount = 0;

      const shoots: MemberShootItem[] = memberAssignments.map(({ assignment, subEvent, project }) => {
        const firstAssign = (subEvent.fw_assignments || [])[0];
        const rawDate = subEvent.event_date || (assignment as any).sub_event_date || (firstAssign as any)?.sub_event_date || project.main_date;
        const d = parseSafeDate(rawDate) || new Date();
        const isValid = !isNaN(d.getTime());
        if (isValid && d < today) {
          memberCompletedCount++;
        } else {
          memberUpcomingCount++;
        }

        const role = assignment.required_role || 'Crew';
        roleCounts[role] = (roleCounts[role] || 0) + 1;

        return {
          assignment,
          subEvent,
          project,
          dateObj: d,
        };
      });

      shoots.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      // Comprehensive Shoots across all active projects (unscoped) for full modal drilldown
      const allMemberAssignments = allAssignmentsAcrossProjects.filter(
        ({ assignment }) => assignment.assigned_member_id === member.id
      );

      const allShoots: MemberShootItem[] = allMemberAssignments.map(({ assignment, subEvent, project }) => {
        const firstAssign = (subEvent.fw_assignments || [])[0];
        const rawDate = subEvent.event_date || (assignment as any).sub_event_date || (firstAssign as any)?.sub_event_date || project.main_date;
        const d = parseSafeDate(rawDate) || new Date();
        return {
          assignment,
          subEvent,
          project,
          dateObj: d,
        };
      });

      allShoots.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      return {
        member,
        totalShoots: shoots.length,
        completedCount: memberCompletedCount,
        upcomingCount: memberUpcomingCount,
        roleCounts,
        shoots,
        allShoots,
      };
    });
  }, [teamMembers, allAssignmentsInScope, allAssignmentsAcrossProjects, today]);

  memberAnalyticsList.sort((a, b) => b.totalShoots - a.totalShoots);

  // Filter Crew Members by search query
  const filteredMemberAnalytics = memberAnalyticsList.filter(({ member }) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const cleanName = member.name ? member.name.replace(/\.\.\./g, '').trim().toLowerCase() : '';
    const role = member.primary_role ? member.primary_role.toLowerCase() : '';
    return cleanName.includes(q) || role.includes(q);
  });

  // Capacity & Allocation Metrics
  const totalSlotsInScope = allAssignmentsInScope.length;
  const assignedSlotsInScope = allAssignmentsInScope.filter(({ assignment }) => assignment.assigned_member_id !== null).length;
  const unassignedSlotsInScope = totalSlotsInScope - assignedSlotsInScope;
  const allocationRateInScope = totalSlotsInScope > 0 ? Math.round((assignedSlotsInScope / totalSlotsInScope) * 100) : 100;

  // Unassigned Slots List for Warning Widget
  const unassignedEventsList = filteredSubEvents.filter(({ subEvent }) =>
    (subEvent.fw_assignments || []).some((a) => !a.assigned_member_id)
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-full overflow-x-hidden pb-28 md:pb-10">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TIME & SCOPE FILTERS BAR - COMPACT RESPONSIVE
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-slate-200/90 shadow-md space-y-3">
        <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Analytics Scope</h3>
              <p className="text-[10px] text-slate-400 font-bold hidden sm:block">All · Month · Year · Custom</p>
            </div>
          </div>

          {/* Scope Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setScopeMode('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer select-none ${
                scopeMode === 'all'
                  ? 'bg-[#6C5CE7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setScopeMode('month')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer select-none ${
                scopeMode === 'month'
                  ? 'bg-[#6C5CE7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setScopeMode('year')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer select-none ${
                scopeMode === 'year'
                  ? 'bg-[#6C5CE7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setScopeMode('custom')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer select-none ${
                scopeMode === 'custom'
                  ? 'bg-[#6C5CE7] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Dynamic Controls depending on scope mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
          {scopeMode === 'all' && (
            <span className="text-[11px] font-bold text-slate-500">
              Showing all scheduled shoots across all years
            </span>
          )}

          {(scopeMode === 'month' || scopeMode === 'year') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-6.5 px-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 text-[11px] focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}

          {scopeMode === 'month' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-6.5 px-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 text-[11px] focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs max-w-[120px]"
              >
                <option value="All">All {selectedYear}</option>
                {monthsList.map((m) => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {scopeMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold text-[9px]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold text-[9px]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                />
              </div>
            </div>
          )}

          <div className="ml-auto text-indigo-600 font-black text-[10px] bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            {totalShootsCount} Sub-Events
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STUDIO-WISE WORK DISTRIBUTION & MULTI-STUDIO TREND CHART
          Rendered when consolidated (isAllStudios) or when multiple studios exist
         ───────────────────────────────────────────────────────────── */}
      {(effectiveIsAllStudios || studioDistribution.length > 1) && (
        <div className="bg-white rounded-3xl border-2 border-indigo-200/80 p-5 sm:p-6 shadow-md shadow-indigo-100/50 space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Studio-Wise Work Distribution
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Itemized workload, upcoming shoots, and completion rate across partner studios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-black shadow-2xs">
                {studioDistribution.length} Partner Studios
              </span>
            </div>
          </div>

          {/* ITEMISED STUDIO BREAKDOWN CARDS (Limited to 4 with Expandable Toggle) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(showAllStudioCards ? studioDistribution : studioDistribution.slice(0, 4)).map((studio) => (
                <div
                  key={studio.studioId}
                  className="bg-slate-50/70 hover:bg-slate-50 border-2 border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: studio.color }} />
                      <h5 className="text-sm font-black text-slate-900 truncate">
                        {studio.studioName}
                      </h5>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[11px] font-bold border border-rose-500/20 shrink-0">
                      🏢 Studio
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/60">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total</span>
                      <span className="text-base font-black text-slate-900">{studio.total}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Upcoming</span>
                      <span className="text-base font-black text-amber-600">{studio.upcoming}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Done</span>
                      <span className="text-base font-black text-emerald-600">{studio.completed}</span>
                    </div>
                  </div>

                  {/* Completion Rate Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold text-[11px]">Completion Rate</span>
                      <span className="font-black text-indigo-700">{studio.completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${studio.completionRate}%`,
                          backgroundColor: studio.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Expandable Luxury Toggle Button */}
            {studioDistribution.length > 4 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllStudioCards(prev => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#FDFBF7] text-slate-700 border border-slate-200/90 shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer select-none"
                >
                  <span>{showAllStudioCards ? 'Show Less ▴' : `View All (${studioDistribution.length}) Studios ▾`}</span>
                </button>
              </div>
            )}
          </div>

          {/* MULTI-STUDIO MONTHLY TREND LINE CHART */}
          <div className="pt-4 border-t border-indigo-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Multi-Studio Monthly Workload Trends ({selectedYear})
                </span>
              </div>

              {/* Clickable studio toggle chips */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {studioDistribution.map((studio) => {
                  const isVisible = selectedStudioLineIds.includes(studio.studioId);
                  return (
                    <button
                      key={studio.studioId}
                      type="button"
                      onClick={() => {
                        setSelectedStudioLineIds(prev => {
                          if (prev.includes(studio.studioId)) {
                            return prev.length > 1 ? prev.filter(id => id !== studio.studioId) : prev;
                          }
                          return [...prev, studio.studioId];
                        });
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none ${
                        isVisible
                          ? 'bg-white border-slate-300 shadow-2xs font-extrabold text-slate-900 ring-1 ring-slate-200'
                          : 'bg-slate-100/70 border-slate-200 opacity-40 hover:opacity-80 font-medium text-slate-400'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                        style={{
                          backgroundColor: studio.color,
                          transform: isVisible ? 'scale(1)' : 'scale(0.8)',
                        }}
                      />
                      <span className="text-[11px]">{studio.studioName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-64 sm:h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiStudioChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<MultiStudioCustomTooltip />} />
                  {studioDistribution
                    .filter(s => selectedStudioLineIds.includes(s.studioId))
                    .map((studio) => (
                      <Line
                        key={studio.studioId}
                        type="monotone"
                        dataKey={studio.studioName}
                        stroke={studio.color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: studio.color }}
                        activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ISOLATED VIEW FOR ASSIGNED MEMBERS (NO STUDIO-WIDE LEAKS)
         ───────────────────────────────────────────────────────────── */}
      {isAssignedOnly && (() => {

        let myCompletedCount = 0;
        let myUpcomingCount = 0;
        myAssignmentsInScope.forEach(({ subEvent, project, assignment }) => {
          const rawDate = subEvent.event_date || (assignment as any).sub_event_date || project.main_date;
          const d = parseSafeDate(rawDate);
          if (d && d < today) {
            myCompletedCount++;
          } else {
            myUpcomingCount++;
          }
        });
        const myTotalCount = myUpcomingCount + myCompletedCount;

        const displayedAssignments = personalStatusFilter === 'all'
          ? myAssignmentsInScope
          : myAssignmentsInScope.filter(({ subEvent, project, assignment }) => {
              const rawDate = subEvent.event_date || (assignment as any).sub_event_date || project.main_date;
              const d = parseSafeDate(rawDate);
              if (personalStatusFilter === 'completed') {
                return Boolean(d && d < today);
              }
              return Boolean(!d || d >= today);
            });

        return (
          <div className="space-y-6">
            {/* 3 PERSONAL KPI CARDS - INTERACTIVE & CLICKABLE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* KPI 1: MY ASSIGNED SHOOTS */}
              <div 
                onClick={() => setPersonalStatusFilter('all')}
                className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                  personalStatusFilter === 'all'
                    ? 'bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white border-indigo-400 ring-4 ring-indigo-500/40 shadow-xl'
                    : 'bg-slate-900/80 text-white/70 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-indigo-200 uppercase tracking-wider">My Assigned Shoots</span>
                  <Calendar className="w-5 h-5 text-indigo-300" />
                </div>
                <h3 className="text-3xl font-black text-white mt-2 leading-none">{myTotalCount}</h3>
                <p className="text-xs text-indigo-200/80 mt-2 font-medium">Total sub-events assigned to me</p>
                {personalStatusFilter === 'all' && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Active Filter (All)</span>
                  </div>
                )}
              </div>

              {/* KPI 2: MY UPCOMING */}
              <div 
                onClick={() => setPersonalStatusFilter('upcoming')}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer select-none relative overflow-hidden ${
                  personalStatusFilter === 'upcoming'
                    ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-400/40 shadow-xl'
                    : 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">My Upcoming</span>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-3xl font-black text-amber-600 mt-2 leading-none">{myUpcomingCount}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">Shoots scheduled ahead</p>
                {personalStatusFilter === 'upcoming' && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Active Filter (Upcoming)</span>
                  </div>
                )}
              </div>

              {/* KPI 3: MY COMPLETED */}
              <div 
                onClick={() => setPersonalStatusFilter('completed')}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer select-none relative overflow-hidden ${
                  personalStatusFilter === 'completed'
                    ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-400/40 shadow-xl'
                    : 'bg-white border-slate-200/90 shadow-md shadow-slate-200/40 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">My Completed</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-emerald-600 mt-2 leading-none">{myCompletedCount}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">Completed past shoots</p>
                {personalStatusFilter === 'completed' && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Filter (Completed)</span>
                  </div>
                )}
              </div>
            </div>

            {/* MY SCHEDULED ROSTER */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>My Scheduled Shoots & Call Times</span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {displayedAssignments.length} {personalStatusFilter === 'all' ? 'Total' : personalStatusFilter === 'upcoming' ? 'Upcoming' : 'Completed'}
                  </span>
                </div>
              </div>

              {displayedAssignments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">
                  No {personalStatusFilter === 'all' ? 'scheduled' : personalStatusFilter} shoots assigned to you in this time range.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedAssignments.map(({ assignment, subEvent, project }, idx) => {
                    const rawDate = subEvent.event_date || (assignment as any).sub_event_date || project.main_date;
                    const d = parseSafeDate(rawDate);
                    const dateStr = d ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
                    const role = assignment.required_role;
                    const allCrew = subEvent.fw_assignments || [];

                    return (
                      <div key={`${assignment.id}-${idx}`} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              {dateStr}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{project.client_name}</span>
                            {((project as any).studio_name || effectiveIsAllStudios) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                🏢 {(project as any).studio_name || 'Studio'}
                              </span>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="font-bold text-slate-700 text-sm">{subEvent.event_title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                            {subEvent.roll_call_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Call: {format12HourTime(subEvent.roll_call_time)}</span>
                              </span>
                            )}
                            {subEvent.venue_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{subEvent.venue_name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* My assigned role badge */}
                          <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{role}</span>
                          </div>

                          {/* Other crew slots (Completely omitted when isSelfRoleOnly) */}
                          {allCrew.filter(c => c.id !== assignment.id).map(otherSlot => {
                            if (isSelfRoleOnly) {
                              return null;
                            }
                            const otherMember = teamMembers.find(m => m.id === otherSlot.assigned_member_id);
                            return (
                              <div key={otherSlot.id} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
                                <span className="text-slate-400 font-bold">{otherSlot.required_role}:</span>
                                <span>{otherMember?.name || 'Unassigned'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!isAssignedOnly && (
        <>
          {/* ─────────────────────────────────────────────────────────────
              2. TOP EXECUTIVE 3D KPI METRIC CARDS
             ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: TOTAL SHOOTS IN SCOPE */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-indigo-700/60 shadow-xl relative overflow-hidden group hover:-translate-y-1 transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-200 uppercase tracking-wider">Scheduled Sub-Events</span>
            <Calendar className="w-5 h-5 text-indigo-300" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-none">{totalShootsCount}</h3>
          <div className="flex items-center justify-between mt-3 text-[11px] font-bold text-indigo-200 flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded-md bg-white/20 border border-white/20">
              {scopeMode === 'month' ? (selectedMonth === 'All' ? `Year ${selectedYear}` : `${monthsList[parseInt(selectedMonth, 10)]?.label} ${selectedYear}`) : scopeMode === 'year' ? `Year ${selectedYear}` : 'Custom Range'}
            </span>
            <span>{completedShootsCount} Done • {upcomingShootsCount} Upcoming</span>
          </div>
        </div>

        {/* KPI 2: ACTIVE CREW ROSTER */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Active Directory Roster</span>
            <Users className="w-5 h-5 text-[#6C5CE7]" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-none">{teamMembers.length}</h3>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-bold text-emerald-600">
            <Award className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>100% Active & Operational</span>
          </div>
        </div>

        {/* KPI 3: CREW ALLOCATION RATE */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Crew Allocation Rate</span>
            <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-emerald-600 mt-2 leading-none">{allocationRateInScope}%</h3>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${allocationRateInScope}%` }} />
          </div>
        </div>

        {/* KPI 4: CRITICAL UNASSIGNED SLOTS ALERT */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Pending Unassigned Slots</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-rose-600 mt-2 leading-none">{unassignedSlotsInScope}</h3>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-rose-600">
            <span>{unassignedSlotsInScope === 0 ? 'All Slots Filled 🎉' : 'Action Needed in Roster'}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. 3D MONTHLY SHOOT VOLUME & SUB-EVENT CATEGORY BREAKDOWN
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MONTHLY VOLUME LIVE RECHARTS LINE CHART (8 COLS) */}
        <div className="lg:col-span-8">
          <OverviewAnalytics
            projects={projects}
            selectedYear={selectedYear}
            scopeMode={scopeMode}
            selectedMonth={selectedMonth}
            onSelectMonth={(monthVal) => {
              setScopeMode('month');
              setSelectedMonth(monthVal);
            }}
          />
        </div>

        {/* CATEGORY BREAKDOWN CARDS (4 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Sub-Event Type Breakdown</h4>
              <p className="text-xs text-slate-500 font-bold">Shoots count by event type</p>
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

      {/* ─────────────────────────────────────────────────────────────
          4. CAPACITY & ALLOCATION PLANNING WIDGETS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CRITICAL UNASSIGNED SLOTS WARNING WIDGET (6 COLS) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-black">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">Critical Unassigned Slots</h4>
                <p className="text-xs text-slate-500 font-bold">Sub-events requiring crew allocation</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black border border-rose-200">
              {unassignedEventsList.length} Events Pending
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
            {unassignedEventsList.length === 0 ? (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center text-xs font-bold text-emerald-800">
                🎉 All sub-events in this scope have 100% assigned crew!
              </div>
            ) : (
              unassignedEventsList.map(({ subEvent, project }) => {
                const unassignedCount = (subEvent.fw_assignments || []).filter((a) => !a.assigned_member_id).length;

                return (
                  <div
                    key={subEvent.id}
                    className="flex items-center justify-between p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 text-xs font-bold"
                  >
                    <div>
                      <span className="font-extrabold text-indigo-900 block">{project.client_name}</span>
                      <span className="text-slate-700 text-[11px] block">{subEvent.event_title} ({subEvent.event_date || 'Date TBD'})</span>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-[10px]">
                      {unassignedCount} Unassigned Role{unassignedCount === 1 ? '' : 's'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CREW UTILIZATION & CAPACITY HEATMAP INDICATOR (6 COLS) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">Crew Utilization & Capacity Heatmap</h4>
                <p className="text-xs text-slate-500 font-bold">Booked vs Available Capacity</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-200">
              Capacity Meter
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Overall Roster Capacity Filled:</span>
              <span className="text-indigo-600 font-black text-sm">{allocationRateInScope}%</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allocationRateInScope > 85
                    ? 'bg-gradient-to-r from-emerald-500 to-indigo-600'
                    : allocationRateInScope > 50
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                    : 'bg-gradient-to-r from-rose-500 to-amber-500'
                }`}
                style={{ width: `${allocationRateInScope}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Assigned Slots</span>
                <span className="text-xl font-black text-emerald-600">{assignedSlotsInScope}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Available Slots</span>
                <span className="text-xl font-black text-amber-600">{unassignedSlotsInScope}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. TEAM MEMBER PERFORMANCE & ROLE DISTRIBUTION LIST REGISTER (WITH SEARCH & DRILL-DOWN POPUP)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-6 md:p-8 shadow-md shadow-slate-200/30 space-y-6">
        
        {/* HEADER BAR WITH SEARCH INPUT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Team Crew Performance & Role Distribution</h3>
              <p className="text-xs text-slate-500 font-bold">
                Click any team member row to open full shoot timeline, venue locations, and payout status
              </p>
            </div>
          </div>

          {/* CREW SEARCH BAR */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search crew by name or role..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] transition shadow-2xs"
            />
          </div>
        </div>

        {/* CLEAN LIST REGISTER LAYOUT FOR OVERVIEW TEAM CARDS */}
        <div className="space-y-3">
          {filteredMemberAnalytics.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-400">
              No team members match your search criteria.
            </div>
          ) : (
            filteredMemberAnalytics.map(({ member, totalShoots, completedCount, upcomingCount, roleCounts, shoots, allShoots }) => {
              const cleanMName = member.name ? member.name.replace(/\.\.\./g, '').trim() : '';

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember({ member, shoots: allShoots, roleCounts, completedCount, upcomingCount })}
                  className="bg-slate-50/80 hover:bg-white border-2 border-slate-200/90 hover:border-indigo-400 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group select-none"
                >
                  {/* MEMBER IDENTITY */}
                  <div className="flex items-center gap-3.5 min-w-[220px]">
                    {member.avatar_url ? (
                      // eslint-disable-next-next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={cleanMName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400 shadow-sm shrink-0 group-hover:scale-105 transition"
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
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase">
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
                          {role}: <span className="text-indigo-600 font-extrabold">{count}x</span>
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

                    <div className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition shadow-2xs shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  )}

  {/* ─────────────────────────────────────────────────────────────
          6. DEEP TEAM MEMBER ANALYTICS MODAL (ROLE, YEAR, MONTH FILTERS & PAGINATION)
         ───────────────────────────────────────────────────────────── */}
      <MemberProfileModal
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        member={selectedMember?.member || null}
        shoots={selectedMember?.shoots || []}
        format12HourTime={format12HourTime}
      />
    </div>
  );
}
