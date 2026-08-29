import { supabase } from '@/lib/supabase';

export interface WorkspaceEventType {
  id: string;
  workspace_id?: string;
  name: string;
  category?: string;
  is_default?: boolean;
  display_order?: number;
}

export interface WorkspaceCrewRole {
  id: string;
  workspace_id?: string;
  name: string;
  short_code: string;
  category?: string;
  is_default?: boolean;
  display_order?: number;
}

export const DEFAULT_EVENT_TYPES: WorkspaceEventType[] = [
  { id: 'def_ev_1', name: 'Wedding Ceremony', category: 'Main Wedding', is_default: true, display_order: 1 },
  { id: 'def_ev_2', name: 'Haldi', category: 'Pre-Wedding', is_default: true, display_order: 2 },
  { id: 'def_ev_3', name: 'Sangeet', category: 'Pre-Wedding', is_default: true, display_order: 3 },
  { id: 'def_ev_4', name: 'Mehendi', category: 'Pre-Wedding', is_default: true, display_order: 4 },
  { id: 'def_ev_5', name: 'Reception', category: 'Post-Wedding', is_default: true, display_order: 5 },
  { id: 'def_ev_6', name: 'Pre-Wedding Shoot', category: 'Shoots', is_default: true, display_order: 6 },
  { id: 'def_ev_7', name: 'Ring Ceremony / Engagement', category: 'Pre-Wedding', is_default: true, display_order: 7 },
  { id: 'def_ev_8', name: 'Cocktail Party', category: 'Pre-Wedding', is_default: true, display_order: 8 },
  { id: 'def_ev_9', name: 'Reception Dinner', category: 'Post-Wedding', is_default: true, display_order: 9 },
  { id: 'def_ev_10', name: 'Pool Party', category: 'Pre-Wedding', is_default: true, display_order: 10 },
  { id: 'def_ev_11', name: 'Varmala & Pheras', category: 'Main Wedding', is_default: true, display_order: 11 },
];

export const DEFAULT_CREW_ROLES: WorkspaceCrewRole[] = [
  { id: 'def_role_1', name: 'Traditional Photographer', short_code: 'TP', category: 'Photography', is_default: true, display_order: 1 },
  { id: 'def_role_2', name: 'Candid Photographer', short_code: 'CP', category: 'Photography', is_default: true, display_order: 2 },
  { id: 'def_role_3', name: 'Cinematographer', short_code: 'CV', category: 'Cinematography', is_default: true, display_order: 3 },
  { id: 'def_role_4', name: 'Drone Pilot', short_code: 'DP', category: 'Drone', is_default: true, display_order: 4 },
  { id: 'def_role_5', name: 'Traditional Videographer', short_code: 'TV', category: 'Cinematography', is_default: true, display_order: 5 },
  { id: 'def_role_6', name: 'Assistant / Helper', short_code: 'AS', category: 'Assistance', is_default: true, display_order: 6 },
  { id: 'def_role_7', name: 'Teaser Specialist', short_code: 'TS', category: 'Cinematography', is_default: true, display_order: 7 },
  { id: 'def_role_8', name: 'Photo Editor / Retoucher', short_code: 'PE', category: 'Post-Production', is_default: true, display_order: 8 },
  { id: 'def_role_9', name: 'Video Editor', short_code: 'VE', category: 'Post-Production', is_default: true, display_order: 9 },
  { id: 'def_role_10', name: 'Album Designer', short_code: 'AD', category: 'Post-Production', is_default: true, display_order: 10 },
  { id: 'def_role_11', name: 'Live Stream Operator', short_code: 'LS', category: 'Live Tech', is_default: true, display_order: 11 },
  { id: 'def_role_12', name: 'Social Media Reels Creator', short_code: 'RC', category: 'Social Media', is_default: true, display_order: 12 },
];

/**
 * Resolves short code for any given role name (custom or default).
 * E.g. "Traditional Photographer" -> "TP"
 * "Candid Photo" -> "CP"
 * "Drone" -> "DP"
 */
export function getRoleShortCode(roleName?: string | null, customRoles?: WorkspaceCrewRole[]): string {
  if (!roleName) return 'CRW';
  const clean = String(roleName).trim();

  // 1. Check in custom / loaded roles
  if (customRoles && customRoles.length > 0) {
    const found = customRoles.find(r => r.name.toLowerCase() === clean.toLowerCase() || r.short_code.toLowerCase() === clean.toLowerCase());
    if (found?.short_code) return found.short_code.toUpperCase();
  }

  // 2. Check in default roles
  const defaultFound = DEFAULT_CREW_ROLES.find(r => r.name.toLowerCase() === clean.toLowerCase() || r.short_code.toLowerCase() === clean.toLowerCase());
  if (defaultFound?.short_code) return defaultFound.short_code.toUpperCase();

  // 3. Fallback heuristic mappings
  const lower = clean.toLowerCase();
  if (lower.includes('trad') && lower.includes('photo')) return 'TP';
  if (lower.includes('trad') && (lower.includes('vid') || lower.includes('cine'))) return 'TV';
  if (lower.includes('candid') && lower.includes('photo')) return 'CP';
  if (lower.includes('candid') && (lower.includes('cine') || lower.includes('vid'))) return 'CV';
  if (lower.includes('cine') || lower.includes('video')) return 'CV';
  if (lower.includes('drone')) return 'DP';
  if (lower.includes('assist') || lower.includes('helper')) return 'AS';
  if (lower.includes('reel') || lower.includes('social')) return 'RC';
  if (lower.includes('live')) return 'LS';
  if (lower.includes('album')) return 'AD';
  if (lower.includes('edit') && lower.includes('photo')) return 'PE';
  if (lower.includes('edit') && lower.includes('vid')) return 'VE';

  // 4. Generate initials from words (e.g. "Candid Cinematography 2" -> "CC2")
  const words = clean.split(/[\s\-_]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

/**
 * Resolves active authenticated workspace ID safely
 */
export async function resolveWorkspaceId(workspaceId?: string): Promise<string> {
  if (workspaceId && workspaceId.trim() && workspaceId !== 'default' && workspaceId !== 'PUBLIC_USER') {
    return workspaceId.trim();
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch (_) {}
  return '';
}

/**
 * Fetch workspace event types from Supabase with fallback to DEFAULT_EVENT_TYPES
 */
export async function fetchWorkspaceEventTypes(workspaceId?: string): Promise<WorkspaceEventType[]> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId) {
      const { data, error } = await supabase
        .from('workspace_event_types')
        .select('*')
        .eq('workspace_id', wsId)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const customNames = new Set(data.map(d => d.name.toLowerCase()));
        const merged = [...data];
        DEFAULT_EVENT_TYPES.forEach(def => {
          if (!customNames.has(def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error fetching workspace_event_types:', err);
  }

  // Fallback to localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`wg_custom_event_types_${wsId || 'default'}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
  }

  return DEFAULT_EVENT_TYPES;
}

/**
 * Fetch workspace crew roles with short codes from Supabase with fallback to DEFAULT_CREW_ROLES
 */
export async function fetchWorkspaceCrewRoles(workspaceId?: string): Promise<WorkspaceCrewRole[]> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId) {
      const { data, error } = await supabase
        .from('workspace_crew_roles')
        .select('*')
        .eq('workspace_id', wsId)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const customNames = new Set(data.map(d => d.name.toLowerCase()));
        const merged = [...data];
        DEFAULT_CREW_ROLES.forEach(def => {
          if (!customNames.has(def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error fetching workspace_crew_roles:', err);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`wg_custom_crew_roles_${wsId || 'default'}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
  }

  return DEFAULT_CREW_ROLES;
}

/**
 * Save new event type to workspace
 */
export async function saveWorkspaceEventType(
  workspaceId?: string,
  name?: string,
  category = 'General'
): Promise<WorkspaceEventType | null> {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;

  const wsId = await resolveWorkspaceId(workspaceId);

  const newType: WorkspaceEventType = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspace_id: wsId || undefined,
    name: cleanName,
    category,
    is_default: false,
    display_order: 99
  };

  try {
    if (wsId) {
      const { data, error } = await supabase
        .from('workspace_event_types')
        .upsert([{
          workspace_id: wsId,
          name: cleanName,
          category,
          is_default: false,
          display_order: 99,
          updated_at: new Date().toISOString()
        }], { onConflict: 'workspace_id, name' })
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error saving workspace_event_type:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
  }
  return newType;
}

/**
 * Update existing event type
 */
export async function updateWorkspaceEventType(
  id: string,
  name: string,
  category = 'General',
  workspaceId?: string
): Promise<WorkspaceEventType | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;
  const wsId = await resolveWorkspaceId(workspaceId);

  try {
    if (wsId && !id.startsWith('def_')) {
      const { data, error } = await supabase
        .from('workspace_event_types')
        .update({
          name: cleanName,
          category,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error updating workspace_event_type:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
  }
  return { id, workspace_id: wsId, name: cleanName, category };
}

/**
 * Save new crew role with short code to workspace
 */
export async function saveWorkspaceCrewRole(
  workspaceId?: string,
  name?: string,
  shortCode?: string,
  category = 'Photography'
): Promise<WorkspaceCrewRole | null> {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;
  const cleanCode = (shortCode ? shortCode.trim() : getRoleShortCode(cleanName)).toUpperCase();

  const wsId = await resolveWorkspaceId(workspaceId);

  const newRole: WorkspaceCrewRole = {
    id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspace_id: wsId || undefined,
    name: cleanName,
    short_code: cleanCode,
    category,
    is_default: false,
    display_order: 99
  };

  try {
    if (wsId) {
      const { data, error } = await supabase
        .from('workspace_crew_roles')
        .upsert([{
          workspace_id: wsId,
          name: cleanName,
          short_code: cleanCode,
          category,
          is_default: false,
          display_order: 99,
          updated_at: new Date().toISOString()
        }], { onConflict: 'workspace_id, name' })
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error saving workspace_crew_role:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
  }
  return newRole;
}

/**
 * Update existing crew role
 */
export async function updateWorkspaceCrewRole(
  id: string,
  name: string,
  shortCode: string,
  category = 'Photography',
  workspaceId?: string
): Promise<WorkspaceCrewRole | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;
  const cleanCode = (shortCode ? shortCode.trim() : getRoleShortCode(cleanName)).toUpperCase();
  const wsId = await resolveWorkspaceId(workspaceId);

  try {
    if (wsId && !id.startsWith('def_')) {
      const { data, error } = await supabase
        .from('workspace_crew_roles')
        .update({
          name: cleanName,
          short_code: cleanCode,
          category,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error updating workspace_crew_role:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
  }
  return { id, workspace_id: wsId, name: cleanName, short_code: cleanCode, category };
}

/**
 * Delete event type from workspace
 */
export async function deleteWorkspaceEventType(
  id: string,
  workspaceId?: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId && !id.startsWith('def_')) {
      await supabase
        .from('workspace_event_types')
        .delete()
        .eq('id', id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
    }
    return true;
  } catch (err) {
    console.warn('[WorkspaceSettings] Error deleting workspace_event_type:', err);
    return false;
  }
}

/**
 * Delete crew role from workspace
 */
export async function deleteWorkspaceCrewRole(
  id: string,
  workspaceId?: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId && !id.startsWith('def_')) {
      await supabase
        .from('workspace_crew_roles')
        .delete()
        .eq('id', id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
    }
    return true;
  } catch (err) {
    console.warn('[WorkspaceSettings] Error deleting workspace_crew_role:', err);
    return false;
  }
}
