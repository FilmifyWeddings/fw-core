import { supabase } from '@/lib/supabase';
import { getRoleShortCode, parseRoleAndNumber, formatRoleWithNumber, isRoleMatching } from '@/lib/workspace-settings';

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  role?: string;
  primary_role?: string;
  roles?: string[];
  avatar_url?: string;
  primary_type?: string;
  member_types?: string[];
  is_active?: boolean;
  daily_rate?: number;
  default_daily_rate?: number;
}


/**
 * Normalizes member name by stripping studio parentheses, e.g.:
 * "Sushant (Filmify Weddings)" -> "sushant"
 * "Navnath Salekar" -> "navnath salekar"
 */
export function normalizeTeamMemberKey(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .replace(/\s*\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strict check if a member is the Studio Owner / Account Owner.
 * Works whether account was registered as a studio owner or freelancer.
 */
export function isOwnerMember(m: any): boolean {
  if (!m) return false;
  const roleStr = String(m.role || '').toLowerCase().trim();
  const primaryRoleStr = String(m.primary_role || '').toLowerCase().trim();
  const primaryTypeStr = String(m.primary_type || m.type || '').toLowerCase().trim();
  return (
    roleStr === 'owner' ||
    roleStr === 'studio owner' ||
    primaryRoleStr === 'owner' ||
    primaryRoleStr === 'studio owner' ||
    primaryTypeStr === 'owner' ||
    m.isOwner === true ||
    m.is_owner === true
  );
}

/**
 * Strict check if a team member is an In-House staff member.
 * Explicitly rejects Freelancers, External Vendors, and Partners.
 * Studio Owner is ALWAYS classified as In-House.
 */
export function isInHouseMember(m: any): boolean {
  if (!m) return false;
  const cleanName = String(m.name || '').trim().toLowerCase();
  if (!cleanName || ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed', 'none'].includes(cleanName) || cleanName.startsWith('not fixed')) {
    return false;
  }
  // Studio Owner is strictly prioritized as In-House
  if (isOwnerMember(m)) {
    return true;
  }
  const primaryType = String(m.primary_type || m.type || '').toUpperCase().trim();
  const typesArr = (Array.isArray(m.member_types) ? m.member_types : []).map((t: any) => String(t).toUpperCase().trim());
  
  if (primaryType === 'FREELANCER' || primaryType === 'PARTNER' || primaryType === 'VENDOR' || primaryType === 'EXT_VENDOR' || typesArr.includes('FREELANCER')) {
    return false;
  }
  if (
    primaryType === 'IN_HOUSE' || 
    primaryType === 'INHOUSE' || 
    primaryType === 'STAFF' || 
    primaryType === 'ADMIN' || 
    primaryType === 'OWNER'
  ) {
    return true;
  }
  if (typesArr.includes('IN_HOUSE') || typesArr.includes('INHOUSE') || typesArr.includes('STAFF')) {
    return true;
  }
  if (m.is_inhouse === true || m.is_in_house === true) {
    return true;
  }
  if (m.payout_frequency === 'monthly' && primaryType !== 'FREELANCER') {
    return true;
  }
  return false;
}

/**
 * Merges two member records for the same person into the most complete record.
 */
function mergeMemberRecords<T = any>(existing: any, incoming: any): T {
  const merged = { ...existing };
  if (!merged.avatar_url && incoming.avatar_url) merged.avatar_url = incoming.avatar_url;
  if (!merged.email && incoming.email) merged.email = incoming.email;
  if (!merged.phone && (incoming.phone || incoming.phone_number)) {
    merged.phone = incoming.phone || incoming.phone_number;
    merged.phone_number = incoming.phone || incoming.phone_number;
  }
  if (isOwnerMember(incoming) && !isOwnerMember(merged)) {
    merged.role = 'owner';
    merged.primary_role = 'Owner';
    merged.name = incoming.name || merged.name;
  }
  if (!merged.primary_role && (incoming.primary_role || incoming.role)) {
    merged.primary_role = isOwnerMember(incoming) ? 'Owner' : (incoming.primary_role || incoming.role);
    merged.role = isOwnerMember(incoming) ? 'owner' : (incoming.primary_role || incoming.role);
  }

  // Robust multi-role merging so Studio Owner designated roles are never lost
  const parseRoles = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(r => String(r).trim()).filter(Boolean);
    if (typeof val === 'string' && val.trim()) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(r => String(r).trim()).filter(Boolean);
      } catch (_) {}
      return val.split(',').map((r: string) => r.trim()).filter(Boolean);
    }
    return [];
  };

  const existingRoles = parseRoles(merged.roles);
  const incomingRoles = parseRoles(incoming.roles);
  const combinedRoles = Array.from(new Set([...existingRoles, ...incomingRoles]));
  if (combinedRoles.length > 0) {
    merged.roles = combinedRoles;
  }

  return merged as T;
}

/**
 * Returns clean, human-readable display string of ALL assigned roles designated by Studio Owner.
 * Studio Owner is strictly labeled "Owner".
 */
export function getMemberDisplayRole(m: any): string {
  if (!m) return '';
  if (isOwnerMember(m)) {
    return 'Owner';
  }

  let rolesList: string[] = [];
  if (Array.isArray(m.roles) && m.roles.length > 0) {
    rolesList = m.roles.map((r: any) => String(r).trim()).filter(Boolean);
  } else if (typeof m.roles === 'string' && m.roles.trim()) {
    try {
      const parsed = JSON.parse(m.roles);
      if (Array.isArray(parsed)) {
        rolesList = parsed.map((r: any) => String(r).trim()).filter(Boolean);
      } else {
        rolesList = [m.roles.trim()];
      }
    } catch (_) {
      rolesList = m.roles.split(',').map((r: string) => r.trim()).filter(Boolean);
    }
  }

  if (m.primary_role && typeof m.primary_role === 'string') {
    const pr = m.primary_role.trim();
    if (pr && pr.toLowerCase() !== 'member' && !rolesList.some(r => r.toLowerCase() === pr.toLowerCase())) {
      rolesList.unshift(pr);
    }
  }

  // Clean out any generic or legacy owner tags
  rolesList = rolesList.filter(r => {
    const low = r.toLowerCase();
    return low !== 'member' && low !== 'studio owner' && low !== 'owner';
  });

  if (rolesList.length > 0) {
    const unique = Array.from(new Set(rolesList));
    return unique.join(', ');
  }

  if (m.primary_role && m.primary_role.toLowerCase() !== 'member') {
    const prLow = m.primary_role.toLowerCase();
    if (prLow === 'studio owner' || prLow === 'owner') return 'Owner';
    return m.primary_role;
  }
  if (m.role && m.role.toLowerCase() !== 'member') {
    const rLow = m.role.toLowerCase();
    if (rLow === 'studio owner' || rLow === 'owner') return 'Owner';
    return m.role;
  }

  const primaryType = String(m.primary_type || m.type || '').toUpperCase();
  return primaryType === 'FREELANCER' ? 'Freelancer' : 'In-House Team';
}

/**
 * Deduplicates in-house team members strictly by normalized name & email.
 * If multiple records exist for the same person (e.g. Sushant & Sushant (Filmify Weddings)),
 * merges them into a single clean record with avatar, email, and role.
 */
export function getDedupedInHouseMembers<T = any>(members: T[]): T[] {
  const map = new Map<string, T>();
  (members || []).forEach((m: any) => {
    if (!isInHouseMember(m)) return;
    const norm = normalizeTeamMemberKey(m.name);
    const emailNorm = m.email ? String(m.email).trim().toLowerCase() : '';
    const lookupKey = norm || emailNorm;
    if (!lookupKey) return;

    if (!map.has(lookupKey)) {
      map.set(lookupKey, m);
    } else {
      const existing = map.get(lookupKey);
      map.set(lookupKey, mergeMemberRecords(existing, m));
    }
  });
  return Array.from(map.values()).sort((a: any, b: any) => {
    const aOwner = isOwnerMember(a);
    const bOwner = isOwnerMember(b);
    if (aOwner && !bOwner) return -1;
    if (!aOwner && bOwner) return 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

/**
 * Groups and deduplicates all workspace members into:
 * 1. inHouse (In-House Staff & Studio Owners) - Studio Owner ALWAYS at index 0 (top)
 * 2. freelancers (External Vendors, Freelancers, Contractors)
 * Both cleanly deduplicated with zero ghost records.
 */
export function getGroupedTeamMembers<T = any>(members: T[]): {
  inHouse: T[];
  freelancers: T[];
  allDeduped: T[];
} {
  const inHouseMap = new Map<string, T>();
  const freelancerMap = new Map<string, T>();

  (members || []).forEach((m: any) => {
    const rawName = String(m.name || '').trim();
    if (!rawName || ['not fixed', 'tbd', 'unassigned', 'pending', 'none'].includes(rawName.toLowerCase())) return;

    const norm = normalizeTeamMemberKey(rawName);
    const emailNorm = m.email ? String(m.email).trim().toLowerCase() : '';
    const lookupKey = norm || emailNorm;
    if (!lookupKey) return;

    if (isInHouseMember(m)) {
      if (!inHouseMap.has(lookupKey)) {
        inHouseMap.set(lookupKey, m);
      } else {
        inHouseMap.set(lookupKey, mergeMemberRecords(inHouseMap.get(lookupKey), m));
      }
    } else {
      if (!freelancerMap.has(lookupKey)) {
        freelancerMap.set(lookupKey, m);
      } else {
        freelancerMap.set(lookupKey, mergeMemberRecords(freelancerMap.get(lookupKey), m));
      }
    }
  });

  // If a member exists in both (e.g. owner listed as freelancer in old stub), prioritize inHouse
  for (const key of inHouseMap.keys()) {
    if (freelancerMap.has(key)) {
      freelancerMap.delete(key);
    }
  }

  const inHouse = Array.from(inHouseMap.values()).sort((a: any, b: any) => {
    const aOwner = isOwnerMember(a);
    const bOwner = isOwnerMember(b);
    if (aOwner && !bOwner) return -1;
    if (!aOwner && bOwner) return 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  const freelancers = Array.from(freelancerMap.values()).sort((a: any, b: any) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );

  return {
    inHouse,
    freelancers,
    allDeduped: [...inHouse, ...freelancers],
  };
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
        .eq('user_id', effectiveWsId);
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
    const cleanName = String(existing.assigned_member_name || existing.clean_name || existing.member_name || (existing.fw_team_members?.name) || '').trim().toLowerCase();
    const isPlaceholder = !cleanName || [
      'not fixed',
      'tbd',
      'unassigned',
      'pending',
      'date not fixed'
    ].includes(cleanName) || cleanName.startsWith('not fixed');

    const assignedStr = String(existing.assigned_member_id || '').trim().toLowerCase();
    const hasValidId = Boolean(assignedStr && assignedStr !== 'null' && assignedStr !== 'undefined' && assignedStr !== 'unassigned');

    if (!hasValidId && isPlaceholder) {
      return null;
    }

    // 1. First, check if there is an explicit fw_team_members object or matched team member by ID
    let matched = existing.fw_team_members || null;
    if (!matched && hasValidId) {
      matched = teamMembers.find(m => m.id === existing.assigned_member_id) || null;
    }

    // 2. If not matched by ID, check by Name (Bulletproof Fallback Shield)
    if (!matched && !isPlaceholder) {
      matched = teamMembers.find(m => m.name.toLowerCase().trim() === cleanName) || null;
    }

    // If genuinely assigned to an existing team member in teamMembers, return it!
    if (matched) {
      return matched;
    }

    // 3. Fallback pseudo-object if real person name or valid ID exists
    if (!isPlaceholder) {
      const fallbackName = existing.assigned_member_name || existing.member_name || (existing.fw_team_members as any)?.name || '';
      if (fallbackName && !['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(fallbackName.toLowerCase())) {
        matched = {
          id: existing.assigned_member_id || `temp_${fallbackName.replace(/\s+/g, '_')}`,
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

  // Deduplicate synonym aliases within rawRoles so that generic quotation synonyms (e.g. 'Cinematographer' vs 'Cinematic Videographer')
  // do not artificially increment roleCounters into duplicate numbered slots (CV 2, CV 3, etc.)
  const normalizedRawRoles: string[] = [];
  const seenBaseKeysInRoles = new Map<string, { preferredRole: string; maxSlot: number; rawCount: number; seenBaseNames: Set<string> }>();

  rawRoles.forEach((roleItem) => {
    const trimmed = String(roleItem || '').trim();
    if (!trimmed) return;
    const { baseRole, number: explicitNum } = parseRoleAndNumber(trimmed);
    const baseKey = getBaseRoleKey(baseRole);
    if (!baseKey) return;

    const ex = seenBaseKeysInRoles.get(baseKey);
    const slot = explicitNum > 1 ? explicitNum : 1;
    const baseLower = baseRole.toLowerCase();

    if (!ex) {
      seenBaseKeysInRoles.set(baseKey, {
        preferredRole: baseRole,
        maxSlot: slot,
        rawCount: 1,
        seenBaseNames: new Set([baseLower])
      });
      normalizedRawRoles.push(roleItem);
    } else {
      // Check if this is an alias for slot 1 (e.g. 'Cinematographer' when 'Cinematic Videographer' is already in the list)
      const isSynonymAlias = !ex.seenBaseNames.has(baseLower) && slot === 1 && ex.maxSlot >= 1;
      ex.seenBaseNames.add(baseLower);

      if (!isSynonymAlias) {
        ex.maxSlot = Math.max(ex.maxSlot, slot, ex.rawCount + 1);
        ex.rawCount += 1;
        normalizedRawRoles.push(roleItem);
      }
    }
  });

  normalizedRawRoles.forEach((roleItem) => {
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

    // 4. Try matching using canonical role matcher
    if (matchIdx === -1) {
      matchIdx = remainingExisting.findIndex(a => {
        return isRoleMatching(formattedRole, a.required_role);
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
  // ONLY append if genuinely assigned to a team member! Never append orphan unassigned phantom rows!
  remainingExisting.forEach(extra => {
    const memberObj = resolveMemberObj(extra);
    const hasAssignedMember = Boolean(
      memberObj || 
      (extra.assigned_member_id && extra.assigned_member_id !== 'null' && extra.assigned_member_id !== 'undefined') ||
      ((extra as any).assigned_member_name && !['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(String((extra as any).assigned_member_name).trim().toLowerCase()))
    );
    if (hasAssignedMember) {
      resolvedAssignments.push({
        ...extra,
        fw_team_members: memberObj
      });
    }
  });

  return resolvedAssignments;
}

const HINDI_NUMBER_WORDS: Record<string, number> = {
  'एक': 1, '1': 1, '01': 1,
  'दो': 2, '2': 2, '02': 2,
  'तीन': 3, '3': 3, '03': 3,
  'चार': 4, '4': 4, '04': 4,
  'पांच': 5, 'पाँच': 5, '5': 5, '05': 5,
  'छह': 6, 'छः': 6, 'छ': 6, '6': 6, '06': 6,
  'सात': 7, '7': 7, '07': 7,
  'आठ': 8, '8': 8, '08': 8,
  'नौ': 9, '9': 9, '09': 9,
  'दस': 10, '10': 10,
  'ग्यारह': 11, '11': 11,
  'बारह': 12, '12': 12,
  'तेरह': 13, '13': 13,
  'चौदह': 14, '14': 14,
  'पंद्रह': 15, 'पन्द्रह': 15, '15': 15,
  'सोलह': 16, 'सोलहा': 16, 'सोलवां': 16, 'सोलहवां': 16, '16': 16,
  'सत्रह': 17, '17': 17,
  'अठारह': 18, 'अट्ठारह': 18, '18': 18,
  'उन्नीस': 19, '19': 19,
  'बीस': 20, '20': 20,
  'इक्कीस': 21, '21': 21,
  'बाईस': 22, '22': 22,
  'तेईस': 23, '23': 23,
  'चौबीस': 24, '24': 24,
  'पच्चीस': 25, '25': 25,
  'छब्बीस': 26, '26': 26,
  'सत्ताईस': 27, '27': 27,
  'अट्ठाईस': 28, 'अट्ठाइस': 28, '28': 28,
  'उनतीस': 29, '29': 29,
  'तीस': 30, '30': 30,
  'इकतीस': 31, '31': 31,
};

const MONTH_MAP: Record<string, number> = {
  // English
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12,
  // Hindi
  'जनवरी': 1, 'जन': 1,
  'फ़रवरी': 2, 'फरवरी': 2, 'फेब': 2, 'फ़ेब': 2,
  'मार्च': 3, 'मार': 3,
  'अप्रैल': 4, 'अप्रेल': 4, 'अप्रै': 4,
  'मई': 5,
  'जून': 6,
  'जुलाई': 7,
  'अगस्त': 8, 'अग': 8,
  'सितंबर': 9, 'सितम्बर': 9, 'सित': 9,
  'अक्टूबर': 10, 'अक्टू': 10, 'अक्टुबर': 10,
  'नवंबर': 11, 'नवम्बर': 11, 'नव': 11,
  'दिसंबर': 12, 'दिसम्बर': 12, 'दिस': 12,
};

export interface ParsedDateQuery {
  isDateQuery: boolean;
  targetDay: number | null; // 1 to 31
  targetMonth: number | null; // 1 to 12
  targetYear: number | null; // e.g. 2026
}

/**
 * ⚡ Extracts precise day, month, and year from free-form natural date searches
 * Supporting formats: "16 nov", "सोलहा NOV", "15 नवंबर", "16 दिसंबर", "16/11", "16-11", "2026-11-16", etc.
 */
export function parseDateQuery(rawQuery: string): ParsedDateQuery {
  if (!rawQuery) {
    return { isDateQuery: false, targetDay: null, targetMonth: null, targetYear: null };
  }
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return { isDateQuery: false, targetDay: null, targetMonth: null, targetYear: null };
  }

  // 1. Check ISO / numeric date formats:
  // e.g. "2026-11-16", "16-11-2026", "16/11/2026", "16/11", "16-11", "16.11"
  const isoMatch = q.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (isoMatch) {
    return {
      isDateQuery: true,
      targetYear: parseInt(isoMatch[1], 10),
      targetMonth: parseInt(isoMatch[2], 10),
      targetDay: parseInt(isoMatch[3], 10),
    };
  }

  const dmyYearMatch = q.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyYearMatch) {
    return {
      isDateQuery: true,
      targetDay: parseInt(dmyYearMatch[1], 10),
      targetMonth: parseInt(dmyYearMatch[2], 10),
      targetYear: parseInt(dmyYearMatch[3], 10),
    };
  }

  const dmMatch = q.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (dmMatch) {
    const p1 = parseInt(dmMatch[1], 10);
    const p2 = parseInt(dmMatch[2], 10);
    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
      return {
        isDateQuery: true,
        targetDay: p1,
        targetMonth: p2,
        targetYear: null,
      };
    }
  }

  // 2. Token-based analysis for natural date combinations:
  // e.g. "16 nov", "16-nov", "सोलहा nov", "15 नवंबर", "16 दिसंबर", "16th nov", "16 november 2026"
  const normalized = q
    .replace(/[./-]/g, ' ')
    .replace(/(st|nd|rd|th|वां|वीं|वा)\b/gi, '')
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);

  let detectedMonth: number | null = null;
  let detectedDay: number | null = null;
  let detectedYear: number | null = null;

  for (const token of tokens) {
    // Check year (4 digits)
    if (/^\d{4}$/.test(token)) {
      const y = parseInt(token, 10);
      if (y >= 2020 && y <= 2040) {
        detectedYear = y;
        continue;
      }
    }

    // Check month word
    if (MONTH_MAP[token] !== undefined) {
      detectedMonth = MONTH_MAP[token];
      continue;
    }

    // Check Hindi number word or digit for day
    if (HINDI_NUMBER_WORDS[token] !== undefined) {
      detectedDay = HINDI_NUMBER_WORDS[token];
      continue;
    }

    // Check numeric day
    if (/^\d{1,2}$/.test(token)) {
      const d = parseInt(token, 10);
      if (d >= 1 && d <= 31) {
        detectedDay = d;
        continue;
      }
    }
  }

  // If a month was detected, this is strictly a date query!
  if (detectedMonth !== null) {
    return {
      isDateQuery: true,
      targetDay: detectedDay,
      targetMonth: detectedMonth,
      targetYear: detectedYear,
    };
  }

  return { isDateQuery: false, targetDay: null, targetMonth: null, targetYear: null };
}

/**
 * ⚡ Checks whether a search query represents a date search
 */
export function isDateSearchQuery(rawQuery: string): boolean {
  return parseDateQuery(rawQuery).isDateQuery;
}

/**
 * ⚡ Matches free-form natural date searches (e.g. "15 नवंबर", "15 अगस्त", "16 nov", "सोलहा NOV", "15/11", "15-11", "2026-11-15")
 * against an event date string (e.g. "2026-11-15").
 * Strict mode: If query specifies a specific day + month, ONLY sub-events on that exact day match!
 */
export function matchDateQuery(rawQuery: string, dateStr?: string | null): boolean {
  if (!rawQuery || !dateStr) return false;
  const parsed = parseDateQuery(rawQuery);
  if (!parsed.isDateQuery) {
    return dateStr.trim().toLowerCase().includes(rawQuery.trim().toLowerCase());
  }

  const rawClean = dateStr.trim();
  const dateMatch = rawClean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!dateMatch) return false;

  const evYear = parseInt(dateMatch[1], 10);
  const evMonth = parseInt(dateMatch[2], 10);
  const evDay = parseInt(dateMatch[3], 10);

  if (parsed.targetYear !== null && evYear !== parsed.targetYear) {
    return false;
  }
  if (parsed.targetMonth !== null && evMonth !== parsed.targetMonth) {
    return false;
  }
  if (parsed.targetDay !== null && evDay !== parsed.targetDay) {
    return false;
  }

  return true;
}

