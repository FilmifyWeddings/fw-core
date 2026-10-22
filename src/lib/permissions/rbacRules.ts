import { supabase } from '@/lib/supabase';

export type LeadsAccessLevel = 'NONE' | 'ASSIGNED_VIEW' | 'ASSIGNED_EDIT' | 'ALL_VIEW' | 'ALL_MANAGE';
export type TeamManagerAccessLevel = 'NONE' | 'ASSIGNED_OWN_ROLE' | 'ASSIGNED_FULL_CREW' | 'ASSIGNED_SUB_EVENT_CALL_TIME' | 'ASSIGNED_SUB_EVENT_CREW' | 'ALL_VIEW' | 'ALL_MANAGE';
export type QuotationsAccessLevel = 'NONE' | 'VIEW' | 'MANAGE';
export type PostProductionAccessLevel = 'NONE' | 'ASSIGNED_VIEW' | 'ASSIGNED_EDIT' | 'ASSIGNED_ONLY' | 'ALL_VIEW' | 'ALL_MANAGE' | 'FULL_ACCESS';
export type FinanceAccessLevel = 'NONE' | 'VIEW' | 'MANAGE';
export type ClientsAccessLevel = 'NONE' | 'ASSIGNED_VIEW' | 'ASSIGNED_EDIT' | 'ALL_VIEW' | 'ALL_MANAGE';

export const CLIENT_SUB_MODULES = [
  { key: 'overview', label: 'Overview & Profile' },
  { key: 'quotations', label: 'Quotation Versions' },
  { key: 'events', label: 'Event Booking' },
  { key: 'moodboard', label: 'Moodboard' },
  { key: 'tasks', label: 'Task Workflow' },
  { key: 'post_production', label: 'Post Production' },
  { key: 'finance', label: 'Finance & Invoices' },
] as const;

export type ClientSubModuleKey = typeof CLIENT_SUB_MODULES[number]['key'];

export const ALL_CLIENT_MODULE_KEYS: string[] = CLIENT_SUB_MODULES.map(m => m.key);

export interface StudioMemberPermissions {
  id?: string;
  owner_id: string;
  member_id: string;
  leads_access: LeadsAccessLevel | string;
  team_manager_access: TeamManagerAccessLevel | string;
  quotations_access: QuotationsAccessLevel | string;
  post_production_access: PostProductionAccessLevel | string;
  finance_access: FinanceAccessLevel | string;
  clients_access?: ClientsAccessLevel | string;
  client_modules_access?: string[] | null;
  partner_access_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_STUDIO_PERMISSIONS: Omit<StudioMemberPermissions, 'owner_id' | 'member_id'> = {
  leads_access: 'NONE',
  team_manager_access: 'NONE',
  quotations_access: 'NONE',
  post_production_access: 'NONE',
  finance_access: 'NONE',
  clients_access: 'NONE',
  client_modules_access: ALL_CLIENT_MODULE_KEYS,
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
      let clientsAccess = (data.clients_access || 'NONE') as ClientsAccessLevel;
      let clientModulesAccess = Array.isArray(data.client_modules_access) ? data.client_modules_access : null;

      if (data.partner_access_code) {
        try {
          const parsed = JSON.parse(data.partner_access_code);
          if (parsed.clients_access && (!clientsAccess || clientsAccess === 'NONE')) {
            clientsAccess = parsed.clients_access;
          }
          if (Array.isArray(parsed.client_modules_access) && (!clientModulesAccess || clientModulesAccess.length === 0)) {
            clientModulesAccess = parsed.client_modules_access;
          }
        } catch (_) {}
      }

      return {
        id: data.id,
        owner_id: data.owner_id,
        member_id: data.member_id,
        leads_access: (data.leads_access || 'NONE') as LeadsAccessLevel,
        team_manager_access: (data.team_manager_access || 'NONE') as TeamManagerAccessLevel,
        quotations_access: (data.quotations_access || 'NONE') as QuotationsAccessLevel,
        post_production_access: (data.post_production_access || 'NONE') as PostProductionAccessLevel,
        finance_access: (data.finance_access || 'NONE') as FinanceAccessLevel,
        clients_access: clientsAccess,
        client_modules_access: clientModulesAccess || ALL_CLIENT_MODULE_KEYS,
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

  const clientModules = permissions.client_modules_access && permissions.client_modules_access.length > 0
    ? permissions.client_modules_access
    : ALL_CLIENT_MODULE_KEYS;

  const extraMeta = {
    clients_access: permissions.clients_access || 'NONE',
    client_modules_access: clientModules,
  };

  const basePayload: any = {
    owner_id: ownerId,
    member_id: memberId,
    leads_access: permissions.leads_access || 'NONE',
    team_manager_access: permissions.team_manager_access || 'NONE',
    quotations_access: permissions.quotations_access || 'NONE',
    post_production_access: permissions.post_production_access || 'NONE',
    finance_access: permissions.finance_access || 'NONE',
    partner_access_code: JSON.stringify(extraMeta),
    updated_at: new Date().toISOString(),
  };

  // Try saving with direct columns first
  try {
    const fullPayload = {
      ...basePayload,
      clients_access: permissions.clients_access || 'NONE',
      client_modules_access: clientModules,
    };

    const { data, error } = await supabase
      .from('studio_member_permissions')
      .upsert(fullPayload, { onConflict: 'owner_id,member_id' })
      .select()
      .single();

    if (!error && data) {
      return { success: true, data };
    }
  } catch (_) {}

  // Fallback to basePayload with partner_access_code encoding
  try {
    const { data, error } = await supabase
      .from('studio_member_permissions')
      .upsert(basePayload, { onConflict: 'owner_id,member_id' })
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

export function canViewAllShootFilters(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return true;
  return access === 'ALL_MANAGE' || access === 'ALL_VIEW';
}

export function canAccessPostProduction(access?: string): boolean {
  return Boolean(access && access !== 'NONE');
}

export function isPostProductionReadOnly(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return false;
  return access === 'ALL_VIEW' || access === 'ASSIGNED_VIEW';
}

export function isAssignedPostProductionOnly(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return false;
  return access === 'ASSIGNED_VIEW' || access === 'ASSIGNED_EDIT' || access === 'ASSIGNED_ONLY';
}

export function canManageAllPostProduction(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return true;
  return access === 'ALL_MANAGE' || access === 'FULL_ACCESS';
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

// ── CLIENT DIRECTORY RBAC HELPERS ──

export function canAccessClients(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return true;
  return Boolean(access && access !== 'NONE');
}

export function isClientsReadOnly(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return false;
  return access === 'ASSIGNED_VIEW' || access === 'ALL_VIEW';
}

export function isAssignedClientsOnly(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return false;
  return access === 'ASSIGNED_VIEW' || access === 'ASSIGNED_EDIT';
}

export function canManageAllClients(access?: string, isOwner?: boolean): boolean {
  if (isOwner) return true;
  return access === 'ALL_MANAGE';
}

