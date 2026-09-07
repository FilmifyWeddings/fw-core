'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Calendar, User, CheckCircle2, RotateCcw } from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';

export interface PostProductionFilters {
  pm: string; // 'all' | 'unassigned' | specific pm name
  status: 'all' | 'Upcoming' | 'In Progress' | 'Under Review' | 'Done';
  dateScopeMode: 'all' | 'year' | 'month' | 'custom';
  dateScopeYear: number;
  dateScopeMonth: string; // 'All' or '0'..'11'
  dateScopeStartDate: string;
  dateScopeEndDate: string;
}

interface PostProductionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PostProductionFilters;
  onChangeFilters: (newFilters: PostProductionFilters) => void;
  pmOptions: Searchable3DCreamSelectOption[];
  totalProjectsCount: number;
  filteredProjectsCount: number;
}

const STATUS_FILTER_OPTIONS: Searchable3DCreamSelectOption[] = [
  { value: 'all', label: 'All Delivery Statuses' },
  {
    value: 'Upcoming',
    label: 'Upcoming',
    badge: 'Upcoming',
    badgeClassName: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  {
    value: 'In Progress',
    label: 'In Progress',
    badge: 'In Progress',
    badgeClassName: 'bg-sky-100 text-sky-800 border border-sky-200',
  },
  {
    value: 'Under Review',
    label: 'Under Review',
    badge: 'Review',
    badgeClassName: 'bg-purple-100 text-purple-800 border border-purple-200',
  },
  {
    value: 'Done',
    label: 'Done',
    badge: 'Done',
    badgeClassName: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
];

export default function PostProductionFilterModal({
  isOpen,
  onClose,
  filters,
  onChangeFilters,
  pmOptions,
  totalProjectsCount,
  filteredProjectsCount,
}: PostProductionFilterModalProps) {
  const activeCount = [
    filters.pm !== 'all',
    filters.status !== 'all',
    filters.dateScopeMode !== 'all',
  ].filter(Boolean).length;

  const handleReset = () => {
    onChangeFilters({
      pm: 'all',
      status: 'all',
      dateScopeMode: 'all',
      dateScopeYear: new Date().getFullYear(),
      dateScopeMonth: 'All',
      dateScopeStartDate: '',
      dateScopeEndDate: '',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-[#FFFDF9] dark:bg-[#1A1816] rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 space-y-5 text-slate-900 dark:text-stone-100 relative"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Filter Production Projects
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-stone-400 font-medium">
                    Narrow down projects by manager, deliverable status &amp; date scope
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Form Controls */}
            <div className="space-y-4">
              {/* 1. Project Manager Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Project Manager (PM)</span>
                </label>
                <Searchable3DCreamSelect
                  value={filters.pm}
                  onChange={(val) => onChangeFilters({ ...filters, pm: val })}
                  options={pmOptions}
                  searchable={true}
                  searchPlaceholder="🔍 Search PM..."
                  placeholder="All Project Managers"
                  usePortal={true}
                />
              </div>

              {/* 2. Deliverables Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Delivery Status</span>
                </label>
                <Searchable3DCreamSelect
                  value={filters.status}
                  onChange={(val) => onChangeFilters({ ...filters, status: val as any })}
                  options={STATUS_FILTER_OPTIONS}
                  placeholder="All Statuses"
                  usePortal={true}
                />
              </div>

              {/* 3. Date Scope Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Date Scope</span>
                </label>

                {/* Scope Mode Selector Buttons */}
                <div className="grid grid-cols-4 gap-1.5 bg-[#F8F6F0] dark:bg-stone-900 p-1.5 rounded-xl border border-[#EAE5DA] dark:border-stone-800 text-center">
                  {(['all', 'year', 'month', 'custom'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, dateScopeMode: mode })}
                      className={`py-1.5 text-[11px] font-black rounded-lg transition capitalize cursor-pointer ${
                        filters.dateScopeMode === mode
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Sub-controls based on Date Scope */}
                {filters.dateScopeMode === 'year' && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700 dark:text-stone-300">Select Year:</span>
                    <select
                      value={filters.dateScopeYear}
                      onChange={(e) => onChangeFilters({ ...filters, dateScopeYear: parseInt(e.target.value, 10) })}
                      className="px-3 py-1 font-bold bg-white dark:bg-stone-800 border border-amber-300 rounded-lg text-slate-900 dark:text-stone-100 cursor-pointer"
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>
                )}

                {filters.dateScopeMode === 'month' && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-stone-300">Year:</span>
                      <select
                        value={filters.dateScopeYear}
                        onChange={(e) => onChangeFilters({ ...filters, dateScopeYear: parseInt(e.target.value, 10) })}
                        className="px-2.5 py-1 font-bold bg-white dark:bg-stone-800 border border-amber-300 rounded-lg text-slate-900 dark:text-stone-100 cursor-pointer"
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-stone-300">Month:</span>
                      <select
                        value={filters.dateScopeMonth}
                        onChange={(e) => onChangeFilters({ ...filters, dateScopeMonth: e.target.value })}
                        className="px-2.5 py-1 font-bold bg-white dark:bg-stone-800 border border-amber-300 rounded-lg text-slate-900 dark:text-stone-100 cursor-pointer"
                      >
                        <option value="All">All Months</option>
                        <option value="0">January</option>
                        <option value="1">February</option>
                        <option value="2">March</option>
                        <option value="3">April</option>
                        <option value="4">May</option>
                        <option value="5">June</option>
                        <option value="6">July</option>
                        <option value="7">August</option>
                        <option value="8">September</option>
                        <option value="9">October</option>
                        <option value="10">November</option>
                        <option value="11">December</option>
                      </select>
                    </div>
                  </div>
                )}

                {filters.dateScopeMode === 'custom' && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-stone-300">From:</span>
                      <input
                        type="date"
                        value={filters.dateScopeStartDate}
                        onChange={(e) => onChangeFilters({ ...filters, dateScopeStartDate: e.target.value })}
                        className="px-2.5 py-1 font-bold bg-white dark:bg-stone-800 border border-amber-300 rounded-lg text-slate-900 dark:text-stone-100 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-stone-300">To:</span>
                      <input
                        type="date"
                        value={filters.dateScopeEndDate}
                        onChange={(e) => onChangeFilters({ ...filters, dateScopeEndDate: e.target.value })}
                        className="px-2.5 py-1 font-bold bg-white dark:bg-stone-800 border border-amber-300 rounded-lg text-slate-900 dark:text-stone-100 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#EAE5DA] dark:border-stone-800">
              <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
                Matching <strong>{filteredProjectsCount}</strong> of {totalProjectsCount} Projects
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition cursor-pointer shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
