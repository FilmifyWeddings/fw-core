/**
 * Enterprise Name Disambiguation Engine
 * 
 * Prevents accidental card overwrites and collisions when multiple clients
 * or leads share the same name (e.g., "Omkar & Priya").
 * Automatically appends (2), (3), etc. to cleanly segregate records across modules.
 */

export function disambiguateNameAgainstList(
  requestedName: string,
  existingNames: string[]
): string {
  if (!requestedName || !requestedName.trim()) return requestedName;

  const rawTrimmed = requestedName.trim();
  // Strip trailing (N) if already present to find true base name
  const match = rawTrimmed.match(/^(.*?)\s*\((\d+)\)$/);
  const baseName = (match ? match[1] : rawTrimmed).trim();
  const lowerBase = baseName.toLowerCase();

  // Find all existing names that match `baseName` or `baseName (N)`
  const existingNumbers = new Set<number>();
  let hasExactBase = false;

  for (const rawEx of existingNames) {
    if (!rawEx) continue;
    const ex = String(rawEx).trim();
    const exMatch = ex.match(/^(.*?)\s*\((\d+)\)$/);
    const exBase = (exMatch ? exMatch[1] : ex).trim();

    if (exBase.toLowerCase() === lowerBase) {
      if (exMatch) {
        const num = parseInt(exMatch[2], 10);
        if (!isNaN(num) && num > 1) {
          existingNumbers.add(num);
        }
      } else {
        hasExactBase = true;
        existingNumbers.add(1);
      }
    }
  }

  // If no conflict exists at all, keep requested name as-is
  if (!hasExactBase && existingNumbers.size === 0) {
    return requestedName.trim();
  }

  // If conflict exists, find next available index starting from 2
  let nextIndex = 2;
  while (existingNumbers.has(nextIndex)) {
    nextIndex++;
  }

  return `${baseName} (${nextIndex})`;
}

/**
 * Ensures a client name is unique within a workspace in `workspace_clients`.
 */
export async function getDisambiguatedClientName(
  supabase: any,
  workspaceId: string,
  requestedName: string,
  excludeClientId?: string | null
): Promise<string> {
  if (!requestedName || !requestedName.trim() || !workspaceId) return requestedName;

  try {
    const rawTrimmed = requestedName.trim();
    const match = rawTrimmed.match(/^(.*?)\s*\((\d+)\)$/);
    const baseName = (match ? match[1] : rawTrimmed).trim();

    let query = supabase
      .from('workspace_clients')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', `${baseName}%`);

    if (excludeClientId) {
      query = query.neq('id', excludeClientId);
    }

    const { data } = await query;
    const existingNames = (data || []).map((c: any) => c.name);

    return disambiguateNameAgainstList(requestedName, existingNames);
  } catch (err) {
    console.warn('[getDisambiguatedClientName] Error querying existing clients, falling back to original name:', err);
    return requestedName;
  }
}

/**
 * Ensures a lead name is unique within a workspace in `leads`.
 */
export async function getDisambiguatedLeadName(
  supabase: any,
  workspaceId: string,
  requestedName: string,
  excludeLeadId?: string | null
): Promise<string> {
  if (!requestedName || !requestedName.trim() || !workspaceId) return requestedName;

  try {
    const rawTrimmed = requestedName.trim();
    const match = rawTrimmed.match(/^(.*?)\s*\((\d+)\)$/);
    const baseName = (match ? match[1] : rawTrimmed).trim();

    let query = supabase
      .from('leads')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', `${baseName}%`);

    if (excludeLeadId) {
      query = query.neq('id', excludeLeadId);
    }

    const { data } = await query;
    const existingNames = (data || []).map((l: any) => l.name);

    return disambiguateNameAgainstList(requestedName, existingNames);
  } catch (err) {
    console.warn('[getDisambiguatedLeadName] Error querying existing leads, falling back to original name:', err);
    return requestedName;
  }
}
