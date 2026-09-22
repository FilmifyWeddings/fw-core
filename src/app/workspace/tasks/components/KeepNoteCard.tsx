'use client';

import React, { useState } from 'react';
import { Check, Trash2, Edit2, Calendar } from 'lucide-react';
import { TaskItem } from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface KeepNoteCardProps {
  task: TaskItem;
  collaborators?: WorkspaceMemberOption[];
  onToggleCompletion: (taskId: string, isCompleted: boolean) => void;
  onUpdateDueDate: (taskId: string, dueDate: string | null) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
}

export function KeepNoteCard({
  task,
  collaborators = [],
  onToggleCompletion,
  onUpdateDueDate,
  onEditTask,
  onDeleteTask,
}: KeepNoteCardProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const isDone = task.is_completed;

  // Format deadline badge
  const formatDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isPast = due < startOfToday;
    const isToday = due >= startOfToday && due <= endOfToday;
    const diffDays = Math.ceil((due.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    if (isPast) {
      const daysAgo = Math.abs(diffDays);
      return {
        label: `⚠️ Overdue by ${daysAgo === 0 ? '1' : daysAgo}d`,
        className: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-black',
      };
    }
    if (isToday) {
      return {
        label: '⏰ Due Today',
        className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      };
    }
    return {
      label: `📅 ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      className:
        'bg-[#FAF8F5] dark:bg-stone-800 text-slate-700 dark:text-slate-300 border-[#EAE5DA] dark:border-stone-700 font-bold',
    };
  };

  const deadline = formatDeadline(task.due_date);

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-150 p-4 space-y-3 ${
        isDone
          ? 'bg-[#F7F5F0]/80 dark:bg-[#181614]/60 border-[#E8E3D8] dark:border-[#26221E] opacity-75'
          : 'bg-[#FDFBF7] dark:bg-[#1C1A17] border border-amber-900/15 dark:border-stone-800 hover:border-amber-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]'
      }`}
    >
      {/* ── Top Row: Checkbox, Title, Hover Actions ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleCompletion(task.id, !isDone)}
            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
              isDone
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 hover:border-amber-500 bg-white dark:bg-stone-900 shadow-2xs'
            }`}
          >
            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              onClick={() => onEditTask(task)}
              className={`text-sm font-bold leading-snug cursor-pointer transition select-none ${
                isDone
                  ? 'line-through text-slate-400 dark:text-stone-500'
                  : 'text-slate-900 dark:text-stone-100 hover:text-amber-700'
              }`}
            >
              {task.title}
            </h4>

            {task.description && (
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Hover Actions: Edit & Delete */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={() => onEditTask(task)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${task.title}"?`)) {
                onDeleteTask(task.id);
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Bottom Row: Deadline & Collaborators ── */}
      <div className="pt-2 border-t border-[#EFEBE4]/80 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
        {/* Deadline Badge / Picker */}
        <div className="relative">
          {isEditingDate ? (
            <input
              type="date"
              autoFocus
              value={task.due_date ? task.due_date.slice(0, 10) : ''}
              onChange={(e) => {
                onUpdateDueDate(task.id, e.target.value ? e.target.value : null);
                setIsEditingDate(false);
              }}
              onBlur={() => setIsEditingDate(false)}
              className="text-[11px] font-bold px-2 py-1 bg-white dark:bg-stone-800 border border-amber-400 rounded-xl outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingDate(true)}
              className={`text-[11px] px-2.5 py-0.5 rounded-lg border flex items-center gap-1 cursor-pointer transition hover:scale-105 ${
                deadline
                  ? deadline.className
                  : 'bg-[#FAF8F5] dark:bg-stone-800 text-slate-400 border-slate-200 dark:border-stone-700 font-medium'
              }`}
              title="Click to change deadline"
            >
              {deadline ? deadline.label : '+ Due Date'}
            </button>
          )}
        </div>

        {/* Stacked Collaborators Avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {collaborators.map((m) => (
              <span
                key={m.id}
                title={`${m.name} (${m.role || 'Collaborator'})`}
                className="w-5 h-5 rounded-full bg-amber-300 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white dark:border-stone-900 shadow-2xs cursor-pointer"
              >
                {m.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
