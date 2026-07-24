'use client';

import React, { useState } from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, 
  UserCheck, AlertCircle, X, Sparkles, Filter 
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
      return existing;
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

export default function Professional3DCalendar({
  projects,
  teamMembers,
  searchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onAssignMember,
  onAddNewMember,
}: Professional3DCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayInspector, setSelectedDayInspector] = useState<{
    dateStr: string;
    formattedDate: string;
    items: { subEvent: FWSubEvent; project: FWProject }[];
  } | null>(null);

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map events to date strings YYYY-MM-DD
  const eventsByDate: { [dateStr: string]: { subEvent: FWSubEvent; project: FWProject }[] } = {};

  projects.forEach((project) => {
    if (project.is_archived) return;

    const q = searchQuery.trim().toLowerCase();
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
      if (!eventsByDate[dateStr]) {
        eventsByDate[dateStr] = [];
      }
      eventsByDate[dateStr].push({ subEvent: se, project });
    });
  });

  const monthNameYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* 3D CALENDAR CONTAINER CARD */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 md:p-8 space-y-6">
        
        {/* TOP HEADER CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">{monthNameYear}</h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Interactive Operations & Operations Planning Board
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-2xl border border-indigo-200/80 transition shadow-2xs cursor-pointer"
            >
              Today
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-2 hover:bg-white rounded-xl text-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-2 hover:bg-white rounded-xl text-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* CALENDAR MONTH GRID */}
        <div className="space-y-2">
          {/* DAY NAMES HEADER */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* DATES GRID */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] md:min-h-[130px] rounded-2xl bg-slate-50/50 border border-slate-100/80" />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const items = eventsByDate[dateStr] || [];

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (items.length > 0) {
                      const dObj = new Date(dateStr);
                      setSelectedDayInspector({
                        dateStr,
                        formattedDate: dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                        items,
                      });
                    }
                  }}
                  className={`min-h-[100px] md:min-h-[130px] p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    isToday
                      ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-2 ring-indigo-500/20'
                      : items.length > 0
                      ? 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-100 bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs md:text-sm font-black ${
                      isToday ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs' : 'text-slate-700'
                    }`}>
                      {dayNum}
                    </span>

                    {items.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black border border-indigo-200">
                        {items.length} Event{items.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {/* EVENTS PILLS PREVIEW */}
                  <div className="space-y-1 mt-1 flex-1">
                    {items.slice(0, 2).map(({ subEvent, project }, idx) => (
                      <div
                        key={idx}
                        className="bg-indigo-900 text-white p-1.5 rounded-xl text-[10px] font-extrabold truncate border border-indigo-950 shadow-2xs"
                      >
                        <span className="text-amber-300 block font-black leading-tight">{project.client_name}</span>
                        <span className="text-white/90 block font-semibold truncate leading-tight">{subEvent.event_title}</span>
                      </div>
                    ))}

                    {items.length > 2 && (
                      <div className="text-[10px] font-bold text-indigo-600 text-center bg-indigo-50 py-0.5 rounded-lg border border-indigo-100">
                        +{items.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3D GLASSMORPHISM DAY INSPECTOR MODAL */}
      {selectedDayInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedDayInspector.formattedDate}</h3>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedDayInspector.items.length} Sub-Events Scheduled
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDayInspector(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* EVENTS BREAKDOWN LIST WITH INTERACTIVE ASSIGNMENT DROPDOWNS */}
            <div className="space-y-4">
              {selectedDayInspector.items.map(({ subEvent, project }) => {
                const assignments = resolveSubEventAssignments(subEvent, teamMembers);

                return (
                  <div
                    key={subEvent.id}
                    className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-900 text-white text-xs font-black">
                          {project.client_name}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm md:text-base">
                          {subEvent.event_title}
                        </h4>
                      </div>

                      {subEvent.roll_call_time && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {format12HourTime(subEvent.roll_call_time)}
                            {subEvent.dismissal_estimate_time
                              ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {subEvent.venue_name && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{subEvent.venue_name}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Assigned Crew Roster
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
