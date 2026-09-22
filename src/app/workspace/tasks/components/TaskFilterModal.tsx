'use client';

import React, { useState } from 'react';
import {
  X,
  Filter,
  Calendar,
  Check,
  RotateCcw,
  Users,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

export interface TaskFilterState {
  startDate?: string;
  endDate?: string;
  statusList: string[]; // 'overdue' | 'today' | 'upcoming' | 'completed'
  teamMemberIds: string[];
}

interface TaskFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TaskFilterState;
  onApplyFilters: (newFilters: TaskFilterState) => void;
  teamMembers: WorkspaceMemberOption[];
}

export function TaskFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  teamMembers = [],
}: TaskFilterModalProps) {
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');
  const [statusList, setStatusList] = useState<string[]>(filters.statusList || []);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(filters.teamMemberIds || []);
  const [memberSearch, setMemberSearch] = useState('');

  if (!isOpen) return null;

  // Quick Date Helpers
  const handleQuickDate = (type: 'today' | 'this_week' | 'this_month' | 'clear') => {
    const now = new Date();
    if (type === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (type === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }
    if (type === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7;
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(endOfWeek.toISOString().split('T')[0]);
      return;
    }
    if (type === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(endOfMonth.toISOString().split('T')[0]);
      return;
    }
  };

  // Toggle Status
  const toggleStatus = (st: string) => {
    setStatusList((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Toggle Team Member
  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Select All / Deselect All Members
  const selectAllMembers = () => {
    setSelectedMemberIds(teamMembers.map((m) => m.id));
  };
  const clearAllMembers = () => {
    setSelectedMemberIds([]);
  };

  // Reset All
  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setStatusList([]);
    setSelectedMemberIds([]);
    setMemberSearch('');
  };

  // Apply
  const handleApply = () => {
    onApplyFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      statusList,
      teamMemberIds: selectedMemberIds,
    });
    onClose();
  };

  // Filtered members by search
  const filteredMembers = teamMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const activeFilterCount =
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    statusList.length +
    selectedMemberIds.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Task Filters
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Filter tasks by date range, status, or assigned team
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-stone-800 text-slate-400 hover:text-slate-700 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Date Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Date Range (Start to End Date)</span>
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleQuickDate('clear')}
                  className="text-[10px] font-bold text-amber-600 hover:underline"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Start Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl outline-none text-slate-900 dark:text-white focus:border-amber-500 text-xs font-medium"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  End Date
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl outline-none text-slate-900 dark:text-white focus:border-amber-500 text-xs font-medium"
                />
              </div>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickDate('today')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 text-[10px] font-bold transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('this_week')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 text-[10px] font-bold transition cursor-pointer"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('this_month')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 text-[10px] font-bold transition cursor-pointer"
              >
                This Month
              </button>
            </div>
          </div>

          {/* Section 2: Task Status */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Status</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Overdue */}
              <button
                type="button"
                onClick={() => toggleStatus('overdue')}
                className={`p-2 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  statusList.includes('overdue')
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold'
                    : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Overdue</span>
                </div>
                {statusList.includes('overdue') && (
                  <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                )}
              </button>

              {/* Due Today */}
              <button
                type="button"
                onClick={() => toggleStatus('today')}
                className={`p-2 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  statusList.includes('today')
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold'
                    : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Due Today</span>
                </div>
                {statusList.includes('today') && (
                  <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                )}
              </button>

              {/* Upcoming */}
              <button
                type="button"
                onClick={() => toggleStatus('upcoming')}
                className={`p-2 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  statusList.includes('upcoming')
                    ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold'
                    : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>Upcoming</span>
                </div>
                {statusList.includes('upcoming') && (
                  <Check className="w-3.5 h-3.5 text-sky-600 stroke-[3]" />
                )}
              </button>

              {/* Completed */}
              <button
                type="button"
                onClick={() => toggleStatus('completed')}
                className={`p-2 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  statusList.includes('completed')
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                    : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Completed</span>
                </div>
                {statusList.includes('completed') && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          {/* Section 3: Team Members Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Assigned Team ({selectedMemberIds.length} selected)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-[10px] font-bold text-slate-500 hover:text-amber-600"
                >
                  Select All
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={clearAllMembers}
                  className="text-[10px] font-bold text-slate-500 hover:text-amber-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Member Search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team member by name, role or email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Members List */}
            <div className="max-h-44 overflow-y-auto space-y-1 rounded-2xl border border-slate-200 dark:border-stone-800 p-1.5 bg-slate-50/50 dark:bg-stone-900/50">
              {filteredMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 font-bold text-amber-950 dark:text-amber-100'
                        : 'hover:bg-white dark:hover:bg-stone-800 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                          {m.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}

                      <div className="min-w-0">
                        <span className="truncate block font-semibold text-xs leading-tight">
                          {m.name}
                        </span>
                        {m.role && (
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            {m.role}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-400">
                  No team members found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Apply Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-slate-950 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
