'use client';

import React, { useState } from 'react';
import { FWProject, FWSubEvent, FWTeamMember } from '@/types';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
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
}

interface FlattenedSubEvent {
  subEvent: FWSubEvent;
  project: FWProject;
  dateObj: Date;
  monthKey: string; // e.g. "July 2026"
  sortTimestamp: number;
}

export default function MonthListView({
  projects,
  teamMembers,
  searchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onAssignMember,
  onAddNewMember,
}: MonthListViewProps) {
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Flatten and group sub-events by Month Year
  const allSubEvents: FlattenedSubEvent[] = [];

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
      const isValidDate = !isNaN(d.getTime());
      const dateObj = isValidDate ? d : new Date();

      const monthKey = isValidDate
        ? dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unscheduled Events';

      allSubEvents.push({
        subEvent: se,
        project,
        dateObj,
        monthKey,
        sortTimestamp: isValidDate ? dateObj.getTime() : 0,
      });
    });
  });

  allSubEvents.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

  const monthGroups: { [monthKey: string]: FlattenedSubEvent[] } = {};
  const monthOrder: string[] = [];

  allSubEvents.forEach((item) => {
    if (!monthGroups[item.monthKey]) {
      monthGroups[item.monthKey] = [];
      monthOrder.push(item.monthKey);
    }
    monthGroups[item.monthKey].push(item);
  });

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  if (monthOrder.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="font-bold text-base text-slate-800">No Sub-Events Found</h4>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          No sub-events match your current search or role filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {monthOrder.map((monthKey) => {
        const items = monthGroups[monthKey];
        const isCollapsed = collapsedMonths[monthKey];

        return (
          <div
            key={monthKey}
            className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 overflow-hidden transition-all"
          >
            {/* MONTH HEADER BAR */}
            <button
              onClick={() => toggleMonth(monthKey)}
              className="w-full px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none transition hover:opacity-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-amber-300 font-black text-sm shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black tracking-tight text-white">{monthKey}</h3>
                  <span className="text-[11px] font-bold text-slate-300 tracking-wide">
                    {items.length} {items.length === 1 ? 'Sub-Event' : 'Sub-Events'} Scheduled
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold backdrop-blur-sm">
                  {items.length} Events
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-slate-300" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </button>

            {/* SUB-EVENTS LIST BODY */}
            {!isCollapsed && (
              <div className="p-6 space-y-4">
                {items.map(({ subEvent, project, dateObj }) => {
                  const projectGradient = getGradientByProjectId(project.id || project.client_name);

                  const dayName = isNaN(dateObj.getTime())
                    ? 'DAY'
                    : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  const monthAbbr = isNaN(dateObj.getTime())
                    ? 'MMM'
                    : dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const dayNumber = isNaN(dateObj.getTime())
                    ? '00'
                    : dateObj.getDate().toString().padStart(2, '0');
                  const yearStr = isNaN(dateObj.getTime())
                    ? ''
                    : dateObj.getFullYear().toString();

                  const assignments = subEvent.fw_assignments || [];
                  const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                  const totalSlots = assignments.length;

                  return (
                    <div
                      key={subEvent.id}
                      className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all p-4 flex flex-col lg:flex-row items-stretch gap-4"
                    >
                      {/* DATE BADGE COLUMN */}
                      <div
                        className={`${projectGradient} w-full lg:w-32 rounded-xl p-3 shrink-0 flex lg:flex-col items-center justify-between text-center text-white`}
                      >
                        <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                            {dayName}
                          </span>
                          <span className="text-2xl lg:text-3xl font-black text-white leading-none my-0.5">
                            {dayNumber}
                          </span>
                          <span className="text-xs font-black text-white/90 uppercase tracking-wider">
                            {monthAbbr} {yearStr}
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black border border-white/20">
                          {assignedCount}/{totalSlots} Crew
                        </div>
                      </div>

                      {/* MAIN CONTENT AREA */}
                      <div className="flex-1 space-y-3">
                        {/* HEADER: CLIENT NAME & SUB EVENT TITLE */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black tracking-wide border border-indigo-200">
                              Client: {project.client_name}
                            </span>
                            <h4 className="text-base font-black text-slate-900 tracking-tight">
                              {subEvent.event_title}
                            </h4>
                          </div>

                          {/* Time & Venue */}
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
                            {subEvent.roll_call_time && (
                              <div className="flex items-center gap-1.5 text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>
                                  {format12HourTime(subEvent.roll_call_time)}
                                  {subEvent.dismissal_estimate_time
                                    ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                    : ''}
                                </span>
                              </div>
                            )}
                            {subEvent.venue_name && (
                              <div className="flex items-center gap-1.5 text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[200px]">{subEvent.venue_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CREW ALLOCATION CHIPS GRID WITH CLICKABLE ASSIGN POPOVERS */}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
