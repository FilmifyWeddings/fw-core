import { supabaseAdmin } from '@/lib/supabase';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskCategory = 'POST_PRODUCTION' | 'DELIVERABLE' | 'SHOOT_PREP' | 'PAYMENT' | 'GENERAL' | 'NOTE';
export type TaskColorTheme = 'amber' | 'rose' | 'emerald' | 'sky' | 'indigo' | 'neutral';

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
  due_date?: string | null;
  due_time?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  nested_items?: TaskChecklistItem[]; // Unlimited nested subtasks
}

export interface TaskComment {
  id: string;
  task_id?: string;
  user_id?: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  mentions?: string[];
  created_at: string;
}

export interface TaskActivityItem {
  id: string;
  task_id?: string;
  actor_id?: string;
  actor_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type?: 'image' | 'pdf' | 'video' | 'document' | 'drive' | 'url';
  size?: string | number;
  thumbnail?: string;
  created_at?: string;
}

export interface TaskFolder {
  id: string;
  workspace_id: string;
  client_id?: string | null;
  project_id?: string | null;
  created_by: string;
  title: string;
  color_theme: TaskColorTheme;
  icon: string;
  is_personal: boolean;
  is_pinned: boolean;
  pinned_by?: string[];
  allow_member_edits?: boolean;
  assigned_members: string[];
  is_trashed?: boolean;
  trashed_at?: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string | null;
  tasks_count?: number;
  completed_count?: number;
  creator?: {
    id?: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    role?: string;
  } | null;
}

export interface TaskActivityLogItem {
  id: string;
  workspace_id?: string | null;
  folder_id: string;
  task_id?: string | null;
  actor_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_avatar?: string | null;
  action_type: string;
  description: string;
  previous_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface TaskItem {
  id: string;
  folder_id?: string | null;
  workspace_id: string;
  client_id?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  title: string;
  description?: string | null;
  category: TaskCategory;
  sub_category?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  created_by: string;
  assigned_to?: string | null;
  assigned_members?: string[];
  assigned_member_details?: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    role?: string;
    isInHouse?: boolean;
  }>;
  is_personal: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_trashed?: boolean;
  trashed_at?: string | null;
  color?: string; // 'white' | 'cream' | 'beige' | 'soft-yellow' | 'soft-blue' | 'soft-green' | 'soft-pink' | 'soft-lavender'
  labels?: string[];
  checklist_items: TaskChecklistItem[];
  attachments: any[];
  comments?: TaskComment[];
  activity?: TaskActivityItem[];
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    phone?: string;
    event_type?: string;
  } | null;
  folder?: {
    id: string;
    title: string;
    color_theme: string;
  } | null;
  creator?: {
    id: string;
    email?: string;
    name?: string;
  } | null;
  assignee?: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export interface TaskFilterOptions {
  folderId?: string | 'all' | 'today_overdue' | 'assigned_me' | 'personal' | 'post_production' | 'notes' | 'starred' | 'completed' | 'trash';
  clientId?: string;
  projectId?: string;
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  label?: string;
  showCompleted?: boolean;
  startDate?: string;
  endDate?: string;
  statusList?: string[];
  teamMemberIds?: string[];
}

export interface TaskSummaryMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  todayDue: number;
  upcoming: number;
  personal: number;
}

// ── Pastel Colors for Notes & Cards ─────────────────────────
export const PASTEL_NOTE_COLORS = [
  { id: 'white', name: 'White', bg: 'bg-white dark:bg-[#1E1B18]', border: 'border-slate-200 dark:border-stone-800', hex: '#FFFFFF' },
  { id: 'cream', name: 'Cream', bg: 'bg-[#FDFBF7] dark:bg-[#25221E]', border: 'border-[#F2ECE1] dark:border-stone-700', hex: '#FDFBF7' },
  { id: 'beige', name: 'Beige', bg: 'bg-[#F7F3EB] dark:bg-[#23201C]', border: 'border-[#EAE3D5] dark:border-stone-700', hex: '#F7F3EB' },
  { id: 'soft-yellow', name: 'Soft Yellow', bg: 'bg-[#FEF9C3] dark:bg-[#2E2813]', border: 'border-[#FDE047] dark:border-[#544615]', hex: '#FEF9C3' },
  { id: 'soft-blue', name: 'Soft Blue', bg: 'bg-[#E0F2FE] dark:bg-[#122838]', border: 'border-[#BAE6FD] dark:border-[#1E435E]', hex: '#E0F2FE' },
  { id: 'soft-green', name: 'Soft Green', bg: 'bg-[#DCFCE7] dark:bg-[#132E1D]', border: 'border-[#BBF7D0] dark:border-[#1F5430]', hex: '#DCFCE7' },
  { id: 'soft-pink', name: 'Soft Pink', bg: 'bg-[#FCE7F3] dark:bg-[#331828]', border: 'border-[#FBCFE8] dark:border-[#5E2648]', hex: '#FCE7F3' },
  { id: 'soft-lavender', name: 'Soft Lavender', bg: 'bg-[#EDE9FE] dark:bg-[#221A3B]', border: 'border-[#DDD6FE] dark:border-[#3D2C6B]', hex: '#EDE9FE' },
];

export const PRESET_LABELS = [
  'Filmify Weddings',
  'Post Production',
  'Album',
  'Client Follow-up',
  'Shoot Prep',
  'Deliverables',
  'Personal',
  'Payment',
];

// Helper: Extract comments from task.attachments or dedicated field
export function extractTaskComments(task: TaskItem): TaskComment[] {
  if (Array.isArray(task.comments)) return task.comments;
  if (Array.isArray(task.attachments)) {
    return task.attachments
      .filter((a: any) => a?.__type === 'comment')
      .map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        user_name: c.user_name || 'Team Member',
        user_avatar: c.user_avatar,
        content: c.content || c.text || '',
        mentions: c.mentions || [],
        created_at: c.created_at || new Date().toISOString(),
      }));
  }
  return [];
}

// Helper: Extract activity from task.attachments or dedicated field
export function extractTaskActivity(task: TaskItem): TaskActivityItem[] {
  if (Array.isArray(task.activity)) return task.activity;
  if (Array.isArray(task.attachments)) {
    return task.attachments
      .filter((a: any) => a?.__type === 'activity')
      .map((act: any) => ({
        id: act.id,
        actor_id: act.actor_id,
        actor_name: act.actor_name || 'System',
        action_type: act.action_type || 'UPDATED',
        description: act.description || '',
        created_at: act.created_at || new Date().toISOString(),
      }));
  }
  return [];
}

// Helper: Extract true attachments (files, images, drive links)
export function extractTaskAttachments(task: TaskItem): TaskAttachment[] {
  if (!Array.isArray(task.attachments)) return [];
  return task.attachments.filter((a: any) => !a?.__type || a.__type === 'attachment');
}

/**
 * Fetch all tasks and folders for a workspace, respecting privacy isolation and assignments.
 */
export async function getWorkspaceTasksAndFolders(
  workspaceId: string,
  currentUserId: string,
  filters?: TaskFilterOptions,
  userEmail?: string
): Promise<{
  folders: TaskFolder[];
  tasks: TaskItem[];
  metrics: TaskSummaryMetrics;
}> {
  try {
    // Check if the current user is the REAL owner of the workspace (from public.workspaces)
    let isRealWorkspaceOwner = false;
    try {
      const { data: wsRow } = await supabaseAdmin
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (wsRow?.owner_id && currentUserId && wsRow.owner_id === currentUserId) {
        isRealWorkspaceOwner = true;
      }
    } catch (e) {
      console.warn('[taskService] Error verifying real workspace owner:', e);
    }

    // Collect all candidate IDs and email aliases representing the current user
    const candidateUserIds = new Set<string>();
    const accessibleWorkspaceIds = new Set<string>();
    if (workspaceId) accessibleWorkspaceIds.add(workspaceId);

    if (currentUserId) candidateUserIds.add(currentUserId);
    if (userEmail) candidateUserIds.add(userEmail.toLowerCase().trim());

    // Resolve any team memberships for this user across workspaces
    try {
      const orConditions: string[] = [];
      if (currentUserId) {
        orConditions.push(`auth_user_id.eq.${currentUserId}`);
        orConditions.push(`user_id.eq.${currentUserId}`);
        orConditions.push(`id.eq.${currentUserId}`);
      }
      if (userEmail) {
        orConditions.push(`email.ilike.${userEmail.trim()}`);
      }

      if (orConditions.length > 0) {
        const [wmRes, ftmRes] = await Promise.allSettled([
          supabaseAdmin
            .from('workspace_members')
            .select('id, auth_user_id, email, workspace_id')
            .or(orConditions.join(',')),
          supabaseAdmin
            .from('fw_team_members')
            .select('id, user_id, auth_user_id, email, workspace_id')
            .or(orConditions.join(',')),
        ]);

        if (wmRes.status === 'fulfilled' && wmRes.value.data) {
          wmRes.value.data.forEach((m: any) => {
            if (m.id) candidateUserIds.add(String(m.id));
            if (m.auth_user_id) candidateUserIds.add(String(m.auth_user_id));
            if (m.email) candidateUserIds.add(String(m.email).toLowerCase().trim());
            if (m.workspace_id) accessibleWorkspaceIds.add(String(m.workspace_id));
          });
        }

        if (ftmRes.status === 'fulfilled' && ftmRes.value.data) {
          ftmRes.value.data.forEach((m: any) => {
            if (m.id) candidateUserIds.add(String(m.id));
            if (m.user_id) candidateUserIds.add(String(m.user_id));
            if (m.auth_user_id) candidateUserIds.add(String(m.auth_user_id));
            if (m.email) candidateUserIds.add(String(m.email).toLowerCase().trim());
            if (m.workspace_id) accessibleWorkspaceIds.add(String(m.workspace_id));
          });
        }
      }
    } catch (e) {
      console.warn('[taskService] Failed to resolve candidate member IDs:', e);
    }

    const hasUserAccess = (assignedMembers?: any[], assignedTo?: string | null) => {
      if (assignedTo && (candidateUserIds.has(assignedTo) || assignedTo === currentUserId)) return true;
      if (Array.isArray(assignedMembers)) {
        return assignedMembers.some((m) => {
          if (!m) return false;
          const str = String(m).toLowerCase().trim();
          return candidateUserIds.has(m) || candidateUserIds.has(str);
        });
      }
      return false;
    };

    const candidateArray = Array.from(candidateUserIds);
    const workspaceIdArray = Array.from(accessibleWorkspaceIds);

    // 1. Fetch Folders across accessible workspaces and assigned folders
    const folderQueries: Promise<any>[] = [
      Promise.resolve(
        supabaseAdmin
          .from('fw_task_folders')
          .select('*')
          .in('workspace_id', workspaceIdArray)
      )
    ];

    if (candidateArray.length > 0) {
      folderQueries.push(
        Promise.resolve(
          supabaseAdmin
            .from('fw_task_folders')
            .select('*')
            .overlaps('assigned_members', candidateArray)
        )
      );
    }

    const folderResults = await Promise.allSettled(folderQueries);
    const folderMapById = new Map<string, any>();
    folderResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value?.data) {
        res.value.data.forEach((f: any) => {
          folderMapById.set(f.id, f);
        });
      }
    });

    const rawFolders = Array.from(folderMapById.values());

    // Strict Privacy Isolation:
    // A folder is visible ONLY to:
    // 1. Its creator (currentUserId / candidateUserIds)
    // 2. Members explicitly listed in assigned_members
    // Unassigned folders are strictly hidden from other users, admins, and freelancers!
    // We do NOT exclude trashed folders here so the frontend can display the Trash count and Trash tab accurately on refresh.
    const permittedFolders: TaskFolder[] = rawFolders.filter((f: any) => {
      const isCreator = candidateUserIds.has(f.created_by) || f.created_by === currentUserId;
      if (isCreator) return true;

      // Personal folders: only creator can see
      if (f.is_personal) return false;

      // Assigned team members see the entire folder
      return hasUserAccess(f.assigned_members);
    });

    const permittedFolderIds = new Set(permittedFolders.map((f) => f.id));

    // 2. Fetch Tasks across accessible workspaces, assignments, and permitted folders
    const taskQueries: Promise<any>[] = [
      Promise.resolve(
        supabaseAdmin
          .from('fw_tasks')
          .select('*')
          .in('workspace_id', workspaceIdArray)
      )
    ];

    if (candidateArray.length > 0) {
      taskQueries.push(
        Promise.resolve(
          supabaseAdmin
            .from('fw_tasks')
            .select('*')
            .overlaps('assigned_members', candidateArray)
        )
      );
      taskQueries.push(
        Promise.resolve(
          supabaseAdmin
            .from('fw_tasks')
            .select('*')
            .in('assigned_to', candidateArray)
        )
      );
    }

    if (permittedFolderIds.size > 0) {
      taskQueries.push(
        Promise.resolve(
          supabaseAdmin
            .from('fw_tasks')
            .select('*')
            .in('folder_id', Array.from(permittedFolderIds))
        )
      );
    }

    const taskResults = await Promise.allSettled(taskQueries);
    const taskMapById = new Map<string, any>();
    taskResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value?.data) {
        res.value.data.forEach((t: any) => {
          taskMapById.set(t.id, t);
        });
      }
    });

    const rawTasks = Array.from(taskMapById.values());

    let permittedTasks: TaskItem[] = rawTasks.filter((t: any) => {
      // 1. If task belongs to any folder the user has access to, the user has access to all its tasks
      if (t.folder_id && permittedFolderIds.has(t.folder_id)) return true;

      // 2. Creator always sees their tasks
      if (candidateUserIds.has(t.created_by) || t.created_by === currentUserId) return true;

      // 3. Directly assigned tasks
      if (hasUserAccess(t.assigned_members, t.assigned_to)) return true;

      return false;
    });

    // 3. Fetch clients to populate client names
    const clientIds = Array.from(
      new Set(
        [
          ...permittedFolders.map((f) => f.client_id),
          ...permittedTasks.map((t) => t.client_id),
        ].filter(Boolean)
      )
    );

    let clientMap: Record<string, any> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabaseAdmin
        .from('workspace_clients')
        .select('id, name, phone, event_type')
        .in('id', clientIds);

      if (clients) {
        clients.forEach((c: any) => {
          clientMap[c.id] = c;
        });
      }
    }

    // 4. Batch resolve creator user profiles for all folders
    const creatorIds = Array.from(new Set(permittedFolders.map((f) => f.created_by).filter(Boolean)));
    const creatorProfileMap = new Map<string, { id: string; name: string; email: string; avatar_url?: string; role?: string }>();

    if (creatorIds.length > 0) {
      // 4-pre: Check profiles table directly (contains full_name, email, avatar_url, workspace_name)
      try {
        const { data: profList } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, avatar_url, workspace_name')
          .in('id', creatorIds);

        if (profList) {
          profList.forEach((p: any) => {
            const entry = {
              id: p.id,
              name: p.full_name || p.workspace_name || p.email?.split('@')[0] || 'Studio Owner',
              email: p.email || '',
              avatar_url: p.avatar_url || '',
              role: 'Studio Owner',
            };
            creatorProfileMap.set(p.id, entry);
          });
        }
      } catch {}

      // 4a. Check workspace_members
      try {
        const { data: wmList } = await supabaseAdmin
          .from('workspace_members')
          .select('id, auth_user_id, name, email, avatar_url, role')
          .or(`id.in.(${creatorIds.join(',')}),auth_user_id.in.(${creatorIds.join(',')})`);

        if (wmList) {
          wmList.forEach((m: any) => {
            const entry = {
              id: m.auth_user_id || m.id,
              name: m.name || m.email?.split('@')[0] || 'Studio Admin',
              email: m.email || '',
              avatar_url: m.avatar_url || '',
              role: m.role || 'Member',
            };
            if (m.id) creatorProfileMap.set(m.id, entry);
            if (m.auth_user_id) creatorProfileMap.set(m.auth_user_id, entry);
          });
        }
      } catch {}

      // 4b. Check fw_team_members
      try {
        const { data: tmList } = await supabaseAdmin
          .from('fw_team_members')
          .select('id, user_id, auth_user_id, name, email, avatar_url, role')
          .or(`id.in.(${creatorIds.join(',')}),auth_user_id.in.(${creatorIds.join(',')}),user_id.in.(${creatorIds.join(',')})`);

        if (tmList) {
          tmList.forEach((m: any) => {
            const entry = {
              id: m.auth_user_id || m.user_id || m.id,
              name: m.name || m.email?.split('@')[0] || 'Studio Admin',
              email: m.email || '',
              avatar_url: m.avatar_url || '',
              role: m.role || 'Crew',
            };
            if (m.id) creatorProfileMap.set(m.id, entry);
            if (m.auth_user_id) creatorProfileMap.set(m.auth_user_id, entry);
            if (m.user_id) creatorProfileMap.set(m.user_id, entry);
          });
        }
      } catch {}

      // 4c. Check workspaces for owner_id
      try {
        const { data: wsOwners } = await supabaseAdmin
          .from('workspaces')
          .select('id, owner_id, name')
          .in('owner_id', creatorIds);

        if (wsOwners) {
          wsOwners.forEach((ws: any) => {
            if (ws.owner_id && !creatorProfileMap.has(ws.owner_id)) {
              creatorProfileMap.set(ws.owner_id, {
                id: ws.owner_id,
                name: ws.name || 'Studio Admin',
                email: '',
                avatar_url: '',
                role: 'Studio Owner',
              });
            }
          });
        }
      } catch {}

      // 4d. For any remaining unresolved IDs or if missing email/generic name, query supabase auth
      for (const cId of creatorIds) {
        const existing = creatorProfileMap.get(cId);
        if (!existing || !existing.email || existing.name === 'Team Member') {
          try {
            const { data: uData } = await supabaseAdmin.auth.admin.getUserById(cId);
            if (uData?.user) {
              const u = uData.user;
              const name =
                u.user_metadata?.full_name ||
                u.user_metadata?.name ||
                u.user_metadata?.workspace_name ||
                existing?.name ||
                u.email?.split('@')[0] ||
                'Studio Admin';
              const email = u.email || existing?.email || '';
              const avatar = u.user_metadata?.avatar_url || existing?.avatar_url || '';
              const resolved = {
                id: cId,
                name,
                email,
                avatar_url: avatar,
                role: 'Studio Admin',
              };
              creatorProfileMap.set(cId, resolved);
            }
          } catch {}
        }
      }
    }

    // Attach client_name, creator info, permissions and task counts to folders
    const foldersWithCounts: TaskFolder[] = permittedFolders.map((f) => {
      const folderTasks = permittedTasks.filter((t) => t.folder_id === f.id);
      const creatorInfo = creatorProfileMap.get(f.created_by) || {
        id: f.created_by,
        name: 'Studio Admin',
        email: '',
        role: 'Admin',
      };
      return {
        ...f,
        client_name: f.client_id ? clientMap[f.client_id]?.name || null : null,
        tasks_count: folderTasks.length,
        completed_count: folderTasks.filter((t) => t.is_completed).length,
        creator: creatorInfo,
        allow_member_edits: f.allow_member_edits !== false,
        pinned_by: Array.isArray(f.pinned_by) ? f.pinned_by : [],
      };
    });

    const folderMap = new Map(foldersWithCounts.map((f) => [f.id, f]));
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

    // Enrich tasks with client, folder, comments, and activity
    const enrichedTasks: TaskItem[] = permittedTasks.map((t) => {
      const comments = extractTaskComments(t);
      const activity = extractTaskActivity(t);
      const pureAttachments = extractTaskAttachments(t);

      // Extract color and labels from attachments metadata if not direct columns
      let cardColor = t.color || 'white';
      let cardLabels = Array.isArray(t.labels) ? t.labels : [];
      let isPinned = Boolean(t.is_pinned);
      let isArchived = Boolean(t.is_archived);
      let dueTime = t.due_time || null;
      let assignedMembers = Array.isArray(t.assigned_members) ? t.assigned_members : [];

      if (Array.isArray(t.attachments)) {
        const meta = t.attachments.find((a: any) => a?.__type === 'meta');
        if (meta) {
          if (!t.color && meta.color) cardColor = meta.color;
          if ((!t.labels || t.labels.length === 0) && Array.isArray(meta.labels)) cardLabels = meta.labels;
          if (t.is_pinned === undefined && meta.is_pinned !== undefined) isPinned = Boolean(meta.is_pinned);
          if (t.is_archived === undefined && meta.is_archived !== undefined) isArchived = Boolean(meta.is_archived);
          if (!dueTime && meta.due_time) dueTime = meta.due_time;
          if (assignedMembers.length === 0 && Array.isArray(meta.assigned_members)) assignedMembers = meta.assigned_members;
        }
      }

      return {
        ...t,
        color: cardColor,
        labels: cardLabels,
        due_time: dueTime,
        assigned_members: assignedMembers,
        is_pinned: isPinned,
        is_archived: isArchived,
        comments,
        activity,
        attachments: pureAttachments,
        client: t.client_id ? clientMap[t.client_id] || null : null,
        folder: t.folder_id ? folderMap.get(t.folder_id) || null : null,
      };
    });

    // Compute Metrics across all active tasks
    let overdueCount = 0;
    let todayDueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let personalCount = 0;

    enrichedTasks.forEach((t) => {
      if (t.is_archived) return;
      if (t.is_completed) {
        completedCount++;
      } else {
        if (t.due_date) {
          const dueDate = new Date(t.due_date);
          if (dueDate < startOfToday) {
            overdueCount++;
          } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
            todayDueCount++;
          } else {
            upcomingCount++;
          }
        } else {
          upcomingCount++;
        }
      }
      if (t.is_personal) {
        personalCount++;
      }
    });

    const metrics: TaskSummaryMetrics = {
      total: enrichedTasks.filter(t => !t.is_archived).length,
      completed: completedCount,
      pending: enrichedTasks.filter(t => !t.is_archived).length - completedCount,
      overdue: overdueCount,
      todayDue: todayDueCount,
      upcoming: upcomingCount,
      personal: personalCount,
    };

    // Apply Filters if provided
    let filteredTasks = [...enrichedTasks];

    if (filters) {
      if (filters.folderId && filters.folderId !== 'all') {
        if (filters.folderId === 'today_overdue') {
          filteredTasks = filteredTasks.filter((t) => {
            if (t.is_completed || !t.due_date) return false;
            const d = new Date(t.due_date);
            return d <= endOfToday;
          });
        } else if (filters.folderId === 'assigned_me') {
          filteredTasks = filteredTasks.filter((t) => hasUserAccess(t.assigned_members, t.assigned_to));
        } else if (filters.folderId === 'personal') {
          filteredTasks = filteredTasks.filter((t) => t.is_personal);
        } else if (filters.folderId === 'notes') {
          filteredTasks = filteredTasks.filter((t) => t.category === 'NOTE' || t.sub_category === 'NOTE');
        } else if (filters.folderId === 'starred') {
          filteredTasks = filteredTasks.filter((t) => t.is_pinned);
        } else if (filters.folderId === 'completed') {
          filteredTasks = filteredTasks.filter((t) => t.is_completed);
        } else if (filters.folderId === 'trash') {
          filteredTasks = filteredTasks.filter((t) => t.is_trashed);
        } else {
          filteredTasks = filteredTasks.filter((t) => t.folder_id === filters.folderId);
        }
      }

      if (filters.clientId) {
        filteredTasks = filteredTasks.filter((t) => t.client_id === filters.clientId);
      }

      if (filters.projectId) {
        filteredTasks = filteredTasks.filter((t) => t.project_id === filters.projectId);
      }

      if (filters.category && filters.category !== 'ALL') {
        filteredTasks = filteredTasks.filter((t) => t.category === filters.category);
      }

      if (filters.priority && filters.priority !== 'ALL') {
        filteredTasks = filteredTasks.filter((t) => t.priority === filters.priority);
      }

      if (filters.status && filters.status !== 'ALL') {
        filteredTasks = filteredTasks.filter((t) => t.status === filters.status);
      }

      if (filters.label && filters.label !== 'all') {
        filteredTasks = filteredTasks.filter((t) => Array.isArray(t.labels) && t.labels.includes(filters.label!));
      }

      if (filters.search?.trim()) {
        const query = filters.search.toLowerCase().trim();
        filteredTasks = filteredTasks.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.client?.name.toLowerCase().includes(query) ||
            t.checklist_items?.some((c) => c.text.toLowerCase().includes(query)) ||
            t.labels?.some((l) => l.toLowerCase().includes(query))
        );
      }

      // Date Range Filters
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        filteredTasks = filteredTasks.filter((t) => t.due_date && new Date(t.due_date) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filteredTasks = filteredTasks.filter((t) => t.due_date && new Date(t.due_date) <= end);
      }

      // Status List Filter
      if (Array.isArray(filters.statusList) && filters.statusList.length > 0) {
        filteredTasks = filteredTasks.filter((t) => {
          return filters.statusList!.some((s) => {
            if (s === 'completed') return t.is_completed;
            if (t.is_completed) return false;
            if (!t.due_date) return s === 'upcoming';
            const d = new Date(t.due_date);
            if (s === 'overdue') return d < startOfToday;
            if (s === 'today') return d >= startOfToday && d <= endOfToday;
            if (s === 'upcoming') return d > endOfToday;
            return false;
          });
        });
      }

      // Team Member Multi-select Filter
      if (Array.isArray(filters.teamMemberIds) && filters.teamMemberIds.length > 0) {
        filteredTasks = filteredTasks.filter((t) => {
          const members = Array.isArray(t.assigned_members) ? t.assigned_members : [];
          return filters.teamMemberIds!.some((id) => members.includes(id) || t.assigned_to === id);
        });
      }
    }

    // Sort tasks: Pinned first, then overdue, then priority, then created_at DESC
    filteredTasks.sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
        return a.is_pinned ? -1 : 1;
      }
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      if (!a.is_completed && !b.is_completed) {
        const nowMs = Date.now();
        const aOverdue = a.due_date && new Date(a.due_date).getTime() < nowMs;
        const bOverdue = b.due_date && new Date(b.due_date).getTime() < nowMs;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      }
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aRank = priorityOrder[a.priority] ?? 2;
      const bRank = priorityOrder[b.priority] ?? 2;
      if (aRank !== bRank) return aRank - bRank;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return {
      folders: foldersWithCounts,
      tasks: filteredTasks,
      metrics,
    };
  } catch (err: any) {
    console.error('[taskService] Error in getWorkspaceTasksAndFolders:', err);
    return {
      folders: [],
      tasks: [],
      metrics: { total: 0, completed: 0, pending: 0, overdue: 0, todayDue: 0, upcoming: 0, personal: 0 },
    };
  }
}

/**
 * Create a new folder with resilient fallback
 */
export async function createFolder(folderData: Partial<TaskFolder>): Promise<TaskFolder | null> {
  let effectiveWsId = folderData.workspace_id;
  if (!isValidUUID(effectiveWsId)) {
    try {
      const { data: ws } = await supabaseAdmin.from('workspaces').select('id').limit(1).maybeSingle();
      if (ws?.id) effectiveWsId = ws.id;
    } catch (e) {
      console.warn('[taskService] Error resolving fallback workspace for folder:', e);
    }
  }

  // Resolve created_by: If it's a workspace_member ID, resolve to auth_user_id or fallback to workspace owner
  let effectiveCreatedBy = isValidUUID(folderData.created_by) ? folderData.created_by : null;
  let wsOwnerId: string | null = null;
  try {
    const { data: wsRow } = await supabaseAdmin.from('workspaces').select('owner_id').eq('id', effectiveWsId).maybeSingle();
    if (wsRow?.owner_id) wsOwnerId = wsRow.owner_id;
  } catch {}

  if (effectiveCreatedBy) {
    try {
      const { data: mRow } = await supabaseAdmin.from('workspace_members').select('auth_user_id').eq('id', effectiveCreatedBy).maybeSingle();
      if (mRow?.auth_user_id) {
        effectiveCreatedBy = mRow.auth_user_id;
      }
    } catch {}
  }
  if (!effectiveCreatedBy) {
    effectiveCreatedBy = wsOwnerId;
  }

  const insertPayload: any = {
    workspace_id: effectiveWsId,
    client_id: folderData.client_id || null,
    project_id: folderData.project_id || null,
    created_by: effectiveCreatedBy,
    title: folderData.title,
    color_theme: folderData.color_theme || 'amber',
    icon: folderData.icon || 'folder',
    is_personal: folderData.is_personal || false,
    is_pinned: folderData.is_pinned || false,
    assigned_members: folderData.assigned_members || [],
    is_trashed: false,
  };

  const { data, error } = await supabaseAdmin
    .from('fw_task_folders')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.warn('[taskService] Primary folder insert failed, attempting safe fallback:', error.message);
    const fallbackPayload = { ...insertPayload };
    if (wsOwnerId) fallbackPayload.created_by = wsOwnerId;
    delete fallbackPayload.is_trashed;
    delete fallbackPayload.assigned_members;

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('fw_task_folders')
      .insert(fallbackPayload)
      .select()
      .single();

    if (fallbackError) {
      console.error('[taskService] Error creating folder in fallback:', fallbackError);
      throw new Error(fallbackError.message);
    }
    return { ...fallbackData, assigned_members: folderData.assigned_members || [] };
  }
  return data;
}

/**
 * Update an existing folder
 */
export async function updateFolder(folderId: string, updates: Partial<TaskFolder>): Promise<TaskFolder | null> {
  const sanitizedUpdates = { ...updates };
  delete (sanitizedUpdates as any).creator;
  delete (sanitizedUpdates as any).tasks_count;
  delete (sanitizedUpdates as any).completed_count;

  const { data, error } = await supabaseAdmin
    .from('fw_task_folders')
    .update({
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    console.warn('[taskService] Primary folder update failed, attempting safe fallback:', error.message);
    const cleanUpdates = { ...sanitizedUpdates };
    delete cleanUpdates.assigned_members;
    delete cleanUpdates.allow_member_edits;
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('fw_task_folders')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', folderId)
      .select()
      .single();

    if (fallbackError) {
      console.error('[taskService] Error updating folder:', fallbackError);
      throw new Error(fallbackError.message);
    }
    return fallbackData;
  }
  return data;
}

/**
 * Log an activity event to fw_task_activity_logs (resilient to table existence)
 */
export async function logTaskActivity(params: {
  workspaceId?: string | null;
  folderId: string;
  taskId?: string | null;
  actorId?: string | null;
  actorName: string;
  actorEmail?: string | null;
  actorAvatar?: string | null;
  actionType: string;
  description: string;
  previousValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  try {
    const cleanActorName =
      params.actorName && params.actorName !== 'Studio Admin'
        ? params.actorName
        : params.actorEmail?.split('@')[0] || params.actorName || 'Team Member';

    const payload = {
      workspace_id: isValidUUID(params.workspaceId) ? params.workspaceId : null,
      folder_id: params.folderId,
      task_id: isValidUUID(params.taskId) ? params.taskId : null,
      actor_id: params.actorId || null,
      actor_name: cleanActorName,
      actor_email: params.actorEmail || null,
      actor_avatar: params.actorAvatar || null,
      action_type: params.actionType,
      description: params.description,
      previous_value: params.previousValue || null,
      new_value: params.newValue || null,
      metadata: params.metadata || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('fw_task_activity_logs').insert([payload]);
    if (error) {
      console.warn('[taskService] Note: fw_task_activity_logs insert skipped:', error.message);
    }
  } catch (e) {
    console.warn('[taskService] Error logging task activity:', e);
  }
}

/**
 * Fetch activity logs for a specific folder / card, combining dedicated table logs and task activity history
 */
export async function getFolderActivityLogs(folderId: string): Promise<TaskActivityLogItem[]> {
  const combinedLogs: TaskActivityLogItem[] = [];
  const seenTaskActionKeys = new Set<string>();
  const seenTimeKeys = new Set<string>();

  // Helper for creator profile resolution
  async function resolveCreatorInfo(creatorId?: string | null): Promise<{ name: string; email: string | null }> {
    if (!creatorId) return { name: 'Studio Owner', email: null };
    try {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, workspace_name')
        .eq('id', creatorId)
        .maybeSingle();
      if (prof?.full_name || prof?.workspace_name) {
        return {
          name: prof.full_name || prof.workspace_name,
          email: prof.email || null,
        };
      }
    } catch {}

    try {
      const { data: wm } = await supabaseAdmin
        .from('workspace_members')
        .select('name, email')
        .or(`id.eq.${creatorId},auth_user_id.eq.${creatorId}`)
        .limit(1)
        .maybeSingle();
      if (wm?.name) return { name: wm.name, email: wm.email || null };
    } catch {}

    try {
      const { data: uData } = await supabaseAdmin.auth.admin.getUserById(creatorId);
      if (uData?.user) {
        const u = uData.user;
        const name =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split('@')[0] ||
          'Studio Owner';
        return { name, email: u.email || null };
      }
    } catch {}

    return { name: 'Studio Owner', email: null };
  }

  // 1. Query dedicated table first (Single Source of Truth)
  const tasksWithCreationLog = new Set<string>();
  const tasksWithCompletionLog = new Set<string>();

  try {
    const { data, error } = await supabaseAdmin
      .from('fw_task_activity_logs')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (!error && Array.isArray(data)) {
      data.forEach((item: any) => {
        let normAction = (item.action_type || '').toUpperCase();
        if (normAction === 'CREATED') normAction = 'TASK_CREATED';
        if (normAction === 'COMPLETED') normAction = 'TASK_COMPLETED';
        if (normAction === 'UNCOMPLETED') normAction = 'TASK_UNCOMPLETED';

        if (item.task_id) {
          seenTaskActionKeys.add(`${normAction}_${item.task_id}`);
          if (normAction === 'TASK_CREATED') {
            tasksWithCreationLog.add(item.task_id);
            seenTaskActionKeys.add(`TASK_CREATED_${item.task_id}`);
            seenTaskActionKeys.add(`CREATED_${item.task_id}`);
          }
          if (normAction === 'TASK_COMPLETED') {
            tasksWithCompletionLog.add(item.task_id);
            seenTaskActionKeys.add(`TASK_COMPLETED_${item.task_id}`);
            seenTaskActionKeys.add(`COMPLETED_${item.task_id}`);
          }
        }
        if (normAction === 'FOLDER_CREATED') {
          seenTaskActionKeys.add('FOLDER_CREATED');
        }

        // Deduplicate events occurring within the same minute
        const timeKey = `${normAction}_${item.task_id || ''}_${(item.created_at || '').slice(0, 16)}`;
        if (!seenTimeKeys.has(timeKey)) {
          seenTimeKeys.add(timeKey);
          combinedLogs.push({ ...item, action_type: normAction });
        }
      });
    }
  } catch (e) {
    console.warn('[taskService] Failed to query fw_task_activity_logs:', e);
  }

  // 2. Synthesize Folder & Tasks History ONLY for missing records (Legacy fallback)
  try {
    const { data: folder } = await supabaseAdmin
      .from('fw_task_folders')
      .select('*')
      .eq('id', folderId)
      .maybeSingle();

    let resolvedFolderCreator: { name: string; email: string | null } | null = null;

    if (folder && !seenTaskActionKeys.has('FOLDER_CREATED')) {
      resolvedFolderCreator = await resolveCreatorInfo(folder.created_by);
      const timeKey = `FOLDER_CREATED__${(folder.created_at || '').slice(0, 16)}`;
      if (!seenTimeKeys.has(timeKey)) {
        seenTimeKeys.add(timeKey);
        combinedLogs.push({
          id: `folder-created-${folder.id}`,
          folder_id: folder.id,
          workspace_id: folder.workspace_id,
          actor_name: resolvedFolderCreator.name || 'Studio Owner',
          actor_email: resolvedFolderCreator.email,
          action_type: 'FOLDER_CREATED',
          description: `Created card "${folder.title}"`,
          created_at: folder.created_at || new Date().toISOString(),
        });
      }
    }

    const { data: tasks } = await supabaseAdmin
      .from('fw_tasks')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (tasks && Array.isArray(tasks)) {
      for (const t of tasks) {
        // 2a. Attachment-based activity items (Only if not recorded in table)
        if (Array.isArray(t.attachments)) {
          t.attachments
            .filter((a: any) => a?.__type === 'activity')
            .forEach((act: any) => {
              let normAction = (act.action_type || 'TASK_UPDATED').toUpperCase();
              if (normAction === 'CREATED') normAction = 'TASK_CREATED';
              if (normAction === 'COMPLETED') normAction = 'TASK_COMPLETED';
              if (normAction === 'UNCOMPLETED') normAction = 'TASK_UNCOMPLETED';

              // If task creation or completion is already logged in table, SKIP attachment
              if (normAction === 'TASK_CREATED' && tasksWithCreationLog.has(t.id)) return;
              if (normAction === 'TASK_COMPLETED' && tasksWithCompletionLog.has(t.id)) return;

              const actionKey = `${normAction}_${t.id}`;
              const timeKey = `${normAction}_${t.id}_${(act.created_at || '').slice(0, 16)}`;

              if (!seenTaskActionKeys.has(actionKey) && !seenTimeKeys.has(timeKey)) {
                seenTaskActionKeys.add(actionKey);
                seenTimeKeys.add(timeKey);
                combinedLogs.push({
                  id: act.id || `act-${t.id}-${act.created_at}`,
                  folder_id: folderId,
                  task_id: t.id,
                  actor_name: act.actor_name || 'Team Member',
                  actor_email: act.actor_email || null,
                  action_type: normAction,
                  description: act.description || `Updated task "${t.title}"`,
                  created_at: act.created_at || t.updated_at || t.created_at,
                });
              }
            });
        }

        // 2b. Synthesize Task Creation ONLY if absolutely no creation record exists
        if (!tasksWithCreationLog.has(t.id) && !seenTaskActionKeys.has(`TASK_CREATED_${t.id}`) && !seenTaskActionKeys.has(`CREATED_${t.id}`)) {
          const taskCreator =
            t.created_by === folder?.created_by && resolvedFolderCreator
              ? resolvedFolderCreator
              : await resolveCreatorInfo(t.created_by);

          const timeKey = `TASK_CREATED_${t.id}_${(t.created_at || '').slice(0, 16)}`;
          if (!seenTimeKeys.has(timeKey)) {
            seenTimeKeys.add(timeKey);
            seenTaskActionKeys.add(`TASK_CREATED_${t.id}`);
            tasksWithCreationLog.add(t.id);
            combinedLogs.push({
              id: `task-created-${t.id}`,
              folder_id: folderId,
              task_id: t.id,
              actor_name: taskCreator.name || 'Team Member',
              actor_email: taskCreator.email,
              action_type: 'TASK_CREATED',
              description: `${taskCreator.name || 'Team Member'} added task "${t.title}"`,
              created_at: t.created_at || new Date().toISOString(),
            });
          }
        }

        // 2c. Synthesize Task Completion ONLY if completed AND no completion record exists
        if (t.is_completed && !tasksWithCompletionLog.has(t.id) && !seenTaskActionKeys.has(`TASK_COMPLETED_${t.id}`) && !seenTaskActionKeys.has(`COMPLETED_${t.id}`)) {
          const compTime = t.completed_at || t.updated_at || t.created_at;
          const timeKey = `TASK_COMPLETED_${t.id}_${(compTime || '').slice(0, 16)}`;
          if (!seenTimeKeys.has(timeKey)) {
            seenTimeKeys.add(timeKey);
            seenTaskActionKeys.add(`TASK_COMPLETED_${t.id}`);
            tasksWithCompletionLog.add(t.id);
            combinedLogs.push({
              id: `task-completed-${t.id}`,
              folder_id: folderId,
              task_id: t.id,
              actor_name: t.completed_by || 'Team Member',
              actor_email: null,
              action_type: 'TASK_COMPLETED',
              description: `Completed task "${t.title}"`,
              created_at: compTime,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[taskService] Error generating fallback activity logs:', err);
  }

  // 3. Final Pass: Strictly enforce AT MOST ONE TASK_CREATED per task_id
  const finalLogs: TaskActivityLogItem[] = [];
  const seenTaskCreationFinal = new Set<string>();
  const seenGeneralActionKeys = new Set<string>();

  // Sort newest first
  combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const item of combinedLogs) {
    const normAction = (item.action_type || '').toUpperCase();
    const isCreation = normAction === 'TASK_CREATED' || normAction === 'CREATED';

    if (isCreation && item.task_id) {
      if (seenTaskCreationFinal.has(item.task_id)) {
        // Already recorded a creation log for this task! Discard duplicate!
        continue;
      }
      seenTaskCreationFinal.add(item.task_id);
      item.action_type = 'TASK_CREATED';
      finalLogs.push(item);
      continue;
    }

    // For other actions, deduplicate by action + taskId/folderId + minute
    const timeMinute = (item.created_at || '').slice(0, 16);
    const dedupKey = `${normAction}_${item.task_id || item.folder_id}_${timeMinute}`;
    if (!seenGeneralActionKeys.has(dedupKey)) {
      seenGeneralActionKeys.add(dedupKey);
      finalLogs.push(item);
    }
  }

  return finalLogs;
}

/**
 * Toggle per-user personal pin on a folder
 */
export async function togglePersonalFolderPin(
  folderId: string,
  userId: string,
  isPinned: boolean,
  actorName: string = 'Team Member'
): Promise<string[]> {
  try {
    const { data: folder } = await supabaseAdmin
      .from('fw_task_folders')
      .select('pinned_by')
      .eq('id', folderId)
      .maybeSingle();

    let pinnedBy: string[] = Array.isArray(folder?.pinned_by) ? [...folder.pinned_by] : [];
    if (isPinned) {
      if (!pinnedBy.includes(userId)) pinnedBy.push(userId);
    } else {
      pinnedBy = pinnedBy.filter((u) => u !== userId);
    }

    try {
      await supabaseAdmin
        .from('fw_task_folders')
        .update({ pinned_by: pinnedBy })
        .eq('id', folderId);
    } catch (e) {
      console.warn('[taskService] pinned_by column update skipped:', e);
    }

    logTaskActivity({
      folderId,
      actorName,
      actionType: isPinned ? 'CARD_PINNED' : 'CARD_UNPINNED',
      description: isPinned ? `${actorName} pinned this card` : `${actorName} unpinned this card`,
    });

    return pinnedBy;
  } catch (err) {
    console.warn('[taskService] Error in togglePersonalFolderPin:', err);
    return [];
  }
}

/**
 * Delete a folder (Soft delete to trash by default, or permanent delete)
 */
export async function deleteFolder(folderId: string, permanent: boolean = false): Promise<boolean> {
  if (permanent) {
    await supabaseAdmin.from('fw_tasks').delete().eq('folder_id', folderId);
    const { error } = await supabaseAdmin.from('fw_task_folders').delete().eq('id', folderId);
    if (error) {
      console.error('[taskService] Error permanently deleting folder:', error);
      throw new Error(error.message);
    }
    return true;
  }

  // Soft delete (Move to Trash)
  const trashedAt = new Date().toISOString();
  await supabaseAdmin
    .from('fw_tasks')
    .update({ is_trashed: true, trashed_at: trashedAt })
    .eq('folder_id', folderId);

  const { error } = await supabaseAdmin
    .from('fw_task_folders')
    .update({ is_trashed: true, trashed_at: trashedAt })
    .eq('id', folderId);

  if (error) {
    console.warn('[taskService] is_trashed soft delete failed, falling back to permanent delete:', error.message);
    return deleteFolder(folderId, true);
  }
  return true;
}

/**
 * Restore a folder from trash
 */
export async function restoreFolder(folderId: string): Promise<boolean> {
  await supabaseAdmin
    .from('fw_tasks')
    .update({ is_trashed: false, trashed_at: null })
    .eq('folder_id', folderId);

  const { error } = await supabaseAdmin
    .from('fw_task_folders')
    .update({ is_trashed: false, trashed_at: null })
    .eq('id', folderId);

  if (error) {
    console.error('[taskService] Error restoring folder:', error);
    throw new Error(error.message);
  }
  return true;
}

/**
 * Empty trash permanently
 */
export async function emptyTrash(workspaceId?: string): Promise<boolean> {
  let taskQ = supabaseAdmin.from('fw_tasks').delete().eq('is_trashed', true);
  let folderQ = supabaseAdmin.from('fw_task_folders').delete().eq('is_trashed', true);

  if (workspaceId && isValidUUID(workspaceId)) {
    taskQ = taskQ.eq('workspace_id', workspaceId);
    folderQ = folderQ.eq('workspace_id', workspaceId);
  }

  await Promise.allSettled([taskQ, folderQ]);
  return true;
}

/**
 * Helper to validate UUID
 */
function isValidUUID(val?: any): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Create a new task or note with guaranteed resilience
 */
export async function createTask(taskData: Partial<TaskItem>): Promise<TaskItem | null> {
  // Preserve metadata (color, labels, is_pinned, is_archived, comments, activity) inside attachments JSONB
  const existingAttachments = Array.isArray(taskData.attachments) ? taskData.attachments : [];
  const metaObj = {
    __type: 'meta',
    color: taskData.color || 'white',
    labels: taskData.labels || [],
    is_pinned: Boolean(taskData.is_pinned),
    is_archived: Boolean(taskData.is_archived),
    due_time: taskData.due_time || null,
    assigned_members: taskData.assigned_members || [],
  };

  const cleanAttachments = [
    ...existingAttachments.filter((a: any) => a?.__type !== 'meta' && a?.__type !== 'activity'),
    metaObj,
  ];

  // Sanitize assigned_to so foreign keys never fail
  const safeAssignedTo = isValidUUID(taskData.assigned_to) ? taskData.assigned_to : null;

  // Resolve folder, guaranteed workspace_id, client and project references
  let effectiveWorkspaceId = taskData.workspace_id;
  let folderClientId = taskData.client_id || null;
  let folderProjectId = taskData.project_id || null;
  let folderAssignedMembers: string[] = [];

  if (taskData.folder_id) {
    try {
      const { data: folderRow } = await supabaseAdmin
        .from('fw_task_folders')
        .select('workspace_id, client_id, project_id, assigned_members, created_by')
        .eq('id', taskData.folder_id)
        .maybeSingle();

      if (folderRow) {
        if (folderRow.workspace_id) effectiveWorkspaceId = folderRow.workspace_id;
        if (!folderClientId && folderRow.client_id) folderClientId = folderRow.client_id;
        if (!folderProjectId && folderRow.project_id) folderProjectId = folderRow.project_id;
        if (Array.isArray(folderRow.assigned_members)) {
          folderAssignedMembers = folderRow.assigned_members;
        }
        if (!taskData.created_by && folderRow.created_by) {
          taskData.created_by = folderRow.created_by;
        }
      }
    } catch (e) {
      console.warn('[taskService] Error looking up folder for task creation:', e);
    }
  }

  // Ensure effectiveWorkspaceId is valid UUID; if not, resolve fallback from workspaces
  if (!isValidUUID(effectiveWorkspaceId)) {
    try {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (ws?.id) effectiveWorkspaceId = ws.id;
    } catch (e) {
      console.warn('[taskService] Error resolving fallback workspace:', e);
    }
  }

  // Ensure effectiveCreatedBy is valid UUID and points to auth.users or fallback to workspace owner
  let effectiveCreatedBy = isValidUUID(taskData.created_by) ? taskData.created_by : null;
  let wsOwnerId: string | null = null;
  try {
    const { data: wsRow } = await supabaseAdmin.from('workspaces').select('owner_id').eq('id', effectiveWorkspaceId).maybeSingle();
    if (wsRow?.owner_id) wsOwnerId = wsRow.owner_id;
  } catch {}

  if (effectiveCreatedBy) {
    try {
      const { data: mRow } = await supabaseAdmin.from('workspace_members').select('auth_user_id').eq('id', effectiveCreatedBy).maybeSingle();
      if (mRow?.auth_user_id) {
        effectiveCreatedBy = mRow.auth_user_id;
      }
    } catch {}
  }
  if (!effectiveCreatedBy) {
    effectiveCreatedBy = wsOwnerId;
  }
  if (!effectiveCreatedBy) {
    try {
      const { data: userRow } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (userRow?.users?.[0]?.id) {
        effectiveCreatedBy = userRow.users[0].id;
      }
    } catch (e) {
      console.warn('[taskService] Error resolving fallback created_by:', e);
    }
  }

  const mergedAssignedMembers = Array.from(
    new Set([
      ...(Array.isArray(taskData.assigned_members) ? taskData.assigned_members : []),
      ...folderAssignedMembers,
    ])
  );

  const payload: any = {
    folder_id: taskData.folder_id || null,
    workspace_id: effectiveWorkspaceId,
    client_id: folderClientId,
    project_id: folderProjectId,
    title: taskData.title,
    description: taskData.description || null,
    category: taskData.category || 'GENERAL',
    sub_category: taskData.sub_category || null,
    priority: taskData.priority || 'medium',
    status: taskData.status || 'todo',
    is_completed: Boolean(taskData.is_completed),
    due_date: taskData.due_date || null,
    due_time: taskData.due_time || null,
    created_by: effectiveCreatedBy,
    assigned_to: safeAssignedTo,
    assigned_members: mergedAssignedMembers,
    is_personal: Boolean(taskData.is_personal),
    is_trashed: false,
    checklist_items: taskData.checklist_items || [],
    attachments: cleanAttachments,
  };

  let { data, error } = await supabaseAdmin
    .from('fw_tasks')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.warn('[taskService] Primary task insert failed, attempting safe fallback:', error.message);
    
    // Attempt fallback with workspace owner as created_by and clean payload
    const fallbackPayload = { ...payload };
    if (wsOwnerId) fallbackPayload.created_by = wsOwnerId;
    delete fallbackPayload.assigned_to;
    delete fallbackPayload.is_trashed;
    delete fallbackPayload.assigned_members;
    delete fallbackPayload.due_time;

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('fw_tasks')
      .insert(fallbackPayload)
      .select()
      .single();

    if (fallbackError) {
      console.error('[taskService] Error creating task in fallback:', fallbackError);
      throw new Error(fallbackError.message);
    }
    data = fallbackData;
  }

  // Log Task Creation to audit trail
  if (data?.id && taskData.folder_id) {
    const creatorName = (taskData as any).actor_name || 'Team Member';
    const creatorEmail = (taskData as any).actor_email || null;
    logTaskActivity({
      workspaceId: effectiveWorkspaceId,
      folderId: taskData.folder_id,
      taskId: data.id,
      actorName: creatorName,
      actorEmail: creatorEmail,
      actionType: 'TASK_CREATED',
      description: `${creatorName} added task "${taskData.title}"`,
    });
  }

  return {
    ...data,
    color: taskData.color || 'white',
    labels: taskData.labels || [],
    due_time: taskData.due_time || null,
    assigned_members: taskData.assigned_members || [],
    is_pinned: Boolean(taskData.is_pinned),
    is_archived: false,
    comments: [],
    activity: extractTaskActivity(data),
    attachments: existingAttachments,
  };
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<TaskItem>,
  actorName: string = 'Team Member',
  actorEmail?: string | null,
  actorUserId?: string | null
): Promise<TaskItem | null> {
  // Fetch current task to merge attachments and record activity
  const { data: currentTask } = await supabaseAdmin
    .from('fw_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  let mergedAttachments: any[] = Array.isArray(currentTask?.attachments) ? [...currentTask.attachments] : [];

  // Update or set meta
  let metaIndex = mergedAttachments.findIndex((a: any) => a?.__type === 'meta');
  const existingMeta = metaIndex >= 0 ? mergedAttachments[metaIndex] : {};
  const newMeta = {
    ...existingMeta,
    __type: 'meta',
    color: updates.color !== undefined ? updates.color : existingMeta.color || 'white',
    labels: updates.labels !== undefined ? updates.labels : existingMeta.labels || [],
    is_pinned: updates.is_pinned !== undefined ? updates.is_pinned : existingMeta.is_pinned || false,
    is_archived: updates.is_archived !== undefined ? updates.is_archived : existingMeta.is_archived || false,
    due_time: updates.due_time !== undefined ? updates.due_time : existingMeta.due_time || null,
  };

  if (metaIndex >= 0) {
    mergedAttachments[metaIndex] = newMeta;
  } else {
    mergedAttachments.push(newMeta);
  }

  // Record activity log
  const activitiesToAdd: any[] = [];
  const targetTaskTitle = updates.title || currentTask?.title || 'task';

  // Helper to format date cleanly as "22 Sep 2026" (NO TIME)
  const formatPureDate = (dateVal: string | null | undefined): string | null => {
    if (!dateVal) return null;
    try {
      const pureDate = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
      const parts = pureDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        if (y && m && d) {
          const dt = new Date(y, m - 1, d);
          return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
      return pureDate;
    } catch {
      return dateVal;
    }
  };

  // 1. Completion / Uncompletion
  if (updates.is_completed !== undefined && updates.is_completed !== currentTask?.is_completed) {
    activitiesToAdd.push({
      id: 'act-' + Date.now() + '-comp',
      __type: 'activity',
      actor_name: actorName,
      actor_email: actorEmail || null,
      action_type: updates.is_completed ? 'TASK_COMPLETED' : 'TASK_UNCOMPLETED',
      description: updates.is_completed
        ? `${actorName} marked "${targetTaskTitle}" as completed`
        : `${actorName} marked "${targetTaskTitle}" as incomplete`,
      created_at: new Date().toISOString(),
    });
  }

  // 2. Deadline Changed - Strictly compare YYYY-MM-DD date parts to avoid false triggers
  if (updates.due_date !== undefined) {
    const prevDateStr = currentTask?.due_date ? currentTask.due_date.split('T')[0] : null;
    const newDateStr = updates.due_date ? updates.due_date.split('T')[0] : null;

    if (prevDateStr !== newDateStr) {
      const prevFormatted = formatPureDate(prevDateStr);
      const newFormatted = formatPureDate(newDateStr);

      activitiesToAdd.push({
        id: 'act-' + Date.now() + '-due',
        __type: 'activity',
        actor_name: actorName,
        actor_email: actorEmail || null,
        action_type: 'DEADLINE_CHANGED',
        description: newFormatted
          ? `${actorName} set deadline for "${targetTaskTitle}" to ${newFormatted}`
          : `${actorName} removed deadline for "${targetTaskTitle}"`,
        previous_value: prevFormatted,
        new_value: newFormatted,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 3. Task Renamed - Strictly check if title actually changed
  if (updates.title !== undefined && currentTask?.title) {
    const oldTitle = currentTask.title.trim();
    const newTitle = updates.title.trim();
    if (newTitle && oldTitle !== newTitle) {
      activitiesToAdd.push({
        id: 'act-' + Date.now() + '-rename',
        __type: 'activity',
        actor_name: actorName,
        actor_email: actorEmail || null,
        action_type: 'TASK_RENAMED',
        description: `${actorName} renamed task from "${oldTitle}" to "${newTitle}"`,
        previous_value: oldTitle,
        new_value: newTitle,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 4. Priority Changed
  if (updates.priority !== undefined && updates.priority !== currentTask?.priority) {
    activitiesToAdd.push({
      id: 'act-' + Date.now() + '-prio',
      __type: 'activity',
      actor_name: actorName,
      actor_email: actorEmail || null,
      action_type: 'PRIORITY_CHANGED',
      description: `${actorName} changed priority for "${targetTaskTitle}" to ${updates.priority}`,
      previous_value: currentTask?.priority || null,
      new_value: updates.priority || null,
      created_at: new Date().toISOString(),
    });
  }

  if (activitiesToAdd.length > 0) {
    mergedAttachments.push(...activitiesToAdd);

    if (currentTask?.folder_id) {
      activitiesToAdd.forEach((act) => {
        logTaskActivity({
          workspaceId: currentTask.workspace_id,
          folderId: currentTask.folder_id,
          taskId: currentTask.id,
          actorName: act.actor_name,
          actorEmail: act.actor_email,
          actionType: act.action_type,
          description: act.description,
          previousValue: act.previous_value || null,
          newValue: act.new_value || null,
        });
      });
    }
  }

  // If updates.attachments provides new files, merge them
  if (Array.isArray(updates.attachments)) {
    const customTypes = mergedAttachments.filter((a: any) => a?.__type);
    mergedAttachments = [...updates.attachments, ...customTypes];
  }

  const payload: any = {
    updated_at: new Date().toISOString(),
    attachments: mergedAttachments,
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.sub_category !== undefined) payload.sub_category = updates.sub_category;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.is_completed !== undefined) {
    payload.is_completed = Boolean(updates.is_completed);
    payload.status = updates.is_completed ? 'completed' : 'todo';
    payload.completed_at = updates.is_completed ? new Date().toISOString() : null;

    // completed_by in Postgres fw_tasks is a UUID FK to auth.users.
    // Never pass a string like actorName here! Only valid UUID or null.
    let safeCompletedBy: string | null = null;
    if (updates.is_completed) {
      if (isValidUUID(actorUserId)) {
        safeCompletedBy = actorUserId || null;
      } else if (isValidUUID(updates.completed_by)) {
        safeCompletedBy = updates.completed_by || null;
      }
    }
    payload.completed_by = safeCompletedBy;
  }
  if (updates.due_date !== undefined) payload.due_date = updates.due_date;
  if (updates.assigned_to !== undefined) payload.assigned_to = updates.assigned_to;
  if (updates.assigned_members !== undefined) payload.assigned_members = updates.assigned_members;
  if (updates.folder_id !== undefined) payload.folder_id = updates.folder_id;
  if (updates.client_id !== undefined) payload.client_id = updates.client_id;
  if (updates.project_id !== undefined) payload.project_id = updates.project_id;
  if (updates.checklist_items !== undefined) payload.checklist_items = updates.checklist_items;

  let { data, error } = await supabaseAdmin
    .from('fw_tasks')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.warn('[taskService] Primary task update failed, attempting safe retry without completed_by:', error.message);
    const fallbackPayload = { ...payload };
    delete fallbackPayload.completed_by;
    const { data: retryData, error: retryError } = await supabaseAdmin
      .from('fw_tasks')
      .update(fallbackPayload)
      .eq('id', taskId)
      .select()
      .single();

    if (retryError) {
      console.error('[taskService] Error updating task after fallback retry:', retryError);
      throw new Error(retryError.message);
    }
    data = retryData;
  }

  return {
    ...data,
    color: newMeta.color,
    labels: newMeta.labels,
    is_pinned: newMeta.is_pinned,
    is_archived: newMeta.is_archived,
    due_time: newMeta.due_time,
    comments: extractTaskComments(data),
    activity: extractTaskActivity(data),
    attachments: extractTaskAttachments(data),
  };
}

/**
 * Delete a task (Soft delete to trash by default, or permanent delete)
 */
export async function deleteTask(taskId: string, permanent: boolean = false): Promise<boolean> {
  if (permanent) {
    const { error } = await supabaseAdmin
      .from('fw_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('[taskService] Error permanently deleting task:', error);
      throw new Error(error.message);
    }
    return true;
  }

  // Soft delete
  const { error } = await supabaseAdmin
    .from('fw_tasks')
    .update({ is_trashed: true, trashed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) {
    console.warn('[taskService] Soft delete task failed, falling back to permanent delete:', error.message);
    return deleteTask(taskId, true);
  }
  return true;
}

/**
 * Restore a task from trash
 */
export async function restoreTask(taskId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('fw_tasks')
    .update({ is_trashed: false, trashed_at: null })
    .eq('id', taskId);

  if (error) {
    console.error('[taskService] Error restoring task:', error);
    throw new Error(error.message);
  }
  return true;
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  comment: { user_id?: string; user_name: string; user_avatar?: string; content: string; mentions?: string[] }
): Promise<TaskComment> {
  const newComment: TaskComment = {
    id: 'cmt-' + Date.now(),
    task_id: taskId,
    user_id: comment.user_id,
    user_name: comment.user_name || 'Team Member',
    user_avatar: comment.user_avatar,
    content: comment.content,
    mentions: comment.mentions || [],
    created_at: new Date().toISOString(),
  };

  const { data: currentTask } = await supabaseAdmin
    .from('fw_tasks')
    .select('attachments')
    .eq('id', taskId)
    .single();

  const existingAttachments = Array.isArray(currentTask?.attachments) ? currentTask.attachments : [];
  const updatedAttachments = [
    ...existingAttachments,
    { ...newComment, __type: 'comment' },
    {
      id: 'act-' + Date.now(),
      __type: 'activity',
      actor_name: comment.user_name || 'Team Member',
      action_type: 'COMMENT_ADDED',
      description: `${comment.user_name || 'Team Member'} commented: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
      created_at: new Date().toISOString(),
    },
  ];

  await supabaseAdmin
    .from('fw_tasks')
    .update({ attachments: updatedAttachments, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  return newComment;
}

/**
 * Toggle task completion status
 */
export async function toggleTaskCompletion(
  taskId: string,
  isCompleted: boolean,
  userId?: string | null,
  actorName: string = 'Team Member',
  actorEmail?: string | null
): Promise<TaskItem | null> {
  return updateTask(
    taskId,
    { is_completed: isCompleted, status: isCompleted ? 'completed' : 'todo' },
    actorName,
    actorEmail,
    userId
  );
}

/**
 * Update nested checklist items on a task
 */
export async function updateTaskChecklist(
  taskId: string,
  checklistItems: TaskChecklistItem[]
): Promise<TaskItem | null> {
  const allDone = checklistItems.length > 0 && checklistItems.every((item) => item.done);
  return updateTask(taskId, {
    checklist_items: checklistItems,
    ...(allDone ? { is_completed: true, status: 'completed' } : {}),
  });
}

/**
 * Standard Photography Workflow Templates
 */
export const PHOTOGRAPHY_TEMPLATES = [
  {
    id: 'wedding_full_pipeline',
    name: 'Full Wedding Project (14 Stages)',
    description: 'Comprehensive 14-stage wedding production workflow from lead confirmation to luxury photobook delivery.',
    stages: [
      { title: '01. Lead Confirmed & Advance Payment Received', priority: 'urgent' as TaskPriority, category: 'PAYMENT' as TaskCategory },
      { title: '02. Client Onboarding & Moodboard Setup', priority: 'high' as TaskPriority, category: 'GENERAL' as TaskCategory },
      { title: '03. Team & Crew Assignment (Photographers, Cinematographers)', priority: 'urgent' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '04. Pre-Shoot Briefing & Shot-list Checklist', priority: 'medium' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '05. Wedding Day Shoot Coverage', priority: 'urgent' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '06. Raw Footage Dual SSD & Cloud Backup', priority: 'urgent' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Copy all SD cards to Master SSD', 'Verify MD5 checksum / size match', 'Upload raw audio stems to cloud backup'] },
      { title: '07. Photo Culling & Proofing Gallery Sent', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Filter out blurred shots', 'Export web proofs', 'Send gallery link with PIN to couple'] },
      { title: '08. Couple Photo Selections Received', priority: 'medium' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory },
      { title: '09. Master Color Grading & Skin Retouching', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Apply studio LUT grade', 'Skin retouch couple portraits', 'Export printable hi-res JPEGs'] },
      { title: '10. 60-Second Instagram Teaser / Reel Cut', priority: 'urgent' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Track licensing & sync', 'First cut assembly', 'Sound design & 9:16 export'] },
      { title: '11. Full Length Cinematic Film & Highlight Video', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Multi-cam ceremony sync', 'Dialogue denoise & mastering', 'Export review link'] },
      { title: '12. Photobook Album Design & Flipbook Preview', priority: 'medium' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory, checklist: ['Import client selections', 'Design 35 panoramic spreads', 'Send flipbook PDF to couple'] },
      { title: '13. Client Approval & Revisions Completed', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory },
      { title: '14. Luxury Box Printing, Packaging & Delivery', priority: 'high' as TaskPriority, category: 'DELIVERABLE' as TaskCategory, checklist: ['Submit spreads to print lab', 'Engrave couple names on wooden box', 'Quality inspection & courier tracking'] },
    ],
  },
  {
    id: 'pre_wedding_shoot',
    name: 'Pre-Wedding Shoot (7 Stages)',
    description: 'Fast-paced outdoor or studio pre-wedding couple shoot pipeline.',
    stages: [
      { title: '01. Concept & Location Scouting', priority: 'high' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '02. Styling & Costume Coordination', priority: 'medium' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '03. Shoot Day Production', priority: 'urgent' as TaskPriority, category: 'SHOOT_PREP' as TaskCategory },
      { title: '04. Raw Ingest & Backup', priority: 'urgent' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory },
      { title: '05. High-Res Selection Link Shared', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory },
      { title: '06. Magazine Style Color Grading & Retouching', priority: 'high' as TaskPriority, category: 'POST_PRODUCTION' as TaskCategory },
      { title: '07. Final High-Resolution Gallery Delivery', priority: 'high' as TaskPriority, category: 'DELIVERABLE' as TaskCategory },
    ],
  },
];

/**
 * Apply Photography Template to a Client/Project
 */
export async function applyPhotographyTemplate(
  templateId: string,
  workspaceId: string,
  userId: string,
  clientId?: string | null,
  projectId?: string | null
): Promise<TaskItem[]> {
  const template = PHOTOGRAPHY_TEMPLATES.find((t) => t.id === templateId) || PHOTOGRAPHY_TEMPLATES[0];
  const createdTasks: TaskItem[] = [];

  for (const stage of template.stages) {
    const checklistItems: TaskChecklistItem[] = (stage.checklist || []).map((text, idx) => ({
      id: `item-${idx + 1}-${Date.now()}`,
      text,
      done: false,
    }));

    const task = await createTask({
      workspace_id: workspaceId,
      created_by: userId,
      client_id: clientId || null,
      project_id: projectId || null,
      title: stage.title,
      priority: stage.priority,
      category: stage.category,
      status: 'todo',
      is_completed: false,
      checklist_items: checklistItems,
      labels: ['Filmify Weddings', stage.category === 'POST_PRODUCTION' ? 'Post Production' : 'Shoot Prep'],
    });

    if (task) createdTasks.push(task);
  }

  return createdTasks;
}

/**
 * Auto-create standard 7-stage Wedding Post-Production checklist pipeline folder & tasks
 */
export async function syncClientPostProductionTasks(
  clientId: string,
  projectId: string | null,
  workspaceId: string,
  userId: string
): Promise<{ folder: TaskFolder; tasks: TaskItem[] }> {
  const { data: client } = await supabaseAdmin
    .from('workspace_clients')
    .select('name, event_type')
    .eq('id', clientId)
    .maybeSingle();

  const clientName = client?.name || 'Client';
  const folderTitle = `${clientName} • Post-Production Pipeline`;

  let folder: TaskFolder;
  const { data: existingFolder } = await supabaseAdmin
    .from('fw_task_folders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_id', clientId)
    .eq('title', folderTitle)
    .maybeSingle();

  if (existingFolder) {
    folder = existingFolder;
  } else {
    const { data: newFolder, error: fErr } = await supabaseAdmin
      .from('fw_task_folders')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        project_id: projectId,
        created_by: userId,
        title: folderTitle,
        color_theme: 'amber',
        icon: 'film',
        is_personal: false,
        is_pinned: true,
      })
      .select()
      .single();

    if (fErr || !newFolder) {
      throw new Error(fErr?.message || 'Failed to create post-production folder');
    }
    folder = newFolder;
  }

  const templateTasks = await applyPhotographyTemplate('wedding_full_pipeline', workspaceId, userId, clientId, projectId);
  return { folder, tasks: templateTasks };
}
