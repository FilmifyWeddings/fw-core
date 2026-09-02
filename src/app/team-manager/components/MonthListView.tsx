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

        const isOvernight = Boolean(
          (se as any).is_overnight || 
          (se.roll_call_time && se.dismissal_estimate_time && se.dismissal_estimate_time < se.roll_call_time)
        );

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
            pastOrder.push(monthKey);
          }
          pastGroups[monthKey].push(item);
        } else {
          if (!activeGroups[monthKey]) {
            activeGroups[monthKey] = [];
            activeOrder.push(monthKey);
          }
          activeGroups[monthKey].push(item);
        }
      });
    });

    // Sort items within each month chronologically
    Object.keys(activeGroups).forEach(k => activeGroups[k].sort((a, b) => a.sortTimestamp - b.sortTimestamp));
    Object.keys(pastGroups).forEach(k => pastGroups[k].sort((a, b) => a.sortTimestamp - b.sortTimestamp));

    return {
      tbdEvents: tbdList,
      activeMonthGroups: activeGroups,
      pastMonthGroups: pastGroups,
      activeMonthOrder: activeOrder,
      pastMonthOrder: pastOrder,
    };
  }, [projects, teamMembers, searchQuery, selectedRoleFilter, statusFilter, selectedPmFilter, selectedMemberFilter, currentMonthYearId]);

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* ─── SMART FILTER SUITE TOOLBAR ─── */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Events
          </button>

          <button
            onClick={() => setStatusFilter('unassigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'unassigned'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>🔴 Unassigned Only</span>
          </button>

          <button
            onClick={() => setStatusFilter('fully_assigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'fully_assigned'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>🟢 Fully Assigned</span>
          </button>

          <button
            onClick={() => setStatusFilter('overnight')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'overnight'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span>🌙 Overnight Shoots</span>
          </button>
        </div>

        {/* Dropdown Filters: Project Manager & Crew Member */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PM Filter */}
          {projectManagers.length > 0 && (
            <select
              value={selectedPmFilter}
              onChange={(e) => setSelectedPmFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="all">🔍 Filter by PM (All)</option>
              {projectManagers.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          )}

          {/* Member Filter */}
          <select
            value={selectedMemberFilter}
            onChange={(e) => setSelectedMemberFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="all">👤 Filter by Crew (All)</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name || 'Member'}</option>
            ))}
          </select>
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
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block mb-1.5">
                          Assigned Crew Roster (Click avatar to assign team member & dispatch WhatsApp)
                        </span>
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
              className="bg-[#FAF8F2] rounded-3xl border border-amber-200/80 p-4 md:p-6 space-y-4 shadow-sm"
            >
              {/* MONTH HEADER ACCORDION BAR - LUXURY WARM INDIGO/AMBER */}
              <div
                onClick={() => toggleMonth(monthKey)}
                className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-3.5 rounded-2xl border border-slate-800 cursor-pointer hover:border-amber-400/60 transition shadow-md select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center font-black border border-white/10 shadow-inner">
                    <Calendar className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-white tracking-tight">
                      {monthKey}
                    </h3>
                    <span className="text-xs font-bold text-amber-200/80">
                      {items.length} Sub-Event{items.length === 1 ? '' : 's'} Upcoming
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-black border border-white/10 backdrop-blur-sm">
                    {items.length} Events
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-200 transition-transform duration-200 ${
                      isCollapsed ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* MONTH EVENTS LIST */}
              {!isCollapsed && (
                <div className="space-y-4 pt-1">
                  {items.map(({ subEvent, project, dateObj }) => {
                    const projectGradient = getGradientByProjectId(project.id || project.client_name);

                    const isOvernightShoot = Boolean(
                      (subEvent as any).is_overnight || 
                      (subEvent.roll_call_time && subEvent.dismissal_estimate_time && subEvent.dismissal_estimate_time < subEvent.roll_call_time)
                    );
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
                        className="bg-white rounded-2xl border-2 border-amber-200/80 hover:border-amber-400 shadow-xs hover:shadow-md transition-all p-5 flex flex-col lg:flex-row items-stretch gap-5"
                      >
                        {/* DATE BADGE COLUMN */}
                        <div
                          className={`${projectGradient} w-full lg:w-32 rounded-xl p-3.5 shrink-0 flex lg:flex-col items-center justify-between text-center text-white`}
                        >
                          <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                              {dayName}
                            </span>
                            <span className="text-2xl lg:text-3xl font-black text-white leading-none my-1">
                              {dayNumber}
                            </span>
                            <span className="text-xs font-black text-white/90 uppercase tracking-wider">
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
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-amber-950 font-black text-sm md:text-base tracking-tight">
                                {project.client_name}
                              </span>

                              <span className="text-stone-300 text-sm font-light select-none">·</span>

                              <h4 className="text-sm md:text-base font-bold text-indigo-700 tracking-tight">
                                {subEvent.event_title}
                              </h4>

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
                                <div className="flex items-center gap-1.5 text-stone-800 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs">
                                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
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
                                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs transition hover:border-indigo-300"
                                >
                                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[200px]">{subEvent.venue_name}</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* CREW ALLOCATION CHIPS GRID WITH CLICKABLE ASSIGN POPOVERS */}
                          <div>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1.5">
                              Assigned Crew Roster (Click avatar to assign team member & dispatch WhatsApp)
                            </span>
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

      {/* ─── 3. COMPLETED / PAST EVENTS SECTION (COLLAPSIBLE ACCORDION ARCHIVE) ─── */}
      {pastMonthOrder.length > 0 && (
        <div className="pt-4">
          <div className="bg-stone-100/70 rounded-3xl border border-stone-200/90 p-4 md:p-6 space-y-4">
            {/* ACCORDION TOGGLE BAR */}
            <div
              onClick={() => setIsPastSectionExpanded(!isPastSectionExpanded)}
              className="flex items-center justify-between bg-stone-200/80 hover:bg-stone-300/80 text-stone-800 px-5 py-3.5 rounded-2xl border border-stone-300/80 cursor-pointer transition select-none shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-300 text-stone-700 flex items-center justify-center font-black">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-stone-900 tracking-tight">
                    📅 Past & Completed Shoots (Archived View)
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">
                    {pastMonthOrder.length} Past Month{pastMonthOrder.length === 1 ? '' : 's'} Recorded
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-stone-300/80 text-stone-700 text-xs font-black">
                  {pastMonthOrder.reduce((acc, k) => acc + pastMonthGroups[k].length, 0)} Total Past Shoots
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-stone-600 transition-transform duration-200 ${
                    isPastSectionExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* EXPANDED PAST MONTHS */}
            {isPastSectionExpanded && (
              <div className="space-y-4 pt-2">
                {pastMonthOrder.map((monthKey) => {
                  const items = pastMonthGroups[monthKey];
                  return (
                    <div key={monthKey} className="bg-white/80 rounded-2xl border border-stone-200 p-4 space-y-3 opacity-80 hover:opacity-100 transition">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-black text-stone-900 text-sm">{monthKey}</span>
                        <span className="text-xs font-bold text-stone-500">{items.length} Shoots</span>
                      </div>

                      <div className="space-y-2.5">
                        {items.map(({ subEvent, project, dateObj }) => {
                          const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                          return (
                            <div key={subEvent.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
                              <div>
                                <span className="font-black text-stone-900 mr-2">{project.client_name}</span>
                                <span className="text-stone-600 font-semibold">({subEvent.event_title})</span>
                                <span className="block text-[11px] text-stone-500 font-medium">
                                  📅 {dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {assignments.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 rounded bg-white text-[10px] font-extrabold text-stone-700 border border-stone-200">
                                    {a.required_role}: {a.fw_team_members?.name || 'Unassigned'}
                                  </span>
                                ))}
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
