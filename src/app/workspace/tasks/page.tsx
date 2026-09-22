'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Folder,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle,
  FolderOpen,
  Users,
  RefreshCw,
  SlidersHorizontal,
  CheckSquare,
  Trash2,
  RotateCcw,
  Pin,
  ChevronLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GoogleKeepFolderCard } from './components/GoogleKeepFolderCard';
import { GoogleKeepFolderModal } from './components/GoogleKeepFolderModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { TaskFilterModal, TaskFilterState } from './components/TaskFilterModal';
import { FolderHistoryModal } from './components/FolderHistoryModal';
import {
  TaskFolder,
  TaskItem,
  TaskSummaryMetrics,
} from '@/lib/services/taskService';
import { fetchWorkspaceTeamMembers, WorkspaceMemberOption } from '@/lib/team-helpers';
import { useWorkspace } from '@/lib/context/BhamstraContext';

export default function WorkspaceTasksPage() {
  const {
    workspaceId: ctxWorkspaceId,
    userId: ctxUserId,
    userName: ctxUserName,
    userEmail: ctxUserEmail,
    isOwner: ctxIsOwner,
    userRole: ctxUserRole,
  } = useWorkspace();
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('Studio Admin');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [userPinnedFolderIds, setUserPinnedFolderIds] = useState<Set<string>>(new Set());

  const [folders, setFolders] = useState<TaskFolder[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<WorkspaceMemberOption[]>([]);

  // Navigation & Filtering
  const [activeFilter, setActiveFilter] = useState<'all' | 'today_overdue' | 'completed' | 'trash'>('all');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Advanced Filters State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<TaskFilterState>({
    statusList: [],
    teamMemberIds: [],
  });

  // Modals state
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedFolderForModal, setSelectedFolderForModal] = useState<TaskFolder | null>(null);
  const [historyFolder, setHistoryFolder] = useState<TaskFolder | null>(null);

  // 1. Resolve Session & User
  useEffect(() => {
    async function initSession() {
      // First try to extract from Supabase session directly
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (session.user.email) {
          setCurrentUserEmail(session.user.email);
        }
        if (!ctxWorkspaceId) {
          setWorkspaceId(session.user.id);
        }
        if (!ctxUserId) {
          setCurrentUserId(session.user.id);
        }

        let resolvedName =
          ctxUserName ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name;

        if (!resolvedName && session.user.id) {
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', session.user.id)
              .maybeSingle();
            if (prof?.full_name) resolvedName = prof.full_name;
          } catch {}
        }
        if (!resolvedName && session.user.email) {
          resolvedName = session.user.email.split('@')[0];
        }
        if (resolvedName) {
          setCurrentUserName(resolvedName);
        }

        // Initialize personal pins from localStorage for fast instant render
        try {
          const cachedPins = localStorage.getItem(`fw_pinned_folders_${session.user.id}`);
          if (cachedPins) {
            const parsed = JSON.parse(cachedPins);
            if (Array.isArray(parsed)) {
              setUserPinnedFolderIds(new Set(parsed));
            }
          }
        } catch (e) {}
      }

      // If context is available, use it
      if (ctxWorkspaceId) setWorkspaceId(ctxWorkspaceId);
      if (ctxUserId) setCurrentUserId(ctxUserId);
      if (ctxUserName) setCurrentUserName(ctxUserName);
      if (ctxUserEmail) setCurrentUserEmail(ctxUserEmail);

      // Fetch true workspace owner to ensure strict RBAC
      try {
        const { data: wsRow } = await supabase
          .from('workspaces')
          .select('id, owner_id')
          .limit(1)
          .maybeSingle();
        if (wsRow?.owner_id) {
          setWorkspaceOwnerId(wsRow.owner_id);
        }
      } catch (e) {
        console.warn('Could not determine workspace owner:', e);
      }
    }
    initSession();
  }, [ctxWorkspaceId, ctxUserId, ctxUserName, ctxUserEmail]);

  // 2. Fetch Team Members
  useEffect(() => {
    if (!workspaceId) return;
    async function loadWorkspaceMeta() {
      try {
        const members = await fetchWorkspaceTeamMembers(workspaceId);
        setTeamMembers(members || []);

        // Enhance currentUserName from teamMembers if generic or matched
        const me = (members || []).find(
          (m) =>
            m.id === (currentUserId || ctxUserId) ||
            (m as any).auth_user_id === (currentUserId || ctxUserId) ||
            (currentUserEmail && m.email?.toLowerCase() === currentUserEmail.toLowerCase())
        );
        if (me?.name && (currentUserName === 'Studio Admin' || !currentUserName)) {
          setCurrentUserName(me.name);
        }
      } catch (err) {
        console.error('Failed to load team members:', err);
      }
    }
    loadWorkspaceMeta();
  }, [workspaceId, currentUserId, currentUserEmail, ctxUserId, currentUserName]);

  // 3. Load Tasks & Folders
  const loadTasksAndFolders = useCallback(
    async (isInitial = false) => {
      if (!workspaceId) return;
      try {
        if (isInitial) setLoading(true);
        const params = new URLSearchParams({
          workspaceId,
          userId: currentUserId,
        });
        const effectiveEmail = currentUserEmail || ctxUserEmail;
        if (effectiveEmail) {
          params.append('userEmail', effectiveEmail.toLowerCase().trim());
        }

        const res = await fetch(`/api/workspace/tasks?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          const incomingFolders: TaskFolder[] = data.folders || [];
          setFolders(incomingFolders);
          setTasks(data.tasks || []);

          // Sync personal pins for the current user
          const uId = currentUserId || ctxUserId;
          const pins = new Set<string>();
          incomingFolders.forEach((f) => {
            if (Array.isArray(f.pinned_by) && uId && f.pinned_by.includes(uId)) {
              pins.add(f.id);
            }
          });
          if (uId) {
            try {
              const cached = localStorage.getItem(`fw_pinned_folders_${uId}`);
              if (cached) {
                const arr = JSON.parse(cached);
                if (Array.isArray(arr)) {
                  arr.forEach((id: string) => pins.add(id));
                }
              }
            } catch (e) {}
          }
          setUserPinnedFolderIds(pins);
        }
      } catch (err) {
        console.error('Failed to load tasks and folders:', err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [workspaceId, currentUserId, currentUserEmail, ctxUserEmail, ctxUserId]
  );

  useEffect(() => {
    loadTasksAndFolders(true);
  }, [loadTasksAndFolders]);

  // 4. Metrics Calculation (Groups, Total Tasks, Overdue, Today, Completed)
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let todayDue = 0;

    const activeTasks = tasks.filter((t) => !t.is_trashed);
    const activeFolders = folders.filter((f) => !f.is_trashed);

    activeTasks.forEach((t) => {
      if (t.is_completed) {
        completed++;
      } else {
        pending++;
        if (t.due_date) {
          const due = new Date(t.due_date);
          if (due < startOfToday) {
            overdue++;
          } else if (due >= startOfToday && due <= endOfToday) {
            todayDue++;
          }
        }
      }
    });

    return {
      totalGroups: activeFolders.length,
      totalTasks: activeTasks.length,
      trashedCount: folders.filter((f) => Boolean(f.is_trashed)).length,
      completed,
      pending,
      overdue,
      todayDue,
    };
  }, [folders, tasks]);

  // 5. Filtered Folders with Date Range, Status & Team Multi-select
  const displayedFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (activeFilter === 'trash') {
      return folders.filter((f) => {
        if (!f.is_trashed) return false;
        if (query) {
          const folderTasks = tasks.filter((t) => t.folder_id === f.id);
          const matchTitle = f.title.toLowerCase().includes(query);
          const matchTasks = folderTasks.some((t) => t.title.toLowerCase().includes(query));
          if (!matchTitle && !matchTasks) return false;
        }
        return true;
      });
    }

    return folders.filter((f) => {
      if (f.is_trashed) return false;
      const folderTasks = tasks.filter((t) => t.folder_id === f.id && !t.is_trashed);

      // Primary tab filter
      if (activeFilter === 'today_overdue') {
        const hasTodayOrOverdue = folderTasks.some((t) => {
          if (t.is_completed || !t.due_date) return false;
          const due = new Date(t.due_date);
          return due <= endOfToday;
        });
        if (!hasTodayOrOverdue) return false;
      } else if (activeFilter === 'completed') {
        const hasCompleted = folderTasks.length > 0 && folderTasks.some((t) => t.is_completed);
        if (!hasCompleted) return false;
      }

      // Advanced Date Range Filter
      if (advancedFilters.startDate) {
        const start = new Date(advancedFilters.startDate);
        const matchesDate = folderTasks.some((t) => t.due_date && new Date(t.due_date) >= start);
        if (!matchesDate) return false;
      }
      if (advancedFilters.endDate) {
        const end = new Date(advancedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        const matchesDate = folderTasks.some((t) => t.due_date && new Date(t.due_date) <= end);
        if (!matchesDate) return false;
      }

      // Advanced Status Filter
      if (advancedFilters.statusList.length > 0) {
        const matchesStatus = folderTasks.some((t) => {
          return advancedFilters.statusList.some((s) => {
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
        if (!matchesStatus) return false;
      }

      // Advanced Team Member Filter
      if (advancedFilters.teamMemberIds.length > 0) {
        const folderMembers = Array.isArray(f.assigned_members) ? f.assigned_members : [];
        const matchesFolderMember = advancedFilters.teamMemberIds.some((id) => folderMembers.includes(id));
        const matchesTaskMember = folderTasks.some((t) => {
          const members = Array.isArray(t.assigned_members) ? t.assigned_members : [];
          return advancedFilters.teamMemberIds.some((id) => members.includes(id) || t.assigned_to === id);
        });
        if (!matchesFolderMember && !matchesTaskMember) return false;
      }

      // Search query
      if (query) {
        const matchTitle = f.title.toLowerCase().includes(query);
        const matchTasks = folderTasks.some((t) => t.title.toLowerCase().includes(query));
        if (!matchTitle && !matchTasks) return false;
      }

      return true;
    });
  }, [folders, tasks, activeFilter, searchQuery, advancedFilters]);

  const activeFilterCount =
    (advancedFilters.startDate ? 1 : 0) +
    (advancedFilters.endDate ? 1 : 0) +
    advancedFilters.statusList.length +
    advancedFilters.teamMemberIds.length;

  const isWorkspaceAdmin = Boolean(
    ctxIsOwner ||
    ctxUserRole === 'OWNER' ||
    ctxUserRole === 'ADMIN' ||
    currentUserEmail?.toLowerCase() === 'filmifyweddings@gmail.com' ||
    (workspaceOwnerId && currentUserId && workspaceOwnerId === currentUserId) ||
    (!workspaceOwnerId && ctxWorkspaceId && currentUserId && ctxWorkspaceId === currentUserId)
  );

  const pinnedFolders = useMemo(
    () => displayedFolders.filter((f) => userPinnedFolderIds.has(f.id)),
    [displayedFolders, userPinnedFolderIds]
  );
  const otherFolders = useMemo(
    () => displayedFolders.filter((f) => !userPinnedFolderIds.has(f.id)),
    [displayedFolders, userPinnedFolderIds]
  );

  // 6. Optimistic Handlers (Instant 0ms Updates)

  // Create Folder
  const handleSaveFolder = async (folderData: Partial<TaskFolder>) => {
    const res = await fetch('/api/workspace/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_folder',
        actorName: currentUserName,
        actorEmail: currentUserEmail,
        folderData: {
          ...folderData,
          workspace_id: workspaceId,
          created_by: currentUserId,
          is_trashed: false,
        },
      }),
    });
    const data = await res.json();
    if (data.success && data.folder) {
      setFolders((prev) => [data.folder, ...prev]);
    }
  };

  // Update Folder
  const handleUpdateFolder = async (folderId: string, updates: Partial<TaskFolder>) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...updates } : f)));
    if (selectedFolderForModal?.id === folderId) {
      setSelectedFolderForModal((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await fetch('/api/workspace/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'folder',
          id: folderId,
          updates,
          actorName: currentUserName,
          actorEmail: currentUserEmail,
        }),
      });
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  };

  // Toggle Pin Folder (Personal Per-User Pinning)
  const handleTogglePinFolder = async (folderId: string, isPinned: boolean) => {
    // 1. Instant optimistic update for current user
    const updatedPins = new Set(userPinnedFolderIds);
    if (isPinned) {
      updatedPins.add(folderId);
    } else {
      updatedPins.delete(folderId);
    }
    setUserPinnedFolderIds(updatedPins);
    if (currentUserId) {
      try {
        localStorage.setItem(
          `fw_pinned_folders_${currentUserId}`,
          JSON.stringify(Array.from(updatedPins))
        );
      } catch (e) {}
    }

    // 2. Update folder.pinned_by in memory
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const prevPinnedBy = Array.isArray(f.pinned_by) ? f.pinned_by : [];
        const nextPinnedBy = isPinned
          ? Array.from(new Set([...prevPinnedBy, currentUserId]))
          : prevPinnedBy.filter((id) => id !== currentUserId);
        return { ...f, pinned_by: nextPinnedBy };
      })
    );

    // 3. Persist to API
    try {
      await fetch('/api/workspace/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'personal_pin',
          id: folderId,
          userId: currentUserId,
          isPinned,
          actorName: currentUserName,
          actorEmail: currentUserEmail,
        }),
      });
    } catch (err) {
      console.error('Failed to toggle pin for folder:', err);
    }
  };

  // Toggle Member Edit Permissions
  const handleToggleMemberEdits = async (folderId: string, allowEdits: boolean) => {
    await handleUpdateFolder(folderId, { allow_member_edits: allowEdits });
  };

  // Delete Folder (Move to Trash / Soft delete, or permanent delete)
  const handleDeleteFolder = async (folderId: string, permanent: boolean = false) => {
    if (permanent) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setTasks((prev) => prev.filter((t) => t.folder_id !== folderId));
      if (selectedFolderForModal?.id === folderId) {
        setSelectedFolderForModal(null);
      }

      try {
        await fetch(`/api/workspace/tasks?id=${folderId}&type=folder&permanent=true`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to permanently delete folder:', err);
      }
      return;
    }

    // Soft delete -> move to trash
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, is_trashed: true, trashed_at: new Date().toISOString() } : f))
    );
    setTasks((prev) =>
      prev.map((t) => (t.folder_id === folderId ? { ...t, is_trashed: true } : t))
    );
    if (selectedFolderForModal?.id === folderId) {
      setSelectedFolderForModal(null);
    }

    try {
      await fetch(`/api/workspace/tasks?id=${folderId}&type=folder`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  // Restore Folder from Trash
  const handleRestoreFolder = async (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, is_trashed: false, trashed_at: null } : f))
    );
    setTasks((prev) =>
      prev.map((t) => (t.folder_id === folderId ? { ...t, is_trashed: false } : t))
    );

    try {
      await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore_folder',
          folderId,
        }),
      });
    } catch (err) {
      console.error('Failed to restore folder:', err);
    }
  };

  // Empty Trash permanently
  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all items in Trash? This cannot be undone.')) {
      return;
    }

    setFolders((prev) => prev.filter((f) => !f.is_trashed));
    setTasks((prev) => prev.filter((t) => !t.is_trashed));

    try {
      await fetch(`/api/workspace/tasks?type=empty_trash&workspaceId=${workspaceId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  // Add Task to Folder (Date only, guaranteed resilience)
  const handleAddTaskToFolder = async (
    folderId: string,
    title: string,
    dueDate?: string | null
  ) => {
    const tempId = 'temp-' + Date.now();
    const targetFolder = folders.find((f) => f.id === folderId);
    const folderMembers = targetFolder?.assigned_members || [];
    const effectiveWsId = targetFolder?.workspace_id || workspaceId;

    const optimisticTask: TaskItem = {
      id: tempId,
      workspace_id: effectiveWsId,
      folder_id: folderId,
      title,
      due_date: dueDate || null,
      due_time: null,
      assigned_members: folderMembers,
      assigned_to: null,
      category: 'GENERAL',
      priority: 'medium',
      status: 'todo',
      is_completed: false,
      is_personal: false,
      is_trashed: false,
      color: 'white',
      created_by: currentUserId,
      checklist_items: [],
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, optimisticTask]);

    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          actorName: currentUserName,
          actorEmail: currentUserEmail,
          taskData: {
            title,
            due_date: dueDate || null,
            folder_id: folderId,
            assigned_members: folderMembers,
            workspace_id: effectiveWsId,
            created_by: currentUserId,
            category: 'GENERAL',
            priority: 'medium',
            status: 'todo',
            is_personal: false,
            is_trashed: false,
            actor_name: currentUserName,
            actor_email: currentUserEmail,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? data.task : t)));
      } else {
        console.warn('Task create failed on server:', data.error);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        alert(data.error || 'Failed to save task to database');
      }
    } catch (err: any) {
      console.error('Failed to add task:', err);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert(err.message || 'Network error while adding task');
    }
  };

  // Toggle Task Completion
  const handleToggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              is_completed: isCompleted,
              status: isCompleted ? 'completed' : 'todo',
            }
          : t
      )
    );

    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_completion',
          taskId,
          isCompleted,
          userId: currentUserId,
          actorName: currentUserName,
          actorEmail: currentUserEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
        );
      } else {
        console.error('Failed to toggle completion on server:', data.error);
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  is_completed: !isCompleted,
                  status: !isCompleted ? 'completed' : 'todo',
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                is_completed: !isCompleted,
                status: !isCompleted ? 'completed' : 'todo',
              }
            : t
        )
      );
    }
  };

  // Update Task
  const handleUpdateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? ({ ...t, ...updates } as TaskItem) : t)));

    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          id: taskId,
          updates,
          userId: currentUserId,
          actorName: currentUserName,
          actorEmail: currentUserEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await fetch(`/api/workspace/tasks?id=${taskId}&type=task`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#FAF8F5] dark:bg-[#151311] overflow-hidden">
      {/* ── Header: Title, Search, Filter (Icon only) & + New Folder (Icon only) ── */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-[#EAE5DA] dark:border-[#2C2824] px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 shadow-2xs">
        {/* Left: Title & Icon */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight shrink-0">
            Tasks & Notes
          </h1>
        </div>

        {/* Right: Search, Filter (Icon only), + New Folder (Icon only) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end max-w-md">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[110px] max-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7.5 pr-2.5 py-1.5 bg-[#FAF8F5] dark:bg-stone-800 border border-slate-300 dark:border-stone-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pop-up Button: ICON ONLY */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`relative p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs shrink-0 ${
              activeFilterCount > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-950 dark:text-amber-200'
                : 'bg-[#FAF8F5] dark:bg-stone-800 border-slate-300 dark:border-stone-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-stone-700'
            }`}
            title="Filter by Date, Status, or Team"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* New Folder Button: ICON ONLY */}
          <button
            type="button"
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="p-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-xs transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            title="Create New Folder / Group"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* ── Clean Top Stats Bar ── */}
      <section className="flex-shrink-0 bg-[#FAF8F5] dark:bg-[#181614] border-b border-[#EAE5DA] dark:border-[#26221E] px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none text-xs font-bold">
          {/* Total Groups */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 shadow-2xs shrink-0">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500">Groups:</span>
            <span className="text-slate-900 dark:text-white">{metrics.totalGroups}</span>
          </div>

          {/* Total Tasks */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 shadow-2xs shrink-0">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500">Total Tasks:</span>
            <span className="text-slate-900 dark:text-white">{metrics.totalTasks}</span>
          </div>

          {/* Overdue */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border shadow-2xs shrink-0 ${
              metrics.overdue > 0
                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 animate-pulse'
                : 'bg-white dark:bg-stone-900 border-slate-200 dark:border-stone-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Overdue:</span>
            <span className="font-extrabold">{metrics.overdue}</span>
          </div>

          {/* Due Today */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 shadow-2xs shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Due Today:</span>
            <span className="font-extrabold">{metrics.todayDue}</span>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 shadow-2xs shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed:</span>
            <span className="font-extrabold">{metrics.completed}</span>
          </div>
        </div>
      </section>

      {/* ── Main Content: Sidebar + Google Keep Cards Masonry Board ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop when expanded on small screens */}
        {isSidebarExpanded && (
          <div
            className="fixed inset-0 z-20 sm:hidden bg-black/20 backdrop-blur-xs"
            onClick={() => setIsSidebarExpanded(false)}
          />
        )}

        {/* Collapsible Left Sidebar */}
        <aside
          onMouseEnter={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 640) {
              setIsSidebarExpanded(true);
            }
          }}
          onMouseLeave={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 640) {
              setIsSidebarExpanded(false);
            }
          }}
          className={`relative z-30 shrink-0 flex flex-col bg-[#FAF8F5] dark:bg-[#1A1816] border-r border-[#EFEBE4] dark:border-[#2C2824] p-2 space-y-2 select-none transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'w-52 shadow-xl sm:shadow-none' : 'w-12 sm:w-14'
          }`}
        >
          <div className="flex items-center justify-between px-1.5 py-1 min-h-[24px]">
            {isSidebarExpanded ? (
              <>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                  Views
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarExpanded(false);
                  }}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarExpanded(true);
                }}
                className="w-full flex justify-center py-0.5 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                title="Expand sidebar"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('all');
            }}
            title="All Groups"
            className={`w-full flex items-center ${
              isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
            } rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-stone-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FolderOpen className="w-4 h-4 shrink-0" />
              {isSidebarExpanded && <span className="truncate">All Groups</span>}
            </div>
            {isSidebarExpanded && (
              <span className="text-[10px] font-mono shrink-0 ml-1">{metrics.totalGroups}</span>
            )}
            {!isSidebarExpanded && metrics.totalGroups > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-slate-900/10 dark:bg-white/20 text-[9px] font-mono flex items-center justify-center">
                {metrics.totalGroups}
              </span>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('today_overdue');
            }}
            title="Overdue & Today"
            className={`w-full flex items-center ${
              isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
            } rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeFilter === 'today_overdue'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-stone-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {isSidebarExpanded && <span className="truncate">Overdue & Today</span>}
            </div>
            {isSidebarExpanded && (metrics.overdue > 0 || metrics.todayDue > 0) && (
              <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                {metrics.overdue + metrics.todayDue}
              </span>
            )}
            {!isSidebarExpanded && (metrics.overdue > 0 || metrics.todayDue > 0) && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {metrics.overdue + metrics.todayDue}
              </span>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('completed');
            }}
            title="Completed"
            className={`w-full flex items-center ${
              isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
            } rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeFilter === 'completed'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-stone-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              {isSidebarExpanded && <span className="truncate">Completed</span>}
            </div>
            {isSidebarExpanded && metrics.completed > 0 && (
              <span className="text-[10px] font-mono shrink-0 ml-1">{metrics.completed}</span>
            )}
            {!isSidebarExpanded && metrics.completed > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {metrics.completed}
              </span>
            )}
          </button>

          {/* Trash Menu Item */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveFilter('trash');
            }}
            title="Trash Bin"
            className={`w-full flex items-center ${
              isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
            } rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeFilter === 'trash'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-stone-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
              {isSidebarExpanded && <span className="truncate">Trash</span>}
            </div>
            {isSidebarExpanded && metrics.trashedCount > 0 && (
              <span className="text-[10px] font-mono shrink-0 ml-1">{metrics.trashedCount}</span>
            )}
            {!isSidebarExpanded && metrics.trashedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {metrics.trashedCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-stone-800">
              {isSidebarExpanded ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdvancedFilters({
                      statusList: [],
                      teamMemberIds: [],
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-amber-600 hover:underline cursor-pointer truncate"
                >
                  Clear Filters ({activeFilterCount})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdvancedFilters({
                      statusList: [],
                      teamMemberIds: [],
                    });
                  }}
                  title={`Clear ${activeFilterCount} filters`}
                  className="w-full flex justify-center p-2 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Google Keep Cards Board */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAF8F5] dark:bg-[#151311]">
          {/* Trash Bin Header Banner */}
          {activeFilter === 'trash' && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Trash Bin ({displayedFolders.length} deleted cards) — Items can be recovered or permanently deleted.</span>
              </div>
              {displayedFolders.length > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="self-start sm:self-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Trash</span>
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : displayedFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-600 flex items-center justify-center shadow-inner">
                <FolderOpen className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {activeFilter === 'trash' ? 'Trash is empty' : 'No folders / groups found'}
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm">
                {activeFilter === 'trash'
                  ? 'Deleted cards will appear here. You can recover them anytime.'
                  : activeFilterCount > 0
                  ? 'No tasks match the active filters. Try adjusting or resetting filters.'
                  : 'Create a folder (e.g. Navnath Task, Post Production Work) to start adding tasks with deadlines.'}
              </p>
              {activeFilter !== 'trash' && (
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAdvancedFilters({
                        statusList: [],
                        teamMemberIds: [],
                      })
                    }
                    className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Create First Folder
                  </button>
                )
              )}
            </div>
          ) : activeFilter !== 'trash' && pinnedFolders.length > 0 ? (
            <div className="space-y-8">
              {/* ── PINNED SECTION ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Pinned ({pinnedFolders.length})</span>
                </div>
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
                  {pinnedFolders.map((folder) => {
                    const folderTasks = tasks.filter((t) => t.folder_id === folder.id);
                    return (
                      <div key={folder.id} className="break-inside-avoid mb-4">
                        <GoogleKeepFolderCard
                          folder={folder}
                          tasks={folderTasks}
                          isPinned={userPinnedFolderIds.has(folder.id)}
                          teamMembers={teamMembers}
                          currentUserId={currentUserId}
                          currentUserName={currentUserName}
                          currentUserEmail={currentUserEmail}
                          isWorkspaceAdmin={isWorkspaceAdmin}
                          isTrashView={false}
                          onOpenFolder={(f) => setSelectedFolderForModal(f)}
                          onToggleTaskCompletion={handleToggleTaskCompletion}
                          onQuickAddTask={handleAddTaskToFolder}
                          onDeleteFolder={handleDeleteFolder}
                          onRestoreFolder={handleRestoreFolder}
                          onPermanentDeleteFolder={(id) => handleDeleteFolder(id, true)}
                          onTogglePin={handleTogglePinFolder}
                          onToggleMemberEdits={handleToggleMemberEdits}
                          onOpenHistory={(f) => setHistoryFolder(f)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── OTHERS SECTION ── */}
              {otherFolders.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Others ({otherFolders.length})
                  </div>
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
                    {otherFolders.map((folder) => {
                      const folderTasks = tasks.filter((t) => t.folder_id === folder.id);
                      return (
                        <div key={folder.id} className="break-inside-avoid mb-4">
                          <GoogleKeepFolderCard
                            folder={folder}
                            tasks={folderTasks}
                            isPinned={userPinnedFolderIds.has(folder.id)}
                            teamMembers={teamMembers}
                            currentUserId={currentUserId}
                            currentUserName={currentUserName}
                            currentUserEmail={currentUserEmail}
                            isWorkspaceAdmin={isWorkspaceAdmin}
                            isTrashView={false}
                            onOpenFolder={(f) => setSelectedFolderForModal(f)}
                            onToggleTaskCompletion={handleToggleTaskCompletion}
                            onQuickAddTask={handleAddTaskToFolder}
                            onDeleteFolder={handleDeleteFolder}
                            onRestoreFolder={handleRestoreFolder}
                            onPermanentDeleteFolder={(id) => handleDeleteFolder(id, true)}
                            onTogglePin={handleTogglePinFolder}
                            onToggleMemberEdits={handleToggleMemberEdits}
                            onOpenHistory={(f) => setHistoryFolder(f)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
              {displayedFolders.map((folder) => {
                const folderTasks = tasks.filter((t) => t.folder_id === folder.id);
                return (
                  <div key={folder.id} className="break-inside-avoid mb-4">
                    <GoogleKeepFolderCard
                      folder={folder}
                      tasks={folderTasks}
                      isPinned={userPinnedFolderIds.has(folder.id)}
                      teamMembers={teamMembers}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      currentUserEmail={currentUserEmail}
                      isWorkspaceAdmin={isWorkspaceAdmin}
                      isTrashView={activeFilter === 'trash'}
                      onOpenFolder={(f) => {
                        if (activeFilter !== 'trash') {
                          setSelectedFolderForModal(f);
                        }
                      }}
                      onToggleTaskCompletion={handleToggleTaskCompletion}
                      onQuickAddTask={handleAddTaskToFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onRestoreFolder={handleRestoreFolder}
                      onPermanentDeleteFolder={(id) => handleDeleteFolder(id, true)}
                      onTogglePin={handleTogglePinFolder}
                      onToggleMemberEdits={handleToggleMemberEdits}
                      onOpenHistory={(f) => setHistoryFolder(f)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Centered Google Keep Folder Modal ── */}
      {selectedFolderForModal && (
        <GoogleKeepFolderModal
          folder={selectedFolderForModal}
          tasks={tasks}
          isOpen={true}
          onClose={() => setSelectedFolderForModal(null)}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          onAddTask={handleAddTaskToFolder}
          onToggleTaskCompletion={handleToggleTaskCompletion}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          isWorkspaceAdmin={isWorkspaceAdmin}
          isPinned={userPinnedFolderIds.has(selectedFolderForModal.id)}
          onTogglePin={handleTogglePinFolder}
          onOpenHistory={(f) => setHistoryFolder(f)}
        />
      )}

      {/* ── Folder History & Audit Log Modal ── */}
      {historyFolder && (
        <FolderHistoryModal
          folder={historyFolder}
          isOpen={true}
          onClose={() => setHistoryFolder(null)}
          teamMembers={teamMembers}
        />
      )}

      {/* ── Filter Modal ── */}
      <TaskFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={advancedFilters}
        onApplyFilters={(newFilters) => setAdvancedFilters(newFilters)}
        teamMembers={teamMembers}
      />

      {/* ── Create Folder Modal ── */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSave={handleSaveFolder}
        teamMembers={teamMembers}
      />
    </div>
  );
}
