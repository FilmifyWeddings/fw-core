import { useMemo } from 'react';
import { FWProject } from '@/types';
import { UnifiedFilterState } from '../components/ShootFilterModal';

/**
 * ⚡ Checks if any filter is actively enabled
 */
export function isCardFilterActive(filters?: UnifiedFilterState | null): boolean {
  if (!filters) return false;
  return Boolean(
    (filters.monthYear && filters.monthYear !== 'all') ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    (filters.eventTypes && filters.eventTypes.length > 0) ||
    (filters.roles && filters.roles.length > 0) ||
    (filters.assignmentStatuses && filters.assignmentStatuses.length > 0) ||
    (filters.assignmentStatus && filters.assignmentStatus !== 'all') ||
    (filters.pmIds && filters.pmIds.length > 0) ||
    (filters.pmId && filters.pmId !== 'all') ||
    (filters.memberIds && filters.memberIds.length > 0) ||
    (filters.memberId && filters.memberId !== 'all') ||
    (filters.studioId && filters.studioId !== 'all')
  );
}

/**
 * ⚡ Extracts or synthesizes sub-event slots including unassigned roles from subEvent.roles
 */
export function extractSubEventSlots(subEvent: any): any[] {
  if (!subEvent) return [];
  const existingAssignments: any[] = subEvent.fw_assignments || subEvent.assignments || [];

  let rawRoles: string[] = [];
  if (Array.isArray(subEvent.roles)) {
    rawRoles = subEvent.roles;
  } else if (typeof subEvent.roles === 'string') {
    try { rawRoles = JSON.parse(subEvent.roles); } catch (e) {}
  } else if (Array.isArray(subEvent.roles_assigned)) {
    rawRoles = subEvent.roles_assigned;
  } else if (Array.isArray(subEvent.event_roles)) {
    rawRoles = subEvent.event_roles;
  }

  if (rawRoles.length === 0) {
    return existingAssignments.length > 0 ? existingAssignments : (subEvent.required_roles || []);
  }

  const assignRoles = existingAssignments.map((a: any) => a.required_role).filter(Boolean);
  const allRoles = Array.from(new Set([...rawRoles, ...assignRoles]));

  return allRoles.map((role: string, idx: number) => {
    const existing = existingAssignments.find(
      (a: any) => a.required_role?.toLowerCase() === role.toLowerCase()
    );
    if (existing) return existing;
    return {
      id: `${subEvent.id || 'slot'}-role-${idx}`,
      sub_event_id: subEvent.id,
      project_id: subEvent.project_id,
      required_role: role,
      assigned_member_id: null,
      fw_team_members: null,
    };
  });
}

/**
 * ⚡ Checks if a project's Project Manager matches the active PM filter
 */
export function isPmMatch(project: any, filters?: UnifiedFilterState | null): boolean {
  if (!filters || !project) return false;
  const activePmIds = (filters.pmIds && filters.pmIds.length > 0)
    ? filters.pmIds
    : (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []);
  if (activePmIds.length === 0) return false;

  const pmId = String(project.project_manager_id || project.project_manager?.id || '').toLowerCase();
  const pmName = String(
    project.project_manager_name ||
    project.project_manager?.name ||
    (typeof project.project_manager === 'string' ? project.project_manager : '') ||
    project.lead_assigned_to ||
    ''
  ).toLowerCase();

  return activePmIds.some(target => {
    const t = target.toLowerCase();
    return (Boolean(pmId) && pmId === t) || (Boolean(pmName) && pmName === t);
  });
}

/**
 * ⚡ Strict Sub-Event Match Checker
 * Evaluates whether an individual sub-event satisfies all active filters:
 * (Dates, Booking Month, Event Types, Team Member, and Strict Co-Filtering: Role + Status)
 */
export function isSubEventMatch(
  subEvent: any,
  project?: FWProject | any,
  filters?: UnifiedFilterState | null
): boolean {
  if (!filters || !isCardFilterActive(filters)) return true;

  // 1. Studio Filter
  if (filters.studioId && filters.studioId !== 'all') {
    if (project && project.user_id && project.user_id !== filters.studioId) return false;
  }

  // 2. Project Manager (PM) Filter
  const activePmIds = (filters.pmIds && filters.pmIds.length > 0)
    ? filters.pmIds
    : (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []);

  if (activePmIds.length > 0 && project) {
    if (!isPmMatch(project, filters)) return false;
  }

  // 3. Booking Month Filter (e.g. '2026-09')
  if (filters.monthYear && filters.monthYear !== 'all') {
    const eventDate = subEvent.event_date || '';
    if (!eventDate.startsWith(filters.monthYear)) return false;
  }

  // 4. Custom Date Range
  if (filters.startDate) {
    if ((subEvent.event_date || '') < filters.startDate) return false;
  }
  if (filters.endDate) {
    if ((subEvent.event_date || '') > filters.endDate) return false;
  }

  // 5. Event Types Multi-select
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    const eventTitle = (subEvent.event_title || subEvent.name || subEvent.event_type || '').toLowerCase();
    const matchType = filters.eventTypes.some(t => eventTitle.includes(t.toLowerCase()));
    if (!matchType) return false;
  }

  // 6. Team Member Filter
  const activeMemberIds = (filters.memberIds && filters.memberIds.length > 0)
    ? filters.memberIds
    : (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []);

  const slots = extractSubEventSlots(subEvent);

  if (activeMemberIds.length > 0) {
    const hasMember = slots.some((a: any) => {
      const mId = String(a.assigned_member_id || a.team_member_id || (a.fw_team_members as any)?.id || '').toLowerCase();
      const mName = String((a.fw_team_members as any)?.name || a.clean_name || a.member_name || '').toLowerCase();
      return activeMemberIds.some(target => {
        const t = target.toLowerCase();
        return (mId && mId === t) || (mName && mName.includes(t));
      });
    });
    if (!hasMember) return false;
  }

  // 7. Strict Joint Filtering: CREW ROLE + ASSIGNMENT STATUS
  const hasRoleFilter = Boolean(filters.roles && filters.roles.length > 0);
  const activeStatuses = (filters.assignmentStatuses && filters.assignmentStatuses.length > 0)
    ? filters.assignmentStatuses
    : (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []);
  const hasStatusFilter = activeStatuses.length > 0;

  if (hasRoleFilter || hasStatusFilter) {
    if (slots.length === 0) return false;

    // Check if at least ONE slot in THIS sub-event satisfies the intersection
    const matchFound = slots.some((roleSlot: any) => {
      const slotRoleName = roleSlot.required_role || roleSlot.role_name || roleSlot.role || '';
      const slotRoleCode = roleSlot.role_short_code || roleSlot.role_code || roleSlot.code || '';

      const matchesRole = !hasRoleFilter || filters.roles.some((r: string) =>
        r.toLowerCase() === slotRoleName.toLowerCase() ||
        (slotRoleCode && r.toUpperCase() === slotRoleCode.toUpperCase())
      );

      if (!matchesRole) return false;

      const isAssigned = Boolean(roleSlot.assigned_member_id || roleSlot.team_member_id || roleSlot.is_assigned);

      if (hasStatusFilter) {
        const wantsAssigned = activeStatuses.some(s => s.toLowerCase() === 'assigned' || s.toLowerCase() === 'fully_assigned');
        const wantsUnassigned = activeStatuses.some(s => s.toLowerCase() === 'unassigned');

        if (wantsAssigned && wantsUnassigned) return true;
        if (wantsAssigned && !isAssigned) return false;
        if (wantsUnassigned && isAssigned) return false;
      }

      return true;
    });

    if (!matchFound) return false;
  }

  return true;
}

/**
 * ⚡ Strict Interconnected Project Match Logic
 * Delegates to isSubEventMatch across project's sub-events
 */
export function isProjectMatch(project: FWProject, filters?: UnifiedFilterState | null): boolean {
  if (!filters || !isCardFilterActive(filters)) return true;

  // 1. Studio Filter
  if (filters.studioId && filters.studioId !== 'all') {
    if (project.user_id !== filters.studioId) return false;
  }

  // 2. Project Manager (PM) Filter
  const activePmIds = (filters.pmIds && filters.pmIds.length > 0)
    ? filters.pmIds
    : (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []);

  if (activePmIds.length > 0) {
    if (!isPmMatch(project, filters)) return false;
  }

  // 3. Sub-events check: At least one sub-event must match the sub-event criteria
  const subEvents = project.fw_sub_events || (project as any).sub_events || [];
  if (subEvents.length === 0) {
    const hasSubEventFilter = Boolean(
      (filters.monthYear && filters.monthYear !== 'all') ||
      filters.startDate ||
      filters.endDate ||
      (filters.eventTypes && filters.eventTypes.length > 0) ||
      (filters.roles && filters.roles.length > 0) ||
      (filters.assignmentStatuses && filters.assignmentStatuses.length > 0) ||
      (filters.assignmentStatus && filters.assignmentStatus !== 'all') ||
      (filters.memberIds && filters.memberIds.length > 0) ||
      (filters.memberId && filters.memberId !== 'all')
    );
    return !hasSubEventFilter;
  }

  return subEvents.some((se: any) => isSubEventMatch(se, project, filters));
}

/**
 * ⚡ Checks if a specific sub-event role slot matches active filters
 * Used to highlight targeted role pills (e.g. Traditional Photographer that is Unassigned, or PM, or Member)
 */
export function checkRoleSlotMatch(
  roleSlot: any,
  filters?: UnifiedFilterState | null
): {
  isTargetedSlot: boolean;
  isUnassignedSlot: boolean;
  isRoleMatch: boolean;
  isMemberMatch: boolean;
} {
  if (!filters || !isCardFilterActive(filters)) {
    return { isTargetedSlot: false, isUnassignedSlot: false, isRoleMatch: false, isMemberMatch: false };
  }

  const slotRoleName = roleSlot.required_role || roleSlot.role_name || roleSlot.role || '';
  const slotRoleCode = roleSlot.role_short_code || roleSlot.role_code || roleSlot.code || '';
  const isAssigned = Boolean(roleSlot.assigned_member_id || roleSlot.team_member_id || roleSlot.is_assigned);

  // 1. Member Match
  const activeMemberIds = (filters.memberIds && filters.memberIds.length > 0)
    ? filters.memberIds
    : (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []);
  const hasMemberFilter = activeMemberIds.length > 0;

  const mId = String(roleSlot.assigned_member_id || roleSlot.team_member_id || (roleSlot.fw_team_members as any)?.id || '').toLowerCase();
  const mName = String((roleSlot.fw_team_members as any)?.name || roleSlot.clean_name || roleSlot.member_name || '').toLowerCase();

  const isMemberMatch = hasMemberFilter && activeMemberIds.some(target => {
    const t = target.toLowerCase();
    return (mId && mId === t) || (mName && mName.includes(t));
  });

  // 2. Role & Status Co-Filtering Match
  const hasRoleFilter = Boolean(filters.roles && filters.roles.length > 0);
  const activeStatuses = (filters.assignmentStatuses && filters.assignmentStatuses.length > 0)
    ? filters.assignmentStatuses
    : (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []);
  const hasStatusFilter = activeStatuses.length > 0;

  const matchesRole = !hasRoleFilter || filters.roles.some((r: string) =>
    r.toLowerCase() === slotRoleName.toLowerCase() ||
    (slotRoleCode && r.toUpperCase() === slotRoleCode.toUpperCase())
  );

  let matchesStatus = true;
  if (hasStatusFilter) {
    const wantsAssigned = activeStatuses.some(s => s.toLowerCase() === 'assigned' || s.toLowerCase() === 'fully_assigned');
    const wantsUnassigned = activeStatuses.some(s => s.toLowerCase() === 'unassigned');

    if (wantsAssigned && !wantsUnassigned && !isAssigned) {
      matchesStatus = false;
    } else if (wantsUnassigned && !wantsAssigned && isAssigned) {
      matchesStatus = false;
    }
  }

  const isTargeted = isMemberMatch || ((hasRoleFilter || hasStatusFilter) && matchesRole && matchesStatus);

  return {
    isTargetedSlot: isTargeted,
    isUnassignedSlot: !isAssigned,
    isRoleMatch: matchesRole,
    isMemberMatch,
  };
}

/**
 * ⚡ Outer Card Highlight Class
 * Note: Whole card does NOT blink (per user request: "वो पूरा कार्ड ब्लिंक नहीं होना चाहिए").
 * Returns clean focus border without animate-pulse.
 */
export function getCardHighlightClass(isFilterActive?: boolean, isCardMatched?: boolean): string {
  if (isFilterActive && isCardMatched) {
    return 'ring-1.5 ring-amber-400/60 shadow-md';
  }
  return '';
}

/**
 * ⚡ Custom Hook for Team Manager Project Filtering
 */
export function useTeamManagerFilter(
  projects: FWProject[],
  filters: UnifiedFilterState,
  searchQuery: string = '',
  selectedRoleFilter: string = 'All'
) {
  const isFilterActive = useMemo(() => isCardFilterActive(filters), [filters]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (project.is_archived) return false;

      // 1. Quick search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = project.client_name?.toLowerCase().includes(q);
        const matchSub = project.fw_sub_events?.some(se => se.event_title?.toLowerCase().includes(q));
        if (!matchName && !matchSub) return false;
      }

      // 2. Legacy single role filter
      if (selectedRoleFilter !== 'All') {
        const hasRole = project.fw_sub_events?.some(se =>
          se.fw_assignments?.some(a => a.required_role === selectedRoleFilter)
        );
        if (!hasRole) return false;
      }

      // 3. Strict Interconnected Match
      return isProjectMatch(project, filters);
    });
  }, [projects, filters, searchQuery, selectedRoleFilter]);

  return {
    filteredProjects,
    isFilterActive,
    isProjectMatch: (p: FWProject) => isProjectMatch(p, filters),
    isSubEventMatch: (se: any, p: FWProject) => isSubEventMatch(se, p, filters),
    checkRoleSlotMatch: (slot: any) => checkRoleSlotMatch(slot, filters),
    getCardHighlightClass: (isMatched: boolean) => getCardHighlightClass(isFilterActive, isMatched),
  };
}

export default useTeamManagerFilter;
