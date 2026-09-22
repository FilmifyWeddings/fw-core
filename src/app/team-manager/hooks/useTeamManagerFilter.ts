import { useMemo } from 'react';
import { FWProject, FWTeamMember } from '@/types';
import { UnifiedFilterState } from '../components/ShootFilterModal';
import { resolveSubEventAssignments } from '@/lib/team-helpers';
import { getRoleShortCode, parseRoleAndNumber } from '@/lib/workspace-settings';

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
 * ⚡ Evaluates whether a crew slot is genuinely assigned to an active team member.
 */
export function isSlotAssigned(slot: any): boolean {
  if (!slot) return false;
  const mId = slot.assigned_member_id || slot.team_member_id;
  if (!mId) return false;
  const str = String(mId).trim().toLowerCase();
  if (!str || str === 'null' || str === 'undefined' || str === 'unassigned' || str === 'none') {
    return false;
  }
  return true;
}

/**
 * ⚡ Canonical Role Matcher
 * Resolves short codes (TP, CP, CV, Ass, Dron), full role names, sequential numbered roles (TP 1, TP 2),
 * and common wedding aliases (e.g. Wedding Photographer <-> Traditional Photographer).
 */
export function isRoleMatching(targetRole?: string | null, candidateRole?: string | null): boolean {
  if (!targetRole || !candidateRole) return false;

  const t = String(targetRole).trim().toLowerCase();
  const c = String(candidateRole).trim().toLowerCase();
  if (!t || !c) return false;

  // 1. Direct case-insensitive match
  if (t === c) return true;

  // 2. Base role match stripping numbers (e.g. "TP 1", "TP 2", "Traditional Photographer 2")
  const parsedT = parseRoleAndNumber(targetRole);
  const parsedC = parseRoleAndNumber(candidateRole);
  const baseT = parsedT.baseRole.trim().toLowerCase();
  const baseC = parsedC.baseRole.trim().toLowerCase();
  if (baseT === baseC) return true;

  // 3. Short codes normalization via getRoleShortCode
  const codeT = getRoleShortCode(baseT).toLowerCase();
  const codeC = getRoleShortCode(baseC).toLowerCase();
  if (codeT && codeC && codeT === codeC) return true;

  // 4. Common wedding photography/videography heuristics
  const isTradPhoto = (s: string) => s.includes('trad') && (s.includes('photo') || s.includes('tp'));
  const isCandidPhoto = (s: string) => s.includes('candid') && (s.includes('photo') || s.includes('cp'));
  const isTradVideo = (s: string) => s.includes('trad') && (s.includes('vid') || s.includes('tv'));
  const isCine = (s: string) => s.includes('cine') || s.includes('kinematic') || s.includes('cv');
  const isDrone = (s: string) => s.includes('dron') || s.includes('dp');
  const isAssistant = (s: string) => s.includes('assist') || s.includes('helper') || s.includes('ass') || s.includes('ast');

  if (isTradPhoto(t) && isTradPhoto(c)) return true;
  if (isCandidPhoto(t) && isCandidPhoto(c)) return true;
  if (isTradVideo(t) && isTradVideo(c)) return true;
  if (isCine(t) && isCine(c)) return true;
  if (isDrone(t) && isDrone(c)) return true;
  if (isAssistant(t) && isAssistant(c)) return true;

  // 5. Generic "Wedding Photographer" / "Photographer" matching photo roles
  if (t.includes('wedding photographer') || t === 'photographer') {
    if (c.includes('photo') || c === 'tp' || c === 'cp' || isTradPhoto(c) || isCandidPhoto(c)) return true;
  }
  if (c.includes('wedding photographer') || c === 'photographer') {
    if (t.includes('photo') || t === 'tp' || t === 'cp' || isTradPhoto(t) || isCandidPhoto(t)) return true;
  }

  // 6. Substring match for custom roles (e.g. "Live Camera", "Face AI", "Makeup Art")
  if (t.includes(c) || c.includes(t)) return true;

  return false;
}

/**
 * ⚡ Authoritative Sub-Event Slot Extractor
 * Strictly delegates to resolveSubEventAssignments to preserve real 1-to-1 database slots,
 * prevent deduplication of multiple same-role crew slots, and generate exact unassigned placeholders.
 */
export function extractSubEventSlots(subEvent: any, teamMembers: any[] = []): any[] {
  if (!subEvent) return [];
  return resolveSubEventAssignments(subEvent, teamMembers);
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
  filters?: UnifiedFilterState | null,
  teamMembers: any[] = []
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

  const isTbd = Boolean(subEvent.is_date_tbd) || !subEvent.event_date || String(subEvent.event_date).toLowerCase() === 'tbd' || String(subEvent.event_date).toLowerCase().includes('not fix');

  // 3. Booking Month Filter (e.g. '2026-09')
  if (filters.monthYear && filters.monthYear !== 'all') {
    if (isTbd) return false; // TBD shoots don't belong to a specific calendar month
    const eventDate = subEvent.event_date || '';
    if (!eventDate.startsWith(filters.monthYear)) return false;
  }

  // 4. Custom Date Range
  if (filters.startDate) {
    if (isTbd || (subEvent.event_date || '') < filters.startDate) return false;
  }
  if (filters.endDate) {
    if (isTbd || (subEvent.event_date || '') > filters.endDate) return false;
  }

  // 5. Event Types Multi-select
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    const eventTitle = (subEvent.event_title || subEvent.name || subEvent.event_type || '').toLowerCase();
    const matchType = filters.eventTypes.some(t => eventTitle.includes(t.toLowerCase()));
    if (!matchType) return false;
  }

  // 6. Extract Authoritative Slots
  const slots = extractSubEventSlots(subEvent, teamMembers);

  // 7. Team Member Filter
  const activeMemberIds = (filters.memberIds && filters.memberIds.length > 0)
    ? filters.memberIds
    : (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []);

  if (activeMemberIds.length > 0) {
    const hasMember = slots.some((a: any) => {
      const mId = String(a.assigned_member_id || a.team_member_id || (a.fw_team_members as any)?.id || '').toLowerCase();
      const mName = String((a.fw_team_members as any)?.name || a.clean_name || a.member_name || a.assigned_member_name || '').toLowerCase();
      return activeMemberIds.some(target => {
        const t = target.toLowerCase();
        return (mId && mId === t) || (mName && mName.includes(t));
      });
    });
    if (!hasMember) return false;
  }

  // 8. Strict Joint Filtering: CREW ROLE + ASSIGNMENT STATUS
  const hasRoleFilter = Boolean(filters.roles && filters.roles.length > 0);
  const activeStatuses = (filters.assignmentStatuses && filters.assignmentStatuses.length > 0)
    ? filters.assignmentStatuses
    : (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []);
  const hasStatusFilter = activeStatuses.length > 0;

  if (hasRoleFilter || hasStatusFilter) {
    if (slots.length === 0) return false;

    // Check if at least ONE slot in THIS sub-event satisfies BOTH role and status filters
    const matchFound = slots.some((roleSlot: any) => {
      const slotRoleName = roleSlot.required_role || roleSlot.role_name || roleSlot.role || '';

      const matchesRole = !hasRoleFilter || filters.roles.some((r: string) => isRoleMatching(r, slotRoleName));
      if (!matchesRole) return false;

      const isAssigned = isSlotAssigned(roleSlot);

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
export function isProjectMatch(
  project: FWProject,
  filters?: UnifiedFilterState | null,
  teamMembers: any[] = []
): boolean {
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

  return subEvents.some((se: any) => isSubEventMatch(se, project, filters, teamMembers));
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
  const isAssigned = isSlotAssigned(roleSlot);

  if (!filters || !isCardFilterActive(filters)) {
    return {
      isTargetedSlot: false,
      isUnassignedSlot: !isAssigned,
      isRoleMatch: false,
      isMemberMatch: false,
    };
  }

  const slotRoleName = roleSlot.required_role || roleSlot.role_name || roleSlot.role || '';

  // 1. Member Match
  const activeMemberIds = (filters.memberIds && filters.memberIds.length > 0)
    ? filters.memberIds
    : (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []);
  const hasMemberFilter = activeMemberIds.length > 0;

  const mId = String(roleSlot.assigned_member_id || roleSlot.team_member_id || (roleSlot.fw_team_members as any)?.id || '').toLowerCase();
  const mName = String((roleSlot.fw_team_members as any)?.name || roleSlot.clean_name || roleSlot.member_name || roleSlot.assigned_member_name || '').toLowerCase();

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

  const matchesRole = !hasRoleFilter || filters.roles.some((r: string) => isRoleMatching(r, slotRoleName));

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

  // A slot is targeted if member filter matches, OR if (role / status filter active and matches both)
  let isTargeted = false;
  if (hasMemberFilter) {
    isTargeted = isMemberMatch;
  } else if (hasRoleFilter || hasStatusFilter) {
    isTargeted = matchesRole && matchesStatus;
  }

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
  // Whole card does NOT blink or show amber rings per user request: "वो पूरा कार्ड ब्लिंक नहीं होना चाहिए केवल वही रोल हाईलाइट होना चाहिए जो अनअसाइन है"
  return '';
}

/**
 * ⚡ Custom Hook for Team Manager Project Filtering
 */
export function useTeamManagerFilter(
  projects: FWProject[],
  filters: UnifiedFilterState,
  searchQuery: string = '',
  selectedRoleFilter: string = 'All',
  teamMembers: FWTeamMember[] = []
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
          extractSubEventSlots(se, teamMembers).some(a => isRoleMatching(selectedRoleFilter, a.required_role))
        );
        if (!hasRole) return false;
      }

      // 3. Strict Interconnected Match
      return isProjectMatch(project, filters, teamMembers);
    });
  }, [projects, filters, searchQuery, selectedRoleFilter, teamMembers]);

  return {
    filteredProjects,
    isFilterActive,
    isProjectMatch: (p: FWProject) => isProjectMatch(p, filters, teamMembers),
    isSubEventMatch: (se: any, p: FWProject) => isSubEventMatch(se, p, filters, teamMembers),
    checkRoleSlotMatch: (slot: any) => checkRoleSlotMatch(slot, filters),
    getCardHighlightClass: (isMatched: boolean) => getCardHighlightClass(isFilterActive, isMatched),
  };
}

export default useTeamManagerFilter;
