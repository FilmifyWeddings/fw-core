'use client';

import React, { useState } from 'react';
import { FWProject, FWSubEvent } from '@/types';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, FileText, Plus } from 'lucide-react';

interface MonthListViewProps {
  projects: FWProject[];
  searchQuery: string;
  selectedRoleFilter: string;
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
  onRoleClick?: (assignmentId: string, rect: DOMRect) => void;
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

export default function MonthListView({
  projects,
  searchQuery,
  selectedRoleFilter,
  format12HourTime,
  getGradientByProjectId,
  onRoleClick,
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
              <div className="p-6 space-y-5">
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
                            {/* 3. PROMINENT CLIENT NAME BADGE */}
                            <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/90 text-indigo-950 font-black text-sm md:text-base shadow-2xs flex items-center gap-2">
                              <span className="text-indigo-600 font-extrabold text-xs uppercase tracking-wider">Client:</span>
                              <span className="text-slate-900 font-black">{project.client_name}</span>
                            </div>

                            <h4 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                              {subEvent.event_title}
                            </h4>
                          </div>

                          {/* 4. DISPLAY LOCATION & TIME */}
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

                        {/* 4. DISPLAY OPERATIONAL NOTES */}
                        {subEvent.operational_notes && (
                          <div className="bg-amber-50/90 border-l-4 border-amber-400 p-3 rounded-r-xl text-xs text-amber-950 font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>📝 Notes: {subEvent.operational_notes}</span>
                          </div>
                        )}

                        {/* 1, 2, 5. CIRCULAR ROLE BADGES (CARD VIEW STYLE) & COLOR CODING & DIRECT ASSIGNMENT */}
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                            Assigned Crew Roster (Click Badge to Assign)
                          </span>
                          {assignments.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No roles configured for this event.</span>
                          ) : (
                            <div className="flex items-start gap-4 flex-wrap pt-1">
                              {assignments.map((assignment) => {
                                const isAssigned = assignment.assigned_member_id !== null;
                                const memberObj = assignment.fw_team_members;
                                const rawName = memberObj?.name || '';
                                const cleanName = rawName.replace(/\.\.\./g, '').trim();
                                const role = assignment.required_role;
                                const dicebearFallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName || role)}`;
                                const { line1, line2 } = formatMemberName2Lines(cleanName);

                                return (
                                  <div
                                    key={assignment.id}
                                    onClick={(e) => onRoleClick && onRoleClick(assignment.id, e.currentTarget.getBoundingClientRect())}
                                    className="relative flex flex-col items-center min-w-[68px] group cursor-pointer"
                                    title={isAssigned ? `${cleanName} (${role}) - Click to change` : `Unassigned: ${role} - Click to assign`}
                                  >
                                    {/* LAYER 1: CIRCULAR AVATAR / RED DASHED UNASSIGNED CIRCLE */}
                                    {isAssigned ? (
                                      memberObj?.avatar_url ? (
                                        /* 5. GREEN BORDER 🟢 FOR ASSIGNED ROLES */
                                        // eslint-disable-next-next/no-img-element
                                        <img
                                          src={memberObj.avatar_url}
                                          alt={cleanName}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-emerald-500 group-hover:scale-105 transition shrink-0"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = dicebearFallback;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-emerald-500 group-hover:scale-105 transition shrink-0">
                                          {getInitials(cleanName || role)}
                                        </div>
                                      )
                                    ) : (
                                      /* 5. RED BORDER 🔴 FOR UNASSIGNED ROLES */
                                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 bg-red-50/90 text-red-600 font-black flex items-center justify-center shadow-2xs group-hover:bg-red-100 group-hover:scale-105 transition-all cursor-pointer shrink-0">
                                        <Plus className="w-5 h-5 text-red-600 stroke-[3]" />
                                      </div>
                                    )}

                                    {/* LAYER 2: ROLE LABEL (GREEN IF ASSIGNED 🟢, RED IF UNASSIGNED 🔴) */}
                                    <span
                                      className={`font-bold text-[11px] uppercase tracking-wide block text-center mt-1.5 leading-none ${
                                        isAssigned ? 'text-emerald-700 font-black' : 'text-red-600 font-extrabold'
                                      }`}
                                    >
                                      {role}
                                    </span>

                                    {/* LAYER 3: MEMBER NAME OR UNASSIGNED BADGE */}
                                    {isAssigned ? (
                                      <div className="flex flex-col items-center text-center font-extrabold text-slate-900 text-xs leading-tight max-w-[90px] mt-0.5 min-h-[28px] justify-start">
                                        <span className="block leading-none truncate max-w-[90px]">{line1}</span>
                                        {line2 ? <span className="block leading-none truncate max-w-[90px] mt-0.5">{line2}</span> : null}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-bold text-red-600 italic block mt-0.5">
                                        Unassigned
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
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
