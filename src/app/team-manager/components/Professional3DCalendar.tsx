'use client';

import React, { useState } from 'react';
import { FWProject, FWSubEvent, FWTeamMember } from '@/types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, 
  X, Sparkles 
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

interface CalendarSubEventItem {
  subEvent: FWSubEvent;
  project: FWProject;
}

const getInitials = (name: string) => {
  if (!name) return 'CR';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatMemberName2Lines = (fullName: string) => {
  if (!fullName) return { line1: '', line2: '' };
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 1) return { line1: parts[0], line2: '' };
  return { line1: parts[0], line2: parts.slice(1).join(' ') };
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
    items: CalendarSubEventItem[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const eventsByDate: { [dateStr: string]: CalendarSubEventItem[] } = {};

  projects.forEach((project) => {
    if (project.is_archived) return;

    const q = searchQuery.trim().toLowerCase();
    const matchClientName = !q || project.client_name.toLowerCase().includes(q);

    (project.fw_sub_events || []).forEach((se) => {
      const matchSubTitle = !q || se.event_title.toLowerCase().includes(q);
      if (!matchClientName && !matchSubTitle) return;

      if (selectedRoleFilter !== 'All') {
        const hasRole = se.fw_assignments?.some((a) => a.required_role === selectedRoleFilter);
        if (!hasRole) return;
      }

      const d = new Date(se.event_date);
      if (isNaN(d.getTime())) return;

      const dateStr = d.toISOString().split('T')[0];
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
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-2 hover:bg-white rounded-xl text-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CALENDAR GRID */}
        <div>
          <div className="grid grid-cols-7 gap-2 text-center mb-3">
            {daysOfWeek.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-xs font-black uppercase tracking-wider rounded-xl ${
                  idx === 0 || idx === 6 ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 bg-slate-100/60'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] sm:min-h-[120px] bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/60 opacity-40"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1;
              const dateObj = new Date(year, month, dayNum);
              const yearPad = dateObj.getFullYear();
              const monthPad = (dateObj.getMonth() + 1).toString().padStart(2, '0');
              const dayPad = dayNum.toString().padStart(2, '0');
              const dateStr = `${yearPad}-${monthPad}-${dayPad}`;

              const items = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;

              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    if (items.length > 0) {
                      setSelectedDayInspector({ dateStr, formattedDate, items });
                    }
                  }}
                  className={`min-h-[100px] sm:min-h-[120px] rounded-2xl border p-2 flex flex-col justify-between transition-all duration-200 select-none ${
                    items.length > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
                  } ${
                    isToday
                      ? 'bg-gradient-to-b from-indigo-50/90 via-purple-50/40 to-white border-2 border-indigo-500 shadow-md shadow-indigo-100/50'
                      : items.length > 0
                      ? 'bg-white border-slate-300/90 shadow-xs hover:border-indigo-400'
                      : 'bg-slate-50/50 border-slate-200/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black transition ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {items.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black text-[10px] border border-indigo-200">
                        {items.length} {items.length === 1 ? 'Event' : 'Events'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2 overflow-hidden">
                    {items.slice(0, 2).map(({ subEvent, project }, idx) => {
                      const grad = getGradientByProjectId(project.id || project.client_name);

                      return (
                        <div
                          key={`${subEvent.id}-${idx}`}
                          className={`${grad} text-white p-1.5 rounded-xl text-[10px] font-bold shadow-xs truncate`}
                        >
                          <div className="font-extrabold truncate">{project.client_name}</div>
                          <div className="text-white/90 font-medium text-[9px] truncate">
                            {subEvent.event_title}
                          </div>
                        </div>
                      );
                    })}

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
                const assignments = subEvent.fw_assignments || [];

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
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{subEvent.venue_name}</span>
                      </div>
                    )}

                    {/* CREW ALLOCATIONS WITH INTERACTIVE ROLE ASSIGNMENT DROPDOWNS */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Assigned Crew Roster (Click chip to assign team member)
                      </span>
                      {assignments.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No roles configured for this event.</span>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {assignments.map((assignment) => (
                            <RoleAssignDropdown
                              key={assignment.id}
                              assignment={assignment}
                              subEventId={subEvent.id}
                              projectId={project.id}
                              teamMembers={teamMembers}
                              onAssignMember={onAssignMember}
                              onAddNewMember={onAddNewMember}
                              variant="chip"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedDayInspector(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
