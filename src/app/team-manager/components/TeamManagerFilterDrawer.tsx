'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, RotateCcw, Calendar, 
  Tag, Users, Layers, ChevronDown, Building2, UserCheck
} from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';

export interface UnifiedFilterState {
  monthYear: string; // 'all' | '2026-09' | etc.
  startDate: string;
  endDate: string;
  eventTypes: string[]; // ['Wedding', 'Sangeet', etc.]
  roles: string[]; // ['Lead Photographer', etc.]
  assignmentStatus: 'all' | 'assigned' | 'fully_assigned' | 'unassigned' | 'partial' | 'partially_assigned';
  pmId?: string;
  studioId?: string; // Studio Owner ID for All-Studios consolidated view
}

export interface TeamManagerFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UnifiedFilterState;
  onApplyFilters: (newFilters: UnifiedFilterState) => void;
  onResetFilters: () => void;
  availableEventTypes?: string[];
  availableRoles?: string[];
  assignedPms?: { id: string; name: string }[];
  studios?: { id: string; name: string }[];
  isAllStudios?: boolean;
  isPartnerPortal?: boolean;
  isOwner?: boolean;
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
  'Traditional Videographer',
  'Cinematographer',
  'Drone Pilot',
  'Assistant / Helper',
  'Editor',
  'Team Manager',
  'Project Manager'
];

export default function TeamManagerFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  availableEventTypes = [],
  availableRoles = [],
  assignedPms = [],
  studios = [],
  isAllStudios = false,
  isPartnerPortal = false,
  isOwner = true,
  totalFilteredCount,
}: TeamManagerFilterDrawerProps) {
  const [draft, setDraft] = useState<UnifiedFilterState>({
    ...filters,
    studioId: filters.studioId || 'all',
  });

  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...filters,
        studioId: filters.studioId || 'all',
      });
    }
  }, [isOpen, filters]);

  // Merge defaults with available props
  const allEventTypes = useMemo(() => {
    return Array.from(new Set([...DEFAULT_EVENT_TYPES, ...availableEventTypes])).filter(Boolean);
  }, [availableEventTypes]);

  const allRoles = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CREW_ROLES, ...availableRoles])).filter(Boolean);
  }, [availableRoles]);

  const studioOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Studios (Consolidated)' },
      ...studios.map(s => ({
        value: s.id,
        label: s.name,
        badge: 'Studio',
      })),
    ];
  }, [studios]);

  const eventTypeOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Event Types' },
      ...allEventTypes.map(t => ({
        value: t,
        label: t,
      })),
    ];
  }, [allEventTypes]);

  const roleOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Crew Roles' },
      ...allRoles.map(r => ({
        value: r,
        label: r,
      })),
    ];
  }, [allRoles]);

  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Assigned PMs' },
      ...assignedPms.map(pm => ({
        value: pm.id,
        label: pm.name,
      })),
    ];
  }, [assignedPms]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  // Crew members/partner views do NOT manage PMs
  const showPmFilter = isOwner && !isPartnerPortal;
  const showStudioFilter = isAllStudios || studios.length > 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-[#FDFBF7] dark:bg-[#1C1917] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#EAE5DA] dark:border-stone-800 overflow-hidden w-[94%] sm:w-full max-w-lg flex flex-col my-auto max-h-[90vh] font-sans"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 dark:bg-stone-950 text-white flex items-center justify-between border-b border-slate-800 dark:border-stone-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Shoot &amp; Crew Filter</h3>
                <p className="text-[10px] text-slate-400 dark:text-stone-400">
                  Filter bookings by studio, event type, date range &amp; assignment
                </p>
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

          {/* Form Body with 3D Cream Styling */}
          <div className="p-4 sm:p-6 space-y-4.5 overflow-y-auto max-h-[68vh] scrollbar-thin">
            
            {/* 1. Studio Filter (When in All Studios mode or multi-studio connected) */}
            {showStudioFilter && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Filter by Studio Owner</span>
                </label>
                <Searchable3DCreamSelect
                  value={draft.studioId || 'all'}
                  onChange={(val) => setDraft(prev => ({ ...prev, studioId: val }))}
                  options={studioOptions}
                  searchable={true}
                  searchPlaceholder="🔍 Search studio..."
                  placeholder="All Studios (Consolidated)"
                />
              </div>
            )}

            {/* 2. Month Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Select Booking Month</span>
              </label>
              <div className="relative">
                <select
                  value={draft.monthYear}
                  onChange={(e) => setDraft(prev => ({ ...prev, monthYear: e.target.value }))}
                  className="h-10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-stone-200 px-3.5 w-full bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 hover:border-slate-300 dark:hover:border-stone-600 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer appearance-none pr-8 transition-all"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 3. Custom Date Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Custom Date Range (From → To)</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-stone-400 font-bold block mb-1">Start Date</span>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full h-10 px-3 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-stone-200 shadow-2xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-stone-400 font-bold block mb-1">End Date</span>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full h-10 px-3 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-stone-200 shadow-2xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* 4. Event Types */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Event Type</span>
              </label>
              <Searchable3DCreamSelect
                value={draft.eventTypes[0] || 'all'}
                onChange={(val) => setDraft(prev => ({ ...prev, eventTypes: val === 'all' ? [] : [val] }))}
                options={eventTypeOptions}
                searchable={true}
                searchPlaceholder="🔍 Search event type..."
                placeholder="All Event Types"
              />
            </div>

            {/* 5. Project Manager (PM) - STRICTLY HIDDEN FOR CREW / PORTAL MODE */}
            {showPmFilter && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Project Manager (PM)</span>
                </label>
                <Searchable3DCreamSelect
                  value={draft.pmId || 'all'}
                  onChange={(val) => setDraft(prev => ({ ...prev, pmId: val }))}
                  options={pmOptions}
                  searchable={true}
                  searchPlaceholder="🔍 Search PM..."
                  placeholder="All Assigned PMs"
                />
              </div>
            )}

            {/* 6. Crew Assignment Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600 dark:text-stone-400" />
                <span>Crew Assignment Status</span>
              </label>
              <div className="relative">
                <select 
                  value={draft.assignmentStatus || 'all'}
                  onChange={(e) => setDraft(prev => ({ ...prev, assignmentStatus: e.target.value as any }))}
                  className="h-10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-stone-200 px-3.5 w-full bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 hover:border-slate-300 dark:hover:border-stone-600 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer appearance-none pr-8 transition-all"
                >
                  <option value="all">All Statuses</option>
                  <option value="fully_assigned">Fully Assigned</option>
                  <option value="partially_assigned">Partially Assigned</option>
                  <option value="unassigned">Unassigned Slots</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 7. Crew Roles */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Crew Role</span>
              </label>
              <Searchable3DCreamSelect
                value={draft.roles[0] || 'all'}
                onChange={(val) => setDraft(prev => ({ ...prev, roles: val === 'all' ? [] : [val] }))}
                options={roleOptions}
                searchable={true}
                searchPlaceholder="🔍 Search role..."
                placeholder="All Roles"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-stone-900 border-t border-[#EAE5DA] dark:border-stone-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-stone-200 transition cursor-pointer px-3 py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-stone-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-stone-400 font-medium hidden sm:inline">
                Matches: <strong className="text-slate-900 dark:text-stone-100 font-black">{totalFilteredCount} shoots</strong>
              </span>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
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
