import { supabase } from '@/lib/supabase';
import { getRoleShortCode } from '@/lib/workspace-settings';

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
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
          members = json.members.map((m: any) => ({
            id: m.id || m.user_id,
            name: m.name || m.full_name || 'Team Member',
            email: m.email || '',
            phone: m.phone || '',
            role: m.primary_role || m.role || 'Project Manager',
            avatar_url: m.avatar_url || '',
          }));
        }
      }
    } catch (_) {}

    // 2. Also merge from fw_team_members
    if (currentUid) {
      const { data: fwData } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('user_id', currentUid);

      if (fwData && fwData.length > 0) {
        for (const f of fwData) {
          const exists = members.some(
            c => c.name.toLowerCase() === f.name.toLowerCase() || (f.email && c.email?.toLowerCase() === f.email.toLowerCase())
          );
          if (!exists) {
            members.push({
              id: f.id,
              name: f.name,
              email: f.email || '',
              phone: f.phone_number ? `${f.country_code || '+91'} ${f.phone_number}` : '',
              role: f.primary_role || 'Crew',
              avatar_url: f.avatar_url || '',
            });
          }
        }
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
 * Resolves sub-event assignments with zero data-loss and full multiplier support.
 * - Retains ALL existing database assignments in subEvent.fw_assignments.
 * - Counts existing assignments per role.
 * - Counts requested roles in subEvent.roles (e.g. 2 Cinematographers).
 * - Appends placeholder unassigned slots only for the difference (requestedCount - existingCount).
 * - NEVER deduplicates identical roles with Set.
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

  // 1. Map existing DB assignments and attach their matched team member
  const resolvedAssignments: FWAssignment[] = existingAssignments.map((existing: any) => {
    const matched = existing.fw_team_members || (existing.assigned_member_id ? teamMembers.find(m => m.id === existing.assigned_member_id) : null);
    return {
      ...existing,
      fw_team_members: matched || existing.fw_team_members || null
    };
  });

  // Helper to normalize role key (matches short code and name)
  const getRoleKey = (roleStr?: string | null): string => {
    const clean = String(roleStr || '').trim().toLowerCase();
    if (!clean) return '';
    const code = getRoleShortCode(clean);
    return (code || clean).toLowerCase();
  };

  // 2. Count existing assignments per role (normalized key matching)
  const existingCountByRole: Record<string, number> = {};
  resolvedAssignments.forEach(a => {
    const rKey = getRoleKey(a.required_role);
    if (rKey) {
      existingCountByRole[rKey] = (existingCountByRole[rKey] || 0) + 1;
    }
  });

  // 3. Count requested roles in rawRoles
  const rawRoleCounts: Record<string, { roleName: string; count: number }> = {};
  rawRoles.forEach(r => {
    const trimmed = String(r || '').trim();
    if (!trimmed) return;
    const rKey = getRoleKey(trimmed);
    if (!rawRoleCounts[rKey]) {
      rawRoleCounts[rKey] = { roleName: trimmed, count: 0 };
    }
    rawRoleCounts[rKey].count += 1;
  });

  // 4. For any role where rawRoles requires MORE slots than exist in resolvedAssignments, add unassigned placeholder slots
  Object.keys(rawRoleCounts).forEach(rKey => {
    const { roleName, count: requestedCount } = rawRoleCounts[rKey];
    const existingCount = existingCountByRole[rKey] || 0;
    const needed = requestedCount - existingCount;
    for (let i = 0; i < needed; i++) {
      resolvedAssignments.push({
        id: `${subEvent.id}-role-${rKey}-${existingCount + i}`,
        sub_event_id: subEvent.id,
        project_id: subEvent.project_id,
        required_role: roleName,
        assigned_member_id: null,
        fw_team_members: null,
        status: 'pending'
      });
    }
  });

  return resolvedAssignments;
}
