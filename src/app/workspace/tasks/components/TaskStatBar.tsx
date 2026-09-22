'use client';

import React from 'react';
import { TaskSummaryMetrics } from '@/lib/services/taskService';

interface TaskStatBarProps {
  metrics: TaskSummaryMetrics;
}

export function TaskStatBar({ metrics }: TaskStatBarProps) {
  const stats = [
    {
      label: 'Total',
      count: metrics.total,
      dotColor: 'bg-slate-400',
      badgeClass: 'text-slate-900 dark:text-white',
      isAlert: false,
    },
    {
      label: 'Overdue',
      count: metrics.overdue,
      dotColor: 'bg-rose-500',
      badgeClass: metrics.overdue > 0 ? 'text-rose-700 dark:text-rose-400 font-black' : 'text-slate-700 dark:text-slate-300',
      isAlert: metrics.overdue > 0,
    },
    {
      label: 'Due Today',
      count: metrics.todayDue,
      dotColor: 'bg-amber-400',
      badgeClass: 'text-amber-800 dark:text-amber-300 font-bold',
      isAlert: false,
    },
    {
      label: 'Completed',
      count: metrics.completed,
      dotColor: 'bg-emerald-500',
      badgeClass: 'text-emerald-800 dark:text-emerald-300 font-bold',
      isAlert: false,
    },
  ];

  return (
    <div className="flex items-center gap-3 overflow-x-auto select-none py-1">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs transition-all ${
            s.isAlert
              ? 'bg-rose-50/90 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(225,29,72,0.06)] animate-pulse'
              : 'bg-[#FDFBF7] dark:bg-[#1A1816] border border-amber-900/15 dark:border-stone-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.04)]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${s.dotColor} shrink-0`} />
          <span className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            {s.label}:
          </span>
          <span className={`font-mono text-sm ${s.badgeClass}`}>
            {s.count}
          </span>
        </div>
      ))}
    </div>
  );
}
