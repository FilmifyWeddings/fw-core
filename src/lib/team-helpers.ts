import { supabase } from '@/lib/supabase';
import { getRoleShortCode, parseRoleAndNumber, formatRoleWithNumber, isRoleMatching } from '@/lib/workspace-settings';

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
    // If no assigned_member_id is present, the slot is strictly UNASSIGNED
    if (!existing.assigned_member_id) {
      return null;
    }

    const assignedStr = String(existing.assigned_member_id).trim().toLowerCase();
    if (!assignedStr || assignedStr === 'null' || assignedStr === 'undefined' || assignedStr === 'unassigned') {
      return null;
    }

    // Check if name is a placeholder
    const cleanName = String(existing.assigned_member_name || (existing.fw_team_members?.name) || '').trim().toLowerCase();
    if (
      cleanName === 'not fixed' ||
      cleanName.startsWith('not fixed') ||
      cleanName === 'tbd' ||
      cleanName === 'unassigned' ||
      cleanName === 'pending' ||
      cleanName === 'date not fixed'
    ) {
      return null;
    }

    let matched = existing.fw_team_members || null;
    if (!matched && existing.assigned_member_id) {
      matched = teamMembers.find(m => m.id === existing.assigned_member_id) || null;
    }
    if (!matched && existing.assigned_member_name) {
      matched = teamMembers.find(m => m.name.toLowerCase().trim() === cleanName) || null;
    }
    if (!matched && existing.assigned_member_id) {
      const fallbackName = existing.assigned_member_name || existing.member_name || '';
      if (fallbackName && !fallbackName.toLowerCase().includes('not fixed')) {
        matched = {
          id: existing.assigned_member_id,
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
  remainingExisting.forEach(extra => {
    resolvedAssignments.push({
      ...extra,
      fw_team_members: resolveMemberObj(extra)
    });
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

