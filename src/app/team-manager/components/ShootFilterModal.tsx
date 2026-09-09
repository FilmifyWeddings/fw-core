'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, RotateCcw, Calendar, 
  Tag, Users, Layers, ChevronDown, Building2, UserCheck
} from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import MultiSelect3DCreamDropdown, { MultiSelectOption } from '@/components/ui/MultiSelect3DCreamDropdown';
import { FWProject } from '@/types';
import { isProjectMatch } from '../hooks/useTeamManagerFilter';

export interface UnifiedFilterState {
  monthYear: string; // 'all' | '2026-09' | etc.
  startDate: string;
  endDate: string;
  eventTypes: string[]; // ['Wedding', 'Sangeet', etc.]
  roles: string[]; // ['Lead Photographer', etc.]
  assignmentStatus?: 'all' | 'assigned' | 'fully_assigned' | 'unassigned' | 'Assigned' | 'Unassigned';
  assignmentStatuses?: string[]; // multi-select: ['Assigned', 'Unassigned']
  pmId?: string;
  pmIds?: string[]; // multi-select: string[]
  studioId?: string; // Studio Owner ID for All-Studios consolidated view
  memberId?: string; // Filter & spotlight specific crew member
  memberIds?: string[]; // multi-select: string[]
}

export interface ShootFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UnifiedFilterState;
  onApplyFilters: (newFilters: UnifiedFilterState) => void;
  onResetFilters: () => void;
  availableEventTypes?: string[];
  availableRoles?: string[];
  assignedPms?: { id: string; name: string }[];
  studios?: { id: string; name: string }[];
  teamMembers?: { id: string; name: string; avatar_url?: string; role?: string; primary_role?: string }[];
  projects?: FWProject[];
  isAllStudios?: boolean;
  isPartnerPortal?: boolean;
  isOwner?: boolean;
  totalFilteredCount: number;
}

export type TeamManagerFilterDrawerProps = ShootFilterModalProps;

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

type FilterDropdownKey = 'none' | 'studio' | 'event' | 'member' | 'pm' | 'status' | 'role';

export default function ShootFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  availableEventTypes = [],
  availableRoles = [],
  assignedPms = [],
  studios = [],
  teamMembers = [],
  projects = [],
  isAllStudios = false,
  isPartnerPortal = false,
  isOwner = true,
  totalFilteredCount,
}: ShootFilterModalProps) {
  const [openDropdown, setOpenDropdown] = useState<FilterDropdownKey>('none');

  const [draft, setDraft] = useState<UnifiedFilterState>({
    ...filters,
    eventTypes: filters.eventTypes || [],
    roles: filters.roles || [],
    memberIds: filters.memberIds || (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []),
    pmIds: filters.pmIds || (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []),
    assignmentStatuses: filters.assignmentStatuses || (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []),
    studioId: filters.studioId || 'all',
    memberId: filters.memberId || 'all',
    pmId: filters.pmId || 'all',
    assignmentStatus: filters.assignmentStatus || 'all',
  });

  useEffect(() => {
    if (isOpen) {
      setOpenDropdown('none');
      setDraft({
        ...filters,
        eventTypes: filters.eventTypes || [],
        roles: filters.roles || [],
        memberIds: filters.memberIds || (filters.memberId && filters.memberId !== 'all' ? [filters.memberId] : []),
        pmIds: filters.pmIds || (filters.pmId && filters.pmId !== 'all' ? [filters.pmId] : []),
        assignmentStatuses: filters.assignmentStatuses || (filters.assignmentStatus && filters.assignmentStatus !== 'all' ? [filters.assignmentStatus] : []),
        studioId: filters.studioId || 'all',
        memberId: filters.memberId || 'all',
        pmId: filters.pmId || 'all',
        assignmentStatus: filters.assignmentStatus || 'all',
      });
    }
  }, [isOpen, filters]);

  // Helper for member initials
  const getInitials = (name: string): string => {
    if (!name) return 'TM';
    const parts = name.trim().replace(/\.\.\./g, '').split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

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

  // 1. Event Type Multi-select options
  const eventTypeMultiOptions: MultiSelectOption[] = useMemo(() => {
    return allEventTypes.map(t => ({
      id: t,
      name: t,
      label: t,
    }));
  }, [allEventTypes]);

  // 2. Team Member Multi-select options
  const memberMultiOptions: MultiSelectOption[] = useMemo(() => {
    return teamMembers.map(m => ({
      id: m.id,
      name: m.name,
      avatarUrl: m.avatar_url,
      initials: getInitials(m.name),
      roleTag: m.role || m.primary_role,
      badge: 'Crew',
    }));
  }, [teamMembers]);

  // 3. Project Manager (PM) Multi-select options
  const pmMultiOptions: MultiSelectOption[] = useMemo(() => {
    return assignedPms.map(pm => ({
      id: pm.id,
      name: pm.name,
      badge: 'PM',
    }));
  }, [assignedPms]);

  // 4. Assignment Status Multi-select options (Strictly Assigned & Unassigned)
  const assignmentStatusOptions: MultiSelectOption[] = useMemo(() => {
    return [
      {
        id: 'Assigned',
        name: 'Assigned',
        badge: 'Filled Slots',
        badgeClassName: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60',
      },
      {
        id: 'Unassigned',
        name: 'Unassigned',
        badge: 'Open Roles',
        badgeClassName: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-700/60',
      },
    ];
  }, []);

  // 5. Crew Roles Multi-select options
  const roleMultiOptions: MultiSelectOption[] = useMemo(() => {
    return allRoles.map(r => ({
      id: r,
      name: r,
      label: r,
    }));
  }, [allRoles]);

  // Live match counter calculated against draft state using strict co-filtering engine
  const liveFilteredCount = useMemo(() => {
    if (!projects || projects.length === 0) return totalFilteredCount;
    return projects.filter(p => {
      if (p.is_archived) return false;
      return isProjectMatch(p, draft);
    }).length;
  }, [projects, draft, totalFilteredCount]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters({
      ...draft,
      memberId: draft.memberIds && draft.memberIds.length > 0 ? draft.memberIds[0] : 'all',
      pmId: draft.pmIds && draft.pmIds.length > 0 ? draft.pmIds[0] : 'all',
      assignmentStatus: draft.assignmentStatuses && draft.assignmentStatuses.length > 0 ? (draft.assignmentStatuses[0] as any) : 'all',
    });
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  const showPmFilter = isOwner && !isPartnerPortal;
  const showStudioFilter = isAllStudios || studios.length > 1;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-[#FDFBF7] dark:bg-[#1C1917] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#EAE5DA] dark:border-stone-800 overflow-hidden w-[94%] sm:w-full max-w-lg flex flex-col my-auto max-h-[90vh] font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 dark:bg-stone-950 text-white flex items-center justify-between border-b border-slate-800 dark:border-stone-800 shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Shoot &amp; Crew Filter</h3>
                <p className="text-[10px] text-slate-400 dark:text-stone-400">
                  Filter bookings with 3D multi-select by studio, event, team &amp; roles
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

          {/* Form Body with 3D Cream Styling - pb-72 ensures bottom dropdowns expand with zero clipping */}
          <div 
            className="p-4 sm:p-6 space-y-4.5 overflow-y-auto max-h-[72vh] pb-72 scrollbar-thin"
            onClick={() => {
              if (openDropdown !== 'none') {
                setOpenDropdown('none');
              }
            }}
          >
            
            {/* 1. Studio Filter */}
            {showStudioFilter && (
              <div className={`space-y-1.5 relative ${openDropdown === 'studio' ? 'z-[60]' : 'z-10'}`}>
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
                  usePortal={false}
                />
              </div>
            )}

            {/* 2. Month Filter */}
            <div className="space-y-1.5 relative z-10">
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
            <div className="space-y-1.5 relative z-10">
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

            {/* 4. Event Types Multi-select with 3D Checkboxes */}
            <div className={`space-y-1.5 relative ${openDropdown === 'event' ? 'z-[60]' : 'z-10'}`}>
              <MultiSelect3DCreamDropdown
                label="Event Type"
                icon={<Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                selectedValues={draft.eventTypes}
                onChange={(vals) => setDraft(prev => ({ ...prev, eventTypes: vals }))}
                options={eventTypeMultiOptions}
                placeholder="All Event Types"
                searchPlaceholder="🔍 Search event types..."
                searchable={true}
                isOpen={openDropdown === 'event'}
                onToggle={(open) => setOpenDropdown(open ? 'event' : 'none')}
                onClose={() => setOpenDropdown('none')}
              />
            </div>

            {/* 5. Filter by Team Member Multi-select */}
            <div className={`space-y-1.5 relative ${openDropdown === 'member' ? 'z-[60]' : 'z-10'}`}>
              <MultiSelect3DCreamDropdown
                label="Filter by Team Member"
                icon={<Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                selectedValues={draft.memberIds || (draft.memberId && draft.memberId !== 'all' ? [draft.memberId] : [])}
                onChange={(vals) => setDraft(prev => ({ 
                  ...prev, 
                  memberIds: vals, 
                  memberId: vals[0] || 'all' 
                }))}
                options={memberMultiOptions}
                placeholder="All Team Members"
                searchPlaceholder="🔍 Search team members..."
                searchable={true}
                isOpen={openDropdown === 'member'}
                onToggle={(open) => setOpenDropdown(open ? 'member' : 'none')}
                onClose={() => setOpenDropdown('none')}
              />
            </div>

            {/* 6. Project Manager (PM) Multi-select */}
            {showPmFilter && (
              <div className={`space-y-1.5 relative ${openDropdown === 'pm' ? 'z-[60]' : 'z-10'}`}>
                <MultiSelect3DCreamDropdown
                  label="Project Manager (PM)"
                  icon={<UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  selectedValues={draft.pmIds || (draft.pmId && draft.pmId !== 'all' ? [draft.pmId] : [])}
                  onChange={(vals) => setDraft(prev => ({ 
                    ...prev, 
                    pmIds: vals, 
                    pmId: vals[0] || 'all' 
                  }))}
                  options={pmMultiOptions}
                  placeholder="All Assigned PMs"
                  searchPlaceholder="🔍 Search PMs..."
                  searchable={true}
                  isOpen={openDropdown === 'pm'}
                  onToggle={(open) => setOpenDropdown(open ? 'pm' : 'none')}
                  onClose={() => setOpenDropdown('none')}
                />
              </div>
            )}

            {/* 7. Crew Assignment Status Multi-select */}
            <div className={`space-y-1.5 relative ${openDropdown === 'status' ? 'z-[60]' : 'z-10'}`}>
              <MultiSelect3DCreamDropdown
                label="Crew Assignment Status"
                icon={<Users className="w-3.5 h-3.5 text-slate-600 dark:text-stone-400" />}
                selectedValues={draft.assignmentStatuses || (draft.assignmentStatus && draft.assignmentStatus !== 'all' ? [draft.assignmentStatus] : [])}
                onChange={(vals) => setDraft(prev => ({ 
                  ...prev, 
                  assignmentStatuses: vals, 
                  assignmentStatus: (vals[0] as any) || 'all' 
                }))}
                options={assignmentStatusOptions}
                placeholder="All Assignment Statuses"
                searchable={false}
                isOpen={openDropdown === 'status'}
                onToggle={(open) => setOpenDropdown(open ? 'status' : 'none')}
                onClose={() => setOpenDropdown('none')}
              />
            </div>

            {/* 8. Crew Roles Multi-select */}
            <div className={`space-y-1.5 relative ${openDropdown === 'role' ? 'z-[60]' : 'z-10'}`}>
              <MultiSelect3DCreamDropdown
                label="Crew Role"
                icon={<Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                selectedValues={draft.roles}
                onChange={(vals) => setDraft(prev => ({ ...prev, roles: vals }))}
                options={roleMultiOptions}
                placeholder="All Crew Roles"
                searchPlaceholder="🔍 Search crew roles..."
                searchable={true}
                isOpen={openDropdown === 'role'}
                onToggle={(open) => setOpenDropdown(open ? 'role' : 'none')}
                onClose={() => setOpenDropdown('none')}
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
                Matches: <strong className="text-slate-900 dark:text-stone-100 font-black">{liveFilteredCount} shoots</strong>
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
