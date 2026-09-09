import { supabase } from '@/lib/supabase';

export interface LogActivityParams {
  projectId: string;
  subEventId?: string | null;
  actionType: string;
  eventTitle?: string | null;
  description?: string;
  targetMemberName?: string | null;
  targetRole?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  actorAvatar?: string | null;
}

export interface ProjectActivityLog {
  id: string;
  project_id: string;
  sub_event_id?: string | null;
  actor_id?: string | null;
  actor_name: string;
  actor_role?: string | null;
  actor_avatar?: string | null;
  action_type: string;
  event_title?: string | null;
  description: string;
  previous_value?: string | null;
  new_value?: string | null;
  target_member_name?: string | null;
  target_role?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Standardize activity messages into clean, readable English templates
 */
export function formatStandardDescription(params: LogActivityParams): string {
  const { actionType, eventTitle, previousValue, newValue, metadata, description, targetMemberName, targetRole } = params;
  const evTitle = eventTitle || metadata?.eventTitle || 'Event';
  const memberName = targetMemberName || newValue || metadata?.target_member || metadata?.memberName || 'Team Member';
  const role = targetRole || metadata?.target_role || metadata?.role || 'Crew';
  const prevMember = previousValue || metadata?.previousMemberName || 'Team Member';

  switch (actionType) {
    case 'CREW_ASSIGNED':
      return `Assigned ${memberName} as ${role} for ${evTitle}`;
    case 'CREW_REMOVED':
      return `Removed ${previousValue || memberName} from ${evTitle}`;
    case 'CREW_REPLACED':
      return `Replaced ${prevMember} with ${memberName} as ${role} for ${evTitle}`;
    case 'DATE_UPDATED':
      return `Changed date of ${evTitle} from ${previousValue || 'TBD'} to ${newValue || 'TBD'}`;
    case 'LOCATION_UPDATED':
      return `Updated location for ${evTitle} to "${newValue || 'TBD'}"`;
    case 'PM_CHANGED':
      return newValue && newValue !== 'Unassigned'
        ? `Assigned ${newValue} as Project Manager`
        : 'Cleared Project Manager assignment';
    case 'EVENT_ADDED':
      return `Created new sub-event "${evTitle}"`;
    case 'EVENT_DELETED':
      return `Deleted sub-event "${evTitle}"`;
    case 'PROJECT_CREATED':
      return description || `Created new project "${newValue || ''}"`;
    case 'PROJECT_UPDATED':
      return description || (previousValue ? `Updated project title from "${previousValue}" to "${newValue}"` : `Updated project details`);
    case 'COMMERCIALS_UPDATED':
      return description || `Updated remuneration commercials for ${memberName}`;
    case 'RATE_CHANGED':
      return description || `Updated agreed remuneration for ${memberName} (${role}) to ${newValue || ''}`;
    default:
      return description || `Recorded activity for ${evTitle}`;
  }
}

/**
 * ⚡ Central Audit Logging Service for Team Manager
 * Strictly resolves author identity from active authenticated session with lean storage footprint
 */
export async function logProjectActivity(params: LogActivityParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn('[projectAuditService] No active user session found for audit log');
      return;
    }

    const currentUserId = session.user.id;

    // 1. Fetch exact profile of who is ACTUALLY LOGGED IN right now
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, studio_name, role, avatar_url, workspace_name, platform_role')
      .eq('id', currentUserId)
      .maybeSingle();

    // 2. Check if logged-in user is the Workspace Owner or Team Member
    const { data: workspaceOwner } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('owner_id', currentUserId)
      .maybeSingle();

    const isStudioAdmin = Boolean(workspaceOwner) || 
      profile?.role === 'owner' || 
      profile?.role === 'admin' || 
      profile?.platform_role === 'tenant_owner' || 
      profile?.platform_role === 'owner' ||
      profile?.platform_role === 'superadmin';

    // Format human-friendly display name (strip email numbers/symbols if fallback, capitalize words)
    let displayName = profile?.full_name?.trim() || session.user.user_metadata?.full_name || session.user.user_metadata?.name || workspaceOwner?.name || profile?.workspace_name;
    if (!displayName && session.user.email) {
      const cleanEmail = session.user.email.split('@')[0].replace(/[0-9_.-]/g, ' ').trim();
      displayName = cleanEmail
        ? cleanEmail.split(' ').filter(Boolean).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
        : 'Studio Admin';
    }
    if (!displayName) displayName = isStudioAdmin ? 'Studio Admin' : 'Team Member';

    const actorRole = isStudioAdmin ? 'Studio Owner' : (profile?.role || 'Team Member');
    const actorAvatar = profile?.avatar_url || session.user.user_metadata?.avatar_url || null;

    const cleanDescription = params.description || formatStandardDescription(params);

    // 3. Insert single lightweight record into Supabase
    const payload = {
      project_id: params.projectId,
      sub_event_id: params.subEventId || null,
      actor_id: currentUserId,
      actor_name: displayName,
      actor_role: actorRole,
      actor_avatar: actorAvatar,
      action_type: params.actionType,
      event_title: params.eventTitle || null,
      description: cleanDescription,
      previous_value: params.previousValue || null,
      new_value: params.newValue || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('fw_project_activity_logs')
      .insert([payload]);

    if (error) {
      console.warn('[projectAuditService] fw_project_activity_logs insert note:', error.message);
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Fetch all activity logs for a project sorted newest first with lean limit
 */
export async function fetchProjectActivityLogs(projectId: string): Promise<ProjectActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('fw_project_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50); // Hard limit to keep payload and memory super light

    if (error) {
      console.warn('[projectAuditService] fetch error:', error.message);
      return [];
    }

    return (data || []) as ProjectActivityLog[];
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    return [];
  }
}

/**
 * ⚡ Unified Crew Assignment & Remuneration Audit Logger
 * Combines member assignment/replacement and agreed fee into a single atomic audit entry,
 * preventing duplicate cards in the activity history ledger.
 */
export async function logCrewAssignmentChange({
  projectId,
  subEventId,
  eventTitle,
  previousMemberName,
  newMemberName,
  roleName,
  previousRate,
  newRate,
  isRemoval = false,
}: {
  projectId: string;
  subEventId?: string | null;
  eventTitle: string;
  previousMemberName?: string | null;
  newMemberName?: string | null;
  roleName: string;
  previousRate?: number | string | null;
  newRate?: number | string | null;
  isRemoval?: boolean;
}): Promise<void> {
  let description = '';
  let prevVal: string | undefined = undefined;
  let newVal: string | undefined = undefined;

  const cleanPrevName = previousMemberName?.trim() || '';
  const cleanNewName = newMemberName?.trim() || '';

  const isReplacement = Boolean(
    cleanPrevName && 
    cleanNewName && 
    cleanPrevName.toLowerCase() !== cleanNewName.toLowerCase() && 
    cleanPrevName.toLowerCase() !== 'unassigned'
  );

  if (isRemoval) {
    description = `Removed ${cleanPrevName || 'crew'} from ${roleName} for ${eventTitle}`;
  } else if (isReplacement) {
    description = `Replaced ${cleanPrevName} with ${cleanNewName} as ${roleName} for ${eventTitle}`;
  } else {
    description = `Assigned ${cleanNewName} as ${roleName} for ${eventTitle}`;
  }

  // If remuneration was altered alongside assignment
  const hasValidPrevRate = previousRate !== undefined && previousRate !== null && previousRate !== '';
  const hasValidNewRate = newRate !== undefined && newRate !== null && newRate !== '';

  if (hasValidPrevRate && hasValidNewRate && Number(previousRate) !== Number(newRate)) {
    description += ` with agreed remuneration updated`;
    prevVal = `₹${Number(previousRate).toLocaleString('en-IN')}`;
    newVal = `₹${Number(newRate).toLocaleString('en-IN')}`;
  } else if (hasValidNewRate && (!cleanPrevName || cleanPrevName.toLowerCase() === 'unassigned') && Number(newRate) > 0) {
    newVal = `₹${Number(newRate).toLocaleString('en-IN')}`;
  } else if (hasValidPrevRate && hasValidNewRate) {
    prevVal = `₹${Number(previousRate).toLocaleString('en-IN')}`;
    newVal = `₹${Number(newRate).toLocaleString('en-IN')}`;
  }

  const actionType = isRemoval 
    ? 'CREW_REMOVED' 
    : (isReplacement ? 'CREW_REPLACED' : 'CREW_ASSIGNED');

  await logProjectActivity({
    projectId,
    subEventId: subEventId || undefined,
    actionType,
    eventTitle,
    description,
    previousValue: prevVal,
    newValue: newVal,
    targetMemberName: cleanNewName || cleanPrevName,
    targetRole: roleName,
    metadata: {
      previousMemberName: cleanPrevName,
      newMemberName: cleanNewName,
      roleName,
      previousRate: hasValidPrevRate ? Number(previousRate) : undefined,
      newRate: hasValidNewRate ? Number(newRate) : undefined,
      isReplacement,
    }
  });
}

