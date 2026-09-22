'use client';

import React, { useState, useRef } from 'react';
import {
  Check,
  Clock,
  Pin,
  MoreVertical,
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
} from 'lucide-react';
import {
  TaskItem,
  TaskChecklistItem,
  PASTEL_NOTE_COLORS,
} from '@/lib/services/taskService';

interface TaskCardProps {
  task: TaskItem;
  collaborators?: any[];
  onToggleCompletion: (taskId: string, isCompleted: boolean) => void;
  onUpdateDueDate?: (taskId: string, dueDate: string | null) => void;
  onUpdateChecklist?: (taskId: string, items: TaskChecklistItem[]) => void;
  onTogglePin?: (taskId: string, isPinned: boolean) => void;
  onUpdateColor?: (taskId: string, color: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskCard({
  task,
  collaborators = [],
  onToggleCompletion,
  onUpdateDueDate,
  onUpdateChecklist,
  onTogglePin,
  onUpdateColor,
  onEditTask,
  onDeleteTask,
}: TaskCardProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine card pastel background
  const colorObj = PASTEL_NOTE_COLORS.find((c) => c.id === task.color) || PASTEL_NOTE_COLORS[0];

  // Checklist counts
  const checklist = task.checklist_items || [];
  const completedChecklist = checklist.filter((i) => i.done);
  const pendingChecklist = checklist.filter((i) => !i.done);
  const progressPercent = checklist.length > 0 ? Math.round((completedChecklist.length / checklist.length) * 100) : 0;

  // Deadline calculation
  const getDeadlineBadge = () => {
    if (!task.due_date) return null;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    const dueDate = new Date(task.due_date);

    if (task.is_completed) {
      return {
        label: dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        color: 'text-slate-400 bg-slate-100 dark:bg-stone-800 dark:text-stone-400',
        icon: Check,
      };
    }

    if (dueDate < startOfToday) {
      return {
        label: 'Overdue',
        subText: dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        color: 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900',
        icon: AlertCircle,
      };
    }

    if (dueDate >= startOfToday && dueDate <= endOfToday) {
      return {
        label: 'Due Today',
        subText: task.due_time || '7:00 PM',
        color: 'text-amber-800 bg-amber-50 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
        icon: Clock,
      };
    }

    if (dueDate > endOfToday && dueDate <= endOfTomorrow) {
      return {
        label: 'Tomorrow',
        color: 'text-sky-800 bg-sky-50 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800',
        icon: Clock,
      };
    }

    return {
      label: dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      color: 'text-emerald-800 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
      icon: Calendar,
    };
  };

  const deadline = getDeadlineBadge();

  // Handle inline checklist item toggle
  const handleToggleItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!onUpdateChecklist) return;
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    onUpdateChecklist(task.id, updated);
  };

  // Handle inline checklist item addition
  const handleAddChecklistItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newChecklistText.trim()) {
      e.preventDefault();
      const newItem: TaskChecklistItem = {
        id: 'item-' + Date.now(),
        text: newChecklistText.trim(),
        done: false,
      };
      const updated = [...checklist, newItem];
      onUpdateChecklist?.(task.id, updated);
      setNewChecklistText('');
    } else if (e.key === 'Escape') {
      setIsAddingItem(false);
      setNewChecklistText('');
    }
  };

  // Comments & Attachments count
  const commentsCount = task.comments?.length || 0;
  const attachmentsCount = task.attachments?.filter((a: any) => !a?.__type || a.__type === 'attachment')?.length || 0;

  // Priority indicator
  const getPriorityDot = () => {
    switch (task.priority) {
      case 'urgent':
        return 'bg-rose-500 ring-rose-300';
      case 'high':
        return 'bg-amber-500 ring-amber-300';
      case 'medium':
        return 'bg-sky-500 ring-sky-300';
      default:
        return 'bg-slate-300 ring-slate-200';
    }
  };

  return (
    <div
      onClick={() => onEditTask(task)}
      className={`group relative rounded-2xl border ${colorObj.bg} ${colorObj.border} p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between select-none ${
        task.is_completed ? 'opacity-65' : ''
      }`}
    >
      {/* ── Top Row: Pin, Priority & Actions ── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* Priority & Labels */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full ring-2 ${getPriorityDot()}`}
            title={`Priority: ${task.priority}`}
          />
          {task.category && task.category !== 'GENERAL' && task.category !== 'NOTE' && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {task.category.replace('_', ' ')}
            </span>
          )}
          {Array.isArray(task.labels) &&
            task.labels.slice(0, 2).map((lbl) => (
              <span
                key={lbl}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-300/40"
              >
                {lbl}
              </span>
            ))}
        </div>

        {/* Pin & Action Controls */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Pin Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(task.id, !task.is_pinned);
            }}
            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer ${
              task.is_pinned ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
            }`}
            title={task.is_pinned ? 'Unpin card' : 'Pin to top'}
          >
            <Pin className={`w-3.5 h-3.5 ${task.is_pinned ? 'fill-current' : ''}`} />
          </button>

          {/* Color Palette Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Change note color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {showColorPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 p-1.5 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl shadow-lg flex items-center gap-1.5 z-20"
              >
                {PASTEL_NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onUpdateColor?.(task.id, c.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full border border-black/10 transition hover:scale-110 ${c.bg} ${
                      task.color === c.id ? 'ring-2 ring-amber-500' : ''
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* More Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl shadow-lg py-1 z-20 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEditTask(task);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-stone-800 transition"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteTask(task.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Card Title & Description ── */}
      <div className="space-y-1 mb-3">
        <h3
          className={`text-sm font-bold text-slate-900 dark:text-white leading-snug ${
            task.is_completed ? 'line-through text-slate-400 dark:text-stone-500' : ''
          }`}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 font-normal leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        )}
      </div>

      {/* ── Checklist Section ── */}
      {checklist.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {/* Progress Mini Bar */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-stone-400 mb-1">
            <span>
              {completedChecklist.length} / {checklist.length} completed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Pending Checklist Items */}
          <div className="space-y-1 pt-1">
            {pendingChecklist.slice(0, showAllChecklist ? undefined : 4).map((item) => (
              <div
                key={item.id}
                onClick={(e) => handleToggleItem(e, item.id)}
                className="flex items-start gap-2 py-0.5 group/item cursor-pointer text-xs text-slate-800 dark:text-slate-200"
              >
                <span className="w-3.5 h-3.5 mt-0.5 rounded border border-slate-300 dark:border-stone-600 flex items-center justify-center transition group-hover/item:border-amber-500 shrink-0">
                  {item.done && <Check className="w-2.5 h-2.5 text-amber-600" />}
                </span>
                <span className="leading-tight select-text">{item.text}</span>
              </div>
            ))}

            {/* Completed Items Toggle if any */}
            {completedChecklist.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllChecklist(!showAllChecklist);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-stone-300 flex items-center gap-1 transition"
                >
                  {showAllChecklist ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span>{completedChecklist.length} completed items</span>
                </button>

                {showAllChecklist && (
                  <div className="space-y-1 pt-1 pl-1">
                    {completedChecklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => handleToggleItem(e, item.id)}
                        className="flex items-start gap-2 py-0.5 cursor-pointer text-xs text-slate-400 dark:text-stone-500 line-through"
                      >
                        <span className="w-3.5 h-3.5 mt-0.5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-amber-600" />
                        </span>
                        <span className="leading-tight">{item.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inline Quick Checklist Add ── */}
      <div className="mb-2">
        {isAddingItem ? (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Add checklist item (press Enter)..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              onKeyDown={handleAddChecklistItem}
              onBlur={() => {
                if (!newChecklistText.trim()) setIsAddingItem(false);
              }}
              autoFocus
              className="w-full bg-transparent text-xs text-slate-800 dark:text-white outline-none placeholder:text-slate-400 font-medium py-0.5"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingItem(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-slate-400 hover:text-amber-600 flex items-center gap-1 py-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add item</span>
          </button>
        )}
      </div>

      {/* ── Card Footer: Deadline, Assignee, Meta ── */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
        {/* Deadline Badge */}
        {deadline ? (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${deadline.color}`}>
            <deadline.icon className="w-3 h-3" />
            <span>{deadline.label}</span>
            {deadline.subText && <span className="opacity-80">· {deadline.subText}</span>}
          </div>
        ) : (
          <span />
        )}

        {/* Assignee & Counters */}
        <div className="flex items-center gap-2">
          {/* Comments Count */}
          {commentsCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-bold" title={`${commentsCount} comments`}>
              <MessageSquare className="w-3 h-3" />
              <span>{commentsCount}</span>
            </span>
          )}

          {/* Attachments Count */}
          {attachmentsCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-bold" title={`${attachmentsCount} attachments`}>
              <Paperclip className="w-3 h-3" />
              <span>{attachmentsCount}</span>
            </span>
          )}

          {/* Assignee Avatar */}
          {task.assigned_to ? (
            <div
              className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs"
              title={`Assigned to ${task.assignee?.name || 'Team Member'}`}
            >
              {(task.assignee?.name || 'TM').slice(0, 1).toUpperCase()}
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompletion(task.id, !task.is_completed);
              }}
              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                task.is_completed
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'border-slate-300 dark:border-stone-600 hover:border-amber-500 bg-white/50'
              }`}
              title={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {task.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
