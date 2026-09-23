'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Filter, Calendar, CheckSquare, Square, 
  RotateCcw, Check, Sparkles, IndianRupee, Users, Tag
} from 'lucide-react';

export interface DeliverablesFilterState {
  startDate: string;
  endDate: string;
  eventTypes: string[];
  roles: string[];
  paymentStatuses: string[];
}

interface VendorDeliverablesFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DeliverablesFilterState;
  onChange: (filters: DeliverablesFilterState) => void;
  onReset: () => void;
  availableEventTypes: string[];
  availableRoles: string[];
  totalFilteredCount: number;
}

export const PAYMENT_STATUS_OPTIONS = [
  { id: 'UNSETTLED', label: 'Unsettled (₹0 Commercials)', badge: 'bg-stone-100 text-stone-700 border-stone-300' },
  { id: 'FULL PAID', label: 'Full Paid (Cleared)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'PARTIALLY PAID', label: 'Partially Paid', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'UNPAID', label: 'Unpaid (Balance Pending)', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export default function VendorDeliverablesFilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  availableEventTypes,
  availableRoles,
  totalFilteredCount,
}: VendorDeliverablesFilterModalProps) {
  if (!isOpen) return null;

  const toggleEventType = (item: string) => {
    const exists = filters.eventTypes.includes(item);
    const updated = exists 
      ? filters.eventTypes.filter(x => x !== item)
      : [...filters.eventTypes, item];
    onChange({ ...filters, eventTypes: updated });
  };

  const toggleRole = (item: string) => {
    const exists = filters.roles.includes(item);
    const updated = exists 
      ? filters.roles.filter(x => x !== item)
      : [...filters.roles, item];
    onChange({ ...filters, roles: updated });
  };

  const togglePaymentStatus = (item: string) => {
    const exists = filters.paymentStatuses.includes(item);
    const updated = exists 
      ? filters.paymentStatuses.filter(x => x !== item)
      : [...filters.paymentStatuses, item];
    onChange({ ...filters, paymentStatuses: updated });
  };

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

  const activeFiltersCount = 
    (filters.startDate || filters.endDate ? 1 : 0) +
    filters.eventTypes.length +
    filters.roles.length +
    filters.paymentStatuses.length;

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
                  <span>Filter Assignments &amp; Shoots</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-2xs">
                      {activeFiltersCount} active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Multi-select filters for date range, event types, crew roles, and payment status
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
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-stone-800">
            {/* 1. Date Range & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Date Range</span>
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

            {/* 2. Payment Status Multi-Select */}
            <div className="space-y-2 pt-2 border-t border-amber-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Payment Status</span>
                </label>
                {filters.paymentStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, paymentStatuses: [] })}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    Clear Statuses
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_STATUS_OPTIONS.map((opt) => {
                  const isChecked = filters.paymentStatuses.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePaymentStatus(opt.id)}
                      className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 transition cursor-pointer shadow-2xs ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-stone-800 flex-1 truncate">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Event Types Multi-Select */}
            {availableEventTypes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>Event Types ({availableEventTypes.length})</span>
                  </label>
                  {filters.eventTypes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, eventTypes: [] })}
                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      Clear Events
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-2xl border border-stone-200">
                  {availableEventTypes.map((evt) => {
                    const isChecked = filters.eventTypes.includes(evt);
                    return (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleEventType(evt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isChecked
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{evt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Crew Roles Multi-Select */}
            {availableRoles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-amber-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span>Crew Roles ({availableRoles.length})</span>
                  </label>
                  {filters.roles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, roles: [] })}
                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      Clear Roles
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-2xl border border-stone-200">
                  {availableRoles.map((role) => {
                    const isChecked = filters.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          isChecked
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
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
