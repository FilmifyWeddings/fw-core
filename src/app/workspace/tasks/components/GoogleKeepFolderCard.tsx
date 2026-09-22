'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Clock,
  AlertCircle,
  Calendar,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  Pin,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import {
  TaskFolder,
  TaskItem,
  PASTEL_NOTE_COLORS,
} from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface GoogleKeepFolderCardProps {
  folder: TaskFolder;
  tasks: TaskItem[];
  isPinned?: boolean;
  teamMembers?: WorkspaceMemberOption[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  isWorkspaceAdmin?: boolean;
  isTrashView?: boolean;
  onOpenFolder: (folder: TaskFolder) => void;
  onToggleTaskCompletion: (taskId: string, isCompleted: boolean) => void;
  onQuickAddTask: (folderId: string, title: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRestoreFolder?: (folderId: string) => void;
  onPermanentDeleteFolder?: (folderId: string) => void;
  onTogglePin?: (folderId: string, isPinned: boolean) => void;
  onToggleMemberEdits?: (folderId: string, allowEdits: boolean) => void;
  onOpenHistory?: (folder: TaskFolder) => void;
}

// Helper to format dynamic deadline badge (e.g. "Overdue by 2 days", "Due Today", "3 days left")
export function formatDeadlineBadge(dueDateStr?: string | null) {
  if (!dueDateStr) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
  const dueDate = new Date(dueDateStr);

  const diffMs = dueDate.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (dueDate < startOfToday) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays <= 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900',
      icon: AlertCircle,
      isOverdue: true,
    };
  }

  if (dueDate >= startOfToday && dueDate <= endOfToday) {
    return {
      text: 'Due Today',
      color: 'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800',
      icon: Clock,
      isToday: true,
    };
  }

  if (dueDate > endOfToday && dueDate <= endOfTomorrow) {
    return {
      text: '1 day left',
      color: 'text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800',
      icon: Clock,
    };
  }

  return {
    text: `${diffDays} days left`,
    color: 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800',
    icon: Calendar,
  };
}

export function GoogleKeepFolderCard({
  folder,
  tasks,
  isPinned,
  teamMembers = [],
  currentUserId,
  currentUserName,
  currentUserEmail,
  isWorkspaceAdmin = false,
  isTrashView = false,
  onOpenFolder,
  onToggleTaskCompletion,
  onQuickAddTask,
  onDeleteFolder,
  onRestoreFolder,
  onPermanentDeleteFolder,
  onTogglePin,
  onToggleMemberEdits,
  onOpenHistory,
}: GoogleKeepFolderCardProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCreatorPopover, setShowCreatorPopover] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const creatorPopoverRef = useRef<HTMLDivElement>(null);

  // Close 3-dots dropdown menu and creator popover when clicking anywhere outside
  useEffect(() => {
    if (!showMenu && !showCreatorPopover) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
      if (creatorPopoverRef.current && !creatorPopoverRef.current.contains(target)) {
        setShowCreatorPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu, showCreatorPopover]);

  const currentIsPinned = isPinned !== undefined ? isPinned : Boolean(folder.is_pinned);

  // Pastel Color Theme
  const colorObj =
    PASTEL_NOTE_COLORS.find((c) => c.id === folder.color_theme) || PASTEL_NOTE_COLORS[0];

  // Separate pending and completed tasks
  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  // Maximum visible tasks on the card to keep uniform size (~10 to 12 items)
  const MAX_VISIBLE_TASKS = 12;
  const visiblePendingTasks = pendingTasks.slice(0, MAX_VISIBLE_TASKS);
  const overflowTaskCount = pendingTasks.length - MAX_VISIBLE_TASKS;

  // Collaborators with profile photos (deduplicated across id, email, auth ID)
  const collaborators = teamMembers.filter((m) =>
    (folder.assigned_members || []).some(
      (assigned) =>
        assigned === m.id ||
        (m.email && assigned.toLowerCase() === m.email.toLowerCase().trim()) ||
        ((m as any).auth_user_id && assigned === (m as any).auth_user_id)
    )
  );

  // Find creator name / info to display "Assigned by: ..."
  const creatorMember = teamMembers.find(
    (m) =>
      m.id === folder.created_by ||
      (m as any).auth_user_id === folder.created_by ||
      (m.email && folder.created_by && m.email.toLowerCase() === folder.created_by?.toLowerCase())
  );

  const isCreatedByMe = Boolean(
    (currentUserId && folder.created_by && (currentUserId === folder.created_by || (creatorMember as any)?.auth_user_id === currentUserId)) ||
    (currentUserEmail && folder.creator?.email && currentUserEmail.toLowerCase().trim() === folder.creator.email.toLowerCase().trim()) ||
    (currentUserEmail && creatorMember?.email && currentUserEmail.toLowerCase().trim() === creatorMember.email.toLowerCase().trim()) ||
    (currentUserId && folder.creator?.id && currentUserId === folder.creator.id)
  );

  const creatorName =
    isCreatedByMe && currentUserName && currentUserName !== 'Studio Admin'
      ? currentUserName
      : folder.creator?.name && folder.creator.name !== 'Studio Admin'
      ? folder.creator.name
      : creatorMember?.name || 'Studio Owner';

  const creatorEmail =
    (isCreatedByMe && currentUserEmail ? currentUserEmail : null) ||
    folder.creator?.email ||
    creatorMember?.email ||
    '';

  const creatorAvatar = folder.creator?.avatar_url || creatorMember?.avatar_url || '';
  const creatorRole = folder.creator?.role || creatorMember?.role || 'Studio Owner';

  // Check if current user is an assigned collaborator on this card
  const isAssigned = (folder.assigned_members || []).some(
    (assigned) =>
      assigned === currentUserId ||
      (currentUserEmail && assigned.toLowerCase() === currentUserEmail.toLowerCase().trim()) ||
      teamMembers.some(
        (m) =>
          ((m as any).auth_user_id === currentUserId || m.id === currentUserId || (m.email && m.email.toLowerCase() === currentUserEmail?.toLowerCase())) &&
          (assigned === m.id || (m.email && assigned.toLowerCase() === m.email.toLowerCase().trim()))
      )
  );

  // Permission Check: Strictly only the actual creator of THIS card can manage permissions (toggle Member Edits or Delete).
  // If card was created by someone else (e.g. filmifyweddings created it and assigned to sushantnavle700),
  // then sushantnavle700 is NOT the creator of this card, so isCreator is FALSE and the "Member Edits" option is HIDDEN.
  const isCreator = Boolean(
    isCreatedByMe ||
    (!folder.created_by && !folder.creator?.email && isWorkspaceAdmin)
  );
  const canEditTasks = isCreator || folder.allow_member_edits !== false;

  const handleCreateTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      e.preventDefault();
      onQuickAddTask(folder.id, newTaskTitle.trim());
      setNewTaskTitle('');
    } else if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div
      onClick={() => onOpenFolder(folder)}
      className={`group relative rounded-2xl border ${colorObj.bg} ${colorObj.border} p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col select-none break-inside-avoid w-full ${
        showMenu || showCreatorPopover ? 'z-30 ring-1 ring-amber-400/40' : 'z-0'
      } ${
        currentIsPinned ? 'ring-1 ring-amber-400/70 shadow-2xs' : ''
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* ── Card Header: Title, Pin & 3-Dots Menu ── */}
        <div className="flex items-start justify-between gap-2 mb-2.5 shrink-0 relative">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
              {folder.title}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isTrashView ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreFolder?.(folder.id);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                  title="Recover / Restore folder"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Recover</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Permanently delete folder "${folder.title}"? This cannot be undone.`)) {
                      onPermanentDeleteFolder?.(folder.id);
                    }
                  }}
                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Pin Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(folder.id, !currentIsPinned);
                  }}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    currentIsPinned
                      ? 'text-amber-600 bg-amber-100/80 dark:bg-amber-950/60 opacity-100'
                      : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title={currentIsPinned ? 'Unpin from top' : 'Pin to top'}
                >
                  <Pin className={`w-3.5 h-3.5 ${currentIsPinned ? 'fill-amber-500' : ''}`} />
                </button>

                {/* 3-Dots Menu Button */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    title="More options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* 3-Dots Dropdown Menu */}
                  {showMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-50 w-56 bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
                    >
                      {/* Pin / Unpin Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onTogglePin?.(folder.id, !currentIsPinned);
                        }}
                        className="w-full px-3 py-2 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Pin className={`w-3.5 h-3.5 ${currentIsPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                          <span>{currentIsPinned ? 'Unpin Card' : 'Pin to Top'}</span>
                        </span>
                        {currentIsPinned && <span className="text-[10px] font-bold text-amber-600">Pinned</span>}
                      </button>

                      {/* History / Audit Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onOpenHistory?.(folder);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer font-medium"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        <span>View Card History</span>
                      </button>

                      {/* Member Permissions Toggle - ONLY FOR CREATOR / ADMIN */}
                      {isCreator && (
                        <div className="px-3 py-2 border-t border-stone-100 dark:border-stone-800 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Member Edits</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onToggleMemberEdits?.(folder.id, !(folder.allow_member_edits !== false));
                              }}
                              className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                folder.allow_member_edits !== false ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'
                              }`}
                            >
                              <span
                                className={`block w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform ${
                                  folder.allow_member_edits !== false ? 'translate-x-3.5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight">
                            {folder.allow_member_edits !== false
                              ? 'Members can edit tasks & dates'
                              : 'Members can only check off tasks'}
                          </p>
                        </div>
                      )}

                      {/* Delete / Trash Option - ONLY FOR CREATOR / ADMIN */}
                      {isCreator && (
                        <div className="border-t border-stone-100 dark:border-stone-800 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false);
                              onDeleteFolder(folder.id);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Move to Trash</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Task Checklist Preview (Scrollable if needed, capped at balanced height) ── */}
        <div className="space-y-1.5 mb-2 overflow-y-auto max-h-[300px] pr-0.5 scrollbar-thin">
          {visiblePendingTasks.map((task) => {
            const badge = formatDeadlineBadge(task.due_date);
            return (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTaskCompletion(task.id, true);
                }}
                className="flex items-center justify-between gap-2 py-0.5 group/item cursor-pointer text-xs text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-stone-600 group-hover/item:border-amber-500 flex items-center justify-center transition shrink-0 bg-white/50 dark:bg-stone-800/50">
                    {task.is_completed && <Check className="w-2.5 h-2.5 text-amber-600 stroke-[3]" />}
                  </span>
                  <span className="leading-tight truncate font-medium">{task.title}</span>
                </div>

                {/* Deadline Badge (Date only) */}
                {badge && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold shrink-0 ${badge.color}`}
                  >
                    <badge.icon className="w-2.5 h-2.5" />
                    <span>{badge.text}</span>
                  </span>
                )}
              </div>
            );
          })}

          {/* If there are more tasks than visible limit */}
          {overflowTaskCount > 0 && (
            <p className="text-[10px] font-semibold text-slate-400 italic pt-0.5">
              +{overflowTaskCount} more pending tasks...
            </p>
          )}

          {/* Completed Accordion */}
          {completedTasks.length > 0 && (
            <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompleted(!showCompleted);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 py-0.5 transition cursor-pointer"
              >
                {showCompleted ? (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                )}
                <span>
                  {completedTasks.length} Completed {completedTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </button>

              {showCompleted && (
                <div className="space-y-1 mt-1 pl-1">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskCompletion(task.id, false);
                      }}
                      className="flex items-center gap-2 py-0.5 group/item cursor-pointer text-xs text-slate-400 line-through"
                    >
                      <span className="w-3.5 h-3.5 rounded border border-amber-500 bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Add Task Input (Controlled by Permission) */}
          {canEditTasks ? (
            isAddingTask ? (
              <div onClick={(e) => e.stopPropagation()} className="pt-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title (Press Enter to add)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleCreateTask}
                  onBlur={() => {
                    if (!newTaskTitle.trim()) setIsAddingTask(false);
                  }}
                  className="w-full text-xs font-medium bg-white/80 dark:bg-stone-800/80 border border-amber-400 rounded-lg px-2 py-1 text-slate-900 dark:text-white outline-none shadow-inner"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingTask(true);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-slate-400 hover:text-amber-600 flex items-center gap-1 py-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add task</span>
              </button>
            )
          ) : (
            <div className="pt-1 text-[10px] text-slate-400 font-medium italic">
              Checkmark access only (Editing disabled by Admin)
            </div>
          )}
        </div>
      </div>

      {/* ── Card Footer: Creator info with Popover, Collaborators & Counts ── */}
      <div className="pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] relative">
          {/* Creator / Assigned by info with interactive hover & click popover */}
          <div
            ref={creatorPopoverRef}
            className="relative flex items-center gap-1 text-slate-500 font-medium cursor-pointer"
            onMouseEnter={() => setShowCreatorPopover(true)}
            onMouseLeave={() => setShowCreatorPopover(false)}
            onClick={(e) => {
              e.stopPropagation();
              setShowCreatorPopover(!showCreatorPopover);
            }}
          >
            <span className="text-[10px] text-slate-400">By:</span>
            <span
              className="font-bold text-slate-800 dark:text-slate-200 bg-amber-100/90 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[130px] hover:ring-1 hover:ring-amber-400 transition flex items-center gap-1"
              title="Click or hover to view creator details & email"
            >
              <span className="truncate">{creatorName}</span>
              {creatorEmail && <span className="text-[9px] text-amber-700 dark:text-amber-300 font-black">@</span>}
            </span>

            {/* Floating Popover on Hover / Click */}
            {showCreatorPopover && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-white dark:bg-[#1C1A17] rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-start gap-2.5">
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      className="w-9 h-9 rounded-full object-cover border border-amber-300 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center border border-amber-300 shrink-0 shadow-2xs">
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-black truncate">{creatorName}</h4>
                      <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded text-[9px] font-bold shrink-0">
                        {creatorRole}
                      </span>
                    </div>

                    {creatorEmail ? (
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className="text-[10px] text-slate-500 truncate font-mono" title={creatorEmail}>
                          {creatorEmail}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(creatorEmail);
                            setCopiedEmail(true);
                            setTimeout(() => setCopiedEmail(false), 2000);
                          }}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-400 hover:text-amber-600 transition cursor-pointer shrink-0"
                          title="Copy email address"
                        >
                          {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No email provided</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Task Counter Badge */}
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md shrink-0">
            {completedTasks.length}/{tasks.length} tasks
          </span>
        </div>

        {/* Assigned Team Members Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="flex items-center -space-x-1.5 shrink-0">
              {collaborators.slice(0, 4).map((m) =>
                m.avatar_url ? (
                  <img
                    key={m.id}
                    src={m.avatar_url}
                    alt={m.name}
                    title={`${m.name} (${m.role || 'Member'})`}
                    className="w-5 h-5 rounded-full object-cover border-2 border-white dark:border-stone-900 shadow-2xs"
                  />
                ) : (
                  <span
                    key={m.id}
                    title={`${m.name} (${m.role || 'Member'})`}
                    className="w-5 h-5 rounded-full bg-amber-300 text-slate-950 font-black text-[8px] flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-2xs"
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                )
              )}
            </div>

            {collaborators.length > 0 ? (
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate" title={collaborators.map(c => c.name).join(', ')}>
                {collaborators.length === 1 ? collaborators[0].name : `${collaborators[0].name} +${collaborators.length - 1}`}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">No team assigned</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
