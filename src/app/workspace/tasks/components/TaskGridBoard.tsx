'use client';

import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Building,
  Film,
  Users,
  ChevronDown,
  Check,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { TaskItem, TaskFolder, TaskStatus } from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface TaskGridBoardProps {
  tasks: TaskItem[];
  activeFolder?: TaskFolder | null;
  folders: TaskFolder[];
  teamMembers: WorkspaceMemberOption[];
  viewMode: 'grid' | 'list';
  onToggleTaskCompletion: (taskId: string, isCompleted: boolean) => void;
  onUpdateTaskDueDate: (taskId: string, dueDate: string | null) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onQuickAddTask: (taskData: {
    title: string;
    due_date?: string | null;
    assigned_members?: string[];
    folder_id?: string | null;
  }) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onAddNewTask: () => void;
  emptyMessage?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  todo: {
    label: 'To Do',
    bg: 'bg-slate-100 dark:bg-stone-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-stone-700',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-900 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
  },
  review: {
    label: 'Review',
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-900 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-900 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
};

export function TaskGridBoard({
  tasks,
  activeFolder,
  folders,
  teamMembers,
  viewMode,
  onToggleTaskCompletion,
  onUpdateTaskDueDate,
  onUpdateTaskStatus,
  onQuickAddTask,
  onEditTask,
  onDeleteTask,
  onAddNewTask,
  emptyMessage,
}: TaskGridBoardProps) {
  // Inline quick task add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickMemberId, setQuickMemberId] = useState('');
  const [isAddingQuick, setIsAddingQuick] = useState(false);

  // Active date picker popover taskId
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState<string | null>(null);

  // Active status dropdown taskId
  const [editingStatusTaskId, setEditingStatusTaskId] = useState<string | null>(null);

  const formatDueDate = (dateStr?: string | null) => {
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
        style: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-black',
        isOverdue: true,
      };
    }
    if (isToday) {
      return {
        label: '⏰ Due Today',
        style: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        isToday: true,
      };
    }
    return {
      label: `📅 ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      style:
        'bg-[#F5F2EB] dark:bg-stone-800 text-slate-700 dark:text-slate-300 border-[#EAE5DA] dark:border-stone-700 font-bold',
      isOverdue: false,
    };
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    onQuickAddTask({
      title: quickTitle.trim(),
      due_date: quickDueDate || null,
      assigned_members: quickMemberId ? [quickMemberId] : [],
      folder_id: activeFolder ? activeFolder.id : null,
    });

    setQuickTitle('');
    setQuickDueDate('');
    setQuickMemberId('');
    setIsAddingQuick(false);
  };

  const totalTasksInFolder = tasks.length;
  const completedTasksInFolder = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-5">
      {/* ── Active Folder Header Banner (if folder is active) ── */}
      {activeFolder && (
        <div className="bg-[#FFFDF9] dark:bg-[#1C1A17] border border-[#EAE5DA] dark:border-[#2C2824] rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-lg shadow-2xs">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {activeFolder.title}
                </h2>
                {activeFolder.is_personal && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Personal Vault
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>
                  {completedTasksInFolder} of {totalTasksInFolder} tasks completed
                </span>
                {activeFolder.client_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-800 font-bold">
                      <Building className="w-3 h-3 text-amber-600" />
                      {activeFolder.client_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Folder Progress Bar */}
          <div className="w-full sm:w-48 space-y-1">
            <div className="flex justify-between text-[11px] font-mono font-bold text-slate-500">
              <span>Progress</span>
              <span>
                {totalTasksInFolder > 0
                  ? Math.round((completedTasksInFolder / totalTasksInFolder) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-stone-800 rounded-full overflow-hidden border border-slate-200 dark:border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                style={{
                  width: `${
                    totalTasksInFolder > 0
                      ? (completedTasksInFolder / totalTasksInFolder) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Inline Quick Add Task Row (Clean & Instant) ── */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="bg-[#FFFDF9] dark:bg-[#1C1A17] border border-[#EAE5DA] dark:border-[#2C2824] rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/10"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={
              activeFolder
                ? `Add a task to "${activeFolder.title}"... (Press Enter)`
                : 'Add a new task or note... (Press Enter)'
            }
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Due Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={quickDueDate}
              onChange={(e) => setQuickDueDate(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>

          {/* Quick Assignee Selector */}
          <select
            value={quickMemberId}
            onChange={(e) => setQuickMemberId(e.target.value)}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[140px] truncate"
          >
            <option value="">👤 Assign</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* ── Empty State ── */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100/70 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
            📝
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {emptyMessage || 'No tasks found in this view'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Use the quick-add bar above or click below to create a new task.
            </p>
          </div>
          <button
            onClick={onAddNewTask}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Task</span>
          </button>
        </div>
      ) : (
        /* ── Task Cards (Grid or List View) ── */
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3 max-w-4xl mx-auto w-full'
          }
        >
          {tasks.map((task) => {
            const dueInfo = formatDueDate(task.due_date);
            const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
            const isDone = task.is_completed;

            // Resolve assigned member names
            const assignedMembers = (task.assigned_members || []).map((id) =>
              teamMembers.find((m) => m.id === id)
            ).filter(Boolean);

            return (
              <div
                key={task.id}
                className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-200 p-5 space-y-3.5 ${
                  isDone
                    ? 'bg-[#FAF8F5]/80 dark:bg-[#181614]/60 border-[#E8E3D8] dark:border-[#26221E] opacity-80'
                    : 'bg-[#FFFDF9] dark:bg-[#1E1B18] border-[#EFEBE4] dark:border-[#2C2824] hover:shadow-md hover:border-amber-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                {/* ── Card Header: Badges & Actions ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Client Tag */}
                      {task.client && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 flex items-center gap-1 truncate max-w-[140px]">
                          <Building className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{task.client.name}</span>
                        </span>
                      )}

                      {/* Category Tag */}
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-stone-800 text-slate-700 dark:text-slate-300 border border-[#EAE5DA] dark:border-stone-700">
                        {task.category?.replace(/_/g, ' ') || 'GENERAL'}
                      </span>

                      {/* Personal Vault Badge */}
                      {task.is_personal && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Vault
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditTask(task)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${task.title}"?`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Task Title & Instant Checkbox ── */}
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleTaskCompletion(task.id, !task.is_completed)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-amber-500 bg-white dark:bg-stone-900'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4
                        onClick={() => onEditTask(task)}
                        className={`text-sm font-black leading-snug cursor-pointer transition ${
                          isDone
                            ? 'line-through text-slate-400'
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
                </div>

                {/* ── Card Footer: Due Date, Status & Assigned Members ── */}
                <div className="pt-2 border-t border-[#EFEBE4] dark:border-stone-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                  {/* Due Date Indicator / Changer */}
                  <div className="relative">
                    {editingDueDateTaskId === task.id ? (
                      <input
                        type="date"
                        autoFocus
                        value={task.due_date ? task.due_date.slice(0, 10) : ''}
                        onChange={(e) => {
                          onUpdateTaskDueDate(task.id, e.target.value ? e.target.value : null);
                          setEditingDueDateTaskId(null);
                        }}
                        onBlur={() => setEditingDueDateTaskId(null)}
                        className="text-[11px] font-bold px-2 py-1 bg-white dark:bg-stone-800 border border-amber-400 rounded-xl outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingDueDateTaskId(task.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl border flex items-center gap-1 cursor-pointer transition hover:scale-105 ${
                          dueInfo
                            ? dueInfo.style
                            : 'bg-slate-50 dark:bg-stone-800 text-slate-500 border-slate-200 dark:border-stone-700 font-medium'
                        }`}
                        title="Click to change due date"
                      >
                        {dueInfo ? dueInfo.label : '+ Add Due Date'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Assigned Members Avatar Stack */}
                    {assignedMembers.length > 0 && (
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {assignedMembers.map((m: any) => (
                          <span
                            key={m.id}
                            title={`${m.name} (${m.role || 'Crew'})`}
                            className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-2xs cursor-pointer"
                          >
                            {m.name.slice(0, 1).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status Pill / Dropdown */}
                    <div className="relative">
                      {editingStatusTaskId === task.id ? (
                        <select
                          autoFocus
                          value={task.status}
                          onChange={(e) => {
                            onUpdateTaskStatus(task.id, e.target.value as TaskStatus);
                            setEditingStatusTaskId(null);
                          }}
                          onBlur={() => setEditingStatusTaskId(null)}
                          className="text-[11px] font-bold px-2 py-1 bg-white dark:bg-stone-800 border border-amber-400 rounded-xl outline-none cursor-pointer"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingStatusTaskId(task.id)}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border cursor-pointer transition ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                          title="Click to change status"
                        >
                          {statusConfig.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
