import { useMemo } from 'react';
import { FWProject, FWTeamMember } from '@/types';
import { UnifiedFilterState } from '../components/ShootFilterModal';
import { resolveSubEventAssignments, matchDateQuery } from '@/lib/team-helpers';
import { getRoleShortCode, parseRoleAndNumber, isRoleMatching } from '@/lib/workspace-settings';

export { isRoleMatching };

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

  const cleanName = String(
    slot.assigned_member_name ||
    slot.fw_team_members?.name ||
    slot.clean_name ||
    slot.member_name ||
    ''
  ).trim().toLowerCase();

  // If clean name is a placeholder (like "Not Fixed", "TBD", "Unassigned", etc.), it is ALWAYS UNASSIGNED
  if (
    cleanName === 'not fixed' ||
    cleanName.startsWith('not fixed') ||
    cleanName === 'tbd' ||
    cleanName === 'unassigned' ||
    cleanName === 'pending' ||
    cleanName === 'date not fixed' ||
    cleanName === 'none' ||
    cleanName === 'null'
  ) {
    return false;
  }

  const mId = slot.assigned_member_id || slot.team_member_id;
  const str = mId ? String(mId).trim().toLowerCase() : '';

  // If member ID is an explicit placeholder string
  if (str === 'null' || str === 'undefined' || str === 'unassigned' || str === 'none') {
    return false;
  }

  // If there is a valid member ID or a valid team member object
  if (str && str.length > 0) {
    return true;
  }
  if (slot.fw_team_members?.id) {
    return true;
  }

  // If assigned_member_name exists and is a valid person's name (not empty, not placeholder)
  if (cleanName && cleanName.length > 0) {
    return true;
  }

  return false;
}

/**
 * ⚡ Event Type Normalizer & Canonical Matcher
 * Handles all whitespace, hyphenation, and case variations:
 * e.g., "pre-wedding", "pre - wedding", "pre wedding", "Pre-Wedding Shoot"
 */
export function normalizeEventType(val: string): string {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isEventTypeMatch(candText: string, targetType: string): boolean {
  if (!candText || !targetType) return false;

  const cand = normalizeEventType(candText);
  const target = normalizeEventType(targetType);

  if (!cand || !target) return false;

  // Direct normalized substring match
  if (cand.includes(target)) return true;

  const candStripped = cand.replace(/[\s\-_]/g, '');
  const targetStripped = target.replace(/[\s\-_]/g, '');

  // Check Pre-Wedding variants
  const isPreWeddingTarget = target.includes('pre-wedding') || targetStripped.startsWith('prewedding');
  if (isPreWeddingTarget) {
    return candStripped.includes('prewedding') || cand.includes('pre-wedding') || cand.includes('pre wedding');
  }

  // Check Post-Wedding variants
  const isPostWeddingTarget = target.includes('post-wedding') || targetStripped.startsWith('postwedding');
  if (isPostWeddingTarget) {
    return candStripped.includes('postwedding') || cand.includes('post-wedding') || cand.includes('post wedding');
  }

  // Prevent generic "wedding" from accidentally matching "pre-wedding" or "post-wedding"
  const isWeddingTarget = target === 'wedding' || target === 'wedding ceremony';
  if (isWeddingTarget) {
    if (candStripped.includes('prewedding') || candStripped.includes('postwedding')) {
      return false;
    }
  }

  // General stripped substring match
  if (candStripped.includes(targetStripped)) return true;

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
export function isPmMatch(project: any, filters?: UnifiedFilterState | null, teamMembers: any[] = []): boolean {
  if (!filters || !project) return false;
  const activePmIds = (filters.pmIds && filters.pmIds.length > 0)
    ? filters.pmIds
    : (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []);
  if (activePmIds.length === 0) return false;

  const pmId = String(project.project_manager_id || project.project_manager?.id || '').toLowerCase().trim();
  let pmName = String(
    project.project_manager_name ||
    project.project_manager?.name ||
    (typeof project.project_manager === 'string' ? project.project_manager : '') ||
    project.lead_assigned_to ||
    ''
  ).toLowerCase().trim();

  // If pmName is empty but pmId exists, resolve name from teamMembers directory
  if (!pmName && pmId && teamMembers && teamMembers.length > 0) {
    const matchedMem = teamMembers.find(m => String(m.id).toLowerCase() === pmId);
    if (matchedMem?.name) {
      pmName = matchedMem.name.toLowerCase().trim();
    }
  }

  return activePmIds.some(target => {
    const t = target.toLowerCase().trim();
    if (!t) return false;
    return (Boolean(pmId) && pmId === t) ||
           (Boolean(pmName) && (pmName === t || pmName.includes(t) || t.includes(pmName)));
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
    if (!isPmMatch(project, filters, teamMembers)) return false;
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

  // 5. Event Types Multi-select (Canonical normalization: matches "pre - wedding", "pre-wedding", "pre wedding", etc.)
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    const candidateStrings = [
      subEvent.event_title,
      subEvent.name,
      subEvent.event_type,
      (subEvent as any).title,
      (subEvent as any).type,
      (subEvent as any).project_name,
      (subEvent as any).project?.project_name,
      (subEvent as any).project?.event_type
    ].filter(Boolean);

    const matchType = filters.eventTypes.some(targetFilter => {
      return candidateStrings.some(cand => isEventTypeMatch(cand, targetFilter));
    });

    if (!matchType) return false;
  }

  // 6. Extract Authoritative Slots
  const slots = extractSubEventSlots(subEvent, teamMembers);

  // 7. Strict Joint Crew Filtering: TEAM MEMBER + CREW ROLE + ASSIGNMENT STATUS
  // When filters like Member AND Role are combined, they MUST match at the SAME slot level!
  const activeMemberIds = (filters.memberIds && filters.memberIds.length > 0)
    ? filters.memberIds
    : (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []);
  const hasMemberFilter = activeMemberIds.length > 0;

  const hasRoleFilter = Boolean(filters.roles && filters.roles.length > 0);
  const activeStatuses = (filters.assignmentStatuses && filters.assignmentStatuses.length > 0)
    ? filters.assignmentStatuses
    : (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []);
  const hasStatusFilter = activeStatuses.length > 0;

  if (hasMemberFilter || hasRoleFilter || hasStatusFilter) {
    if (slots.length === 0) return false;

    // Check if at least ONE slot in THIS sub-event satisfies ALL active crew criteria jointly
    const matchFound = slots.some((slot: any) => {
      // (a) Team Member Check
      if (hasMemberFilter) {
        const mId = String(slot.assigned_member_id || slot.team_member_id || (slot.fw_team_members as any)?.id || '').toLowerCase();
        const mName = String((slot.fw_team_members as any)?.name || slot.clean_name || slot.member_name || slot.assigned_member_name || '').toLowerCase();
        const memberMatches = activeMemberIds.some(target => {
          const t = target.toLowerCase().trim();
          return (Boolean(mId) && mId === t) || (Boolean(mName) && (mName === t || mName.includes(t) || t.includes(mName)));
        });
        if (!memberMatches) return false;
      }

      // (b) Crew Role Check
      if (hasRoleFilter) {
        const slotRoleName = slot.required_role || slot.role_name || slot.role || '';
        const roleMatches = filters.roles.some((r: string) => isRoleMatching(r, slotRoleName));
        if (!roleMatches) return false;
      }

      // (c) Assignment Status Check
      if (hasStatusFilter) {
        const isAssigned = isSlotAssigned(slot);
        const wantsAssigned = activeStatuses.some(s => s.toLowerCase() === 'assigned' || s.toLowerCase() === 'fully_assigned');
        const wantsUnassigned = activeStatuses.some(s => s.toLowerCase() === 'unassigned');

        if (wantsAssigned && wantsUnassigned) {
          // both allowed
        } else if (wantsAssigned && !isAssigned) {
          return false;
        } else if (wantsUnassigned && isAssigned) {
          return false;
        }
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
    if (!isPmMatch(project, filters, teamMembers)) return false;
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
    const t = target.toLowerCase().trim();
    return (Boolean(mId) && mId === t) || (Boolean(mName) && (mName === t || mName.includes(t) || t.includes(mName)));
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

  // ⚡ Joint Targeting: If Member, Role, or Status are filtered, a slot is targeted
  // only if ALL active filters among them match at this exact slot!
  let isTargeted = false;
  const hasAnyCrewFilter = hasMemberFilter || hasRoleFilter || hasStatusFilter;
  if (hasAnyCrewFilter) {
    const memberOk = !hasMemberFilter || isMemberMatch;
    const roleOk = !hasRoleFilter || matchesRole;
    const statusOk = !hasStatusFilter || matchesStatus;
    isTargeted = memberOk && roleOk && statusOk;
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

      // 1. Quick search query (Client Name, Title, Venue, Sub-Event Title, or Natural Date: e.g. "15 नवंबर", "15 august", "15 nov")
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (project.client_name || '').toLowerCase().includes(q) || ((project as any).title || '').toLowerCase().includes(q);
        const matchVenue = (project.main_venue || '').toLowerCase().includes(q);
        const matchSub = project.fw_sub_events?.some(se => 
          (se.event_title || '').toLowerCase().includes(q) ||
          (se.venue_name || '').toLowerCase().includes(q) ||
          matchDateQuery(q, se.event_date)
        );
        if (!matchName && !matchVenue && !matchSub) return false;
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
