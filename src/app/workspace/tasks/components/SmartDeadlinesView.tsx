'use client';

import React from 'react';
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  ChevronRight,
  User,
  Check,
} from 'lucide-react';
import { TaskItem } from '@/lib/services/taskService';

interface SmartDeadlinesViewProps {
  tasks: TaskItem[];
  onToggleCompletion: (taskId: string, isCompleted: boolean) => void;
  onOpenTaskDetail: (task: TaskItem) => void;
}

export function SmartDeadlinesView({
  tasks,
  onToggleCompletion,
  onOpenTaskDetail,
}: SmartDeadlinesViewProps) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

  // End of this week (Sunday)
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const endOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);

  // End of next week
  const endOfNextWeek = new Date(endOfThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Categorize uncompleted tasks with due dates
  const activeTasks = tasks.filter((t) => !t.is_completed && !t.is_archived);

  const overdue = activeTasks.filter((t) => t.due_date && new Date(t.due_date) < startOfToday);
  const today = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= startOfToday && d <= endOfToday;
  });
  const tomorrow = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d > endOfToday && d <= endOfTomorrow;
  });
  const thisWeek = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d > endOfTomorrow && d <= endOfThisWeek;
  });
  const nextWeek = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d > endOfThisWeek && d <= endOfNextWeek;
  });
  const later = activeTasks.filter((t) => {
    if (!t.due_date) return true; // No deadline = later
    const d = new Date(t.due_date);
    return d > endOfNextWeek;
  });

  const sections = [
    { title: 'Overdue', count: overdue.length, items: overdue, color: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', icon: AlertCircle },
    { title: "Today's Tasks", count: today.length, items: today, color: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200', icon: Clock },
    { title: 'Tomorrow', count: tomorrow.length, items: tomorrow, color: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300', icon: Calendar },
    { title: 'This Week', count: thisWeek.length, items: thisWeek, color: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', icon: Calendar },
    { title: 'Next Week', count: nextWeek.length, items: nextWeek, color: 'text-indigo-600 dark:text-indigo-400', badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300', icon: Calendar },
    { title: 'Later / No Deadline', count: later.length, items: later, color: 'text-slate-500', badgeBg: 'bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-300', icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {sections.map(
        (sec) =>
          sec.items.length > 0 && (
            <div key={sec.title} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <sec.icon className={`w-4 h-4 ${sec.color}`} />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {sec.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sec.badgeBg}`}>
                  {sec.count}
                </span>
              </div>

              <div className="space-y-1.5">
                {sec.items.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onOpenTaskDetail(task)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs hover:shadow-xs transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompletion(task.id, true);
                        }}
                        className="w-4 h-4 rounded border border-slate-300 dark:border-stone-600 hover:border-amber-500 flex items-center justify-center transition shrink-0 cursor-pointer"
                      >
                        {task.is_completed && <Check className="w-3 h-3 text-amber-600" />}
                      </button>

                      {/* Title & Client */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 transition">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          {task.client && <span>{task.client.name}</span>}
                          {task.category && <span>• {task.category.replace('_', ' ')}</span>}
                          {task.checklist_items?.length > 0 && (
                            <span>
                              • {task.checklist_items.filter((i) => i.done).length}/{task.checklist_items.length} items
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deadline time & Assignee */}
                    <div className="flex items-center gap-3 shrink-0">
                      {task.due_time && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-stone-400">
                          {task.due_time}
                        </span>
                      )}
                      {task.assigned_to && (
                        <div
                          className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs"
                          title={`Assigned to ${task.assignee?.name || 'Member'}`}
                        >
                          {(task.assignee?.name || 'TM').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {activeTasks.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            🎉
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">You&apos;re all caught up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">No pending deadlines for today or upcoming. Enjoy your shoot!</p>
        </div>
      )}
    </div>
  );
}
