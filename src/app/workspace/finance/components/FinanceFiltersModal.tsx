'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Calendar, Users, Folder, Search, Check, ChevronDown, Building2, Handshake } from 'lucide-react';

export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface DetailedTeamMember {
  id?: string;
  name: string;
  avatar_url?: string;
  primary_role?: string;
  role?: string;
  primary_type?: string;
  member_types?: string[];
  payout_frequency?: string;
}

export interface FinanceFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'invoices' | 'expenses' | 'analytics' | 'clients';
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
  teamMembersDetailed?: DetailedTeamMember[];
  teamMembersList: string[];
  handledByList?: string[];
  statusFilter: string;
  setStatusFilter: (val: any) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  uniqueCategories: string[];
  expenseCategories?: string[];
  clientFilter?: string;
  setClientFilter?: (val: string) => void;
  clientsList?: Array<{ id: string; name: string }>;
  locationFilter: string;
  setLocationFilter: (val: string) => void;
  uniqueLocations: string[];
  paymentModeFilter: string;
  setPaymentModeFilter: (val: string) => void;
  revenueTypeFilter?: 'ALL' | 'NEW_BOOKING' | 'DUE_BALANCE';
  setRevenueTypeFilter?: (val: 'ALL' | 'NEW_BOOKING' | 'DUE_BALANCE') => void;
}

export function FinanceFiltersModal({
  isOpen,
  onClose,
  activeTab = 'invoices',
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
  teamMembersDetailed = [],
  teamMembersList = [],
  handledByList = [],
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  uniqueCategories = [],
  expenseCategories = [],
  clientFilter = 'all',
  setClientFilter,
  clientsList = [],
  locationFilter,
  setLocationFilter,
  uniqueLocations = [],
  paymentModeFilter,
  setPaymentModeFilter,
  revenueTypeFilter = 'ALL',
  setRevenueTypeFilter,
}: FinanceFiltersModalProps) {
  // States for custom dropdown popovers
  const isInvoiceTab = activeTab !== 'expenses';
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown popovers on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Segregate Team Members into In-House vs Freelancers & Partners
  const { inHouseMembers, freelancerMembers } = useMemo(() => {
    const inHouse: DetailedTeamMember[] = [];
    const freelancers: DetailedTeamMember[] = [];
    const seenNames = new Set<string>();

    teamMembersDetailed.forEach((m) => {
      const name = m.name?.trim();
      if (!name || seenNames.has(name.toLowerCase())) return;
      seenNames.add(name.toLowerCase());

      const isInHouse =
        m.primary_type === 'IN_HOUSE' ||
        m.member_types?.includes('IN_HOUSE') ||
        m.payout_frequency === 'monthly';

      if (isInHouse) {
        inHouse.push(m);
      } else {
        freelancers.push(m);
      }
    });

    // Also include any names in teamMembersList that were not in teamMembersDetailed
    teamMembersList.forEach((raw) => {
      const clean = raw.replace(/\s*\([^)]*\)/g, '').trim();
      if (!clean || seenNames.has(clean.toLowerCase())) return;
      seenNames.add(clean.toLowerCase());
      freelancers.push({
        id: clean,
        name: clean,
        primary_role: raw.includes('(') ? raw.split('(')[1].replace(')', '').trim() : 'Crew',
      });
    });

    return { inHouseMembers: inHouse, freelancerMembers: freelancers };
  }, [teamMembersDetailed, teamMembersList]);

  // Filtered members by search query
  const filteredInHouse = useMemo(() => {
    if (!teamSearchQuery.trim()) return inHouseMembers;
    const q = teamSearchQuery.toLowerCase();
    return inHouseMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.primary_role || m.role || '').toLowerCase().includes(q)
    );
  }, [inHouseMembers, teamSearchQuery]);

  const filteredHandledBy = useMemo(() => {
    const list = handledByList && handledByList.length > 0 ? handledByList : [];
    if (!teamSearchQuery.trim()) return list;
    const q = teamSearchQuery.toLowerCase();
    return list.filter((name) => name.toLowerCase().includes(q));
  }, [handledByList, teamSearchQuery]);

  const filteredFreelancers = useMemo(() => {
    if (!teamSearchQuery.trim()) return freelancerMembers;
    const q = teamSearchQuery.toLowerCase();
    return freelancerMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.primary_role || m.role || '').toLowerCase().includes(q)
    );
  }, [freelancerMembers, teamSearchQuery]);

  // Selected Team Member / Handled By Label
  const selectedMemberDisplay = useMemo(() => {
    if (teamMemberFilter === 'all') {
      return isInvoiceTab ? '👥 All Handled By' : '👥 All Team Members';
    }
    if (teamMemberFilter === 'unassigned') return '👤 Unassigned Only';
    const found = teamMembersDetailed.find(
      (m) => m.id === teamMemberFilter || m.name.toLowerCase() === teamMemberFilter.toLowerCase()
    );
    return found?.name || teamMemberFilter;
  }, [teamMemberFilter, teamMembersDetailed, isInvoiceTab]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase();
    return clientsList.filter((c) => c.name.toLowerCase().includes(q));
  }, [clientsList, clientSearchQuery]);

  const selectedClientDisplay = useMemo(() => {
    if (!clientFilter || clientFilter === 'all') return '📁 All Clients';
    const found = clientsList.find((c) => c.id === clientFilter || c.name === clientFilter);
    return found ? found.name : clientFilter;
  }, [clientFilter, clientsList]);

  // Combined Category options for expenses mode
  const effectiveExpenseCategories = useMemo(() => {
    const base = [
      'Post-Production Payout',
      'Staff Salary Payout',
      'Crew Payout',
      'Photographer Payout',
      'Cinematographer Payout',
      'Album Printing Fee',
      'Travel & Conveyance',
      'Studio Rent & Utilities',
    ];
    return Array.from(new Set([...base, ...expenseCategories]));
  }, [expenseCategories]);

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
                <Filter className="w-3.5 h-3.5 text-orange-600" />
                <span>{activeTab === 'expenses' ? 'Team Payouts Filters' : 'Filter Criteria'}</span>
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
                {statusFilter === 'received' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Payment Date Mode
                  </span>
                ) : dateRangePreset !== 'all' ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : null}
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
                        const str = formatLocalDate(now);
                        setStartDate(str);
                        setEndDate(str);
                      } else if (val === 'yesterday') {
                        const yest = new Date(now);
                        yest.setDate(now.getDate() - 1);
                        const y = formatLocalDate(yest);
                        setStartDate(y);
                        setEndDate(y);
                      } else if (val === 'this_week') {
                        const day = now.getDay();
                        const diffToMonday = (day === 0 ? -6 : 1) - day;
                        const monday = new Date(now);
                        monday.setDate(now.getDate() + diffToMonday);
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        setStartDate(formatLocalDate(monday));
                        setEndDate(formatLocalDate(sunday));
                      } else if (val === 'this_month') {
                        const first = new Date(now.getFullYear(), now.getMonth(), 1);
                        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setStartDate(formatLocalDate(first));
                        setEndDate(formatLocalDate(last));
                      } else if (val === 'last_30_days') {
                        const past = new Date(now);
                        past.setDate(now.getDate() - 29);
                        setStartDate(formatLocalDate(past));
                        setEndDate(formatLocalDate(now));
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

            {/* 👥 THREADED TEAM MEMBER DROPDOWN WITH AVATARS */}
            <div className="relative" ref={teamDropdownRef}>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-600" /> {isInvoiceTab ? 'Handled By' : 'Team Member'}
                </span>
                {teamMemberFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTeamMemberFilter('all')}
                    className="text-[10px] font-bold text-amber-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </label>

              <button
                type="button"
                onClick={() => setIsTeamDropdownOpen((prev) => !prev)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition text-left"
              >
                <span className="truncate">{selectedMemberDisplay}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Threaded Dropdown Popover */}
              {isTeamDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-hidden flex flex-col p-1.5 space-y-1">
                  {/* Search Input */}
                  <div className="relative p-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={isInvoiceTab ? 'Search handled by staff...' : 'Search member or role...'}
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="overflow-y-auto flex-1 space-y-1">
                    {/* All Team Members */}
                    <button
                      type="button"
                      onClick={() => {
                        setTeamMemberFilter('all');
                        setIsTeamDropdownOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                        teamMemberFilter === 'all'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>👥</span> {isInvoiceTab ? 'All Handled By' : 'All Team Members'}
                      </span>
                      {teamMemberFilter === 'all' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Unassigned Only (For Invoices Tab) */}
                    {isInvoiceTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setTeamMemberFilter('unassigned');
                          setIsTeamDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          teamMemberFilter === 'unassigned'
                            ? 'bg-rose-500 text-white shadow-2xs'
                            : 'hover:bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>👤</span> Unassigned Only
                        </span>
                        {teamMemberFilter === 'unassigned' && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {isInvoiceTab ? (
                      /* 👤 HANDLED BY STAFF LIST (ASSIGNED MEMBERS ONLY) */
                      <div className="pt-1.5">
                        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 rounded-md flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Assigned Handled By Staff ({filteredHandledBy.length})</span>
                        </div>
                        {filteredHandledBy.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400 font-medium text-center">
                            No staff currently assigned in handled by
                          </div>
                        ) : (
                          <div className="mt-1 space-y-0.5">
                            {filteredHandledBy.map((name) => {
                              const isSelected = teamMemberFilter.toLowerCase() === name.toLowerCase();
                              const memberInfo = teamMembersDetailed.find(
                                (m) => m.name.toLowerCase() === name.toLowerCase()
                              );
                              const initials = name.slice(0, 2).toUpperCase();

                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => {
                                    setTeamMemberFilter(name);
                                    setIsTeamDropdownOpen(false);
                                  }}
                                  className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : 'hover:bg-amber-50/70 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {memberInfo?.avatar_url ? (
                                      <img
                                        src={memberInfo.avatar_url}
                                        alt={name}
                                        className="w-5 h-5 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[9px] font-black flex items-center justify-center shrink-0 border border-purple-200">
                                        {initials}
                                      </div>
                                    )}
                                    <div className="truncate min-w-0">
                                      <span className="truncate block font-extrabold">{name}</span>
                                      <span className={`text-[9px] block truncate ${isSelected ? 'text-white/80' : 'text-purple-600 font-semibold'}`}>
                                        {memberInfo?.primary_role || memberInfo?.role || 'Handled By'}
                                      </span>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 🏢 TEAM MEMBERS LIST (FOR TEAM PAYOUTS & EXPENSES - 100% UNTOUCHED) */
                      <>
                        {/* GROUP 1: 🏢 IN-HOUSE TEAM MEMBERS (AT THE TOP) */}
                    {filteredInHouse.length > 0 && (
                      <div className="pt-1.5">
                        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 rounded-md flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>In-House Team Members ({filteredInHouse.length})</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {filteredInHouse.map((m) => {
                            const isSelected =
                              teamMemberFilter === m.id ||
                              teamMemberFilter.toLowerCase() === m.name.toLowerCase();
                            const initials = m.name.slice(0, 2).toUpperCase();

                            return (
                              <button
                                key={m.id || m.name}
                                type="button"
                                onClick={() => {
                                  setTeamMemberFilter(m.id || m.name);
                                  setIsTeamDropdownOpen(false);
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'hover:bg-amber-50/70 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {m.avatar_url ? (
                                    <img
                                      src={m.avatar_url}
                                      alt={m.name}
                                      className="w-5 h-5 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[9px] font-black flex items-center justify-center shrink-0 border border-purple-200">
                                      {initials}
                                    </div>
                                  )}
                                  <div className="truncate min-w-0">
                                    <span className="truncate block font-extrabold">{m.name}</span>
                                    <span className={`text-[9px] block truncate ${isSelected ? 'text-white/80' : 'text-purple-600 font-semibold'}`}>
                                      {m.primary_role || m.role || 'In-House Staff'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* GROUP 2: 🤝 FREELANCERS & PARTNERS (UNDERNEATH) */}
                    {filteredFreelancers.length > 0 && (
                      <div className="pt-2">
                        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded-md flex items-center gap-1">
                          <Handshake className="w-3 h-3" />
                          <span>Freelancers &amp; Partners ({filteredFreelancers.length})</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {filteredFreelancers.map((m) => {
                            const isSelected =
                              teamMemberFilter === m.id ||
                              teamMemberFilter.toLowerCase() === m.name.toLowerCase();
                            const initials = m.name.slice(0, 2).toUpperCase();

                            return (
                              <button
                                key={m.id || m.name}
                                type="button"
                                onClick={() => {
                                  setTeamMemberFilter(m.id || m.name);
                                  setIsTeamDropdownOpen(false);
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'hover:bg-amber-50/70 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {m.avatar_url ? (
                                    <img
                                      src={m.avatar_url}
                                      alt={m.name}
                                      className="w-5 h-5 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black flex items-center justify-center shrink-0 border border-emerald-200">
                                      {initials}
                                    </div>
                                  )}
                                  <div className="truncate min-w-0">
                                    <span className="truncate block font-extrabold">{m.name}</span>
                                    <span className={`text-[9px] block truncate ${isSelected ? 'text-white/80' : 'text-emerald-700 font-semibold'}`}>
                                      {m.primary_role || m.role || 'Crew / Freelancer'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 📁 CLIENT FILTER DROPDOWN (DEDICATED FOR EXPENSES TAB) */}
            {activeTab === 'expenses' && setClientFilter && (
              <div className="relative" ref={clientDropdownRef}>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3 text-amber-600" /> Client
                  </span>
                  {clientFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setClientFilter('all')}
                      className="text-[10px] font-bold text-amber-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen((prev) => !prev)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition text-left"
                >
                  <span className="truncate">{selectedClientDisplay}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Client Dropdown Popover with Search */}
                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-hidden flex flex-col p-1.5 space-y-1">
                    <div className="relative p-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search client directory..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setClientFilter('all');
                          setIsClientDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          clientFilter === 'all'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>📁 All Clients</span>
                        {clientFilter === 'all' && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {filteredClients.map((client) => {
                        const isSelected = clientFilter === client.id || clientFilter === client.name;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setClientFilter(client.id);
                              setIsClientDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'hover:bg-amber-50/70 text-slate-800'
                            }`}
                          >
                            <span className="truncate">📁 {client.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT STATUS FILTER (FOR INVOICES TAB) */}
            {activeTab !== 'expenses' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">⚡ All Status</option>
                  <option value="overall_turnover">📈 Overall Turnover</option>
                  <option value="received">💰 Payment Received</option>
                  <option value="paid">✅ Fully Paid</option>
                  <option value="pending">⏳ Pending Due</option>
                  <option value="overdue_only">⚠️ Overdue Dues Only</option>
                  <option value="trash">🗑️ Trash (Archived / Soft-Deleted)</option>
                </select>
              </div>
            )}

            {/* CATEGORY FILTER */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {activeTab === 'expenses' ? 'Category' : 'Event Category'}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {activeTab === 'expenses' ? (
                  <>
                    <option value="all">📂 All Categories</option>
                    {effectiveExpenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="all">📂 All Event Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* LOCATION / CITY (HIDDEN FOR EXPENSES TAB) */}
            {activeTab !== 'expenses' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Location / City</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">📍 All Locations / Cities</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PAYMENT MODE CHANNEL (FOR BOTH INVOICES & EXPENSES) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Mode Channel</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
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
