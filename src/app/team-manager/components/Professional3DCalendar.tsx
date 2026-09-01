'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, 
  UserCheck, AlertCircle, X, Sparkles, Filter, Search, Plus, Moon,
  Users, CheckCircle2, Phone, ExternalLink, ChevronDown
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

// Luxury Pastel Event Pill Themes based on Event Type / Name
const getEventPillStyle = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('haldi') || t.includes('mehendi') || t.includes('mehndi') || t.includes('pithi') || t.includes('engagement') || t.includes('roka') || t.includes('tilak')) {
    return {
      pillBg: 'bg-amber-100/95 hover:bg-amber-200 text-amber-950 border border-amber-300/80',
      dotColor: 'bg-amber-500',
      tag: 'Haldi/Mehendi',
      timeText: 'text-amber-800'
    };
  }
  if (t.includes('sangeet') || t.includes('reception') || t.includes('cocktail') || t.includes('party') || t.includes('dj') || t.includes('garba') || t.includes('dance')) {
    return {
      pillBg: 'bg-purple-100/95 hover:bg-purple-200 text-purple-950 border border-purple-300/80',
      dotColor: 'bg-purple-500',
      tag: 'Sangeet/Reception',
      timeText: 'text-purple-800'
    };
  }
  if (t.includes('wedding') || t.includes('shaadi') || t.includes('mandap') || t.includes('phera') || t.includes('barat') || t.includes('varmala') || t.includes('main')) {
    return {
      pillBg: 'bg-rose-100/95 hover:bg-rose-200 text-rose-950 border border-rose-300/80',
      dotColor: 'bg-rose-500',
      tag: 'Wedding',
      timeText: 'text-rose-800'
    };
  }
  if (t.includes('pre-wedding') || t.includes('pre wedding') || t.includes('shoot') || t.includes('portrait') || t.includes('outdoor')) {
    return {
      pillBg: 'bg-sky-100/95 hover:bg-sky-200 text-sky-950 border border-sky-300/80',
      dotColor: 'bg-sky-500',
      tag: 'Pre-Wedding',
      timeText: 'text-sky-800'
    };
  }
  return {
    pillBg: 'bg-emerald-100/95 hover:bg-emerald-200 text-emerald-950 border border-emerald-300/80',
    dotColor: 'bg-emerald-500',
    tag: 'Event',
    timeText: 'text-emerald-800'
  };
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function Professional3DCalendar({
  projects,
  teamMembers,
  searchQuery: parentSearchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onAssignMember,
  onAddNewMember,
  onAddProject
}: Professional3DCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const [selectedDayInspector, setSelectedDayInspector] = useState<{
    dateStr: string;
    formattedDate: string;
    projectGroups: { project: FWProject; subEvents: FWSubEvent[] }[];
  } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveSearch = (internalSearch || parentSearchQuery || '').trim().toLowerCase();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const jumpToMonthYear = (monthIdx: number, yearNum: number) => {
    setCurrentDate(new Date(yearNum, monthIdx, 1));
    setIsMonthPickerOpen(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const rawFirstDay = new Date(year, month, 1).getDay();
  const firstDayOfMonth = (rawFirstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const eventsByDate: { [dateStr: string]: { subEvent: FWSubEvent; project: FWProject }[] } = useMemo(() => {
    const map: { [dateStr: string]: { subEvent: FWSubEvent; project: FWProject }[] } = {};

    projects.forEach((project) => {
      if (project.is_archived) return;

      const q = effectiveSearch;
      const matchClientName = !q || project.client_name.toLowerCase().includes(q);

      (project.fw_sub_events || []).forEach((se) => {
        const matchSubTitle = !q || se.event_title.toLowerCase().includes(q);
        if (!matchClientName && !matchSubTitle) return;

        const assignments = resolveSubEventAssignments(se, teamMembers);

        if (selectedRoleFilter !== 'All') {
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

  const monthNameYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const todayDayNum = todayObj.getDate();
  const todayMonthShort = todayObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const totalMonthEvents = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (eventsByDate[dStr]) {
        count += eventsByDate[dStr].length;
      }
    }
    return count;
  }, [eventsByDate, year, month, daysInMonth]);

  const handleOpenDayInspector = (dateStr: string) => {
    const rawItems = eventsByDate[dateStr] || [];
    const dObj = new Date(`${dateStr}T12:00:00`);

    const projectMap: { [projId: string]: { project: FWProject; subEvents: FWSubEvent[] } } = {};
    rawItems.forEach(({ project, subEvent }) => {
      const pId = project.id || project.client_name;
      if (!projectMap[pId]) {
        projectMap[pId] = { project, subEvents: [] };
      }
      projectMap[pId].subEvents.push(subEvent);
    });

    setSelectedDayInspector({
      dateStr,
      formattedDate: dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      projectGroups: Object.values(projectMap),
    });
  };

  return (
    <div className="space-y-5 select-none font-sans min-h-[600px]">
      <div className="bg-[#FAF8F2] rounded-3xl border border-amber-200/80 shadow-xl shadow-amber-950/5 p-4 md:p-6 space-y-5 overflow-hidden">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex flex-col items-center justify-center shadow-md shadow-slate-950/20 shrink-0 border border-slate-800">
              <span className="text-[9px] font-black tracking-wider text-amber-300 uppercase leading-none">{todayMonthShort}</span>
              <span className="text-base font-black leading-tight mt-0.5">{todayDayNum}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight leading-tight">
                  {monthNameYear}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-200/80 text-amber-950 rounded-full border border-amber-300/80">
                  {totalMonthEvents} Shoots
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-500 mt-0.5">
                {currentDate.toLocaleDateString('en-US', { month: 'short' })} 1, {year} – {currentDate.toLocaleDateString('en-US', { month: 'short' })} {daysInMonth}, {year}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            
            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shoots..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs transition"
              />
              {internalSearch && (
                <button
                  onClick={() => setInternalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative" ref={monthPickerRef}>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="px-3 py-1.5 bg-white/90 hover:bg-white border border-amber-200/90 rounded-xl text-xs font-black text-amber-950 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>📅 {MONTH_NAMES[month].slice(0, 3)} {year}</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
              </button>

              {isMonthPickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border-2 border-amber-300 shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-xs font-black text-amber-950 uppercase">Select Month & Year</span>
                    <button
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {YEARS_LIST.map((y) => (
                      <button
                        key={y}
                        onClick={() => jumpToMonthYear(month, y)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                          y === year
                            ? 'bg-amber-950 text-amber-200 shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {MONTH_NAMES.map((mName, idx) => (
                      <button
                        key={mName}
                        onClick={() => jumpToMonthYear(idx, year)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black transition text-center cursor-pointer ${
                          idx === month
                            ? 'bg-slate-950 text-white shadow-xs'
                            : 'bg-amber-50/70 hover:bg-amber-100/90 text-amber-950 border border-amber-200/60'
                        }`}
                      >
                        {mName.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center bg-white/90 p-1 rounded-2xl border border-amber-200/90 shadow-2xs">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 hover:bg-amber-100/70 text-amber-950 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-extrabold text-amber-950 hover:bg-amber-100/70 rounded-xl transition cursor-pointer"
              >
                Today
              </button>

              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 hover:bg-amber-100/70 text-amber-950 rounded-xl transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onAddProject && (
              <button
                type="button"
                onClick={() => onAddProject()}
                className="px-3.5 py-2 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md shadow-slate-950/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
                <span>+ Add Event</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] text-center border-b border-amber-200/60 pb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-xs font-black text-stone-400 uppercase tracking-wider text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[700px]">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[110px] sm:min-h-[140px] p-2 rounded-2xl bg-[#F5F2E9]/40 border border-stone-200/40 text-stone-300 flex flex-col justify-between opacity-60"
                >
                  <span className="text-xs font-bold">{prevDayNum}</span>
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const items = eventsByDate[dateStr] || [];

              return (
                <div
                  key={dayNum}
                  onClick={() => handleOpenDayInspector(dateStr)}
                  className={`min-h-[115px] sm:min-h-[140px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between group cursor-pointer ${
                    isToday
                      ? 'bg-amber-50/95 border-amber-400 ring-2 ring-amber-400/60 shadow-md'
                      : items.length > 0
                      ? 'bg-white hover:bg-amber-50/50 border-amber-200/90 hover:border-amber-400 shadow-2xs hover:shadow-md'
                      : 'bg-white/80 hover:bg-white border-amber-200/50 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-xs font-black transition-all ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center text-[11px] shadow-xs ring-2 ring-amber-400'
                          : 'text-amber-950 group-hover:text-amber-600'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {items.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300/70 leading-none">
                          {items.length} {items.length === 1 ? 'shoot' : 'shoots'}
                        </span>
                      )}

                      {onAddProject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddProject(dateStr);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-200 text-amber-900 rounded-lg transition"
                          title={`Add event on ${dateStr}`}
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mt-1 flex-1">
                    {items.slice(0, 2).map(({ subEvent, project }, idx) => {
                      const style = getEventPillStyle(subEvent.event_title);
                      const isOvernight = Boolean(
                        (subEvent as any).is_overnight ||
                        (subEvent.roll_call_time && subEvent.dismissal_estimate_time && subEvent.dismissal_estimate_time < subEvent.roll_call_time)
                      );

                      return (
                        <div
                          key={idx}
                          className={`${style.pillBg} p-1.5 rounded-xl text-[10px] font-extrabold transition-all shadow-2xs block truncate`}
                          title={`${project.client_name} - ${subEvent.event_title}`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor} shrink-0`} />
                            <span className="font-black truncate leading-tight flex-1">
                              {project.client_name}
                            </span>
                            {subEvent.roll_call_time && (
                              <span className={`text-[9px] font-bold ${style.timeText} shrink-0`}>
                                {format12HourTime(subEvent.roll_call_time)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-[9px] text-stone-600 font-semibold truncate mt-0.5 pl-3">
                            <span className="truncate">{subEvent.event_title}</span>
                            {isOvernight && (
                              <span className="flex items-center gap-0.5 text-indigo-700 font-bold shrink-0">
                                <Moon className="w-2.5 h-2.5" /> Overnight
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {items.length > 2 && (
                      <div className="text-[9px] font-black text-amber-900 bg-amber-100/90 py-0.5 px-1.5 rounded-lg border border-amber-300/80 text-center hover:bg-amber-200 transition">
                        +{items.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(() => {
              const totalSlots = firstDayOfMonth + daysInMonth;
              const remainingSlots = (7 - (totalSlots % 7)) % 7;
              return Array.from({ length: remainingSlots }).map((_, i) => (
                <div
                  key={`next-${i}`}
                  className="min-h-[110px] sm:min-h-[140px] p-2 rounded-2xl bg-[#F5F2E9]/40 border border-stone-200/40 text-stone-300 flex flex-col justify-between opacity-60"
                >
                  <span className="text-xs font-bold">{i + 1}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {selectedDayInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#FEFDF9] rounded-3xl border-2 border-amber-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-950 text-amber-300 flex items-center justify-center font-black shadow-md">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-950">{selectedDayInspector.formattedDate}</h3>
                  <span className="text-xs font-bold text-amber-800">
                    {selectedDayInspector.projectGroups.reduce((acc, g) => acc + g.subEvents.length, 0)} Sub-Events Scheduled
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onAddProject && (
                  <button
                    onClick={() => {
                      const d = selectedDayInspector.dateStr;
                      setSelectedDayInspector(null);
                      onAddProject(d);
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-extrabold rounded-xl border border-amber-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Shoot</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedDayInspector(null)}
                  className="w-8 h-8 rounded-full bg-amber-100/80 hover:bg-amber-200 flex items-center justify-center text-amber-950 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedDayInspector.projectGroups.length === 0 ? (
              <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-black text-amber-950">No Shoots Scheduled on this Date</h4>
                <p className="text-xs font-semibold text-stone-500">You can create a new wedding or event for this date.</p>
                {onAddProject && (
                  <button
                    onClick={() => {
                      const d = selectedDayInspector.dateStr;
                      setSelectedDayInspector(null);
                      onAddProject(d);
                    }}
                    className="px-4 py-2 bg-slate-950 text-white text-xs font-black rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>Create Event on this Date</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayInspector.projectGroups.map(({ project, subEvents }) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl border-2 border-amber-200/90 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-slate-950 text-amber-300 text-xs font-black shadow-xs">
                          {project.client_name}
                        </span>
                        <span className="text-xs font-bold text-stone-500">
                          ({subEvents.length} Event{subEvents.length === 1 ? '' : 's'})
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {subEvents.map((subEvent) => {
                        const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                        const style = getEventPillStyle(subEvent.event_title);
                        const isOvernight = Boolean(
                          (subEvent as any).is_overnight ||
                          (subEvent.roll_call_time && subEvent.dismissal_estimate_time && subEvent.dismissal_estimate_time < subEvent.roll_call_time)
                        );

                        return (
                          <div
                            key={subEvent.id}
                            className="bg-[#FAF8F2] rounded-xl border border-amber-200/70 p-3.5 space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h5 className="font-black text-amber-950 text-sm">
                                  {subEvent.event_title}
                                </h5>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${style.pillBg}`}>
                                  {style.tag}
                                </span>
                              </div>

                              {subEvent.roll_call_time && (
                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>
                                    {format12HourTime(subEvent.roll_call_time)}
                                    {subEvent.dismissal_estimate_time
                                      ? ` → ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                      : ''}
                                  </span>
                                  {isOvernight && (
                                    <span className="ml-1 text-[10px] text-indigo-700 font-black">🌙 Overnight</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {subEvent.venue_name && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{subEvent.venue_name}</span>
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">
                                Assigned Crew ({assignments.filter(a => a.assigned_member_id).length}/{assignments.length})
                              </span>
                              <div className="flex items-center gap-3 flex-wrap pt-1">
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
