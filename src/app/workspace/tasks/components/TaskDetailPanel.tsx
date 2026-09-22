'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  Clock,
  Pin,
  Trash2,
  Calendar,
  AlertCircle,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Palette,
  Tag,
  User,
  ExternalLink,
  Share2,
  Folder,
  Building,
  Upload,
  Send,
  History,
  CornerDownRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  TaskItem,
  TaskChecklistItem,
  TaskComment,
  TaskActivityItem,
  TaskAttachment,
  PASTEL_NOTE_COLORS,
  PRESET_LABELS,
} from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface TaskDetailPanelProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (updates: Partial<TaskItem>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, comment: { content: string; user_name: string; mentions?: string[] }) => Promise<void>;
  teamMembers: WorkspaceMemberOption[];
  clients: Array<{ id: string; name: string; event_type?: string }>;
  currentUserName?: string;
  isMobile?: boolean;
}

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onSaveTask,
  onDeleteTask,
  onAddComment,
  teamMembers,
  clients,
  currentUserName = 'Team Member',
  isMobile = false,
}: TaskDetailPanelProps) {
  if (!isOpen || !task) return null;

  // Local form state
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [status, setStatus] = useState(task.status || 'todo');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
  const [dueTime, setDueTime] = useState(task.due_time || '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [clientId, setClientId] = useState(task.client_id || '');
  const [color, setColor] = useState(task.color || 'white');
  const [isPinned, setIsPinned] = useState(Boolean(task.is_pinned));
  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist_items || []);

  // Subtasks state (stored in checklist_items or nested hierarchy)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newNestedParentId, setNewNestedParentId] = useState<string | null>(null);
  const [newNestedTitle, setNewNestedTitle] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [newDriveTitle, setNewDriveTitle] = useState('');
  const [isAddingDriveLink, setIsAddingDriveLink] = useState(false);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>(task.comments || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Auto-save feedback state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when task prop changes
  useEffect(() => {
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setStatus(task.status || 'todo');
    setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setDueTime(task.due_time || '');
    setAssignedTo(task.assigned_to || '');
    setClientId(task.client_id || '');
    setColor(task.color || 'white');
    setIsPinned(Boolean(task.is_pinned));
    setLabels(task.labels || []);
    setChecklist(task.checklist_items || []);
    setAttachments(task.attachments || []);
    setComments(task.comments || []);
  }, [task]);

  // Debounced Auto-save handler
  const triggerAutoSave = useCallback(
    (overrides?: Partial<TaskItem>) => {
      setSaveStatus('saving');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(async () => {
        const payload: Partial<TaskItem> = {
          id: task.id,
          title,
          description,
          priority,
          status,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          due_time: dueTime || null,
          assigned_to: assignedTo || null,
          client_id: clientId || null,
          color,
          is_pinned: isPinned,
          labels,
          checklist_items: checklist,
          attachments,
          ...overrides,
        };

        try {
          await onSaveTask(payload);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
          console.error('Auto-save error:', err);
          setSaveStatus('idle');
        }
      }, 700);
    },
    [task.id, title, description, priority, status, dueDate, dueTime, assignedTo, clientId, color, isPinned, labels, checklist, attachments, onSaveTask]
  );

  // Checklist item toggle
  const toggleChecklistItem = (itemId: string) => {
    const updated = checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
    setChecklist(updated);
    triggerAutoSave({ checklist_items: updated });
  };

  // Add subtask
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: TaskChecklistItem = {
      id: 'sub-' + Date.now(),
      text: newSubtaskTitle.trim(),
      done: false,
      priority: 'medium',
      status: 'todo',
      nested_items: [],
    };
    const updated = [...checklist, newSub];
    setChecklist(updated);
    setNewSubtaskTitle('');
    triggerAutoSave({ checklist_items: updated });
  };

  // Add nested child subtask
  const handleAddNestedSubtask = (parentId: string) => {
    if (!newNestedTitle.trim()) return;
    const childItem: TaskChecklistItem = {
      id: 'child-' + Date.now(),
      text: newNestedTitle.trim(),
      done: false,
      priority: 'medium',
      status: 'todo',
    };

    const updated = checklist.map((item) => {
      if (item.id === parentId) {
        return {
          ...item,
          nested_items: [...(item.nested_items || []), childItem],
        };
      }
      return item;
    });

    setChecklist(updated);
    setNewNestedTitle('');
    setNewNestedParentId(null);
    triggerAutoSave({ checklist_items: updated });
  };

  // Toggle nested child subtask
  const toggleNestedChild = (parentId: string, childId: string) => {
    const updated = checklist.map((item) => {
      if (item.id === parentId && item.nested_items) {
        return {
          ...item,
          nested_items: item.nested_items.map((c) => (c.id === childId ? { ...c, done: !c.done } : c)),
        };
      }
      return item;
    });
    setChecklist(updated);
    triggerAutoSave({ checklist_items: updated });
  };

  // Add Drive link
  const handleAddDriveLink = () => {
    if (!newDriveUrl.trim()) return;
    const newAtt: TaskAttachment = {
      id: 'att-' + Date.now(),
      name: newDriveTitle.trim() || 'Google Drive Asset',
      url: newDriveUrl.trim(),
      type: 'drive',
      created_at: new Date().toISOString(),
    };
    const updated = [...attachments, newAtt];
    setAttachments(updated);
    setNewDriveUrl('');
    setNewDriveTitle('');
    setIsAddingDriveLink(false);
    triggerAutoSave({ attachments: updated });
  };

  // Add Comment
  const handlePostComment = async () => {
    if (!newCommentText.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const mentions = newCommentText.match(/@([\w.-]+)/g) || [];
      await onAddComment(task.id, {
        content: newCommentText.trim(),
        user_name: currentUserName,
        mentions,
      });

      const optimisticComment: TaskComment = {
        id: 'cmt-' + Date.now(),
        task_id: task.id,
        user_name: currentUserName,
        content: newCommentText.trim(),
        mentions,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimisticComment]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Color selection
  const selectedColorObj = PASTEL_NOTE_COLORS.find((c) => c.id === color) || PASTEL_NOTE_COLORS[0];

  // Checklist counts & progress
  const completedCount = checklist.filter((i) => i.done).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${
          isMobile ? 'h-full max-w-none' : 'max-w-2xl h-full'
        } ${selectedColorObj.bg} text-slate-900 dark:text-white flex flex-col shadow-2xl overflow-hidden border-l border-slate-200 dark:border-stone-800 transition-all duration-300 animate-in slide-in-from-right`}
      >
        {/* ── Header ── */}
        <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-slate-500 hover:text-slate-800"
              title="Close panel"
            >
              {isMobile ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
              {task.category === 'NOTE' ? 'Note Details' : 'Task Details'}
            </span>
          </div>

          {/* Auto-save Status Indicator */}
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="text-[11px] font-semibold text-amber-600 animate-pulse flex items-center gap-1">
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isPinned;
                setIsPinned(next);
                triggerAutoSave({ is_pinned: next });
              }}
              className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer ${
                isPinned ? 'text-amber-600' : 'text-slate-400'
              }`}
              title={isPinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Color Picker Dropdown */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              {PASTEL_NOTE_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setColor(c.id);
                    triggerAutoSave({ color: c.id });
                  }}
                  className={`w-4 h-4 rounded-full border border-black/10 transition hover:scale-110 ${c.bg} ${
                    color === c.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to delete this task?')) {
                  onDeleteTask(task.id);
                  onClose();
                }
              }}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Body: Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Description (Auto-save) */}
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                triggerAutoSave({ title: e.target.value });
              }}
              placeholder="Task Title..."
              className="w-full text-xl sm:text-2xl font-black bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 leading-tight"
            />

            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                triggerAutoSave({ description: e.target.value });
              }}
              rows={3}
              placeholder="Add description or notes..."
              className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 font-normal leading-relaxed resize-none"
            />
          </div>

          {/* ── Metadata Pill Bar ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
            {/* Due Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  triggerAutoSave({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null });
                }}
                className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
              />
            </div>

            {/* Due Time */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  triggerAutoSave({ due_time: e.target.value });
                }}
                className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as any;
                  setPriority(p);
                  triggerAutoSave({ priority: p });
                }}
                className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => {
                  setAssignedTo(e.target.value);
                  triggerAutoSave({ assigned_to: e.target.value || null });
                }}
                className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role || 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Client & Project Linking ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Link to Client / Wedding
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  triggerAutoSave({ client_id: e.target.value || null });
                }}
                className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="">No Client Linked</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.event_type ? `(${c.event_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Labels / Tags ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Labels
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_LABELS.map((lbl) => {
                const isSelected = labels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => {
                      const next = isSelected ? labels.filter((l) => l !== lbl) : [...labels, lbl];
                      setLabels(next);
                      triggerAutoSave({ labels: next });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-stone-300 hover:bg-black/10'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Checklist & Subtasks Section ── */}
          <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Checklist & Subtasks
                </span>
                {checklist.length > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    {completedCount} / {checklist.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-black text-slate-500">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Subtasks Tree */}
            <div className="space-y-2 pt-1">
              {checklist.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  {/* Parent Subtask */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/70 dark:bg-stone-800/70 border border-black/5 dark:border-white/5 group transition hover:shadow-xs">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                          item.done
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'border-slate-300 dark:border-stone-600 hover:border-amber-500'
                        }`}
                      >
                        {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        className={`text-xs font-bold leading-tight select-text truncate ${
                          item.done ? 'line-through text-slate-400 dark:text-stone-500' : 'text-slate-800 dark:text-white'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Add Nested Child Subtask */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewNestedParentId(item.id);
                          setNewNestedTitle('');
                        }}
                        className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-[10px] font-bold hover:bg-amber-100 transition flex items-center gap-1"
                        title="Add nested child subtask"
                      >
                        <CornerDownRight className="w-2.5 h-2.5" />
                        <span>Add child</span>
                      </button>

                      {/* Delete Subtask */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = checklist.filter((i) => i.id !== item.id);
                          setChecklist(updated);
                          triggerAutoSave({ checklist_items: updated });
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nested Child Items (Indented) */}
                  {Array.isArray(item.nested_items) && item.nested_items.length > 0 && (
                    <div className="pl-6 space-y-1">
                      {item.nested_items.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/40 dark:bg-stone-800/40 border border-black/5 dark:border-white/5 text-xs group/child"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleNestedChild(item.id, child.id)}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                child.done
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'border-slate-300 dark:border-stone-600 hover:border-amber-500'
                              }`}
                            >
                              {child.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </button>
                            <span
                              className={`select-text ${
                                child.done ? 'line-through text-slate-400 dark:text-stone-500' : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {child.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nested Child Add Input if active */}
                  {newNestedParentId === item.id && (
                    <div className="pl-6 flex items-center gap-1.5 pt-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        placeholder="Child subtask name (e.g. Bride Photos)..."
                        value={newNestedTitle}
                        onChange={(e) => setNewNestedTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNestedSubtask(item.id);
                          if (e.key === 'Escape') setNewNestedParentId(null);
                        }}
                        autoFocus
                        className="flex-1 bg-white dark:bg-stone-800 border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNestedSubtask(item.id)}
                        className="px-2 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Subtask Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="+ Add new subtask (e.g. Photo Selection, Album Designing)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                className="flex-1 bg-white/80 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* ── Attachments & Google Drive Links ── */}
          <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attachments & Links ({attachments.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingDriveLink(!isAddingDriveLink)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Link</span>
              </button>
            </div>

            {/* Add Drive Link Input */}
            {isAddingDriveLink && (
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2 border border-black/5">
                <input
                  type="text"
                  placeholder="Link Title (e.g. Wedding Raw Photos Drive)..."
                  value={newDriveTitle}
                  onChange={(e) => setNewDriveTitle(e.target.value)}
                  className="w-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={newDriveUrl}
                    onChange={(e) => setNewDriveUrl(e.target.value)}
                    className="flex-1 bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddDriveLink}
                    className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
                  >
                    Save Link
                  </button>
                </div>
              </div>
            )}

            {/* Attachment Cards */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 hover:border-amber-400 transition group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-amber-600">
                        {att.name}
                      </p>
                      <span className="text-[10px] text-slate-400 truncate block">Click to open</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Comments & @Mentions Section ── */}
          <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Team Discussion ({comments.length})</span>
            </span>

            {/* Comment Thread */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((cmt) => (
                <div key={cmt.id} className="p-3 rounded-2xl bg-white/70 dark:bg-stone-800/70 border border-black/5 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] flex items-center justify-center font-black">
                        {cmt.user_name.slice(0, 1).toUpperCase()}
                      </span>
                      {cmt.user_name}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {new Date(cmt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-normal whitespace-pre-wrap leading-relaxed">
                    {cmt.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Add Comment Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a comment... (use @name to mention)"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment();
                }}
                className="flex-1 bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={isPostingComment || !newCommentText.trim()}
                className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Activity History ── */}
          {task.activity && task.activity.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Activity History</span>
              </span>
              <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-stone-800">
                {task.activity.slice(0, 6).map((act) => (
                  <div key={act.id} className="text-[11px] text-slate-500 dark:text-stone-400 leading-tight">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{act.description}</span>
                    <span className="text-[10px] opacity-60 ml-2">
                      {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile Sticky Bottom Action ── */}
        {isMobile && (
          <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const titlePrompt = prompt('Enter new subtask title:');
                if (titlePrompt?.trim()) {
                  const newSub: TaskChecklistItem = {
                    id: 'sub-' + Date.now(),
                    text: titlePrompt.trim(),
                    done: false,
                    priority: 'medium',
                    status: 'todo',
                  };
                  const updated = [...checklist, newSub];
                  setChecklist(updated);
                  triggerAutoSave({ checklist_items: updated });
                }
              }}
              className="flex-1 py-3 bg-amber-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Subtask</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-200 dark:bg-stone-800 text-slate-800 dark:text-white font-bold text-xs rounded-xl"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
