'use client';

import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';

interface QuickTaskInputProps {
  onAddTask: (taskData: { title: string; due_date?: string | null }) => void;
  folderTitle?: string;
}

export function QuickTaskInput({ onAddTask, folderTitle }: QuickTaskInputProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      due_date: dueDate ? dueDate : null,
    });

    setTitle('');
    setDueDate('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#FDFBF7] dark:bg-[#1A1816] border border-amber-900/15 dark:border-stone-800 rounded-2xl p-2.5 sm:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/10"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0 px-2">
        <span className="w-6 h-6 rounded-lg bg-amber-400/80 text-slate-950 flex items-center justify-center shrink-0 text-xs font-black shadow-2xs">
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </span>
        <input
          type="text"
          placeholder={
            folderTitle
              ? `+ Add a task to "${folderTitle}"... (Press Enter)`
              : '+ Add a task... (Press Enter)'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 placeholder:font-normal"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 justify-end">
        {/* Date Selector */}
        <div className="relative flex items-center bg-[#FAF8F5] dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer"
            title="Set Deadline"
          />
        </div>

        {/* Add Button */}
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95 shrink-0"
        >
          Add Task
        </button>
      </div>
    </form>
  );
}
