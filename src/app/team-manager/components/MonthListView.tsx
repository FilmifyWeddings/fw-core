'use client';

import React, { useState } from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
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
  monthKey: string;
  sortTimestamp: number;
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

// Robust assignment resolver ensuring roles are never empty
const resolveSubEventAssignments = (subEvent: FWSubEvent, teamMembers: FWTeamMember[]): FWAssignment[] => {
  if (subEvent.fw_assignments && subEvent.fw_assignments.length > 0) {
    return subEvent.fw_assignments;
  }

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

  if (rawRoles.length === 0) {
    return [];
  }

  return rawRoles.map((r: string, idx: number) => {
    return {
      id: `${subEvent.id}-role-${idx}`,
      sub_event_id: subEvent.id,
      project_id: subEvent.project_id,
      required_role: r,
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

      const assignments = resolveSubEventAssignments(se, teamMembers);

      if (selectedRoleFilter !== 'All') {
        const hasRole = assignments.some((a) => a.required_role === selectedRoleFilter);
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

  return (
    <div className="space-y-6">
      {monthOrder.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2 shadow-2xs">
          <h3 className="text-base font-black text-slate-900">No Sub-Events Found</h3>
          <p className="text-xs text-slate-500 font-semibold">
            Try adjusting your search query or role filter.
          </p>
        </div>
      ) : (
        monthOrder.map((monthKey) => {
          const isCollapsed = collapsedMonths[monthKey];
          const items = monthGroups[monthKey];

          return (
            <div
              key={monthKey}
              className="bg-[#F8F9FD] rounded-3xl border border-slate-200/90 p-4 md:p-6 space-y-4 shadow-sm"
            >
              {/* MONTH HEADER ACCORDION BAR */}
              <div
                onClick={() => toggleMonth(monthKey)}
                className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition shadow-2xs select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C5CE7] flex items-center justify-center font-black">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                      {monthKey}
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      {items.length} Sub-Event{items.length === 1 ? '' : 's'} Total
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
                    {items.length} Events
                  </span>
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition">
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* MONTH EVENTS LIST */}
              {!isCollapsed && (
                <div className="space-y-4 pt-1">
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

                    const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                    const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                    const totalSlots = assignments.length;

                    return (
                      <div
                        key={subEvent.id}
                        className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col lg:flex-row items-stretch gap-5"
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
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* PROMINENT CLIENT NAME BADGE */}
                              <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/90 text-indigo-950 font-black text-sm md:text-base shadow-2xs flex items-center gap-2">
                                <span className="text-indigo-600 font-extrabold text-xs uppercase tracking-wider">Client:</span>
                                <span className="text-slate-900 font-black">{project.client_name}</span>
                              </div>

                              <h4 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                                {subEvent.event_title}
                              </h4>
                            </div>

                            {/* DISPLAY LOCATION & TIME */}
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
                              {subEvent.roll_call_time && (
                                <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span>
                                    {format12HourTime(subEvent.roll_call_time)}
                                    {subEvent.dismissal_estimate_time
                                      ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                      : ''}
                                  </span>
                                </div>
                              )}
                              {subEvent.venue_name && (
                                <a
                                  href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition hover:border-indigo-300"
                                >
                                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[220px]">{subEvent.venue_name}</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* CREW ALLOCATION CHIPS GRID WITH CLICKABLE ASSIGN POPOVERS */}
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                              Assigned Crew Roster (Click chip to assign team member)
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
    </div>
  );
}
