'use client';

import React from 'react';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import { Calendar, Clock, MapPin, Plus, Pencil, History } from 'lucide-react';
import { resolveEventCrewVisibility } from '@/lib/permissions/rbacRules';
import { checkProjectUnassignedWarning } from './TeamManagerProjectCard';
import { isCardFilterActive as checkIsFilterActive, checkRoleSlotMatch, getCardHighlightClass, isPmMatch, isSubEventMatch } from '../hooks/useTeamManagerFilter';
import { WorkspaceCrewRole, getRoleAbbr } from '@/lib/workspace-settings';

export interface TeamManagerCardViewProps {
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  format12HourTime: (time?: string) => string;
  getGradientByProjectId: (id: string) => string;
  isTmReadOnly?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  currentMemberId?: string | null;
  currentMemberEmail?: string | null;
  currentUserId?: string | null;
  studioPermissionsMap?: Map<string, any>;
  activeStudioId?: string | null;
  customCrewRoles?: WorkspaceCrewRole[];
  highlightMemberId?: string | null;
  selectedFilterMemberId?: string | null;
  unifiedFilters?: any;
  onAssignMember?: (assignmentId: string, memberId: string | null) => void;
  onAddNewMember?: (info: { assignmentId: string; role: string; subEventId: string; projectId: string }) => void;
  onEditProject?: (project: FWProject) => void;
  onOpenHistory?: (project: FWProject) => void;
  onProjectPMChange?: (projectId: string, memberId: string | null, memberName: string | null) => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'TM';
  const parts = name.trim().replace(/\.\.\./g, '').split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

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

export default function TeamManagerCardView({
  projects,
  teamMembers,
  format12HourTime,
  getGradientByProjectId,
  isTmReadOnly = false,
  isOwner = false,
  isAdmin,
  currentMemberId = null,
  currentMemberEmail = null,
  currentUserId = null,
  studioPermissionsMap = new Map(),
  activeStudioId = null,
  customCrewRoles = [],
  highlightMemberId = null,
  selectedFilterMemberId = null,
  unifiedFilters = null,
  onAssignMember,
  onAddNewMember,
  onEditProject,
  onProjectPMChange,
  onOpenHistory,
}: TeamManagerCardViewProps) {
  return (
    <div className="space-y-8">
      {projects.map((project) => {
        const projectGradient = getGradientByProjectId(project.id || project.client_name);

        const isCardFilterActive = checkIsFilterActive(unifiedFilters);
        const cardHighlightClass = getCardHighlightClass(isCardFilterActive, true);

        return (
          <div
            key={project.id}
            className={`bg-white border-2 border-slate-300/90 shadow-lg shadow-slate-200/50 rounded-3xl p-4 sm:p-6 space-y-4 mb-8 transition-all duration-300 ${cardHighlightClass}`}
          >
            {/* Master Client Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#1E1B4B' }}>
                  {project.client_name}
                </h3>
                {project.studio_name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    🏢 {project.studio_name}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-950 text-[11px] font-black tracking-wide border border-indigo-200/80 shadow-2xs">
                  {project.fw_sub_events?.length || 0} Sub-Events
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* PM Badge */}
                {(() => {
                  const isProjectPmMatched = isPmMatch(project, unifiedFilters);
                  return (
                    <div className={`px-3 py-1.5 rounded-2xl border text-amber-950 text-xs font-bold flex items-center gap-2 select-none shadow-2xs transition-all ${
                      isProjectPmMatched
                        ? 'ring-2 ring-amber-400/80 bg-amber-100/90 border-amber-400 animate-pulse shadow-sm shadow-amber-300/40'
                        : 'bg-amber-50/70 border-amber-200/70'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">PM:</span>
                      {project.project_manager_name ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[9px] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            {getInitials(project.project_manager_name)}
                          </div>
                          <span className="font-extrabold text-amber-950 max-w-[130px] truncate">{project.project_manager_name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-700/60 font-medium">Unassigned</span>
                      )}
                    </div>
                  );
                })()}

                {/* Standalone History Icon Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onOpenHistory?.(project);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-100/90 hover:bg-amber-100/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer shadow-sm"
                  title="View Project Change History"
                >
                  <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </button>

                {!isTmReadOnly && onEditProject && (
                  <button
                    title="Edit Project"
                    onClick={() => onEditProject(project)}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition shadow-xs shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Events Stack */}
            <div className="space-y-4">
              {(isCardFilterActive
                ? (project.fw_sub_events || []).filter(se => isSubEventMatch(se, project, unifiedFilters))
                : (project.fw_sub_events || [])
              ).map((subEvent) => {
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

                const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                const assignedCount = assignments.filter((a: any) => a.assigned_member_id !== null).length;
                const totalSlots = assignments.length;
                const eventVisibility = resolveEventCrewVisibility(
                  { ...subEvent, project },
                  currentMemberId,
                  studioPermissionsMap,
                  activeStudioId,
                  isOwner
                );

                return (
                  <div
                    key={subEvent.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-row items-stretch overflow-hidden"
                  >
                    {/* Left Date Block */}
                    <div className={`${projectGradient} w-24 sm:w-28 shrink-0 flex flex-col items-center justify-between p-3 sm:p-3.5 text-center text-white select-none`}>
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider block">
                          {dayName}
                        </span>
                        <span className={`font-black text-white leading-none my-1 block ${isTbd ? 'text-base' : 'text-xl sm:text-2xl'}`}>
                          {dayNumber}
                        </span>
                        <span className="text-[10px] sm:text-xs font-extrabold text-white/90 uppercase tracking-wider block">
                          {monthAbbr}
                        </span>
                        <span className="text-[9px] font-semibold text-white/70 tracking-widest mt-0.5 block">
                          {yearStr}
                        </span>
                      </div>

                      <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner mt-2 border border-white/20">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Right Body */}
                    <div className="flex-1 p-4 flex flex-col justify-between space-y-3 min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-base tracking-tight" style={{ color: '#1E1B4B' }}>
                              {subEvent.event_title}
                            </h4>
                            {isTbd && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                ⚠️ Date: TBD
                              </span>
                            )}
                            {isOvernightShoot && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black">
                                🌙 Overnight
                              </span>
                            )}
                          </div>

                          <div className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                            {eventVisibility === 'OWN_ROLE_ONLY' ? 'Assigned' : `${assignedCount}/${totalSlots} Roles`}
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
                            </div>
                          )}
                          {subEvent.venue_name && (
                            <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                              <span className="truncate max-w-[220px]">{subEvent.venue_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 my-1.5" />

                      {/* Crew Placement Grid */}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                        <div className="flex items-start gap-4 flex-wrap">
                          {assignments.map((assignment: any) => {
                            const isAssigned = assignment.assigned_member_id !== null;
                            const memberObj = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                            const cleanName = (memberObj?.name || '').replace(/\.\.\./g, '').trim();
                            const role = assignment.required_role;
                            const shortRole = getRoleAbbr(role, customCrewRoles);

                            const isCurrentUserSlot = Boolean(
                              (currentMemberId && assignment.assigned_member_id === currentMemberId) ||
                              (currentMemberEmail && memberObj?.email && memberObj.email.toLowerCase() === currentMemberEmail.toLowerCase()) ||
                              (currentUserId && memberObj?.user_id === currentUserId)
                            );

                            // Dynamic Per-Event RBAC Masking: omit non-self roles completely if OWN_ROLE_ONLY
                            if (eventVisibility === 'OWN_ROLE_ONLY' && !isCurrentUserSlot) {
                              return null;
                            }

                            const activeFilterId = selectedFilterMemberId || highlightMemberId;
                            const isUserAdmin = isAdmin ?? (!isTmReadOnly || isOwner);

                            const isSelectedSpotlight = Boolean(
                              isUserAdmin &&
                              isAssigned &&
                              activeFilterId &&
                              activeFilterId !== 'all' &&
                              (
                                assignment.assigned_member_id === activeFilterId ||
                                memberObj?.id === activeFilterId ||
                                cleanName.toLowerCase() === activeFilterId.toLowerCase()
                              )
                            );

                            const slotMatch = checkRoleSlotMatch(assignment, unifiedFilters);
                            const isTargeted = isSelectedSpotlight || slotMatch.isTargetedSlot;

                            return (
                              <div key={assignment.id} className="relative flex flex-col items-center min-w-[68px]">
                                <div
                                  className={`relative flex flex-col items-center transition-all duration-300 ${
                                    isTargeted
                                      ? 'rounded-lg ring-2 ring-amber-400/80 bg-amber-50/70 dark:bg-amber-950/30 p-1 shadow-sm shadow-amber-300/40 animate-pulse'
                                      : ''
                                  }`}
                                >
                                  <div
                                    className={`flex flex-col items-center group min-w-[50px] max-w-[76px] text-center select-none ${
                                      isTmReadOnly || eventVisibility === 'FULL_CREW' ? 'cursor-default' : 'cursor-pointer'
                                    }`}
                                    title={isAssigned ? `${cleanName} (${role})` : isTmReadOnly || eventVisibility === 'FULL_CREW' ? `Unassigned: ${role}` : `Unassigned: ${role}`}
                                  >
                                    {isAssigned ? (
                                      <div className="relative mb-1 flex items-center justify-center">
                                        <div className={`relative w-10 h-10 rounded-full border-2 p-0.5 flex items-center justify-center shrink-0 transition-all ${
                                          isTargeted
                                            ? 'border-amber-400 bg-amber-100/80 shadow-xs'
                                            : 'border-emerald-500 bg-emerald-50 shadow-xs'
                                        }`}>
                                          {memberObj?.avatar_url ? (
                                            <img
                                              src={memberObj.avatar_url}
                                              alt={cleanName}
                                              className="w-full h-full rounded-full object-cover shrink-0"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                                              }}
                                            />
                                          ) : (
                                            <div className={`w-full h-full rounded-full font-black text-[10px] flex items-center justify-center shrink-0 text-white ${
                                              isTargeted
                                                ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                                                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                            }`}>
                                              {getInitials(cleanName || role)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (isTmReadOnly || eventVisibility === 'FULL_CREW') ? (
                                      <div className={`w-10 h-10 rounded-full border font-bold mb-1 flex items-center justify-center shadow-2xs shrink-0 cursor-default ${
                                        isTargeted
                                          ? 'border-amber-400 bg-amber-100 text-amber-900'
                                          : 'border-dashed border-slate-300 bg-slate-100/70 text-slate-400'
                                      }`}>
                                        <span className="text-xs font-black">-</span>
                                      </div>
                                    ) : (
                                      <div className={`w-10 h-10 rounded-full border border-dashed font-black mb-1 flex items-center justify-center shadow-2xs transition-colors cursor-pointer shrink-0 ${
                                        isTargeted
                                          ? 'border-amber-500 bg-amber-100/90 text-amber-700 group-hover:bg-amber-200/90'
                                          : 'border-red-500 bg-red-50/90 text-red-600 group-hover:bg-red-100'
                                      }`}>
                                        <Plus className={`w-4 h-4 stroke-[3] ${isTargeted ? 'text-amber-700' : 'text-red-600'}`} />
                                      </div>
                                    )}

                                    {/* Role Pill */}
                                    <span className={`text-[10px] font-black uppercase tracking-wider leading-tight block text-center ${
                                      isTargeted ? 'text-amber-800 dark:text-amber-400 font-extrabold' : 'text-slate-500'
                                    }`}>
                                      {shortRole}
                                    </span>

                                    {/* 2-Line Centered Name or Unassigned Label */}
                                    {isAssigned ? (
                                      (() => {
                                        const fullName = cleanName || memberObj?.name?.trim() || '';
                                        const firstSpaceIndex = fullName.indexOf(' ');
                                        const firstName = firstSpaceIndex !== -1 ? fullName.substring(0, firstSpaceIndex) : fullName;
                                        const remainingName = firstSpaceIndex !== -1 ? fullName.substring(firstSpaceIndex + 1) : '';

                                        return (
                                          <div className="flex flex-col items-center justify-center leading-tight text-center max-w-[76px] px-0.5 mt-0.5">
                                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                              {firstName}
                                            </span>
                                            {remainingName && (
                                              <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 tracking-tight line-clamp-1">
                                                {remainingName}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[68px] text-center leading-none mt-0.5 block">
                                        {isTmReadOnly || eventVisibility === 'FULL_CREW' ? 'Unassigned' : 'Assign'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
  );
}
