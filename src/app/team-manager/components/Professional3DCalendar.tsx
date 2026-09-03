'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, 
  UserCheck, AlertCircle, Plus, Users, CheckCircle2, Search,
  Briefcase, ChevronDown, UserPlus, Sparkles, X, Filter,
  Pencil, Calendar, Zap, FileText, Check
} from 'lucide-react';
import RoleAssignDropdown from './RoleAssignDropdown';

interface Professional3DCalendarProps {
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  searchQuery: string;
  selectedRoleFilter: string;
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
  onAssignMember: (assignmentId: string, memberId: string | null) => void;
  onAddNewMember: (info: { assignmentId: string; role: string; subEventId: string; projectId: string }) => void;
  onAddProject?: (initialDate?: string) => void;
  onEditProject?: (project: FWProject) => void;
}

// ─────────────────────────────────────────────────────────────
// DATE HELPERS (PURE JS)
// ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatFullDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const dayNum = String(date.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

function formatOrdinalDate(date: Date): string {
  const d = date.getDate();
  const suffix = (d % 10 === 1 && d !== 11) ? 'st' :
                 (d % 10 === 2 && d !== 12) ? 'nd' :
                 (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
  return `${d}${suffix} ${MONTH_NAMES[date.getMonth()]}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth();
}

function toIsoDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Event Dot Colors
const getEventDotColor = (title: string = '') => {
  const t = title.toLowerCase();
  if (t.includes('wedding') || t.includes('shaadi') || t.includes('mandap') || t.includes('phera')) {
    return 'bg-rose-500';
  }
  if (t.includes('sangeet') || t.includes('reception') || t.includes('cocktail') || t.includes('party') || t.includes('dj')) {
    return 'bg-purple-500';
  }
  if (t.includes('haldi') || t.includes('mehendi') || t.includes('mehndi') || t.includes('pithi') || t.includes('engagement')) {
    return 'bg-amber-500';
  }
  if (t.includes('pre-wedding') || t.includes('pre wedding') || t.includes('post-wedding') || t.includes('shoot')) {
    return 'bg-sky-500';
  }
  return 'bg-emerald-500';
};

const getInitials = (name?: string | null) => {
  if (!name) return 'PM';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function Professional3DCalendar({
  projects,
  teamMembers,
  searchQuery: parentSearchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onAssignMember,
  onAddNewMember,
  onAddProject,
  onEditProject,
}: Professional3DCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);
  const currentRealYear = new Date().getFullYear();
  const availableYears = useMemo(() => Array.from({ length: 8 }, (_, i) => currentRealYear - 2 + i), [currentRealYear]);
  const [activePmDropdownId, setActivePmDropdownId] = useState<string | null>(null);
  const [pmSearchQuery, setPmSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close month dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
      if (activePmDropdownId) {
        setActivePmDropdownId(null);
        setPmSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePmDropdownId]);

  const effectiveSearch = (internalSearch || parentSearchQuery || '').trim().toLowerCase();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  // Map events to date strings (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: { [dateStr: string]: { subEvent: FWSubEvent; project: FWProject }[] } = {};

    projects.forEach((project) => {
      if (project.is_archived) return;

      const q = effectiveSearch;
      const matchClientName = !q || project.client_name.toLowerCase().includes(q);

      (project.fw_sub_events || []).forEach((se) => {
        const matchSubTitle = !q || se.event_title.toLowerCase().includes(q);
        if (!matchClientName && !matchSubTitle) return;

        const assignments = resolveSubEventAssignments(se, teamMembers);

        if (selectedRoleFilter && selectedRoleFilter !== 'All') {
          const hasRole = assignments.some((a) => a.required_role === selectedRoleFilter);
          if (!hasRole) return;
        }

        const dateStr = se.event_date;
        if (!dateStr) return;
        if (!map[dateStr]) {
          map[dateStr] = [];
        }
        map[dateStr].push({ subEvent: se, project });
      });
    });

    return map;
  }, [projects, effectiveSearch, selectedRoleFilter, teamMembers]);

  // Generate 42 grid cells (Monday-aligned)
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOffset = (firstDay.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const startDate = new Date(year, month, 1 - startDayOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
    }
    return days;
  }, [currentMonth]);

  // Selected date events grouped by project for identical Cards View rendering
  const selectedDateStr = toIsoDateString(selectedDate);
  const selectedDateEvents = eventsByDate[selectedDateStr] || [];

  const selectedDateProjectGroups = useMemo(() => {
    const map: { [projId: string]: { project: FWProject; subEvents: FWSubEvent[] } } = {};
    selectedDateEvents.forEach(({ project, subEvent }) => {
      const pId = project.id || project.client_name;
      if (!map[pId]) {
        map[pId] = { project, subEvents: [] };
      }
      map[pId].subEvents.push(subEvent);
    });
    return Object.values(map);
  }, [selectedDateEvents]);

  // Month event count
  const currentMonthTotalEvents = useMemo(() => {
    let count = 0;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (eventsByDate[dStr]) {
        count += eventsByDate[dStr].length;
      }
    }
    return count;
  }, [eventsByDate, currentMonth]);

  return (
    <div className="space-y-4 select-none font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP & TABLET: INTERACTIVE MASTER SPLIT VIEW (lg:grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-5 min-h-[580px] lg:h-[calc(100vh-140px)]">
        
        {/* LEFT PANEL (~50% / 6 Cols or 5 Cols): Compact Month Calendar Grid */}
        <div className="lg:col-span-5 2xl:col-span-4 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Selector */}
              <div className="relative">
                <select
                  value={currentMonth.getMonth()}
                  onChange={(e) => {
                    const newMonthIdx = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(currentMonth.getFullYear(), newMonthIdx, 1));
                  }}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-[11px] font-bold pl-2 pr-5 py-0.5 h-6.5 rounded-md cursor-pointer transition shadow-2xs outline-none focus:border-indigo-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 ml-1 opacity-60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              {/* Year Selector */}
              <div className="relative">
                <select
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
                  }}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-[11px] font-bold pl-2 pr-5 py-0.5 h-6.5 rounded-md cursor-pointer transition shadow-2xs outline-none focus:border-indigo-500"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 ml-1 opacity-60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>
            </div>

            {/* Quick Actions (Today, Prev, Next, Add) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 hover:border-slate-300 transition cursor-pointer shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Today
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 hover:border-slate-300 transition cursor-pointer shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {onAddProject && (
                <button
                  type="button"
                  onClick={() => onAddProject(selectedDateStr)}
                  className="hidden sm:flex items-center gap-1 ml-1 px-2.5 py-1.5 text-xs font-black bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white rounded-xl shadow-md shadow-[#6C5CE7]/20 transition cursor-pointer"
                  title="Add Shoot for this Date"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Shoot</span>
                </button>
              )}
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-[11px] font-black text-slate-400 uppercase py-2">
            {WEEKDAY_NAMES.map(d => (
              <div key={d} className="tracking-wider">{d}</div>
            ))}
          </div>

          {/* 42-Day Month Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 items-stretch">
            {monthDays.map((day) => {
              const dayIso = toIsoDateString(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const dayEvents = eventsByDate[dayIso] || [];

              return (
                <button
                  key={dayIso}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-between p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer min-h-[48px] sm:min-h-[58px] ${
                    isSelected
                      ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 scale-[1.03] z-10'
                      : isToday
                      ? 'bg-blue-50/70 border-2 border-blue-400 text-blue-900 font-extrabold shadow-2xs'
                      : isCurrentMonth
                      ? 'text-slate-800 bg-slate-50/70 hover:bg-slate-100 border border-slate-100 hover:border-slate-200'
                      : 'text-slate-300 bg-transparent hover:bg-slate-50/40 opacity-40'
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between w-full px-0.5">
                    <span className={`text-xs sm:text-sm ${isSelected ? 'text-white font-black' : 'font-bold'}`}>
                      {day.getDate()}
                    </span>

                    {/* Today Dot */}
                    {isToday && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>

                  {/* Event Indicator Dots */}
                  <div className="w-full flex items-center justify-center gap-1 mt-auto pb-0.5">
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev, i) => {
                          const dotColor = getEventDotColor(ev.subEvent.event_title);
                          return (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : dotColor
                              }`}
                              title={ev.subEvent.event_title}
                            />
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className={`text-[8px] font-extrabold leading-none ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Legend */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/> Wedding</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"/> Sangeet</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"/> Haldi</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"/> Pre-Wed</span>
            </div>
            <span className="text-slate-400 font-semibold hidden 2xl:inline">
              {currentMonthTotalEvents} shoots
            </span>
          </div>

        </div>

        {/* RIGHT PANEL (~50% / 7 Cols or 8 Cols): Exact High-Fidelity "Cards View" for Selected Date */}
        <div className="lg:col-span-7 2xl:col-span-8 bg-slate-50/70 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col h-full overflow-hidden shadow-xs">
          
          {/* Schedule Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block leading-none">
                DAILY SCHEDULE (FULL CARD VIEW)
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1">
                {formatFullDate(selectedDate)}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl shadow-2xs">
                {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Event' : 'Events'}
              </span>

              {onAddProject && (
                <button
                  type="button"
                  onClick={() => onAddProject(selectedDateStr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white rounded-xl shadow-md shadow-[#6C5CE7]/20 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Events List Container (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1 scrollbar-thin">
            {selectedDateProjectGroups.length === 0 ? (
              <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-8 bg-white border border-dashed border-slate-200 rounded-3xl text-slate-400 space-y-3 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div>
                  <h5 className="text-sm font-black text-slate-800">No Shoots Scheduled for this Date</h5>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Select another date on the calendar or add a new wedding shoot.
                  </p>
                </div>
                {onAddProject && (
                  <button
                    type="button"
                    onClick={() => onAddProject(selectedDateStr)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white rounded-xl shadow-md shadow-[#6C5CE7]/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Shoot on this Date</span>
                  </button>
                )}
              </div>
            ) : (
              selectedDateProjectGroups.map(({ project, subEvents }) => {
                const projectGradient = getGradientByProjectId(project.id || project.client_name);

                return (
                  <div 
                    key={project.id}
                    className="bg-white border-2 border-slate-300/90 shadow-lg shadow-slate-200/50 rounded-3xl p-5 space-y-4"
                  >
                    {/* MASTER CLIENT CARD HEADER */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                          {project.client_name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-950 text-[11px] font-black tracking-wide border border-indigo-200/80 shadow-2xs">
                          {subEvents.length} Sub-Event{subEvents.length === 1 ? '' : 's'} Today
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* PM BADGE */}
                        {project.project_manager_name ? (
                          <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">PM:</span>
                            <span className="font-extrabold text-amber-950">{project.project_manager_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400 font-medium">PM Not Assigned</span>
                        )}

                        {onEditProject && (
                          <button 
                            type="button"
                            title="Edit Project"
                            onClick={() => onEditProject(project)}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition shadow-xs shrink-0 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* HORIZONTAL MODERN GRADIENT SUB-EVENT CARDS STACK */}
                    <div className="space-y-3.5">
                      {subEvents.map((subEvent) => {
                        const isTbd = Boolean((subEvent as any).is_date_tbd) || !subEvent.event_date || isNaN(new Date(subEvent.event_date).getTime());
                        const isOvernightShoot = Boolean((subEvent as any).is_overnight) && Boolean((subEvent as any).end_date) && !isNaN(new Date((subEvent as any).end_date).getTime());

                        const startDateObj = !isTbd ? new Date(subEvent.event_date) : null;
                        const endDateObj = isOvernightShoot ? new Date((subEvent as any).end_date) : null;

                        let dayNumber = 'TBD';
                        let dayName = 'DATE';
                        let monthAbbr = 'NOT';
                        let yearStr = 'FIXED';

                        if (!isTbd && startDateObj) {
                          const sDay = startDateObj.getDate().toString().padStart(2, '0');
                          const sDayName = startDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                          monthAbbr = startDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                          yearStr = startDateObj.getFullYear().toString();

                          if (isOvernightShoot && endDateObj) {
                            const eDay = endDateObj.getDate().toString().padStart(2, '0');
                            const eDayName = endDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                            dayNumber = `${sDay}-${eDay}`;
                            dayName = `${sDayName}-${eDayName}`;
                          } else {
                            dayNumber = sDay;
                            dayName = sDayName;
                          }
                        }

                        // Robust assignment resolver ensuring roles are fetched via fw_assignments relation
                        const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                        const assignedCount = assignments.filter(a => a.assigned_member_id || a.fw_team_members).length;
                        const totalSlots = assignments.length;

                        return (
                          <div 
                            key={subEvent.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                          >
                            {/* TOP HORIZONTAL GRADIENT DATE BANNER (MATCHES MONTH VIEW) */}
                            <div className={`${projectGradient} px-4 py-2 text-white flex items-center justify-between`}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-black tracking-tight uppercase">
                                  {dayName} {dayNumber} {monthAbbr} {yearStr}
                                </span>
                                {isTbd && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                                    TBD
                                  </span>
                                )}
                                {Boolean((subEvent as any).is_overnight) && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-950 flex items-center gap-0.5">
                                    <Moon className="w-2.5 h-2.5" /> Overnight
                                  </span>
                                )}
                              </div>

                              <div className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold border border-white/20">
                                {assignedCount}/{totalSlots} Roles
                              </div>
                            </div>

                            {/* MAIN RIGHT CONTENT BODY */}
                            <div className="p-4 flex flex-col justify-between space-y-3">
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                                      {subEvent.event_title}
                                    </h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 flex-wrap">
                                  {subEvent.roll_call_time && (
                                    <div className="flex items-center gap-1.5 text-slate-700">
                                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>
                                        {format12HourTime(subEvent.roll_call_time)}
                                        {subEvent.dismissal_estimate_time ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
                                      </span>
                                      {(subEvent as any).shift_hours_slot && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200/90 ml-1">
                                          <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                                          {(subEvent as any).shift_hours_slot}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {subEvent.roll_call_time && subEvent.venue_name && (
                                    <span className="text-slate-300 font-normal">|</span>
                                  )}

                                  {subEvent.venue_name && (
                                    <div className="relative group/venue">
                                      <a
                                        href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
                                      >
                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                        <span className="truncate max-w-[220px]">{subEvent.venue_name}</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {subEvent.operational_notes && (
                                <div className="bg-amber-50/80 border-l-4 border-amber-400 p-2.5 rounded-r-xl text-xs text-amber-950 font-medium flex items-center gap-2 my-1">
                                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>{subEvent.operational_notes}</span>
                                </div>
                              )}

                              <div className="border-t border-slate-100 my-1.5" />

                              {/* CREW PLACEMENT ROLE BADGES GRID */}
                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                                  Assigned Crew Roster (Click avatar to assign role)
                                </span>
                                <div className="flex items-start gap-4 flex-wrap">
                                  {assignments.map((assignment: any) => (
                                    <RoleAssignDropdown
                                      key={assignment.id}
                                      assignment={assignment}
                                      subEventId={subEvent.id}
                                      projectId={project.id}
                                      teamMembers={teamMembers}
                                      onAssignMember={onAssignMember}
                                      onAddNewMember={(info) => {
                                        onAddNewMember({
                                          assignmentId: info.assignmentId,
                                          role: info.role,
                                          subEventId: info.subEventId,
                                          projectId: info.projectId,
                                        });
                                      }}
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
              })
            )}
          </div>

        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE VIEW (< lg): COMPACT DATE PICKER + EXACT CARD VIEW LIST
         ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-4">
        
        {/* Mobile Mini Month Picker Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <select
                  value={currentMonth.getMonth()}
                  onChange={(e) => {
                    const newMonthIdx = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(currentMonth.getFullYear(), newMonthIdx, 1));
                  }}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-black pl-2 pr-6 py-1 rounded-lg outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name.slice(0, 3)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>

              <div className="relative">
                <select
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
                  }}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-black pl-2 pr-6 py-1 rounded-lg outline-none"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-lg"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile 7-Col Grid */}
          <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase mb-1.5">
            {WEEKDAY_NAMES.map(d => (
              <div key={d}>{d[0]}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayIso = toIsoDateString(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const dayEvents = eventsByDate[dayIso] || [];

              return (
                <button
                  key={dayIso}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30'
                      : isToday
                      ? 'bg-blue-50 border border-blue-400 text-blue-900 font-extrabold'
                      : isCurrentMonth
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'text-slate-300 opacity-40'
                  }`}
                >
                  <span className="text-xs">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Schedule Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Events for {formatOrdinalDate(selectedDate)}
            </h4>
            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>

          {selectedDateProjectGroups.length === 0 ? (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 space-y-2 shadow-xs">
              <Calendar className="w-6 h-6 mx-auto opacity-30" />
              <p className="text-xs font-semibold">No shoots scheduled for this date</p>
            </div>
          ) : (
            selectedDateProjectGroups.map(({ project, subEvents }) => {
              const projectGradient = getGradientByProjectId(project.id || project.client_name);

              return (
                <div 
                  key={project.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-base font-black text-slate-900">{project.client_name}</h4>
                    {project.project_manager_name && (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        PM: {project.project_manager_name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {subEvents.map((subEvent) => {
                      const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                      const timeDisplay = subEvent.roll_call_time
                        ? `${format12HourTime(subEvent.roll_call_time)} - ${format12HourTime(subEvent.dismissal_estimate_time || '18:00')}`
                        : 'Time Slot: TBD';

                      const projectGradient = getGradientByProjectId(project.id || project.client_name);
                      return (
                        <div key={subEvent.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col overflow-hidden">
                          {/* TOP HORIZONTAL GRADIENT DATE BANNER */}
                          <div className={`${projectGradient} w-full px-3 py-1.5 text-white flex items-center justify-between`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black tracking-wider uppercase">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} {selectedDate.getDate().toString().padStart(2, '0')} {selectedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {selectedDate.getFullYear()}
                              </span>
                            </div>

                            <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold border border-white/20">
                              {assignments.filter((a: any) => a.assigned_member_id).length}/{assignments.length} Roles
                            </div>
                          </div>

                          <div className="p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-black text-slate-900">{subEvent.event_title}</h5>
                              {subEvent.location_city && (
                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                  {subEvent.location_city}
                                </span>
                              )}
                            </div>

                            {subEvent.roll_call_time && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200 w-fit">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{timeDisplay}</span>
                              </div>
                            )}

                            {/* Crew Avatars */}
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                                Crew Placements
                              </span>
                              <div className="flex items-start gap-2.5 flex-wrap">
                                {assignments.map((assignment: any) => (
                                  <RoleAssignDropdown
                                    key={assignment.id}
                                    assignment={assignment}
                                    subEventId={subEvent.id}
                                    projectId={project.id}
                                    teamMembers={teamMembers}
                                    onAssignMember={onAssignMember}
                                    onAddNewMember={(info) => {
                                      onAddNewMember({
                                        assignmentId: info.assignmentId,
                                        role: info.role,
                                        subEventId: info.subEventId,
                                        projectId: info.projectId
                                      });
                                    }}
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
            })
          )}
        </div>

      </div>

    </div>
  );
}
