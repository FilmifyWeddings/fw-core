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

export interface WorkspaceQuotationDeliverable {
  id: string;
  title: string;
  category?: string;
  is_default?: boolean;
  display_order?: number;
}

export interface WorkspaceQuotationSpecialAddon {
  id: string;
  title: string;
  category?: string;
  is_default?: boolean;
  display_order?: number;
}

export interface WorkspaceQuotationPaidAddon {
  id: string;
  title: string;
  price: number;
  category?: string;
  is_default?: boolean;
  display_order?: number;
}

export interface WorkspaceQuotationDefaultFunction {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  durationSlot?: string;
  location?: string;
  requirements: Array<{ name: string; qty: number }>;
  notes?: string;
  display_order?: number;
}

export interface WorkspaceQuotationPaymentStep {
  id: string;
  name: string;
  display_order?: number;
}

export interface WorkspaceQuotationSettings {
  deliverables: WorkspaceQuotationDeliverable[];
  specialAddons: WorkspaceQuotationSpecialAddon[];
  paidAddons: WorkspaceQuotationPaidAddon[];
  defaultFunctions: WorkspaceQuotationDefaultFunction[];
  requirements: string[];
  preWeddingDeliverables: string[];
  durationSlots: string[];
  paymentSteps: string[];
  pdfTheme?: string;
  quoteTerms?: string;
  contractClauses?: string;
  quoteExpiryDays?: number;
  currency?: string;
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
  { id: 'def_role_1', name: 'Team Manager', short_code: 'TM', category: 'Management', is_default: true, display_order: 1 },
  { id: 'def_role_2', name: 'Traditional Photographer', short_code: 'TP', category: 'Photography', is_default: true, display_order: 2 },
  { id: 'def_role_3', name: 'Traditional Videographer', short_code: 'TV', category: 'Cinematography', is_default: true, display_order: 3 },
  { id: 'def_role_4', name: 'Candid Photographer', short_code: 'CP', category: 'Photography', is_default: true, display_order: 4 },
  { id: 'def_role_5', name: 'Cinematographer', short_code: 'CV', category: 'Cinematography', is_default: true, display_order: 5 },
  { id: 'def_role_6', name: 'Assistant', short_code: 'AS', category: 'Assistance', is_default: true, display_order: 6 },
  { id: 'def_role_7', name: 'Drone Pilot', short_code: 'DP', category: 'Drone', is_default: true, display_order: 7 },
  { id: 'def_role_8', name: 'Family Photographer', short_code: 'FP', category: 'Photography', is_default: true, display_order: 8 },
  { id: 'def_role_9', name: 'Reels Creator', short_code: 'RC', category: 'Social Media', is_default: true, display_order: 9 },
];

export const DEFAULT_QUOTATION_DELIVERABLES: WorkspaceQuotationDeliverable[] = [
  { id: 'deliv_1', title: '1 Teaser Video (1-2 Min)', category: 'Video', is_default: true, display_order: 1 },
  { id: 'deliv_2', title: '1 Main Highlight Film (15-20 Min)', category: 'Video', is_default: true, display_order: 2 },
  { id: 'deliv_3', title: '3 Instagram Reels', category: 'Social Media', is_default: true, display_order: 3 },
  { id: 'deliv_4', title: 'All Raw Photos & Footage in Hard Drive', category: 'Data', is_default: true, display_order: 4 },
  { id: 'deliv_5', title: '75-80 Retouched High-Res Images', category: 'Photo', is_default: true, display_order: 5 },
  { id: 'deliv_6', title: 'Pre-Wedding Teaser Video', category: 'Video', is_default: true, display_order: 6 },
  { id: 'deliv_7', title: 'Traditional Long Video (2-3 Hours)', category: 'Video', is_default: true, display_order: 7 },
  { id: 'deliv_8', title: 'Custom Printed Coffee Table Album', category: 'Album', is_default: true, display_order: 8 },
  { id: 'deliv_9', title: 'Full Ultra HD Super-Fine Raw Photos', category: 'Photo', is_default: true, display_order: 9 },
  { id: 'deliv_10', title: 'Approx. 50 High Resolution Edited Images', category: 'Photo', is_default: true, display_order: 10 },
  { id: 'deliv_11', title: '3 Save The Dates Photos', category: 'Photo', is_default: true, display_order: 11 },
  { id: 'deliv_12', title: '1 Countdown Reel', category: 'Social Media', is_default: true, display_order: 12 },
];

export const DEFAULT_QUOTATION_SPECIAL_ADDONS: WorkspaceQuotationSpecialAddon[] = [
  { id: 'sp_1', title: 'Complimentary Pre-Wedding Session (1 Day)', category: 'Shoots', is_default: true, display_order: 1 },
  { id: 'sp_2', title: 'Free Luxury Album Upgrade (40 Pages)', category: 'Album', is_default: true, display_order: 2 },
  { id: 'sp_3', title: 'Drone Coverage Included for Wedding & Sangeet', category: 'Drone', is_default: true, display_order: 3 },
  { id: 'sp_4', title: 'Same Day Edit Reel for Instagram', category: 'Social Media', is_default: true, display_order: 4 },
  { id: 'sp_5', title: 'Free Raw Data Hard Drive (1TB)', category: 'Data', is_default: true, display_order: 5 },
  { id: 'sp_6', title: 'Complimentary LED Wall Feed Live Output', category: 'Live Output', is_default: true, display_order: 6 },
];

export const DEFAULT_QUOTATION_PAID_ADDONS: WorkspaceQuotationPaidAddon[] = [
  { id: 'paid_1', title: 'Additional Candid Photographer', price: 15000, category: 'Photography', is_default: true, display_order: 1 },
  { id: 'paid_2', title: 'Additional Cinematographer', price: 22000, category: 'Cinematography', is_default: true, display_order: 2 },
  { id: 'paid_3', title: 'FPV Drone Pilot (Per Event)', price: 18000, category: 'Drone', is_default: true, display_order: 3 },
  { id: 'paid_4', title: 'Live Streaming Setup (Per Event)', price: 25000, category: 'Live Tech', is_default: true, display_order: 4 },
  { id: 'paid_5', title: 'Extra Album Pages (Per 10 Pages)', price: 5000, category: 'Album', is_default: true, display_order: 5 },
  { id: 'paid_6', title: 'Express 7-Day Video Edit Delivery', price: 20000, category: 'Post-Production', is_default: true, display_order: 6 },
  { id: 'paid_7', title: 'Same-Day Edit Video Reel', price: 12000, category: 'Social Media', is_default: true, display_order: 7 },
  { id: 'paid_8', title: 'Crane / Jimmy Jib Setup', price: 35000, category: 'Equipment', is_default: true, display_order: 8 },
];

export const DEFAULT_QUOTATION_FUNCTIONS: WorkspaceQuotationDefaultFunction[] = [
  {
    id: 'qfunc_1',
    name: 'Haldi & Sangeet',
    startTime: '10:00 AM',
    endTime: '05:00 PM',
    durationSlot: '7 Hours',
    location: 'JW MARRIOTT, MUMBAI',
    requirements: [
      { name: 'Candid Photography', qty: 2 },
      { name: 'Cinematography', qty: 2 },
      { name: 'Drone', qty: 1 },
    ],
    notes: 'Includes traditional setup & evening sangeet performances coverage.',
    display_order: 1
  },
  {
    id: 'qfunc_2',
    name: 'Wedding',
    startTime: '04:00 PM',
    endTime: '11:00 PM',
    durationSlot: '7 Hours',
    location: 'PALACE GROUNDS, MUMBAI',
    requirements: [
      { name: 'Candid Photography', qty: 2 },
      { name: 'Cinematography', qty: 2 },
      { name: 'Drone', qty: 1 },
      { name: 'Traditional Video', qty: 1 },
    ],
    notes: 'Varmala & Pheras high speed cinema capture.',
    display_order: 2
  },
  {
    id: 'qfunc_3',
    name: 'Reception',
    startTime: '07:00 PM',
    endTime: '11:30 PM',
    durationSlot: '5 Hours',
    location: 'TAJ LANDS END, MUMBAI',
    requirements: [
      { name: 'Candid Photography', qty: 1 },
      { name: 'Cinematography', qty: 1 },
      { name: 'Traditional Video', qty: 1 },
    ],
    notes: 'Stage couple portraits & guest greeting coverage.',
    display_order: 3
  }
];

export const DEFAULT_PRE_WEDDING_REQUIREMENTS: string[] = [
  'Candid Photography',
  'Cinematography',
  'Drone',
  'Traditional Video',
  'Pre-Wedding Film',
  'Portable Changing Room',
];

export const DEFAULT_PRE_WEDDING_DELIVERABLES: string[] = [
  'Full Ultra HD Super-Fine Raw Photos',
  'Approx. 50 High Resolution Edited Images',
  '3 Save The Dates Photos',
  '1 Countdown Reel',
  '1 Video Reel',
  'Teaser Video (1-2 Min)',
  'Main Highlight Film (15-20 Min)',
];

export const DEFAULT_DURATION_SLOTS: string[] = [
  'None',
  '2 Hours',
  '3 Hours',
  '4 Hours',
  '5 Hours',
  '6 Hours',
  '7 Hours',
  '8 Hours',
  '10 Hours',
  '12 Hours',
  'Full Day',
];

export const DEFAULT_QUOTATION_PAYMENT_STEPS: string[] = [
  'Token Amount',
  'Advance Amount',
  'On Wedding Day',
  'After Event',
];

export const DEFAULT_WORKSPACE_QUOTATION_SETTINGS: WorkspaceQuotationSettings = {
  deliverables: DEFAULT_QUOTATION_DELIVERABLES,
  specialAddons: DEFAULT_QUOTATION_SPECIAL_ADDONS,
  paidAddons: DEFAULT_QUOTATION_PAID_ADDONS,
  defaultFunctions: DEFAULT_QUOTATION_FUNCTIONS,
  requirements: DEFAULT_PRE_WEDDING_REQUIREMENTS,
  preWeddingDeliverables: DEFAULT_PRE_WEDDING_DELIVERABLES,
  durationSlots: DEFAULT_DURATION_SLOTS,
  paymentSteps: DEFAULT_QUOTATION_PAYMENT_STEPS,
  pdfTheme: 'royal_gold',
  quoteTerms: 'Deliverables will be compiled and sent within 45 days of wedding event completion.',
  contractClauses: '1. Standard contract terms apply for all assignments.\\n2. Final deliverables delivered post clearance.\\n3. Studio retains copyright for portfolio presentation.',
  quoteExpiryDays: 14,
  currency: 'INR',
};

/**
 * Resolves short code for any given role name (custom or default).
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

  // 4. Generate initials from words
  const words = clean.split(/[\\s\\-_]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

/**
 * Resolves active authenticated workspace ID safely
 */
export const isUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

export async function resolveWorkspaceId(workspaceId?: string): Promise<string> {
  if (workspaceId && workspaceId.trim() && isUuid(workspaceId)) {
    return workspaceId.trim();
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id && isUuid(session.user.id)) return session.user.id;
  } catch (_) {}
  return '';
}

/**
 * Fetch workspace event types from Supabase.
 * If brand new workspace with 0 event types, seeds defaults into DB.
 * Never forces back deleted default events.
 */
export async function fetchWorkspaceEventTypes(workspaceId?: string): Promise<WorkspaceEventType[]> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (isUuid(wsId)) {
      // 1. Try RPC first if available
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_workspace_event_types', {
          target_ws_id: wsId,
          target_user_id: wsId
        });
        if (!rpcErr && rpcData && rpcData.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(rpcData));
          }
          return rpcData;
        } else if (rpcErr) {
          console.warn('[WorkspaceSettings] RPC get_workspace_event_types note:', rpcErr.message);
        }
      } catch (_) {}

      // 2. Direct Query from workspace_event_types table
      const { data, error } = await supabase
        .from('workspace_event_types')
        .select('*')
        .eq('workspace_id', wsId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('[WorkspaceSettings] Supabase error fetching workspace_event_types:', error.message);
      } else if (data) {
        if (data.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(data));
          }
          return data;
        } else {
          // Brand new workspace: Seed defaults into DB so they can be edited or deleted freely
          const defaultInserts = DEFAULT_EVENT_TYPES.map((def, idx) => ({
            workspace_id: wsId,
            name: def.name,
            category: def.category || 'Main Wedding',
            is_default: true,
            display_order: idx,
            updated_at: new Date().toISOString()
          }));
          try {
            const { data: seeded, error: seedErr } = await supabase
              .from('workspace_event_types')
              .insert(defaultInserts)
              .select('*');
            if (seedErr) {
              console.warn('[WorkspaceSettings] Seed defaults note:', seedErr.message);
            } else if (seeded && seeded.length > 0) {
              if (typeof window !== 'undefined') {
                localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(seeded));
              }
              return seeded;
            }
          } catch (_) {}
        }
      }
    }
  } catch (err: any) {
    console.error('[WorkspaceSettings] Exception fetching workspace_event_types:', err?.message || err);
  }

  // Fallback to localStorage if offline
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
 * Save new event type to workspace
 */
export async function saveWorkspaceEventType(
  workspaceId?: string,
  name?: string,
  category = 'General',
  displayOrder?: number
): Promise<WorkspaceEventType | null> {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;

  const wsId = await resolveWorkspaceId(workspaceId);
  const targetOrder = typeof displayOrder === 'number' ? displayOrder : 99;

  let savedItem: WorkspaceEventType = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspace_id: wsId || undefined,
    name: cleanName,
    category,
    is_default: false,
    display_order: targetOrder
  };

  try {
    const payload: any = {
      name: cleanName,
      category: category || 'General',
      is_default: false,
      display_order: targetOrder,
      updated_at: new Date().toISOString()
    };

    if (isUuid(wsId)) {
      payload.workspace_id = wsId;
    }

    const { data, error } = await supabase
      .from('workspace_event_types')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      savedItem = data;
    } else if (error) {
      console.warn('[WorkspaceSettings] Supabase insert note (fallback check):', error.message);
      if (isUuid(wsId)) {
        const { data: existing } = await supabase
          .from('workspace_event_types')
          .select('*')
          .eq('workspace_id', wsId)
          .eq('name', cleanName)
          .single();

        if (existing) savedItem = existing;
      }
    }
  } catch (err: any) {
    console.error('[WorkspaceSettings] Error saving workspace_event_type:', err?.message || err);
  }

  // Update local cache
  if (typeof window !== 'undefined' && wsId) {
    try {
      const local = localStorage.getItem(`wg_custom_event_types_${wsId}`);
      const list = local ? JSON.parse(local) : [];
      const filtered = Array.isArray(list) ? list.filter((e: any) => e.name?.toLowerCase() !== cleanName.toLowerCase()) : [];
      filtered.push(savedItem);
      localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(filtered));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
  }

  return savedItem;
}

/**
 * Update existing event type (works for both custom and default events)
 */
export async function updateWorkspaceEventType(
  idOrName: string,
  newName: string,
  category = 'General',
  workspaceId?: string,
  displayOrder?: number
): Promise<WorkspaceEventType | null> {
  const cleanNewName = newName.trim();
  if (!cleanNewName) return null;
  const wsId = await resolveWorkspaceId(workspaceId);

  let updatedItem: WorkspaceEventType = { 
    id: idOrName, 
    workspace_id: wsId, 
    name: cleanNewName, 
    category,
    display_order: displayOrder ?? 0 
  };

  try {
    if (wsId) {
      let query = supabase
        .from('workspace_event_types')
        .update({
          name: cleanNewName,
          category,
          ...(typeof displayOrder === 'number' ? { display_order: displayOrder } : {}),
          updated_at: new Date().toISOString()
        });

      if (idOrName.length > 20 && !idOrName.startsWith('def_') && !idOrName.startsWith('ev_')) {
        query = query.eq('id', idOrName);
      } else {
        query = query.eq('workspace_id', wsId).eq('name', idOrName);
      }

      const { data, error } = await query.select().single();
      if (!error && data) {
        updatedItem = data;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error updating workspace_event_type:', err);
  }

  if (typeof window !== 'undefined' && wsId) {
    try {
      const local = localStorage.getItem(`wg_custom_event_types_${wsId}`);
      if (local) {
        const list = JSON.parse(local);
        if (Array.isArray(list)) {
          const updatedList = list.map((e: any) => 
            (e.id === idOrName || e.name?.toLowerCase() === idOrName.toLowerCase())
              ? { ...e, name: cleanNewName, category }
              : e
          );
          localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(updatedList));
        }
      }
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
  }

  return updatedItem;
}

export async function deleteWorkspaceEventType(
  id: string,
  workspaceId?: string,
  name?: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId) {
      if (id && id.length > 20 && !id.startsWith('def_') && !id.startsWith('ev_')) {
        await supabase.from('workspace_event_types').delete().eq('id', id);
      } else if (name) {
        await supabase.from('workspace_event_types').delete().eq('workspace_id', wsId).eq('name', name);
      } else {
        await supabase.from('workspace_event_types').delete().or(`id.eq.${id},name.eq.${name || ''}`);
      }

      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem(`wg_custom_event_types_${wsId}`);
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((e: any) => e.id !== id && (!name || e.name?.toLowerCase() !== name.toLowerCase()));
              localStorage.setItem(`wg_custom_event_types_${wsId}`, JSON.stringify(filtered));
            }
          }
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
      }
    }
    return true;
  } catch (err) {
    console.warn('[WorkspaceSettings] Error deleting workspace_event_type:', err);
    return false;
  }
}

/**
 * Batch update and persist entire event list in exact order
 */
export async function saveAllWorkspaceEventTypes(
  workspaceId: string | undefined,
  events: string[]
): Promise<void> {
  const wsId = await resolveWorkspaceId(workspaceId);
  if (!wsId || !Array.isArray(events)) return;

  try {
    // 1. Delete events not in the new list
    const { data: existing } = await supabase
      .from('workspace_event_types')
      .select('id, name')
      .eq('workspace_id', wsId);

    const newNamesLower = new Set(events.map(e => e.trim().toLowerCase()));
    if (existing && existing.length > 0) {
      const toDeleteIds = existing
        .filter(ex => !newNamesLower.has(ex.name.trim().toLowerCase()))
        .map(ex => ex.id);

      if (toDeleteIds.length > 0) {
        await supabase.from('workspace_event_types').delete().in('id', toDeleteIds);
      }
    }

    // 2. Upsert each event with its current display_order
    const upserts = events.map((name, idx) => ({
      workspace_id: wsId,
      name: name.trim(),
      display_order: idx,
      category: 'General',
      updated_at: new Date().toISOString()
    }));

    await supabase
      .from('workspace_event_types')
      .upsert(upserts, { onConflict: 'workspace_id, name' });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace_event_types_updated'));
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error in saveAllWorkspaceEventTypes:', err);
  }
}

/**
 * Fetch workspace crew roles with short codes from Supabase master_crew_roles
 * Calls get_workspace_crew_roles RPC or direct master_crew_roles query
 */
export async function fetchWorkspaceCrewRoles(workspaceId?: string, userId?: string): Promise<WorkspaceCrewRole[]> {
  const wsId = await resolveWorkspaceId(workspaceId);
  try {
    if (wsId) {
      // 1. Primary: Call DB RPC Function to get or auto-seed defaults per-workspace
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_workspace_crew_roles', {
          target_ws_id: wsId,
          target_user_id: userId || wsId
        });

        if (!rpcErr && Array.isArray(rpcData)) {
          return rpcData.map((d: any, idx: number) => ({
            id: d.id,
            workspace_id: d.workspace_id,
            name: d.name,
            short_code: (d.short_code || getRoleShortCode(d.name)).toUpperCase(),
            category: d.category || 'Photography',
            is_default: !d.is_customized,
            display_order: d.display_order || idx + 1
          }));
        }
      } catch (_) {}

      // 2. Direct Query on master_crew_roles strictly by workspace_id
      const { data, error } = await supabase
        .from('master_crew_roles')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any, idx: number) => ({
          id: d.id,
          workspace_id: d.workspace_id,
          name: d.name,
          short_code: (d.short_code || getRoleShortCode(d.name)).toUpperCase(),
          category: d.category || 'Photography',
          is_default: !d.is_customized,
          display_order: d.display_order || idx + 1
        }));
      }

      // 3. If brand new workspace with 0 roles in DB, seed the 8 default roles directly
      const defaultSeed = [
        { name: 'Team Manager', short_code: 'TM', category: 'Management' },
        { name: 'Candid Photographer', short_code: 'CP', category: 'Photography' },
        { name: 'Cinematographer', short_code: 'CIN', category: 'Cinematography' },
        { name: 'Traditional Photographer', short_code: 'TP', category: 'Photography' },
        { name: 'Traditional Videographer', short_code: 'TV', category: 'Cinematography' },
        { name: 'Assistant', short_code: 'AST', category: 'Assistance' },
        { name: 'Drone Pilot', short_code: 'DR', category: 'Drone' },
        { name: 'Family Photographer', short_code: 'FP', category: 'Photography' },
      ];

      const seedPayload = defaultSeed.map((role) => ({
        workspace_id: wsId,
        created_by: userId || wsId,
        name: role.name,
        short_code: role.short_code,
        is_customized: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: seeded, error: seedErr } = await supabase
        .from('master_crew_roles')
        .insert(seedPayload)
        .select();

      if (!seedErr && seeded && seeded.length > 0) {
        return seeded.map((d: any, idx: number) => ({
          id: d.id,
          workspace_id: d.workspace_id,
          name: d.name,
          short_code: (d.short_code || getRoleShortCode(d.name)).toUpperCase(),
          category: d.category || 'Photography',
          is_default: !d.is_customized,
          display_order: idx + 1
        }));
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error fetching master_crew_roles:', err);
  }

  // If no DB result or while loading, return empty array (DO NOT override with static fallback)
  return [];
}

/**
 * Save new crew role strictly for current workspace
 */
export async function saveWorkspaceCrewRole(
  workspaceId?: string,
  name?: string,
  shortCode?: string,
  category = 'Photography',
  userId?: string
): Promise<WorkspaceCrewRole | null> {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;
  const cleanCode = (shortCode ? shortCode.trim() : getRoleShortCode(cleanName)).toUpperCase();
  const wsId = await resolveWorkspaceId(workspaceId);

  try {
    if (wsId) {
      const { data: masterData, error } = await supabase
        .from('master_crew_roles')
        .insert([{
          workspace_id: wsId,
          created_by: userId || wsId,
          name: cleanName,
          short_code: cleanCode,
          is_customized: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error && masterData) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
        }
        return {
          id: masterData.id,
          workspace_id: masterData.workspace_id,
          name: masterData.name,
          short_code: masterData.short_code,
          category,
          is_default: false
        };
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error saving master_crew_roles:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
  }
  return { id: `role_${Date.now()}`, workspace_id: wsId, name: cleanName, short_code: cleanCode, category, is_default: false };
}

/**
 * Update existing crew role strictly by ID
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
    const cleanPayload = {
      name: cleanName,
      short_code: cleanCode,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('master_crew_roles')
      .update(cleanPayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
      }
      return {
        id: data.id,
        workspace_id: data.workspace_id,
        name: data.name,
        short_code: data.short_code,
        category: data.category || category,
        is_default: data.is_default || false
      };
    }
    if (error) {
      console.error('[WorkspaceSettings] Error updating master_crew_roles in database:', error);
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error updating master_crew_roles:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
  }
  return { id, workspace_id: wsId, name: cleanName, short_code: cleanCode, category, is_default: false };
}

/**
 * Delete crew role strictly by ID
 */
export async function deleteWorkspaceCrewRole(
  id: string,
  workspaceId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('master_crew_roles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[WorkspaceSettings] Error deleting master_crew_roles:', error);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
    }
    return true;
  } catch (err) {
    console.warn('[WorkspaceSettings] Error deleting master_crew_roles:', err);
    return false;
  }
}

/**
 * 2-Way Sync helper to rename/update a crew role by previous name or ID from Quotation Builder
 */
export async function syncQuotationCrewRole(
  workspaceId?: string,
  oldName?: string,
  newName?: string,
  shortCode?: string,
  roleId?: string
): Promise<WorkspaceCrewRole | null> {
  const wsId = await resolveWorkspaceId(workspaceId);
  const cleanNew = (newName || '').trim();
  const cleanOld = (oldName || '').trim();
  if (!cleanNew) return null;
  const cleanCode = (shortCode ? shortCode.trim() : getRoleShortCode(cleanNew)).toUpperCase();

  try {
    if (wsId) {
      // 1. Try sync_workspace_crew_role RPC if available
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('sync_workspace_crew_role', {
          p_workspace_id: wsId,
          p_name: cleanNew,
          p_short_code: cleanCode,
          p_id: roleId || null
        });
        if (!rpcErr && rpcData) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
          }
          return rpcData;
        }
      } catch (_) {}

      // 2. Direct fallback update by ID or oldName
      if (roleId) {
        return await updateWorkspaceCrewRole(roleId, cleanNew, cleanCode, 'Photography', wsId);
      } else if (cleanOld) {
        const { data: existing } = await supabase
          .from('master_crew_roles')
          .select('id')
          .eq('workspace_id', wsId)
          .ilike('name', cleanOld)
          .maybeSingle();

        if (existing?.id) {
          return await updateWorkspaceCrewRole(existing.id, cleanNew, cleanCode, 'Photography', wsId);
        }
      }

      // 3. Otherwise save as new
      return await saveWorkspaceCrewRole(wsId, cleanNew, cleanCode);
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error in syncQuotationCrewRole:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_crew_roles_updated'));
  }
  return { id: `role_${Date.now()}`, workspace_id: wsId, name: cleanNew, short_code: cleanCode, category: 'Photography', is_default: false };
}

/**
 * Delete crew role by name or ID from Quotation Builder
 */
export async function deleteQuotationCrewRole(
  workspaceId?: string,
  roleName?: string,
  roleId?: string
): Promise<boolean> {
  const wsId = await resolveWorkspaceId(workspaceId);
  const clean = (roleName || '').trim();
  if (!wsId || (!clean && !roleId)) return false;

  try {
    if (roleId) {
      return await deleteWorkspaceCrewRole(roleId, wsId);
    } else if (clean) {
      const { data: existing } = await supabase
        .from('master_crew_roles')
        .select('id')
        .eq('workspace_id', wsId)
        .ilike('name', clean)
        .maybeSingle();

      if (existing?.id) {
        return await deleteWorkspaceCrewRole(existing.id, wsId);
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error in deleteQuotationCrewRole:', err);
  }
  return false;
}

// ==============================================================================
// QUOTATION SETTINGS (DELIVERABLES, SPECIAL ADDONS, PAID ADDONS, DEFAULT FUNCTIONS)
// ==============================================================================

/**
 * Fetch full workspace quotation settings from Supabase with localStorage & defaults fallback
 */
export async function fetchWorkspaceQuotationSettings(workspaceId?: string): Promise<WorkspaceQuotationSettings> {
  const wsId = await resolveWorkspaceId(workspaceId);
  let result: WorkspaceQuotationSettings = { ...DEFAULT_WORKSPACE_QUOTATION_SETTINGS };

  try {
    if (wsId) {
      const { data, error } = await supabase
        .from('workspace_quotation_settings')
        .select('settings')
        .eq('workspace_id', wsId)
        .maybeSingle();

      if (!error && data?.settings && typeof data.settings === 'object') {
        const s = data.settings;
        result = {
          deliverables: Array.isArray(s.deliverables) && s.deliverables.length > 0 ? s.deliverables : DEFAULT_QUOTATION_DELIVERABLES,
          specialAddons: Array.isArray(s.specialAddons) && s.specialAddons.length > 0 ? s.specialAddons : DEFAULT_QUOTATION_SPECIAL_ADDONS,
          paidAddons: Array.isArray(s.paidAddons) && s.paidAddons.length > 0 ? s.paidAddons : DEFAULT_QUOTATION_PAID_ADDONS,
          defaultFunctions: Array.isArray(s.defaultFunctions) && s.defaultFunctions.length > 0 ? s.defaultFunctions : DEFAULT_QUOTATION_FUNCTIONS,
          requirements: Array.isArray(s.requirements) && s.requirements.length > 0 ? s.requirements : DEFAULT_PRE_WEDDING_REQUIREMENTS,
          preWeddingDeliverables: Array.isArray(s.preWeddingDeliverables) && s.preWeddingDeliverables.length > 0 ? s.preWeddingDeliverables : DEFAULT_PRE_WEDDING_DELIVERABLES,
          durationSlots: Array.isArray(s.durationSlots) && s.durationSlots.length > 0 ? s.durationSlots : DEFAULT_DURATION_SLOTS,
          paymentSteps: Array.isArray(s.paymentSteps) && s.paymentSteps.length > 0 ? s.paymentSteps : DEFAULT_QUOTATION_PAYMENT_STEPS,
          pdfTheme: s.pdfTheme || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.pdfTheme,
          quoteTerms: s.quoteTerms || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.quoteTerms,
          contractClauses: s.contractClauses || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.contractClauses,
          quoteExpiryDays: s.quoteExpiryDays ?? DEFAULT_WORKSPACE_QUOTATION_SETTINGS.quoteExpiryDays,
          currency: s.currency || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.currency,
        };
        // Cache to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`wg_quote_settings_${wsId}`, JSON.stringify(result));
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error fetching workspace_quotation_settings:', err);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`wg_quote_settings_${wsId || 'default'}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_WORKSPACE_QUOTATION_SETTINGS,
            ...parsed
          };
        }
      }
    } catch (_) {}
  }

  return result;
}

/**
 * Save complete workspace quotation settings
 */
export async function saveAllWorkspaceQuotationSettings(
  workspaceId?: string,
  settings?: Partial<WorkspaceQuotationSettings>
): Promise<WorkspaceQuotationSettings> {
  const wsId = await resolveWorkspaceId(workspaceId);
  const existing = await fetchWorkspaceQuotationSettings(wsId);
  const updated: WorkspaceQuotationSettings = {
    ...existing,
    ...settings
  };

  // 1. Cache to localStorage immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`wg_quote_settings_${wsId || 'default'}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('workspace_quotation_settings_updated', { detail: updated }));
    } catch (_) {}
  }

  // 2. Persist to Supabase
  try {
    if (wsId) {
      await supabase
        .from('workspace_quotation_settings')
        .upsert([{
          workspace_id: wsId,
          settings: updated,
          updated_at: new Date().toISOString()
        }], { onConflict: 'workspace_id' });
    }
  } catch (err) {
    console.warn('[WorkspaceSettings] Error saving workspace_quotation_settings:', err);
  }

  return updated;
}

/**
 * Deliverables CRUD
 */
export async function saveWorkspaceQuotationDeliverable(
  workspaceId?: string,
  title?: string,
  category = 'General'
): Promise<WorkspaceQuotationDeliverable | null> {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const existingIdx = current.deliverables.findIndex(d => d.title.toLowerCase() === cleanTitle.toLowerCase());
  if (existingIdx !== -1) {
    return current.deliverables[existingIdx];
  }

  const newDeliverable: WorkspaceQuotationDeliverable = {
    id: `deliv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    category,
    is_default: false,
    display_order: current.deliverables.length + 1
  };

  const updatedDeliverables = [...current.deliverables, newDeliverable];
  await saveAllWorkspaceQuotationSettings(workspaceId, { deliverables: updatedDeliverables });
  return newDeliverable;
}

export async function updateWorkspaceQuotationDeliverable(
  id: string,
  title: string,
  category = 'General',
  workspaceId?: string
): Promise<WorkspaceQuotationDeliverable | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const updatedDeliverables = current.deliverables.map(d => 
    d.id === id || d.title.toLowerCase() === id.toLowerCase() ? { ...d, title: cleanTitle, category } : d
  );

  await saveAllWorkspaceQuotationSettings(workspaceId, { deliverables: updatedDeliverables });
  return { id, title: cleanTitle, category };
}

export async function deleteWorkspaceQuotationDeliverable(
  idOrTitle: string,
  workspaceId?: string
): Promise<boolean> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const updatedDeliverables = current.deliverables.filter(d => 
    d.id !== idOrTitle && d.title.toLowerCase() !== idOrTitle.toLowerCase()
  );
  await saveAllWorkspaceQuotationSettings(workspaceId, { deliverables: updatedDeliverables });
  return true;
}

/**
 * Special Value Additions (Complimentary Add-ons) CRUD
 */
export async function saveWorkspaceQuotationSpecialAddon(
  workspaceId?: string,
  title?: string,
  category = 'Complimentary'
): Promise<WorkspaceQuotationSpecialAddon | null> {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const existingIdx = current.specialAddons.findIndex(s => s.title.toLowerCase() === cleanTitle.toLowerCase());
  if (existingIdx !== -1) {
    return current.specialAddons[existingIdx];
  }

  const newAddon: WorkspaceQuotationSpecialAddon = {
    id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    category,
    is_default: false,
    display_order: current.specialAddons.length + 1
  };

  const updatedSpecial = [...current.specialAddons, newAddon];
  await saveAllWorkspaceQuotationSettings(workspaceId, { specialAddons: updatedSpecial });
  return newAddon;
}

export async function updateWorkspaceQuotationSpecialAddon(
  id: string,
  title: string,
  category = 'Complimentary',
  workspaceId?: string
): Promise<WorkspaceQuotationSpecialAddon | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const updatedSpecial = current.specialAddons.map(s => 
    s.id === id || s.title.toLowerCase() === id.toLowerCase() ? { ...s, title: cleanTitle, category } : s
  );

  await saveAllWorkspaceQuotationSettings(workspaceId, { specialAddons: updatedSpecial });
  return { id, title: cleanTitle, category };
}

export async function deleteWorkspaceQuotationSpecialAddon(
  idOrTitle: string,
  workspaceId?: string
): Promise<boolean> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const updatedSpecial = current.specialAddons.filter(s => 
    s.id !== idOrTitle && s.title.toLowerCase() !== idOrTitle.toLowerCase()
  );
  await saveAllWorkspaceQuotationSettings(workspaceId, { specialAddons: updatedSpecial });
  return true;
}

/**
 * Paid Add-Ons & Upgrades CRUD
 */
export async function saveWorkspaceQuotationPaidAddon(
  workspaceId?: string,
  title?: string,
  price = 10000,
  category = 'Extra Service'
): Promise<WorkspaceQuotationPaidAddon | null> {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const existingIdx = current.paidAddons.findIndex(p => p.title.toLowerCase() === cleanTitle.toLowerCase());
  if (existingIdx !== -1) {
    return current.paidAddons[existingIdx];
  }

  const newPaidAddon: WorkspaceQuotationPaidAddon = {
    id: `paid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    price: Number(price) || 0,
    category,
    is_default: false,
    display_order: current.paidAddons.length + 1
  };

  const updatedPaid = [...current.paidAddons, newPaidAddon];
  await saveAllWorkspaceQuotationSettings(workspaceId, { paidAddons: updatedPaid });
  return newPaidAddon;
}

export async function updateWorkspaceQuotationPaidAddon(
  id: string,
  title: string,
  price: number,
  category = 'Extra Service',
  workspaceId?: string
): Promise<WorkspaceQuotationPaidAddon | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const updatedPaid = current.paidAddons.map(p => 
    p.id === id || p.title.toLowerCase() === id.toLowerCase() ? { ...p, title: cleanTitle, price: Number(price) || 0, category } : p
  );

  await saveAllWorkspaceQuotationSettings(workspaceId, { paidAddons: updatedPaid });
  return { id, title: cleanTitle, price: Number(price) || 0, category };
}

export async function deleteWorkspaceQuotationPaidAddon(
  idOrTitle: string,
  workspaceId?: string
): Promise<boolean> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const updatedPaid = current.paidAddons.filter(p => 
    p.id !== idOrTitle && p.title.toLowerCase() !== idOrTitle.toLowerCase()
  );
  await saveAllWorkspaceQuotationSettings(workspaceId, { paidAddons: updatedPaid });
  return true;
}

/**
 * Default Functions CRUD (Functions template pre-loaded for new quotations)
 */
export async function saveWorkspaceQuotationDefaultFunction(
  workspaceId?: string,
  func?: Partial<WorkspaceQuotationDefaultFunction>
): Promise<WorkspaceQuotationDefaultFunction | null> {
  const cleanName = (func?.name || '').trim();
  if (!cleanName) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const newFunc: WorkspaceQuotationDefaultFunction = {
    id: func?.id || `qfunc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    startTime: func?.startTime || '10:00 AM',
    endTime: func?.endTime || '05:00 PM',
    durationSlot: func?.durationSlot || '7 Hours',
    location: func?.location || 'VENUE / HOTEL NAME',
    requirements: Array.isArray(func?.requirements) ? func!.requirements : [
      { name: 'Candid Photography', qty: 2 },
      { name: 'Cinematography', qty: 2 }
    ],
    notes: func?.notes || '',
    display_order: current.defaultFunctions.length + 1
  };

  const updatedFunctions = [...current.defaultFunctions, newFunc];
  await saveAllWorkspaceQuotationSettings(workspaceId, { defaultFunctions: updatedFunctions });
  return newFunc;
}

export async function updateWorkspaceQuotationDefaultFunction(
  id: string,
  updatedData: Partial<WorkspaceQuotationDefaultFunction>,
  workspaceId?: string
): Promise<WorkspaceQuotationDefaultFunction | null> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);

  const updatedFunctions = current.defaultFunctions.map(f => {
    if (f.id === id) {
      return {
        ...f,
        ...updatedData,
        name: (updatedData.name || f.name).trim(),
      };
    }
    return f;
  });

  await saveAllWorkspaceQuotationSettings(workspaceId, { defaultFunctions: updatedFunctions });
  const found = updatedFunctions.find(f => f.id === id);
  return found || null;
}

export async function deleteWorkspaceQuotationDefaultFunction(
  id: string,
  workspaceId?: string
): Promise<boolean> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const updatedFunctions = current.defaultFunctions.filter(f => f.id !== id);
  await saveAllWorkspaceQuotationSettings(workspaceId, { defaultFunctions: updatedFunctions });
  return true;
}

// ==============================================================================
// REORDERING & PAYMENT STEP NAMES CRUD
// ==============================================================================

/**
 * Reorder Deliverables in Workspace Settings
 */
export async function reorderWorkspaceQuotationDeliverables(
  reorderedList: WorkspaceQuotationDeliverable[],
  workspaceId?: string
): Promise<WorkspaceQuotationDeliverable[]> {
  const normalized = reorderedList.map((item, idx) => ({ ...item, display_order: idx + 1 }));
  await saveAllWorkspaceQuotationSettings(workspaceId, { deliverables: normalized });
  return normalized;
}

/**
 * Reorder Special Add-ons in Workspace Settings
 */
export async function reorderWorkspaceQuotationSpecialAddons(
  reorderedList: WorkspaceQuotationSpecialAddon[],
  workspaceId?: string
): Promise<WorkspaceQuotationSpecialAddon[]> {
  const normalized = reorderedList.map((item, idx) => ({ ...item, display_order: idx + 1 }));
  await saveAllWorkspaceQuotationSettings(workspaceId, { specialAddons: normalized });
  return normalized;
}

/**
 * Reorder Extra Paid Add-ons in Workspace Settings
 */
export async function reorderWorkspaceQuotationPaidAddons(
  reorderedList: WorkspaceQuotationPaidAddon[],
  workspaceId?: string
): Promise<WorkspaceQuotationPaidAddon[]> {
  const normalized = reorderedList.map((item, idx) => ({ ...item, display_order: idx + 1 }));
  await saveAllWorkspaceQuotationSettings(workspaceId, { paidAddons: normalized });
  return normalized;
}

/**
 * Save / Add Payment Step Name
 */
export async function saveWorkspacePaymentStepName(
  workspaceId?: string,
  stepName?: string
): Promise<string[] | null> {
  const cleanName = (stepName || '').trim();
  if (!cleanName) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const steps = Array.isArray(current.paymentSteps) ? current.paymentSteps : DEFAULT_QUOTATION_PAYMENT_STEPS;
  if (!steps.includes(cleanName)) {
    const updated = [...steps, cleanName];
    await saveAllWorkspaceQuotationSettings(workspaceId, { paymentSteps: updated });
    return updated;
  }
  return steps;
}

/**
 * Update Payment Step Name
 */
export async function updateWorkspacePaymentStepName(
  oldName: string,
  newName: string,
  workspaceId?: string
): Promise<string[] | null> {
  const cleanNew = newName.trim();
  if (!cleanNew) return null;
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const steps = Array.isArray(current.paymentSteps) ? current.paymentSteps : DEFAULT_QUOTATION_PAYMENT_STEPS;
  const updated = steps.map((s: string) => s === oldName ? cleanNew : s);
  await saveAllWorkspaceQuotationSettings(workspaceId, { paymentSteps: updated });
  return updated;
}

/**
 * Delete Payment Step Name
 */
export async function deleteWorkspacePaymentStepName(
  nameToDelete: string,
  workspaceId?: string
): Promise<string[]> {
  const current = await fetchWorkspaceQuotationSettings(workspaceId);
  const steps = Array.isArray(current.paymentSteps) ? current.paymentSteps : DEFAULT_QUOTATION_PAYMENT_STEPS;
  const updated = steps.filter((s: string) => s !== nameToDelete);
  await saveAllWorkspaceQuotationSettings(workspaceId, { paymentSteps: updated });
  return updated;
}

/**
 * Reorder Payment Step Names
 */
export async function reorderWorkspacePaymentStepNames(
  reorderedSteps: string[],
  workspaceId?: string
): Promise<string[]> {
  await saveAllWorkspaceQuotationSettings(workspaceId, { paymentSteps: reorderedSteps });
  return reorderedSteps;
}
