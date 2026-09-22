'use client';

import React from 'react';
import {
  CheckSquare,
  FileText,
  Clock,
  Calendar,
  Plus,
  Layers,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'board' | 'list' | 'compact' | 'deadlines' | 'calendar' | 'notes';
  onChangeView: (view: 'board' | 'list' | 'compact' | 'deadlines' | 'calendar' | 'notes') => void;
  onOpenQuickCreate: () => void;
  metrics?: {
    todayDue: number;
    overdue: number;
  };
}

export function MobileBottomNav({
  activeView,
  onChangeView,
  onOpenQuickCreate,
  metrics,
}: MobileBottomNavProps) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-slate-200 dark:border-stone-800 px-3 py-1.5 flex items-center justify-around shadow-lg select-none">
      {/* Tasks Tab */}
      <button
        type="button"
        onClick={() => onChangeView('board')}
        className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition cursor-pointer ${
          activeView === 'board' || activeView === 'list' || activeView === 'compact'
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <CheckSquare className="w-5 h-5" />
        <span className="text-[10px]">Tasks</span>
      </button>

      {/* Notes Tab */}
      <button
        type="button"
        onClick={() => onChangeView('notes')}
        className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition cursor-pointer ${
          activeView === 'notes'
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px]">Notes</span>
      </button>

      {/* Floating Center Create Action */}
      <div className="-mt-5">
        <button
          type="button"
          onClick={onOpenQuickCreate}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center justify-center transition active:scale-95 cursor-pointer"
          title="Create New"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Deadlines Tab */}
      <button
        type="button"
        onClick={() => onChangeView('deadlines')}
        className={`relative flex flex-col items-center gap-1 min-w-[56px] py-1 transition cursor-pointer ${
          activeView === 'deadlines'
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-[10px]">Deadlines</span>
        {metrics && (metrics.overdue > 0 || metrics.todayDue > 0) && (
          <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-rose-500" />
        )}
      </button>

      {/* Calendar Tab */}
      <button
        type="button"
        onClick={() => onChangeView('calendar')}
        className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition cursor-pointer ${
          activeView === 'calendar'
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">Calendar</span>
      </button>
    </nav>
  );
}
