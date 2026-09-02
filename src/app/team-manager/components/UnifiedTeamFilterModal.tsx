'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, RotateCcw, Calendar, Check, SlidersHorizontal, 
  Tag, Users, CheckCircle2, ChevronRight, Layers, Sparkles 
} from 'lucide-react';

export interface UnifiedFilterState {
  monthYear: string; // 'all' | '2026-09' | etc.
  startDate: string;
  endDate: string;
  eventTypes: string[]; // ['Wedding', 'Sangeet', etc.]
  roles: string[]; // ['Lead Photographer', etc.]
  assignmentStatus: 'all' | 'assigned' | 'unassigned' | 'partial';
}

export interface UnifiedTeamFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UnifiedFilterState;
  onApplyFilters: (newFilters: UnifiedFilterState) => void;
  onResetFilters: () => void;
  availableEventTypes: string[];
  availableRoles: string[];
  totalFilteredCount: number;
}

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'December 2026' },
  { value: '2027-01', label: 'January 2027' },
  { value: '2027-02', label: 'February 2027' },
];

export default function UnifiedTeamFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  availableEventTypes,
  availableRoles,
  totalFilteredCount,
}: UnifiedTeamFilterModalProps) {
  const [draft, setDraft] = React.useState<UnifiedFilterState>(filters);

  React.useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const toggleEventType = (type: string) => {
    setDraft(prev => {
      const exists = prev.eventTypes.includes(type);
      return {
        ...prev,
        eventTypes: exists ? prev.eventTypes.filter(t => t !== type) : [...prev.eventTypes, type]
      };
    });
  };

  const toggleRole = (role: string) => {
    setDraft(prev => {
      const exists = prev.roles.includes(role);
      return {
        ...prev,
        roles: exists ? prev.roles.filter(r => r !== role) : [...prev.roles, role]
      };
    });
  };

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-2xl flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Unified Shoot &amp; Crew Filter</h3>
                <p className="text-[10px] text-slate-400">Filter bookings by month, date range, event types &amp; roles</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            
            {/* 1. Month Filter */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Select Booking Month</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MONTH_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, monthYear: m.value }))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                      draft.monthYear === m.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Custom Date Range */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Custom Date Range (From → To)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">Start Date</span>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">End Date</span>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. Assignment Status */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Crew Assignment Status</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'assigned', label: 'Fully Assigned' },
                  { id: 'partial', label: 'Partially Assigned' },
                  { id: 'unassigned', label: 'Has Unassigned Slots' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, assignmentStatus: s.id as any }))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                      draft.assignmentStatus === s.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Event Types Multiselect */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Event Types ({draft.eventTypes.length === 0 ? 'All' : `${draft.eventTypes.length} Selected`})</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableEventTypes.map((type) => {
                  const isSelected = draft.eventTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEventType(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-amber-700" />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Crew Roles Multiselect */}
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Crew Roles ({draft.roles.length === 0 ? 'All' : `${draft.roles.length} Selected`})</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableRoles.map((role) => {
                  const isSelected = draft.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-extrabold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-indigo-700" />}
                      <span>{role}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer px-3 py-2 rounded-xl hover:bg-slate-200/60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Matches: <strong className="text-slate-900 font-black">{totalFilteredCount} shoots</strong>
              </span>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
