'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Plus,
} from 'lucide-react';
import { TaskItem } from '@/lib/services/taskService';

interface MinimalCalendarViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
  onQuickAddTaskForDate?: (dateStr: string) => void;
}

export function MinimalCalendarView({
  tasks,
  onOpenTaskDetail,
  onQuickAddTaskForDate,
}: MinimalCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Month grid calculation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const daysArray = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthDays - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    daysArray.push({
      day: d,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remaining = 7 - (daysArray.length % 7);
  if (remaining < 7) {
    for (let r = 1; r <= remaining; r++) {
      daysArray.push({
        day: r,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }
  }

  const now = new Date();
  const isToday = (y: number, m: number, d: number) =>
    now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={today}
            className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 border-b border-slate-100 dark:border-stone-800 pb-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {daysArray.map((cell, idx) => {
          const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const cellTasks = tasks.filter((t) => {
            if (!t.due_date) return false;
            return t.due_date.startsWith(dateStr);
          });

          const isCurrentToday = isToday(cell.year, cell.month, cell.day);

          return (
            <div
              key={idx}
              className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition group ${
                cell.isCurrentMonth
                  ? isCurrentToday
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-stone-900/50 border-slate-100 dark:border-stone-800/80 hover:border-slate-300'
                  : 'bg-slate-50/50 dark:bg-stone-950/40 border-transparent text-slate-300 dark:text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    isCurrentToday
                      ? 'w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-[11px]'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-stone-600'
                  }`}
                >
                  {cell.day}
                </span>

                {cell.isCurrentMonth && onQuickAddTaskForDate && (
                  <button
                    type="button"
                    onClick={() => onQuickAddTaskForDate(dateStr)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-amber-600 transition"
                    title="Add task for this day"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Day Tasks Pills */}
              <div className="space-y-1 my-1 overflow-y-auto max-h-16">
                {cellTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t)}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate cursor-pointer transition ${
                      t.is_completed
                        ? 'bg-slate-100 text-slate-400 line-through'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 hover:bg-amber-200'
                    }`}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
                {cellTasks.length > 3 && (
                  <span className="text-[9px] font-extrabold text-slate-400 block text-center">
                    +{cellTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
