import { supabase } from '@/lib/supabase';

export type LeadsAccessLevel = 'NONE' | 'ASSIGNED_VIEW' | 'ASSIGNED_EDIT' | 'ALL_VIEW' | 'ALL_MANAGE';
export type TeamManagerAccessLevel = 'NONE' | 'ASSIGNED_OWN_ROLE' | 'ASSIGNED_FULL_CREW' | 'ALL_VIEW' | 'ALL_MANAGE';
export type QuotationsAccessLevel = 'NONE' | 'VIEW' | 'MANAGE';
export type PostProductionAccessLevel = 'NONE' | 'ASSIGNED_VIEW' | 'ALL_VIEW' | 'ALL_MANAGE';
export type FinanceAccessLevel = 'NONE' | 'VIEW' | 'MANAGE';

export interface StudioMemberPermissions {
  id?: string;
  owner_id: string;
  member_id: string;
  leads_access: LeadsAccessLevel | string;
  team_manager_access: TeamManagerAccessLevel | string;
  quotations_access: QuotationsAccessLevel | string;
  post_production_access: PostProductionAccessLevel | string;
  finance_access: FinanceAccessLevel | string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_STUDIO_PERMISSIONS: Omit<StudioMemberPermissions, 'owner_id' | 'member_id'> = {
  leads_access: 'NONE',
  team_manager_access: 'NONE',
  quotations_access: 'NONE',
  post_production_access: 'NONE',
  finance_access: 'NONE',
};

/**
 * Fetch studio-isolated permissions for a specific team member under a specific studio owner
 */
export async function getMemberStudioPermissions(ownerId: string, memberId: string): Promise<StudioMemberPermissions> {
  if (!ownerId || !memberId) {
    return {
      owner_id: ownerId || '',
      member_id: memberId || '',
      ...DEFAULT_STUDIO_PERMISSIONS,
    };
  }

  try {
    const { data, error } = await supabase
      .from('studio_member_permissions')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) {
      console.warn('[rbacRules] getMemberStudioPermissions notice:', error.message);
    }

    if (data) {
      return {
        id: data.id,
        owner_id: data.owner_id,
        member_id: data.member_id,
        leads_access: (data.leads_access || 'NONE') as LeadsAccessLevel,
        team_manager_access: (data.team_manager_access || 'NONE') as TeamManagerAccessLevel,
        quotations_access: (data.quotations_access || 'NONE') as QuotationsAccessLevel,
        post_production_access: (data.post_production_access || 'NONE') as PostProductionAccessLevel,
        finance_access: (data.finance_access || 'NONE') as FinanceAccessLevel,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn('[rbacRules] Error fetching studio member permissions:', err);
  }

  return {
    owner_id: ownerId,
    member_id: memberId,
    ...DEFAULT_STUDIO_PERMISSIONS,
  };
}

/**
 * Persist studio-isolated permissions bound strictly to (owner_id, member_id)
 */
export async function saveMemberStudioPermissions(
  ownerId: string,
  memberId: string,
  permissions: Partial<Omit<StudioMemberPermissions, 'owner_id' | 'member_id'>>
): Promise<{ success: boolean; data?: StudioMemberPermissions; error?: string }> {
  if (!ownerId || !memberId) {
    return { success: false, error: 'Missing ownerId or memberId' };
  }

  const payload = {
    owner_id: ownerId,
    member_id: memberId,
    leads_access: permissions.leads_access || 'NONE',
    team_manager_access: permissions.team_manager_access || 'NONE',
    quotations_access: permissions.quotations_access || 'NONE',
    post_production_access: permissions.post_production_access || 'NONE',
    finance_access: permissions.finance_access || 'NONE',
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('studio_member_permissions')
      .upsert(payload, { onConflict: 'owner_id,member_id' })
      .select()
      .single();

    if (error) {
      console.error('[rbacRules] saveMemberStudioPermissions error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[rbacRules] Exception saving studio permissions:', err);
    return { success: false, error: err ? err.message : 'Failed to save permissions' };
  }
}

// ── PERMISSION EVALUATION HELPERS ──

export function canAccessLeads(access?: string): boolean {
  return Boolean(access && access !== 'NONE');
}

export function isLeadsReadOnly(access?: string): boolean {
  return access === 'ASSIGNED_VIEW' || access === 'ALL_VIEW';
}

export function isAssignedLeadsOnly(access?: string): boolean {
  return access === 'ASSIGNED_VIEW' || access === 'ASSIGNED_EDIT';
}

export function canManageAllLeads(access?: string): boolean {
  return access === 'ALL_MANAGE' || access === 'ALL_EDIT' || access === 'FULL_EDIT';
}

export function canAccessTeamManager(access?: string): boolean {
  return Boolean(access && access !== 'NONE');
}

export function isTeamManagerReadOnly(access?: string): boolean {
  return access !== 'ALL_MANAGE' && access !== 'MANAGE_ALL';
}

export function isAssignedShootsOnly(access?: string): boolean {
  return (
    access === 'ASSIGNED_OWN_ROLE' ||
    access === 'ASSIGNED_FULL_CREW' ||
    access === 'ASSIGNED_ONLY_VIEW' ||
    access === 'ASSIGNED_FULL_TEAM_VIEW'
  );
}

export function isSelfRoleOnly(access?: string): boolean {
  return access === 'ASSIGNED_OWN_ROLE' || access === 'ASSIGNED_ONLY_VIEW';
}

export function canManageAllShoots(access?: string): boolean {
  return access === 'ALL_MANAGE' || access === 'MANAGE_ALL';
}

/**
 * Dynamic Per-Event Crew Visibility Resolver
 * Evaluates visibility specifically for each event card based on the owning studio's permissions
 */
export function resolveEventCrewVisibility(
  event: any,
  currentMemberId: string | null,
  studioPermissionsMap: Map<string, any>,
  selectedStudioId?: string | null,
  isOwner?: boolean
): 'FULL_CREW' | 'OWN_ROLE_ONLY' | 'ALL_MANAGE' {
  if (isOwner) return 'ALL_MANAGE';

  // Identify the studio owner who owns this project/event
  const studioOwnerId = event?.project?.user_id || event?.user_id || event?.owner_id;
  if (!studioOwnerId) return 'OWN_ROLE_ONLY';

  const permission = studioPermissionsMap?.get ? studioPermissionsMap.get(studioOwnerId) : (studioPermissionsMap as any)?.[studioOwnerId];
  const accessLevel = permission?.team_manager_access || 'NONE';

  if (accessLevel === 'ALL_MANAGE' || accessLevel === 'MANAGE_ALL') return 'ALL_MANAGE';
  if (
    accessLevel === 'ASSIGNED_FULL_CREW' || 
    accessLevel === 'ALL_VIEW' || 
    accessLevel === 'ASSIGNED_FULL_TEAM_VIEW'
  ) {
    return 'FULL_CREW';
  }

  // Default to OWN_ROLE_ONLY for ASSIGNED_OWN_ROLE or restricted partner
  return 'OWN_ROLE_ONLY';
}

