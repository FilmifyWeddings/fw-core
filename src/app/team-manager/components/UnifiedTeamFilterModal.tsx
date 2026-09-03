'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, RotateCcw, Calendar, 
  Tag, Users, Layers, ChevronDown 
} from 'lucide-react';

export interface UnifiedFilterState {
  monthYear: string; // 'all' | '2026-09' | etc.
  startDate: string;
  endDate: string;
  eventTypes: string[]; // ['Wedding', 'Sangeet', etc.]
  roles: string[]; // ['Lead Photographer', etc.]
  assignmentStatus: 'all' | 'assigned' | 'fully_assigned' | 'unassigned' | 'partial' | 'partially_assigned';
  pmId?: string;
}

export interface UnifiedTeamFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UnifiedFilterState;
  onApplyFilters: (newFilters: UnifiedFilterState) => void;
  onResetFilters: () => void;
  availableEventTypes: string[];
  availableRoles: string[];
  assignedPms?: { id: string; name: string }[];
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
  { value: '2027-03', label: 'March 2027' },
];

const DEFAULT_EVENT_TYPES = [
  'Wedding',
  'Reception',
  'Engagement',
  'Haldi',
  'Mehendi',
  'Sangeet',
  'Pre-Wedding Shoot',
  'Post-Wedding Shoot',
  'Maternity Shoot',
  'Birthday Party',
  'Corporate Event'
];

const DEFAULT_CREW_ROLES = [
  'Lead Photographer',
  'Candid Photographer',
  'Traditional Photographer',
  'Cinematographer',
  'Drone Pilot',
  'Assistant / Helper',
  'Editor',
  'Team Manager',
  'Project Manager'
];

export default function UnifiedTeamFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  availableEventTypes = [],
  availableRoles = [],
  assignedPms = [],
  totalFilteredCount,
}: UnifiedTeamFilterModalProps) {
  const [draft, setDraft] = React.useState<UnifiedFilterState>(filters);

  React.useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  if (!isOpen) return null;

  // Merge defaults with available props
  const allEventTypes = Array.from(new Set([...DEFAULT_EVENT_TYPES, ...availableEventTypes])).filter(Boolean);
  const allRoles = Array.from(new Set([...DEFAULT_CREW_ROLES, ...availableRoles])).filter(Boolean);

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
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-[94%] sm:w-full max-w-lg flex flex-col my-auto max-h-[90vh] font-sans"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Unified Shoot &amp; Crew Filter</h3>
                <p className="text-[10px] text-slate-400">Filter bookings by month, date, event types &amp; roles</p>
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

          {/* Form Body with 3D Dropdowns */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[68vh]">
            
            {/* 1. Month Filter (3D Dropdown) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Select Booking Month</span>
              </label>
              <div className="relative">
                <select
                  value={draft.monthYear}
                  onChange={(e) => setDraft(prev => ({ ...prev, monthYear: e.target.value }))}
                  className="h-10 text-xs sm:text-sm font-semibold text-slate-800 px-3 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer appearance-none pr-8 transition-all"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Custom Date Range (3D Inputs) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Custom Date Range (From → To)</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Start Date</span>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">End Date</span>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>
            </div>

            {/* 3. Crew Assignment Status */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                Crew Assignment Status
              </label>
              <select 
                value={draft.assignmentStatus || 'all'}
                onChange={(e) => setDraft(prev => ({ ...prev, assignmentStatus: e.target.value as any }))}
                className="h-8 text-xs font-semibold px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 w-full outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="fully_assigned">Fully Assigned</option>
                <option value="partially_assigned">Partially Assigned</option>
                <option value="unassigned">Unassigned Slots</option>
              </select>
            </div>

            {/* 4. Event Types (3D Dropdown) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Event Type</span>
              </label>
              <div className="relative">
                <select
                  value={draft.eventTypes[0] || 'all'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft(prev => ({ ...prev, eventTypes: val === 'all' ? [] : [val] }));
                  }}
                  className="h-10 text-xs sm:text-sm font-semibold text-slate-800 px-3 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer appearance-none pr-8 transition-all"
                >
                  <option value="all">All Event Types</option>
                  {allEventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 5. Project Manager (PM) */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                Project Manager (PM)
              </label>
              <select 
                value={draft.pmId || 'all'}
                onChange={(e) => setDraft(prev => ({ ...prev, pmId: e.target.value }))}
                className="h-8 text-xs font-semibold px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 w-full outline-none"
              >
                <option value="all">All Assigned PMs</option>
                {assignedPms.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Crew Roles (3D Dropdown) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Crew Role</span>
              </label>
              <div className="relative">
                <select
                  value={draft.roles[0] || 'all'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft(prev => ({ ...prev, roles: val === 'all' ? [] : [val] }));
                  }}
                  className="h-10 text-xs sm:text-sm font-semibold text-slate-800 px-3 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer appearance-none pr-8 transition-all"
                >
                  <option value="all">All Roles</option>
                  {allRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
