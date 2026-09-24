'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, Calendar, RotateCcw, Check, Sparkles, 
  IndianRupee, Users, Tag, Clock, AlertTriangle
} from 'lucide-react';
import ThreeDMultiSelectDropdown, { MultiSelectOption } from '@/components/common/ThreeDMultiSelectDropdown';

export interface DeliverablesFilterState {
  startDate: string;
  endDate: string;
  eventTypes: string[];
  segments?: string[];
  deliverables?: string[];
  roles: string[];
  paymentStatuses: string[];
  workflowStatuses?: string[];
  dueDateFilter?: 'all' | 'overdue' | 'due_today' | 'due_this_week';
}

interface VendorDeliverablesFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DeliverablesFilterState;
  onChange: (filters: DeliverablesFilterState) => void;
  onReset: () => void;
  availableEventTypes: string[];
  availableSegments?: string[];
  availableDeliverables?: string[];
  availableRoles: string[];
  availableWorkflowStatuses?: Array<{ id?: string; name: string; color?: string; }>;
  category?: string;
  totalFilteredCount: number;
}

const PAYMENT_STATUS_OPTIONS: MultiSelectOption[] = [
  { id: 'UNSETTLED', label: 'Unsettled (₹0 Commercials)', badge: 'UNSETTLED', badgeClass: 'bg-stone-100 text-stone-700 border border-stone-300' },
  { id: 'FULL PAID', label: 'Full Paid (Cleared)', badge: 'FULL PAID', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  { id: 'PARTIALLY PAID', label: 'Partially Paid', badge: 'PARTIAL', badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300' },
  { id: 'UNPAID', label: 'Unpaid (Balance Pending)', badge: 'UNPAID', badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300' },
];

export default function VendorDeliverablesFilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  availableEventTypes,
  availableSegments = [],
  availableDeliverables = [],
  availableRoles,
  availableWorkflowStatuses = [],
  category = 'shoot',
  totalFilteredCount,
}: VendorDeliverablesFilterModalProps) {
  if (!isOpen) return null;

  const setDatePreset = (preset: 'all' | 'this_month' | 'last_month' | 'next_30' | 'this_year') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'all') {
      onChange({ ...filters, startDate: '', endDate: '' });
      return;
    }

    if (preset === 'this_month') {
      const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
      onChange({ ...filters, startDate: start, endDate: end });
      return;
    }

    if (preset === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-01`;
      const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const end = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}-${pad(lastDay)}`;
      onChange({ ...filters, startDate: start, endDate: end });
      return;
    }

    if (preset === 'next_30') {
      const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const nextDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const end = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`;
      onChange({ ...filters, startDate: start, endDate: end });
      return;
    }

    if (preset === 'this_year') {
      const start = `${now.getFullYear()}-01-01`;
      const end = `${now.getFullYear()}-12-31`;
      onChange({ ...filters, startDate: start, endDate: end });
      return;
    }
  };

  const isShoot = category === 'shoot';

  const activeFiltersCount = 
    (filters.startDate || filters.endDate ? 1 : 0) +
    (isShoot ? filters.eventTypes.length : 0) +
    (!isShoot ? (filters.segments?.length || 0) : 0) +
    (!isShoot ? (filters.deliverables?.length || 0) : 0) +
    (isShoot ? filters.roles.length : 0) +
    filters.paymentStatuses.length +
    (filters.workflowStatuses?.length || 0) +
    (filters.dueDateFilter && filters.dueDateFilter !== 'all' ? 1 : 0);

  const eventOptions: MultiSelectOption[] = availableEventTypes.map(evt => ({
    id: evt,
    label: evt,
  }));

  const segmentOptions: MultiSelectOption[] = availableSegments.map(seg => ({
    id: seg,
    label: seg,
  }));

  const deliverableOptions: MultiSelectOption[] = availableDeliverables.map(deliv => ({
    id: deliv,
    label: deliv,
  }));

  const roleOptions: MultiSelectOption[] = availableRoles.map(role => ({
    id: role,
    label: role,
  }));

  const statusOptions: MultiSelectOption[] = availableWorkflowStatuses.map(st => ({
    id: st.name,
    label: st.name,
    badge: st.name,
    badgeClass: 'font-black px-2 py-0.5 rounded-full border shadow-2xs',
  }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-2xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* 3D Filter Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-xl max-h-[90vh] bg-[#FAF8F5] rounded-3xl shadow-2xl border-2 border-amber-300 flex flex-col z-10 overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-2xs">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <span>Filter {isShoot ? 'Shoots' : 'Deliverables & Jobs'}</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-2xs">
                      {activeFiltersCount} active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  {isShoot 
                    ? 'Refine by date range, payment status, event types, and crew roles'
                    : 'Refine by due date status, workflow stage, payment status, and events'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-stone-800">
            {/* 1. Due Date Urgency Quick Filter (Non-Shoots) */}
            {!isShoot && (
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Due Date Urgency</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'overdue', label: '🚨 Overdue' },
                    { id: 'due_today', label: '⏳ Due Today' },
                    { id: 'due_this_week', label: '📅 Due 7 Days' },
                  ].map(tab => {
                    const isSelected = (filters.dueDateFilter || 'all') === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange({ ...filters, dueDateFilter: tab.id as any })}
                        className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer border shadow-2xs ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white hover:bg-amber-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Date Range & Presets */}
            <div className="space-y-2 pt-1 border-t border-amber-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isShoot ? 'Shoot Date Range' : 'Assignment / Due Date Range'}</span>
                </label>
                {(filters.startDate || filters.endDate) && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, startDate: '', endDate: '' })}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Clear Dates
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'next_30', label: 'Next 30 Days' },
                  { id: 'this_year', label: 'This Year' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDatePreset(preset.id as any)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 text-stone-700 border border-stone-200 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Start & End Date Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Start Date</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-0.5">End Date</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Workflow Status Multi-Select (Post-Production Settings Aligned) */}
            {availableWorkflowStatuses.length > 0 && (
              <div className="pt-2 border-t border-amber-200/60">
                <ThreeDMultiSelectDropdown
                  label={`Workflow Statuses (${availableWorkflowStatuses.length})`}
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                  placeholder="Select workflow statuses..."
                  options={statusOptions}
                  selectedValues={filters.workflowStatuses || []}
                  onChange={(statuses) => onChange({ ...filters, workflowStatuses: statuses })}
                  searchPlaceholder="Search status..."
                />
              </div>
            )}

            {/* 4. Payment Status Multi-Select */}
            <div className="pt-2 border-t border-amber-200/60">
              <ThreeDMultiSelectDropdown
                label="Payment Status"
                icon={<IndianRupee className="w-3.5 h-3.5 text-emerald-700" />}
                placeholder="Select payment statuses..."
                options={PAYMENT_STATUS_OPTIONS}
                selectedValues={filters.paymentStatuses}
                onChange={(statuses) => onChange({ ...filters, paymentStatuses: statuses })}
                searchPlaceholder="Search payment status..."
              />
            </div>

            {/* 5. Segments Multi-Select (For Non-Shoots: Pre-Wedding, Wedding, Reception, Haldi, etc.) */}
            {!isShoot && (
              <div className="pt-2 border-t border-amber-200/60">
                <ThreeDMultiSelectDropdown
                  label={`Segments (${availableSegments.length})`}
                  icon={<Tag className="w-3.5 h-3.5 text-amber-700" />}
                  placeholder={availableSegments.length === 0 ? "No assigned segments on cards" : "Select assigned segments..."}
                  options={segmentOptions}
                  selectedValues={filters.segments || []}
                  onChange={(segments) => onChange({ ...filters, segments })}
                  searchPlaceholder="Search segment (e.g. Wedding, Pre-Wedding)..."
                  emptyMessage="No assigned segments found on cards"
                />
              </div>
            )}

            {/* 6. Deliverables Multi-Select (For Non-Shoots: Cinematic Film, Teaser, Reels, etc.) */}
            {!isShoot && (
              <div className="pt-2 border-t border-amber-200/60">
                <ThreeDMultiSelectDropdown
                  label={`Deliverables (${availableDeliverables.length})`}
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-700" />}
                  placeholder={availableDeliverables.length === 0 ? "No assigned deliverables on cards" : "Select deliverables..."}
                  options={deliverableOptions}
                  selectedValues={filters.deliverables || []}
                  onChange={(deliverables) => onChange({ ...filters, deliverables })}
                  searchPlaceholder="Search deliverable..."
                  emptyMessage="No assigned deliverables found on cards"
                />
              </div>
            )}

            {/* 7. Event Types Multi-Select (STRICTLY FOR SHOOTS ONLY) */}
            {isShoot && (
              <div className="pt-2 border-t border-amber-200/60">
                <ThreeDMultiSelectDropdown
                  label={`Event Types (${availableEventTypes.length})`}
                  icon={<Tag className="w-3.5 h-3.5 text-amber-700" />}
                  placeholder={availableEventTypes.length === 0 ? "No assigned event types on cards" : "Select assigned event types..."}
                  options={eventOptions}
                  selectedValues={filters.eventTypes}
                  onChange={(events) => onChange({ ...filters, eventTypes: events })}
                  searchPlaceholder="Search event type..."
                  emptyMessage="No assigned event types found on cards"
                />
              </div>
            )}

            {/* 8. Crew Roles Multi-Select (STRICTLY FOR SHOOTS ONLY) */}
            {isShoot && (
              <div className="pt-2 border-t border-amber-200/60">
                <ThreeDMultiSelectDropdown
                  label={`Crew Roles (${availableRoles.length})`}
                  icon={<Users className="w-3.5 h-3.5 text-amber-700" />}
                  placeholder={availableRoles.length === 0 ? "No assigned crew roles on cards" : "Select assigned crew roles..."}
                  options={roleOptions}
                  selectedValues={filters.roles}
                  onChange={(roles) => onChange({ ...filters, roles })}
                  searchPlaceholder="Search crew role..."
                  emptyMessage="No assigned crew roles found on cards"
                />
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-amber-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
              <span>Reset All</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>Show {totalFilteredCount} Results</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
