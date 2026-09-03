'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Calendar, Users } from 'lucide-react';

export interface FinanceFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFiltersCount: number;
  resetAllFilters: () => void;
  dateRangePreset: string;
  setDateRangePreset: (val: any) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  teamMemberFilter: string;
  setTeamMemberFilter: (val: string) => void;
  teamMembersList: string[];
  statusFilter: string;
  setStatusFilter: (val: any) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  uniqueCategories: string[];
  locationFilter: string;
  setLocationFilter: (val: string) => void;
  uniqueLocations: string[];
  paymentModeFilter: string;
  setPaymentModeFilter: (val: string) => void;
}

export function FinanceFiltersModal({
  isOpen,
  onClose,
  activeFiltersCount,
  resetAllFilters,
  dateRangePreset,
  setDateRangePreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  teamMemberFilter,
  setTeamMemberFilter,
  teamMembersList,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  uniqueCategories,
  locationFilter,
  setLocationFilter,
  uniqueLocations,
  paymentModeFilter,
  setPaymentModeFilter,
}: FinanceFiltersModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 sm:relative sm:inset-auto sm:bg-transparent"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="w-full max-w-sm mx-auto bg-white rounded-2xl p-4 shadow-xl text-xs sm:absolute sm:right-0 sm:top-2 sm:w-96 border border-slate-200 z-40 space-y-3.5 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-orange-600" /> Filter Criteria
              </h4>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[10px] font-extrabold text-rose-600 hover:underline cursor-pointer"
                >
                  Reset All ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* 📅 DATE RANGE PICKER */}
            <div className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" /> Date Range
                </label>
                {dateRangePreset !== 'all' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-extrabold">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_30_days', label: 'Last 30 Days' },
                ].map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      const val = preset.id as any;
                      setDateRangePreset(val);
                      const now = new Date();
                      if (val === 'today') {
                        const str = now.toISOString().split('T')[0];
                        setStartDate(str);
                        setEndDate(str);
                      } else if (val === 'yesterday') {
                        const y = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
                        setStartDate(y);
                        setEndDate(y);
                      } else if (val === 'this_week') {
                        const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
                        const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6)).toISOString().split('T')[0];
                        setStartDate(firstDay);
                        setEndDate(lastDay);
                      } else if (val === 'this_month') {
                        const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                        setStartDate(first);
                        setEndDate(last);
                      } else if (val === 'last_30_days') {
                        const past = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
                        setStartDate(past);
                        setEndDate(now.toISOString().split('T')[0]);
                      } else if (val === 'all') {
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className={`py-1 px-1.5 rounded-lg border text-center transition cursor-pointer ${
                      dateRangePreset === preset.id
                        ? 'bg-amber-600 text-white border-amber-600 font-black'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-2 py-1.5 shadow-2xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDateRangePreset('custom');
                      setStartDate(e.target.value);
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
                  />
                  <span className="text-amber-600 text-xs font-bold">➔</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDateRangePreset('custom');
                      setEndDate(e.target.value);
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* 👥 TEAM MEMBER */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-600" /> Team Member
              </label>
              <select
                value={teamMemberFilter}
                onChange={(e) => setTeamMemberFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">👥 All Team Members</option>
                <option value="unassigned">👤 Unassigned Only</option>
                {teamMembersList.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">⚡ All Statuses</option>
                <option value="overdue_only">⚠️ Overdue Dues Only</option>
                <option value="pending">⏳ Pending Balance</option>
                <option value="partially_paid">🌓 Partially Paid</option>
                <option value="paid">✅ 100% Paid Full</option>
              </select>
            </div>

            {/* Event Category */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Event Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">📂 All Event Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Location / City */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Location / City</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">📍 All Locations / Cities</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Payment Channel */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Mode Channel</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="all">💳 All Channels</option>
                <option value="UPI">UPI (GooglePay / PhonePe)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
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

export default FinanceFiltersModal;
