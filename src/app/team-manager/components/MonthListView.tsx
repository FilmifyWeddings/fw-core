'use client';

import React, { useState, useMemo } from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import { 
  Calendar, Clock, MapPin, ChevronDown, ChevronUp, AlertCircle, 
  Moon, CheckCircle2, User, Users, Filter, Sparkles, Search, Plus
} from 'lucide-react';
import RoleAssignDropdown from './RoleAssignDropdown';

interface MonthListViewProps {
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  searchQuery: string;
  selectedRoleFilter: string;
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
  onAssignMember: (assignmentId: string, memberId: string | null) => void;
  onAddNewMember: (info: { assignmentId: string; role: string; subEventId: string; projectId: string }) => void;
  onAddProject?: (initialDate?: string) => void;
}

interface FlattenedSubEvent {
  subEvent: FWSubEvent;
  project: FWProject;
  dateObj: Date;
  monthKey: string;
  monthYearId: string; // e.g. "2026-08"
  isPast: boolean;
  isTbd: boolean;
  sortTimestamp: number;
}

// Robust assignment resolver ensuring ALL configured roles remain visible (assigned or unassigned)
const resolveSubEventAssignments = (subEvent: FWSubEvent, teamMembers: FWTeamMember[]): FWAssignment[] => {
  let rawRoles: string[] = [];
  if (Array.isArray((subEvent as any).roles)) {
    rawRoles = (subEvent as any).roles;
  } else if (typeof (subEvent as any).roles === 'string') {
    try { rawRoles = JSON.parse((subEvent as any).roles); } catch (e) {}
  } else if (Array.isArray((subEvent as any).roles_assigned)) {
    rawRoles = (subEvent as any).roles_assigned;
  } else if (Array.isArray((subEvent as any).event_roles)) {
    rawRoles = (subEvent as any).event_roles;
  }

  const existingAssignments = subEvent.fw_assignments || [];
  const assignRoles = existingAssignments.map(a => a.required_role).filter(Boolean);
  const allRoles = Array.from(new Set([...rawRoles, ...assignRoles]));

  if (allRoles.length === 0) {
    return existingAssignments;
  }

  return allRoles.map((role: string, idx: number) => {
    const existing = existingAssignments.find(
      a => a.required_role?.toLowerCase() === role.toLowerCase()
    );
    if (existing) {
      const matched = existing.fw_team_members || (existing.assigned_member_id ? teamMembers.find(m => m.id === existing.assigned_member_id) : null);
      return {
        ...existing,
        fw_team_members: matched || existing.fw_team_members || null
      };
    }
    return {
      id: `${subEvent.id}-role-${idx}`,
      sub_event_id: subEvent.id,
      project_id: subEvent.project_id,
      required_role: role,
      assigned_member_id: null,
      fw_team_members: null,
    };
  });
};

export default function MonthListView({
  projects,
  teamMembers,
  searchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onAssignMember,
  onAddNewMember,
  onAddProject,
}: MonthListViewProps) {
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [isPastSectionExpanded, setIsPastSectionExpanded] = useState<boolean>(false);
  const [isTbdSectionExpanded, setIsTbdSectionExpanded] = useState<boolean>(false);

  // Smart Filter Suite States
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'fully_assigned' | 'overnight'>('all');
  const [selectedPmFilter, setSelectedPmFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);

  const now = new Date();
  const currentMonthYearId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Unique Project Managers list
  const projectManagers = useMemo(() => {
    const pms = new Set<string>();
    projects.forEach(p => {
      if ((p as any).project_manager) pms.add((p as any).project_manager);
      if ((p as any).lead_assigned_to) pms.add((p as any).lead_assigned_to);
    });
    return Array.from(pms).filter(Boolean);
  }, [projects]);

  // Flatten and categorize sub-events
  const { tbdEvents, activeMonthGroups, pastMonthGroups, activeMonthOrder, pastMonthOrder } = useMemo(() => {
    const tbdList: FlattenedSubEvent[] = [];
    const activeGroups: { [monthKey: string]: FlattenedSubEvent[] } = {};
    const pastGroups: { [monthKey: string]: FlattenedSubEvent[] } = {};
    const activeOrder: string[] = [];
    const pastOrder: string[] = [];

    const q = searchQuery.trim().toLowerCase();

    projects.forEach((project) => {
      if (project.is_archived) return;

      const matchClientName = !q || project.client_name.toLowerCase().includes(q);

      // Project Manager Filter
      if (selectedPmFilter !== 'all') {
        const pmName = (project as any).project_manager || (project as any).lead_assigned_to || '';
        if (pmName.toLowerCase() !== selectedPmFilter.toLowerCase()) return;
      }

      (project.fw_sub_events || []).forEach((se) => {
        const matchSubTitle = !q || se.event_title.toLowerCase().includes(q);
        if (!matchClientName && !matchSubTitle) return;

        const assignments = resolveSubEventAssignments(se, teamMembers);
        const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
        const totalSlots = assignments.length;

        // Role filter
        if (selectedRoleFilter !== 'All') {
          const hasRole = assignments.some((a) => a.required_role === selectedRoleFilter);
          if (!hasRole) return;
        }

        // Specific Crew Member filter
        if (selectedMemberFilter !== 'all') {
          const hasMember = assignments.some((a) => a.assigned_member_id === selectedMemberFilter);
          if (!hasMember) return;
        }

        // Accurate overnight check: strictly when user explicitly marks is_overnight
        const isOvernight = Boolean((se as any).is_overnight === true || (se as any).is_overnight === 'true');

        // Smart Status Filters
        if (statusFilter === 'unassigned' && assignedCount === totalSlots && totalSlots > 0) return;
        if (statusFilter === 'fully_assigned' && (assignedCount < totalSlots || totalSlots === 0)) return;
        if (statusFilter === 'overnight' && !isOvernight) return;

        const isTbd = Boolean((se as any).is_date_tbd) || !se.event_date || se.event_date.toLowerCase() === 'tbd';
        const d = se.event_date ? new Date(se.event_date) : null;
        const isValidDate = !isTbd && d && !isNaN(d.getTime());

        if (!isValidDate) {
          tbdList.push({
            subEvent: se,
            project,
            dateObj: new Date(),
            monthKey: 'Date Not Fixed (TBD)',
            monthYearId: 'TBD',
            isPast: false,
            isTbd: true,
            sortTimestamp: 0,
          });
          return;
        }

        const dateObj = d!;
        const monthKey = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const monthYearId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const isPast = monthYearId < currentMonthYearId;

        const item: FlattenedSubEvent = {
          subEvent: se,
          project,
          dateObj,
          monthKey,
          monthYearId,
          isPast,
          isTbd: false,
          sortTimestamp: dateObj.getTime(),
        };

        if (isPast) {
          if (!pastGroups[monthKey]) {
            pastGroups[monthKey] = [];
          }
          pastGroups[monthKey].push(item);
        } else {
          if (!activeGroups[monthKey]) {
            activeGroups[monthKey] = [];
          }
          activeGroups[monthKey].push(item);
        }
      });
    });

    // 1. Sort items within each month chronologically
    Object.keys(activeGroups).forEach(k => activeGroups[k].sort((a, b) => a.sortTimestamp - b.sortTimestamp));
    Object.keys(pastGroups).forEach(k => pastGroups[k].sort((a, b) => a.sortTimestamp - b.sortTimestamp));

    // 2. Sort active month groups STRICTLY chronologically ascending (e.g. Sep 2026 -> Oct 2026 -> Nov 2026 -> Jan 2027)
    const sortedActiveOrder = Object.keys(activeGroups).sort((a, b) => {
      const tA = activeGroups[a][0]?.sortTimestamp || 0;
      const tB = activeGroups[b][0]?.sortTimestamp || 0;
      return tA - tB;
    });

    // 3. Sort past month groups descending (most recent past month first)
    const sortedPastOrder = Object.keys(pastGroups).sort((a, b) => {
      const tA = pastGroups[a][0]?.sortTimestamp || 0;
      const tB = pastGroups[b][0]?.sortTimestamp || 0;
      return tB - tA;
    });

    return {
      tbdEvents: tbdList,
      activeMonthGroups: activeGroups,
      pastMonthGroups: pastGroups,
      activeMonthOrder: sortedActiveOrder,
      pastMonthOrder: sortedPastOrder,
    };
  }, [projects, teamMembers, searchQuery, selectedRoleFilter, statusFilter, selectedPmFilter, selectedMemberFilter, currentMonthYearId]);

  const totalEventsCount = useMemo(() => {
    let count = tbdEvents.length;
    Object.values(activeMonthGroups).forEach(arr => count += arr.length);
    Object.values(pastMonthGroups).forEach(arr => count += arr.length);
    return count;
  }, [tbdEvents, activeMonthGroups, pastMonthGroups]);

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* ─── SMART COMPACT FILTER SUITE TOOLBAR ─── */}
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-black text-slate-800 tracking-tight">Month Register</span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
              {totalEventsCount} Events
            </span>
          </div>

          {/* Active Filter Indicators */}
          {(statusFilter !== 'all' || selectedPmFilter !== 'all' || selectedMemberFilter !== 'all') && (
            <div className="flex items-center gap-1 overflow-hidden">
              {statusFilter !== 'all' && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-200 shrink-0">
                  {statusFilter === 'unassigned' ? 'Unassigned' : statusFilter === 'fully_assigned' ? 'Assigned' : 'Overnight'}
                </span>
              )}
              {selectedPmFilter !== 'all' && (
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-200 truncate max-w-[70px]">
                  PM: {selectedPmFilter}
                </span>
              )}
              {selectedMemberFilter !== 'all' && (
                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 text-[9px] font-bold border border-purple-200 truncate max-w-[70px]">
                  Crew: {teamMembers.find(m => m.id === selectedMemberFilter)?.name || 'Filtered'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* SINGLE FILTER BUTTON */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className={`h-6.5 px-2.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
              statusFilter !== 'all' || selectedPmFilter !== 'all' || selectedMemberFilter !== 'all'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Filter</span>
            {(statusFilter !== 'all' || selectedPmFilter !== 'all' || selectedMemberFilter !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            )}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 3D DROPDOWN POPOVER FOR FILTERS */}
          {isFilterDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsFilterDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 space-y-2 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Filter Options
                  </span>
                  {(statusFilter !== 'all' || selectedPmFilter !== 'all' || selectedMemberFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setSelectedPmFilter('all');
                        setSelectedMemberFilter('all');
                      }}
                      className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* 1. Status Filter Dropdown */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Event Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full h-6.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Events</option>
                    <option value="unassigned">🔴 Unassigned Only</option>
                    <option value="fully_assigned">🟢 Fully Assigned</option>
                    <option value="overnight">🌙 Overnight Shoots</option>
                  </select>
                </div>

                {/* 2. Project Manager Dropdown */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Project Manager
                  </label>
                  <select
                    value={selectedPmFilter}
                    onChange={(e) => setSelectedPmFilter(e.target.value)}
                    className="w-full h-6.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">All PMs</option>
                    {projectManagers.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Crew Member Dropdown */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block">
                    Crew Member
                  </label>
                  <select
                    value={selectedMemberFilter}
                    onChange={(e) => setSelectedMemberFilter(e.target.value)}
                    className="w-full h-6.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Crew</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name || 'Member'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── 1. COLLAPSIBLE LUXURY REDDISH "DATE NOT FIXED (TBD)" SECTION ─── */}
      {tbdEvents.length > 0 && (
        <div className="bg-[#FFF5F5] rounded-3xl border border-rose-200/90 p-4 md:p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
          {/* TBD ACCORDION TOGGLE BAR (CLICKABLE ANYWHERE & RIGHT ARROW) */}
          <div
            onClick={() => setIsTbdSectionExpanded(!isTbdSectionExpanded)}
            className="flex items-center justify-between bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 text-white px-5 py-3.5 rounded-2xl border border-rose-800 cursor-pointer hover:border-rose-400/80 transition shadow-md select-none"
            title="Click to Hide or Unhide Date Not Fixed Shoots"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-rose-300 flex items-center justify-center font-black border border-white/10 shadow-inner">
                <AlertCircle className="w-5 h-5 text-rose-300" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Date Not Fixed (TBD)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-xs font-bold border border-rose-400/30">
                    Action Required
                  </span>
                </h3>
                <span className="text-xs font-bold text-rose-200/80">
                  {tbdEvents.length} Shoot{tbdEvents.length === 1 ? '' : 's'} Pending Date (Click to {isTbdSectionExpanded ? 'Hide' : 'Show'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-black border border-white/10 backdrop-blur-sm">
                {tbdEvents.length} Events
              </span>
              <ChevronDown
                className={`w-5 h-5 text-rose-200 transition-transform duration-200 ${
                  isTbdSectionExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {/* TBD EVENTS LIST (FULL LUXURY RED-THEMED CARDS IDENTICAL TO FIXED-DATE CARDS) */}
          {isTbdSectionExpanded && (
            <div className="space-y-4 pt-1">
              {tbdEvents.map(({ subEvent, project }) => {
                const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                const totalSlots = assignments.length;

                const isOvernightShoot = Boolean(
                  (subEvent as any).is_overnight || 
                  (subEvent.roll_call_time && subEvent.dismissal_estimate_time && subEvent.dismissal_estimate_time < subEvent.roll_call_time)
                );

                return (
                  <div
                    key={subEvent.id}
                    className="bg-white rounded-2xl border-2 border-rose-200/90 hover:border-rose-400 shadow-xs hover:shadow-md transition-all p-5 flex flex-col lg:flex-row items-stretch gap-5"
                  >
                    {/* DATE BADGE COLUMN (ROSE / RED THEME) */}
                    <div
                      className="bg-gradient-to-b from-rose-600 via-rose-700 to-rose-900 w-full lg:w-32 rounded-xl p-3.5 shrink-0 flex lg:flex-col items-center justify-between text-center text-white shadow-xs"
                    >
                      <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                        <span className="text-xs font-bold text-rose-200/90 uppercase tracking-wider">
                          DATE
                        </span>
                        <span className="text-2xl lg:text-3xl font-black text-white leading-none my-1 tracking-wider">
                          TBD
                        </span>
                        <span className="text-[10px] font-black text-rose-200/90 uppercase tracking-wider">
                          NOT FIXED
                        </span>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black border border-white/20 mt-1">
                        {assignedCount}/{totalSlots} Crew
                      </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 space-y-3.5">
                      {/* HEADER: CLIENT NAME & SUB EVENT TITLE */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-rose-950 font-black text-sm md:text-base tracking-tight">
                            {project.client_name}
                          </span>

                          <span className="text-rose-300 text-sm font-light select-none">·</span>

                          <h4 className="text-sm md:text-base font-bold text-rose-700 tracking-tight">
                            {subEvent.event_title}
                          </h4>

                          <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 font-extrabold text-[10px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Date Not Fixed</span>
                          </span>

                          {isOvernightShoot && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] flex items-center gap-1">
                              <Moon className="w-3 h-3" />
                              <span>Overnight</span>
                            </span>
                          )}
                        </div>

                        {/* LOCATION & TIME */}
                        <div className="flex items-center gap-3 text-xs font-bold text-stone-600 flex-wrap">
                          {subEvent.roll_call_time && (
                            <div className="flex items-center gap-1.5 text-rose-900 bg-rose-50/80 px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                              <Clock className="w-4 h-4 text-rose-700 shrink-0" />
                              <span>
                                {format12HourTime(subEvent.roll_call_time)}
                                {subEvent.dismissal_estimate_time
                                  ? ` → ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                  : ''}
                              </span>
                            </div>
                          )}
                          {subEvent.venue_name && (
                            <a
                              href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-rose-700 hover:text-rose-900 font-bold bg-rose-50/50 px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs transition hover:border-rose-400"
                            >
                              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="truncate max-w-[200px]">{subEvent.venue_name}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CREW ALLOCATION AVATARS GRID WITH CLICKABLE ASSIGN POPOVERS */}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                        <div className="flex items-center gap-4 flex-wrap pt-1">
                          {assignments.map((assignment) => (
                            <RoleAssignDropdown
                              key={assignment.id}
                              assignment={assignment}
                              subEventId={subEvent.id}
                              projectId={project.id}
                              teamMembers={teamMembers}
                              onAssignMember={onAssignMember}
                              onAddNewMember={onAddNewMember}
                              variant="avatar"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 2. ACTIVE & UPCOMING MONTHS SECTION (LUXURY CREAM CARDS) ─── */}
      {activeMonthOrder.length === 0 && tbdEvents.length === 0 && pastMonthOrder.length === 0 ? (
        <div className="bg-[#FAF8F2] p-12 rounded-3xl border border-amber-200/80 text-center space-y-2 shadow-2xs">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-black text-amber-950">No Sub-Events Found</h3>
          <p className="text-xs text-stone-500 font-semibold">
            Try adjusting your search query or filter options.
          </p>
        </div>
      ) : (
        activeMonthOrder.map((monthKey) => {
          const isCollapsed = collapsedMonths[monthKey];
          const items = activeMonthGroups[monthKey];

          return (
            <div
              key={monthKey}
              className="bg-[#FAF8F2] rounded-3xl border border-amber-200/80 p-2.5 sm:p-4 space-y-3 shadow-sm"
            >
              {/* MONTH HEADER ACCORDION BAR - COMPACT LIGHTWEIGHT */}
              <div
                onClick={() => toggleMonth(monthKey)}
                className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-800 cursor-pointer transition shadow-xs select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center font-bold border border-white/10">
                    <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none">
                      {monthKey}
                    </h3>
                    <span className="text-[10px] font-medium text-amber-200/80 block mt-0.5 leading-none">
                      {items.length} Sub-Event{items.length === 1 ? '' : 's'} Upcoming
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-amber-200 font-bold border border-white/10 backdrop-blur-sm">
                    {items.length} Events
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-200 transition-transform duration-200 ${
                      isCollapsed ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* MONTH EVENTS LIST */}
              {!isCollapsed && (
                <div className="space-y-3 pt-1">
                  {items.map(({ subEvent, project, dateObj }) => {
                    const projectGradient = getGradientByProjectId(project.id || project.client_name);

                    // Strictly check explicit is_overnight flag
                    const isOvernightShoot = Boolean((subEvent as any).is_overnight === true || (subEvent as any).is_overnight === 'true');
                    const endDateObj = isOvernightShoot && (subEvent as any).end_date ? new Date((subEvent as any).end_date) : null;

                    let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    let monthAbbr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                    let dayNumber = dateObj.getDate().toString().padStart(2, '0');
                    let yearStr = dateObj.getFullYear().toString();

                    if (isOvernightShoot && endDateObj && !isNaN(endDateObj.getTime())) {
                      const sDay = dateObj.getDate().toString().padStart(2, '0');
                      const eDay = endDateObj.getDate().toString().padStart(2, '0');
                      dayNumber = `${sDay}-${eDay}`;
                    }

                    const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                    const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                    const totalSlots = assignments.length;

                    return (
                      <div
                        key={subEvent.id}
                        className="bg-white rounded-xl border border-amber-200/80 hover:border-amber-300 shadow-2xs transition-all p-3 sm:p-4 flex flex-col lg:flex-row items-stretch gap-3 sm:gap-4"
                      >
                        {/* DATE BADGE COLUMN */}
                        <div
                          className={`${projectGradient} w-full lg:w-28 rounded-xl px-3 py-2 lg:p-2.5 shrink-0 flex lg:flex-col items-center justify-between text-center text-white`}
                        >
                          <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                            <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider">
                              {dayName}
                            </span>
                            <span className="text-lg lg:text-2xl font-black text-white leading-none my-0.5 sm:my-1">
                              {dayNumber}
                            </span>
                            <span className="text-[10px] sm:text-xs font-extrabold text-white/90 uppercase tracking-wider">
                              {monthAbbr} {yearStr}
                            </span>
                          </div>
                          <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold border border-white/20 mt-0.5">
                            {assignedCount}/{totalSlots} Crew
                          </div>
                        </div>

                        {/* MAIN CONTENT AREA */}
                        <div className="flex-1 space-y-2.5 min-w-0">
                          {/* HEADER: CLIENT NAME & SUB EVENT TITLE */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-amber-950 font-black text-xs sm:text-sm tracking-tight truncate">
                                {project.client_name}
                              </span>

                              <span className="text-stone-300 text-xs font-light select-none">·</span>

                              <h4 className="text-xs sm:text-sm font-bold text-indigo-700 tracking-tight truncate">
                                {subEvent.event_title}
                              </h4>

                              {isOvernightShoot && (
                                <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[9px] flex items-center gap-1">
                                  <Moon className="w-2.5 h-2.5" />
                                  <span>Overnight</span>
                                </span>
                              )}
                            </div>

                            {/* LOCATION & TIME */}
                            <div className="flex items-center gap-2 text-[11px] font-medium text-stone-600 flex-wrap">
                              {subEvent.roll_call_time && (
                                <div className="flex items-center gap-1 text-stone-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                                  <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                                  <span>
                                    {format12HourTime(subEvent.roll_call_time)}
                                    {subEvent.dismissal_estimate_time
                                      ? ` → ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                      : ''}
                                  </span>
                                </div>
                              )}
                              {subEvent.venue_name && (
                                <a
                                  href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-stone-50 px-2 py-1 rounded-lg border border-stone-200 shadow-2xs transition hover:border-indigo-300"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[150px]">{subEvent.venue_name}</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* CREW ALLOCATION CHIPS GRID WITH CLICKABLE ASSIGN POPOVERS */}
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                            <div className="flex items-center gap-4 flex-wrap pt-1">
                              {assignments.map((assignment) => (
                                <RoleAssignDropdown
                                  key={assignment.id}
                                  assignment={assignment}
                                  subEventId={subEvent.id}
                                  projectId={project.id}
                                  teamMembers={teamMembers}
                                  onAssignMember={onAssignMember}
                                  onAddNewMember={onAddNewMember}
                                  variant="avatar"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ─── 3. COMPLETED / PAST EVENTS SECTION (COLLAPSIBLE ACCORDION LUXURY GREY CARDS) ─── */}
      {pastMonthOrder.length > 0 && (
        <div className="pt-4">
          <div className="bg-slate-100/80 rounded-3xl border border-slate-200/90 p-4 md:p-6 space-y-4">
            {/* ACCORDION TOGGLE BAR */}
            <div
              onClick={() => setIsPastSectionExpanded(!isPastSectionExpanded)}
              className="flex items-center justify-between bg-slate-800 hover:bg-slate-900 text-white px-5 py-3.5 rounded-2xl border border-slate-700 cursor-pointer transition select-none shadow-md"
              title="Click to Hide or Unhide Past & Completed Shoots"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center font-black">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                    📅 Past & Completed Shoots (Archived View)
                  </h3>
                  <span className="text-xs font-semibold text-slate-300">
                    {pastMonthOrder.length} Past Month{pastMonthOrder.length === 1 ? '' : 's'} Recorded (Click to {isPastSectionExpanded ? 'Hide' : 'Show'})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-black border border-white/10">
                  {pastMonthOrder.reduce((acc, k) => acc + pastMonthGroups[k].length, 0)} Past Shoots
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-300 transition-transform duration-200 ${
                    isPastSectionExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* EXPANDED PAST MONTHS (FULL LUXURY GREY-THEMED CARDS) */}
            {isPastSectionExpanded && (
              <div className="space-y-6 pt-2">
                {pastMonthOrder.map((monthKey) => {
                  const items = pastMonthGroups[monthKey];
                  return (
                    <div key={monthKey} className="bg-white rounded-3xl border border-slate-200 p-4 md:p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-slate-400" />
                          <span className="font-black text-slate-900 text-base">{monthKey}</span>
                        </div>
                        <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{items.length} Completed Shoots</span>
                      </div>

                      <div className="space-y-4">
                        {items.map(({ subEvent, project, dateObj }) => {
                          const isOvernightShoot = Boolean((subEvent as any).is_overnight === true || (subEvent as any).is_overnight === 'true');
                          const endDateObj = isOvernightShoot && (subEvent as any).end_date ? new Date((subEvent as any).end_date) : null;

                          let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                          let monthAbbr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                          let dayNumber = dateObj.getDate().toString().padStart(2, '0');
                          let yearStr = dateObj.getFullYear().toString();

                          if (isOvernightShoot && endDateObj && !isNaN(endDateObj.getTime())) {
                            const sDay = dateObj.getDate().toString().padStart(2, '0');
                            const eDay = endDateObj.getDate().toString().padStart(2, '0');
                            dayNumber = `${sDay}-${eDay}`;
                          }

                          const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                          const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                          const totalSlots = assignments.length;

                          return (
                            <div
                              key={subEvent.id}
                              className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all p-5 flex flex-col lg:flex-row items-stretch gap-5"
                            >
                              {/* DATE BADGE COLUMN (SLATE / GREY THEME) */}
                              <div
                                className="bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 w-full lg:w-32 rounded-xl p-3.5 shrink-0 flex lg:flex-col items-center justify-between text-center text-white shadow-xs"
                              >
                                <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    {dayName}
                                  </span>
                                  <span className="text-2xl lg:text-3xl font-black text-white leading-none my-1">
                                    {dayNumber}
                                  </span>
                                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                                    {monthAbbr} {yearStr}
                                  </span>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black border border-white/20 mt-1">
                                  {assignedCount}/{totalSlots} Crew
                                </div>
                              </div>

                              {/* MAIN CONTENT AREA */}
                              <div className="flex-1 space-y-3.5">
                                {/* HEADER: CLIENT NAME & SUB EVENT TITLE */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-slate-900 font-black text-sm md:text-base tracking-tight">
                                      {project.client_name}
                                    </span>

                                    <span className="text-slate-300 text-sm font-light select-none">·</span>

                                    <h4 className="text-sm md:text-base font-bold text-slate-700 tracking-tight">
                                      {subEvent.event_title}
                                    </h4>

                                    <span className="px-2 py-0.5 rounded-md bg-slate-200/80 border border-slate-300 text-slate-700 font-extrabold text-[10px] flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Completed</span>
                                    </span>

                                    {isOvernightShoot && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-[10px] flex items-center gap-1">
                                        <Moon className="w-3 h-3" />
                                        <span>Overnight</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* LOCATION & TIME */}
                                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
                                    {subEvent.roll_call_time && (
                                      <div className="flex items-center gap-1.5 text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                                        <span>
                                          {format12HourTime(subEvent.roll_call_time)}
                                          {subEvent.dismissal_estimate_time
                                            ? ` → ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                            : ''}
                                        </span>
                                      </div>
                                    )}
                                    {subEvent.venue_name && (
                                      <a
                                        href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition hover:border-slate-400"
                                      >
                                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[200px]">{subEvent.venue_name}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* CREW ALLOCATION AVATARS */}
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                                  <div className="flex items-center gap-4 flex-wrap pt-1">
                                    {assignments.map((assignment) => (
                                      <RoleAssignDropdown
                                        key={assignment.id}
                                        assignment={assignment}
                                        subEventId={subEvent.id}
                                        projectId={project.id}
                                        teamMembers={teamMembers}
                                        onAssignMember={onAssignMember}
                                        onAddNewMember={onAddNewMember}
                                        variant="avatar"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
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
      )}
    </div>
  );
}
