import { supabase } from '@/lib/supabase';
import { getRoleShortCode, parseRoleAndNumber, formatRoleWithNumber } from '@/lib/workspace-settings';

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  primary_type?: string;
  member_types?: string[];
}

export async function fetchWorkspaceTeamMembers(workspaceId?: string): Promise<WorkspaceMemberOption[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;
    const effectiveWsId = workspaceId || currentUid;

    let members: WorkspaceMemberOption[] = [];

    // 1. Try workspace_members API
    try {
      if (effectiveWsId) {
        const res = await fetch(`/api/workspace/members?workspace_id=${encodeURIComponent(effectiveWsId)}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members) && json.members.length > 0) {
          members = json.members;
        }
      }
    } catch (_) {}

    // 2. Fallback to direct supabase query on fw_team_members
    if (members.length === 0 && effectiveWsId) {
      const { data: directMembers } = await supabase
        .from('fw_team_members')
        .select('*')
        .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`);
      if (directMembers && directMembers.length > 0) {
        members = directMembers;
      }
    }

    return members;
  } catch (err) {
    console.error('[fetchWorkspaceTeamMembers Error]:', err);
    return [];
  }
}

import type { FWAssignment, FWSubEvent, FWTeamMember } from '../types';

/**
 * Resolves sub-event assignments with zero data-loss, strict slot order stability,
 * sequential role numbering (TV, TV 2, TV 3), and robust member resolution.
 * - Adheres strictly to the order defined in subEvent.roles (e.g. ['CV', 'TC']).
 * - Slot positions NEVER shift, invert, or swap when assigning/unassigning crew.
 * - Retains ALL existing database assignments in subEvent.fw_assignments.
 * - Resolves assigned member avatars and names across both fw_team_members and workspace_members.
 */
export function resolveSubEventAssignments(
  subEvent: FWSubEvent,
  teamMembers: FWTeamMember[]
): FWAssignment[] {
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

  const existingAssignments: FWAssignment[] = (subEvent.fw_assignments || []) as FWAssignment[];

  // Helper to normalize base role key (e.g. 'Traditional Videographer' -> 'tv', 'CV 2' -> 'cv')
  const getBaseRoleKey = (roleStr?: string | null): string => {
    const { baseRole } = parseRoleAndNumber(roleStr);
    const clean = baseRole.trim().toLowerCase();
    if (!clean) return '';
    const code = getRoleShortCode(clean);
    return (code || clean).toLowerCase();
  };

  // Helper to resolve FWTeamMember object for an assignment
  const resolveMemberObj = (existing: any): FWTeamMember | null => {
    let matched = existing.fw_team_members || null;
    if (!matched && existing.assigned_member_id) {
      matched = teamMembers.find(m => m.id === existing.assigned_member_id) || null;
    }
    if (!matched && existing.assigned_member_name) {
      const cleanAssigned = String(existing.assigned_member_name).toLowerCase().trim();
      matched = teamMembers.find(m => m.name.toLowerCase().trim() === cleanAssigned) || null;
    }
    if (!matched && (existing.assigned_member_id || existing.assigned_member_name)) {
      const fallbackName = existing.assigned_member_name || existing.member_name || '';
      if (fallbackName) {
        matched = {
          id: existing.assigned_member_id || `fallback-${fallbackName}`,
          name: fallbackName,
          primary_role: existing.required_role || 'Crew',
          is_active: true
        } as FWTeamMember;
      }
    }
    return matched;
  };

  // If no rawRoles specified, fallback to ordered existing assignments
  if (!rawRoles || rawRoles.length === 0) {
    return existingAssignments.map(existing => ({
      ...existing,
      fw_team_members: resolveMemberObj(existing)
    }));
  }

  // Track remaining existing assignments to match against rawRoles
  const remainingExisting = [...existingAssignments];
  const resolvedAssignments: FWAssignment[] = [];

  // Track sequential numbering for duplicate base roles in rawRoles
  const roleCounters: Record<string, number> = {};

  rawRoles.forEach((roleItem) => {
    const trimmed = String(roleItem || '').trim();
    if (!trimmed) return;

    const { baseRole, number: explicitNum } = parseRoleAndNumber(trimmed);
    const baseKey = getBaseRoleKey(baseRole);

    let slotNum = 1;
    if (explicitNum > 1) {
      slotNum = explicitNum;
      roleCounters[baseKey] = Math.max(roleCounters[baseKey] || 0, explicitNum);
    } else {
      roleCounters[baseKey] = (roleCounters[baseKey] || 0) + 1;
      slotNum = roleCounters[baseKey];
    }

    const formattedRole = formatRoleWithNumber(baseRole, slotNum);

    // 1. Try exact role string match first
    let matchIdx = remainingExisting.findIndex(
      a => (a.required_role || '').trim().toLowerCase() === formattedRole.toLowerCase()
    );

    // 2. Try matching by base role key AND slot number
    if (matchIdx === -1) {
      matchIdx = remainingExisting.findIndex(a => {
        const parsed = parseRoleAndNumber(a.required_role);
        return getBaseRoleKey(parsed.baseRole) === baseKey && parsed.number === slotNum;
      });
    }

    // 3. Try matching by base role key
    if (matchIdx === -1) {
      matchIdx = remainingExisting.findIndex(a => {
        const parsed = parseRoleAndNumber(a.required_role);
        return getBaseRoleKey(parsed.baseRole) === baseKey;
      });
    }

    if (matchIdx >= 0) {
      const matched = remainingExisting.splice(matchIdx, 1)[0];
      resolvedAssignments.push({
        ...matched,
        required_role: formattedRole,
        fw_team_members: resolveMemberObj(matched)
      });
    } else {
      // Unassigned placeholder strictly placed at this exact slot position
      resolvedAssignments.push({
        id: `${subEvent.id}-role-${baseKey}-${slotNum}`,
        sub_event_id: subEvent.id,
        project_id: subEvent.project_id,
        required_role: formattedRole,
        assigned_member_id: null,
        fw_team_members: null,
        status: 'pending'
      });
    }
  });

  // Append any extra assignments from DB that were not part of rawRoles
  remainingExisting.forEach(extra => {
    resolvedAssignments.push({
      ...extra,
      fw_team_members: resolveMemberObj(extra)
    });
  });

  return resolvedAssignments;
}
