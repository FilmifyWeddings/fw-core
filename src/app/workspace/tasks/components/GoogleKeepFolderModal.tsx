'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Plus,
  Palette,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Pin,
  MoreVertical,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import {
  TaskFolder,
  TaskItem,
  PASTEL_NOTE_COLORS,
} from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';
import { formatDeadlineBadge } from './GoogleKeepFolderCard';

interface GoogleKeepFolderModalProps {
  folder: TaskFolder;
  tasks: TaskItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateFolder: (folderId: string, updates: Partial<TaskFolder>) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onAddTask: (folderId: string, title: string, dueDate?: string | null) => Promise<void>;
  onToggleTaskCompletion: (taskId: string, isCompleted: boolean) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  teamMembers?: WorkspaceMemberOption[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  isWorkspaceAdmin?: boolean;
  isPinned?: boolean;
  onTogglePin?: (folderId: string, isPinned: boolean) => void;
  onOpenHistory?: (folder: TaskFolder) => void;
}

export function GoogleKeepFolderModal({
  folder,
  tasks,
  isOpen,
  onClose,
  onUpdateFolder,
  onDeleteFolder,
  onAddTask,
  onToggleTaskCompletion,
  onUpdateTask,
  onDeleteTask,
  teamMembers = [],
  currentUserId,
  currentUserName,
  currentUserEmail,
  isWorkspaceAdmin = false,
  isPinned,
  onTogglePin,
  onOpenHistory,
}: GoogleKeepFolderModalProps) {
  if (!isOpen || !folder) return null;

  // Folder state
  const [title, setTitle] = useState(folder.title || '');
  const [colorTheme, setColorTheme] = useState(folder.color_theme || 'amber');
  const [assignedMembers, setAssignedMembers] = useState<string[]>(folder.assigned_members || []);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreatorPopover, setShowCreatorPopover] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');

  // Editing existing task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>('');

  // Completed accordion toggle
  const [showCompleted, setShowCompleted] = useState(true);

  // Refs for click outside & date inputs
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Keep state in sync when selected folder changes
  useEffect(() => {
    setTitle(folder.title || '');
    setColorTheme(folder.color_theme || 'amber');
    setAssignedMembers(folder.assigned_members || []);
  }, [folder]);

  // Click outside to close team dropdown, color picker, and 3-dots menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(target)
      ) {
        setIsMemberDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter tasks belonging to this folder
  const folderTasks = tasks.filter((t) => t.folder_id === folder.id);
  const pendingTasks = folderTasks.filter((t) => !t.is_completed);
  const completedTasks = folderTasks.filter((t) => t.is_completed);

  // Pastel Color Theme
  const colorObj =
    PASTEL_NOTE_COLORS.find((c) => c.id === colorTheme) || PASTEL_NOTE_COLORS[0];

  // Collaborators with profile photos
  const collaborators = teamMembers.filter((m) =>
    assignedMembers.some(
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

  const currentIsPinned = isPinned !== undefined ? isPinned : Boolean(folder.is_pinned);

  // Check if current user is an assigned collaborator on this card
  const isAssigned = (assignedMembers || []).some(
    (assigned) =>
      assigned === currentUserId ||
      (currentUserEmail && assigned.toLowerCase() === currentUserEmail.toLowerCase().trim()) ||
      teamMembers.some(
        (m) =>
          ((m as any).auth_user_id === currentUserId || m.id === currentUserId || (m.email && m.email.toLowerCase() === currentUserEmail?.toLowerCase())) &&
          (assigned === m.id || (m.email && assigned.toLowerCase() === m.email.toLowerCase().trim()))
      )
  );

  // Permission Check: Strictly only the actual creator of THIS card can manage permissions (toggle Member Edits or Delete or Assign Members).
  // If card was created by someone else (e.g. filmifyweddings created it and assigned to sushantnavle700),
  // then sushantnavle700 is NOT the creator of this card, so isCreator is FALSE and the "Member Edits" option is HIDDEN.
  const isCreator = Boolean(
    isCreatedByMe ||
    (!folder.created_by && !folder.creator?.email && isWorkspaceAdmin)
  );
  const canEditTasks = isCreator || folder.allow_member_edits !== false;

  const filteredTeamMembers = teamMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  // Handle Title Blur / Auto-save
  const handleTitleBlur = () => {
    if (canEditTasks && title.trim() && title.trim() !== folder.title) {
      onUpdateFolder(folder.id, { title: title.trim() });
    }
  };

  // Handle Add Task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !canEditTasks) return;
    const cleanDate = newTaskDueDate ? `${newTaskDueDate.trim()}T00:00:00.000Z` : null;
    await onAddTask(
      folder.id,
      newTaskTitle.trim(),
      cleanDate
    );
    setNewTaskTitle('');
    setNewTaskDueDate('');
  };

  // Handle Save Edited Task - Strictly send only fields that actually changed
  const handleSaveEditTask = async (taskId: string) => {
    if (!editTaskTitle.trim() || !canEditTasks) return;
    const currentItem = tasks.find((t) => t.id === taskId);
    if (!currentItem) return;

    const oldTitle = (currentItem.title || '').trim();
    const newTitle = editTaskTitle.trim();
    const titleChanged = newTitle !== oldTitle;

    const oldDateStr = currentItem.due_date ? currentItem.due_date.split('T')[0] : '';
    const newDateStr = editTaskDueDate ? editTaskDueDate.trim() : '';
    const dateChanged = oldDateStr !== newDateStr;

    const updates: Partial<TaskItem> = {};
    if (titleChanged) {
      updates.title = newTitle;
    }
    if (dateChanged) {
      updates.due_date = newDateStr ? `${newDateStr}T00:00:00.000Z` : null;
    }

    if (Object.keys(updates).length > 0) {
      await onUpdateTask(taskId, updates);
    }
    setEditingTaskId(null);
  };

  // Start Editing Task
  const startEditTask = (task: TaskItem) => {
    if (!canEditTasks) return;
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDueDate(task.due_date ? task.due_date.split('T')[0] : '');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${colorObj.bg} ${colorObj.border} text-slate-900 dark:text-white`}
      >
        {/* ── Modal Header: Title, Pin, Color, Team, 3-Dots & Close ── */}
        <div className="relative z-30 p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3 bg-white/70 dark:bg-[#181614]/80 backdrop-blur-md shrink-0">
          <input
            type="text"
            value={title}
            disabled={!canEditTasks}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Folder Name..."
            className="text-lg sm:text-xl font-black bg-transparent outline-none text-slate-900 dark:text-white flex-1 min-w-0 disabled:opacity-80"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pin / Unpin Button */}
            <button
              type="button"
              onClick={() => {
                if (onTogglePin) {
                  onTogglePin(folder.id, !currentIsPinned);
                } else {
                  onUpdateFolder(folder.id, { is_pinned: !currentIsPinned });
                }
              }}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                currentIsPinned
                  ? 'text-amber-600 bg-amber-100/80 dark:bg-amber-950/60'
                  : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 hover:text-amber-600'
              }`}
              title={currentIsPinned ? 'Unpin from top' : 'Pin to top'}
            >
              <Pin className={`w-4 h-4 ${currentIsPinned ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Color Palette Toggle (Only for Creator / Admin) */}
            {isCreator && (
              <div className="relative" ref={colorPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Change card color"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {showColorPicker && (
                  <div className="absolute right-0 top-full mt-1 p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-2xl shadow-xl flex items-center gap-1.5 z-30">
                    {PASTEL_NOTE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setColorTheme(c.id as any);
                          onUpdateFolder(folder.id, { color_theme: c.id as any });
                          setShowColorPicker(false);
                        }}
                        className={`w-5 h-5 rounded-full border border-black/10 transition hover:scale-110 ${c.bg} ${
                          colorTheme === c.id ? 'ring-2 ring-amber-500' : ''
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Team Members Assignment Dropdown (Only for Creator / Admin) */}
            {isCreator && (
              <div className="relative" ref={memberDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1"
                  title="Manage team access"
                >
                  <Users className="w-4 h-4" />
                  {collaborators.length > 0 && (
                    <span className="text-[10px] font-bold bg-amber-400 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center">
                      {collaborators.length}
                    </span>
                  )}
                </button>

                {isMemberDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-2xl shadow-2xl z-30 space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-1">
                      Assign Team Members
                    </div>

                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search team..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {filteredTeamMembers.map((m) => {
                        const isSelected = assignedMembers.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              const updated = isSelected
                                ? assignedMembers.filter((id) => id !== m.id)
                                : [...assignedMembers, m.id];
                              setAssignedMembers(updated);
                              onUpdateFolder(folder.id, { assigned_members: updated });
                            }}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition ${
                              isSelected
                                ? 'bg-amber-100 dark:bg-amber-950/60 font-bold text-amber-950 dark:text-amber-200'
                                : 'hover:bg-slate-50 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  alt={m.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-amber-300 text-slate-950 font-bold text-[8px] flex items-center justify-center">
                                  {m.name.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <div className="truncate">
                                <span className="truncate block leading-tight">{m.name}</span>
                                {m.email && (
                                  <span className="text-[10px] text-slate-400 block truncate leading-tight">
                                    {m.email}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3-Dots Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-[#1C1A17] border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl py-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Pin / Unpin Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onTogglePin) {
                        onTogglePin(folder.id, !currentIsPinned);
                      } else {
                        onUpdateFolder(folder.id, { is_pinned: !currentIsPinned });
                      }
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Pin className={`w-3.5 h-3.5 ${currentIsPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                      <span>{currentIsPinned ? 'Unpin Card' : 'Pin to Top'}</span>
                    </span>
                    {currentIsPinned && <span className="text-[10px] font-bold text-amber-600">Pinned</span>}
                  </button>

                  {/* View History */}
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
                            onUpdateFolder(folder.id, {
                              allow_member_edits: !(folder.allow_member_edits !== false),
                            });
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

                  {/* Delete / Move to Trash - ONLY FOR CREATOR / ADMIN */}
                  {isCreator && (
                    <div className="border-t border-stone-100 dark:border-stone-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (confirm(`Delete folder "${folder.title}" and its tasks?`)) {
                            onDeleteFolder(folder.id);
                            onClose();
                          }
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

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body: Tasks List & Quick Add ── */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Add Task Input Bar (Or Notice if restricted) */}
          {canEditTasks ? (
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-black/5 dark:border-white/5 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Add a task (e.g. Photo Selection, Tanvi Video)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTask();
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                />

                {/* Direct Calendar Deadline Picker: Full button area triggers native calendar picker */}
                <div className="relative shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (dateInputRef.current) {
                        if (typeof (dateInputRef.current as any).showPicker === 'function') {
                          (dateInputRef.current as any).showPicker();
                        } else {
                          dateInputRef.current.focus();
                        }
                      }
                    }}
                    className={`relative px-2.5 py-1.5 rounded-xl border text-xs transition flex items-center gap-1.5 cursor-pointer ${
                      newTaskDueDate
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold shadow-2xs'
                        : 'border-slate-200 dark:border-stone-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-stone-800'
                    }`}
                    title="Click anywhere to set deadline"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 pointer-events-none" />
                    {newTaskDueDate ? (
                      <span className="text-[11px] pointer-events-none">
                        {new Date(newTaskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium pointer-events-none">Deadline</span>
                    )}
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      title="Click to set deadline"
                    />
                  </button>

                  {newTaskDueDate && (
                    <button
                      type="button"
                      onClick={() => setNewTaskDueDate('')}
                      className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                      title="Clear deadline"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {newTaskTitle.trim() && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCreateTask}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Add Task
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Checkmark-only access: You can complete tasks, but adding or editing tasks is restricted by Admin.</span>
            </div>
          )}

          {/* Pending Tasks List */}
          <div className="space-y-1.5">
            {pendingTasks.map((task) => {
              const badge = formatDeadlineBadge(task.due_date);
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTaskCompletion(task.id, true)}
                      className="w-4 h-4 rounded border border-slate-300 dark:border-stone-600 hover:border-amber-500 flex items-center justify-center transition shrink-0 bg-white/50 dark:bg-stone-800/50 cursor-pointer"
                    >
                      {task.is_completed && <Check className="w-3 h-3 text-amber-600 stroke-[3]" />}
                    </button>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <input
                          type="text"
                          value={editTaskTitle}
                          onChange={(e) => setEditTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditTask(task.id);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          autoFocus
                          className="flex-1 text-xs sm:text-sm font-medium bg-white dark:bg-stone-800 border border-amber-400 rounded px-1.5 py-0.5 outline-none"
                        />
                        <input
                          type="date"
                          value={editTaskDueDate}
                          onChange={(e) => setEditTaskDueDate(e.target.value)}
                          className="text-xs bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditTask(task.id)}
                          className="p-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 cursor-pointer"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded text-xs cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          if (canEditTasks) startEditTask(task);
                        }}
                        className={`text-xs sm:text-sm font-medium leading-snug truncate ${
                          canEditTasks ? 'cursor-pointer hover:text-amber-700 dark:hover:text-amber-300' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      {badge && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}
                        >
                          <badge.icon className="w-3 h-3" />
                          <span>{badge.text}</span>
                        </span>
                      )}

                      {canEditTasks && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEditTask(task)}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title="Edit task"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {pendingTasks.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                No active tasks in this folder.
              </div>
            )}
          </div>

          {/* Completed Tasks Accordion */}
          {completedTasks.length > 0 && (
            <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              >
                {showCompleted ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Completed Tasks ({completedTasks.length})</span>
              </button>

              {showCompleted && (
                <div className="space-y-1 pl-2">
                  {completedTasks.map((ct) => (
                    <div
                      key={ct.id}
                      className="flex items-center justify-between gap-3 p-1.5 rounded-lg group text-slate-400 line-through text-xs"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleTaskCompletion(ct.id, false)}
                          className="w-4 h-4 rounded border border-amber-500 bg-amber-500 text-white flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </button>
                        <span className="truncate">{ct.title}</span>
                      </div>

                      {canEditTasks && (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(ct.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer: Assigned Team & Done Button with Creator Popover ── */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 flex flex-wrap items-center justify-between gap-3 shrink-0 relative">
          <div className="flex flex-wrap items-center gap-3">
            {/* Assigned by Badge with Popover on Hover / Click */}
            <div
              className="relative flex items-center gap-1.5 text-xs cursor-pointer"
              onMouseEnter={() => setShowCreatorPopover(true)}
              onMouseLeave={() => setShowCreatorPopover(false)}
              onClick={() => setShowCreatorPopover(!showCreatorPopover)}
            >
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned by:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-lg text-xs hover:ring-1 hover:ring-amber-400 transition flex items-center gap-1">
                <span>{creatorName}</span>
                {creatorEmail && <span className="text-[9px] text-amber-700 dark:text-amber-300 font-black">@</span>}
              </span>

              {/* Floating Creator Popover */}
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

            {/* Collaborators */}
            <div className="flex items-center gap-2 pl-3 border-l border-black/10 dark:border-white/10">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Team ({collaborators.length}):</span>
              <div className="flex items-center -space-x-1.5">
                {collaborators.map((m) =>
                  m.avatar_url ? (
                    <img
                      key={m.id}
                      src={m.avatar_url}
                      alt={m.name}
                      title={`${m.name} (${m.role || 'Member'})`}
                      className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-stone-900 shadow-2xs"
                    />
                  ) : (
                    <span
                      key={m.id}
                      title={`${m.name} (${m.role || 'Member'})`}
                      className="w-6 h-6 rounded-full bg-amber-300 text-slate-950 font-black text-[9px] flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-2xs"
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  )
                )}
                {collaborators.length === 0 && (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
