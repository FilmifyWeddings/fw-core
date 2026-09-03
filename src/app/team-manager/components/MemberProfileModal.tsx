'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  X, Calendar, Clock, MapPin, Phone, Mail, 
  ChevronLeft, ChevronRight, Filter, Award, 
  CheckCircle2, Clock3, ArrowUpRight, FileText,
  Camera, Briefcase, ChevronDown
} from 'lucide-react';
import { FWTeamMember, FWAssignment, FWSubEvent, FWProject } from '@/types';

export interface MemberShootItem {
  assignment: FWAssignment;
  subEvent: FWSubEvent;
  project: FWProject;
  dateObj: Date;
}

export interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember | null;
  shoots: MemberShootItem[];
  format12HourTime: (time?: string) => string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
  shoots = [],
  format12HourTime,
}: MemberProfileModalProps) {
  // Master Filter States
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('All');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Distinct roles this member has
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    if (member?.primary_role) set.add(member.primary_role);
    shoots.forEach(s => {
      if (s.assignment?.required_role) set.add(s.assignment.required_role);
    });
    return Array.from(set);
  }, [member, shoots]);

  // Available Years from shoots + default
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    const currentYear = new Date().getFullYear();
    set.add(currentYear - 1);
    set.add(currentYear);
    set.add(currentYear + 1);

    shoots.forEach(s => {
      if (s.dateObj && !isNaN(s.dateObj.getTime())) {
        set.add(s.dateObj.getFullYear());
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [shoots]);

  // Filtered Shoots
  const filteredShoots = useMemo(() => {
    return shoots.filter(s => {
      // Role Filter
      if (selectedRoleFilter !== 'All') {
        const r = s.assignment?.required_role || '';
        if (r.toLowerCase() !== selectedRoleFilter.toLowerCase()) return false;
      }

      // Year Filter
      if (selectedYearFilter !== 'All') {
        const yr = parseInt(selectedYearFilter, 10);
        if (s.dateObj.getFullYear() !== yr) return false;
      }

      // Month Filter
      if (selectedMonthFilter !== 'All') {
        const m = parseInt(selectedMonthFilter, 10);
        if (s.dateObj.getMonth() !== m) return false;
      }

      return true;
    });
  }, [shoots, selectedRoleFilter, selectedYearFilter, selectedMonthFilter]);

  // Filtered Key Metrics
  const { filteredRoleCounts, completedCount, upcomingCount } = useMemo(() => {
    const roleCounts: Record<string, number> = {};
    let completed = 0;
    let upcoming = 0;

    filteredShoots.forEach(s => {
      const r = s.assignment?.required_role || 'Crew';
      roleCounts[r] = (roleCounts[r] || 0) + 1;

      const isValid = !isNaN(s.dateObj.getTime());
      if (isValid && s.dateObj < today) {
        completed++;
      } else {
        upcoming++;
      }
    });

    return {
      filteredRoleCounts: roleCounts,
      completedCount: completed,
      upcomingCount: upcoming,
    };
  }, [filteredShoots, today]);

  // Paginated Shoots
  const totalPages = Math.max(1, Math.ceil(filteredShoots.length / itemsPerPage));
  const paginatedShoots = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShoots.slice(start, start + itemsPerPage);
  }, [filteredShoots, currentPage, itemsPerPage]);

  if (!isOpen || !member) return null;

  const cleanName = member.name ? member.name.replace(/\.\.\./g, '').trim() : 'Team Member';
  const totalFilteredCount = filteredShoots.length;
  const completedPercent = totalFilteredCount > 0 ? Math.round((completedCount / totalFilteredCount) * 100) : 0;
  const upcomingPercent = totalFilteredCount > 0 ? 100 - completedPercent : 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-4 sm:p-6 md:p-8 space-y-4 relative max-h-[92vh] overflow-y-auto my-auto font-sans">
        {/* PINNED TOP-RIGHT CORNER CRISP CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center cursor-pointer shadow-md transition"
          title="Close Member Profile"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
        
        {/* ─── 1. MODAL HEADER: MEMBER IDENTITY ─── */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3.5">
            {member.avatar_url ? (
              // eslint-disable-next-next/no-img-element
              <img
                src={member.avatar_url}
                alt={cleanName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white ring-2 ring-purple-400 shadow-md shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                }}
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 text-white font-black text-lg flex items-center justify-center border-2 border-white ring-2 ring-purple-200 shadow-md shrink-0">
                {cleanName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {cleanName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-black uppercase tracking-wider">
                  {member.primary_role || 'Crew'}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {member.country_code || '+91'} {member.phone_number}
                </span>
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    {member.email}
                  </span>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* ─── 2. MASTER FILTERS ACCORDION (ROLE, YEAR, MONTH) ─── */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <span className="uppercase tracking-wider text-[10px] text-slate-400">Analytics Scope</span>
              {(selectedRoleFilter !== 'All' || selectedYearFilter !== 'All' || selectedMonthFilter !== 'All') && (
                <div className="flex items-center gap-1">
                  {selectedRoleFilter !== 'All' && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[9px] font-bold">
                      {selectedRoleFilter}
                    </span>
                  )}
                  {selectedYearFilter !== 'All' && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[9px] font-bold">
                      {selectedYearFilter}
                    </span>
                  )}
                  {selectedMonthFilter !== 'All' && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[9px] font-bold">
                      {MONTH_NAMES[parseInt(selectedMonthFilter, 10)]?.slice(0, 3)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-6.5 px-2.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                isFilterOpen || selectedRoleFilter !== 'All' || selectedYearFilter !== 'All' || selectedMonthFilter !== 'All'
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Filter className="w-3 h-3 text-purple-600" />
              <span>Filter</span>
              {(selectedRoleFilter !== 'All' || selectedYearFilter !== 'All' || selectedMonthFilter !== 'All') && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
              )}
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter Dropdowns - Shown only when Filter button is clicked */}
          {isFilterOpen && (
            <div className="pt-2 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Select Filters</span>
                {(selectedRoleFilter !== 'All' || selectedYearFilter !== 'All' || selectedMonthFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleFilter('All');
                      setSelectedYearFilter('All');
                      setSelectedMonthFilter('All');
                      setCurrentPage(1);
                    }}
                    className="text-[9px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Role Filter */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Role</label>
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => {
                      setSelectedRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-6.5 px-2 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    {distinctRoles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Year</label>
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => {
                      setSelectedYearFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-6.5 px-2 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Month</label>
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => {
                      setSelectedMonthFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-6.5 px-2 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="All">All Months</option>
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. MEMBER KEY METRICS SUMMARY (FILTERED) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          
          {/* Total Filtered Shoots Card */}
          <div className="sm:col-span-4 bg-gradient-to-br from-indigo-50 to-purple-50/60 border border-indigo-100 rounded-2xl p-4 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
              Total Filtered Shoots
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-950">{totalFilteredCount}</span>
              <span className="text-xs font-bold text-indigo-700">Events</span>
            </div>
          </div>

          {/* Filtered Role Summary Pill Strip */}
          <div className="sm:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Filtered Role Summary
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.keys(filteredRoleCounts).length === 0 ? (
                <span className="text-xs text-slate-400 italic">No roles match active filter</span>
              ) : (
                Object.entries(filteredRoleCounts).map(([r, count]) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs"
                  >
                    <span>{r}:</span>
                    <span className="text-purple-600 font-black">{count}</span>
                  </span>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Status Breakdown Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 font-extrabold flex items-center gap-1.5">
              <span>Status Breakdown:</span>
              <span className="text-emerald-700 font-black">Completed: {completedCount}</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-black">Upcoming: {upcomingCount}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-bold">
              {completedPercent}% Done
            </span>
          </div>

          {/* Progress Bar Breakdown */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
            <div
              style={{ width: `${completedPercent}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Completed: ${completedCount}`}
            />
            <div
              style={{ width: `${upcomingPercent}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`Upcoming: ${upcomingCount}`}
            />
          </div>
        </div>

        {/* ─── 4. MEMBER EVENTS LIST (FILTERED & PAGINATED) ─── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Filtered Events List ({totalFilteredCount})
            </h4>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {paginatedShoots.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 space-y-1">
              <Calendar className="w-6 h-6 mx-auto opacity-30 mb-2" />
              <p>No events found for this filter criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleFilter('All');
                  setSelectedYearFilter('All');
                  setSelectedMonthFilter('All');
                  setCurrentPage(1);
                }}
                className="text-indigo-600 hover:underline text-[11px] font-bold mt-1 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedShoots.map(({ subEvent, project, assignment, dateObj }) => {
                const isPast = !isNaN(dateObj.getTime()) && dateObj < today;
                const dateFormatted = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : subEvent.event_date;

                const locationDisplay = subEvent.venue_name || subEvent.location_address || 'Location TBD';

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-2xl transition shadow-2xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          {project.client_name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-purple-700">
                          {subEvent.event_title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPast
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </span>

                        {/* Link to Project Finance */}
                        <Link
                          href={`/workspace/finance?client=${encodeURIComponent(project.client_name)}`}
                          target="_blank"
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs hover:shadow-xs transition"
                          title="View Project Financials"
                        >
                          <span>Finance</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Details Row: Date | Event Type | Venue/Location & Assigned Role */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          {dateFormatted}
                        </span>

                        <span className="text-slate-300 font-normal">|</span>

                        <span className="flex items-center gap-1 text-slate-700 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{locationDisplay}</span>
                        </span>
                      </div>

                      {/* Assigned Role Pill */}
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-extrabold text-slate-800 shadow-2xs">
                        Role: <span className="text-purple-600">{assignment.required_role}</span>
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 5. MODAL FOOTER ─── */}
        <div className="pt-2 text-right border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            Close Member Analytics
          </button>
        </div>

      </div>
    </div>
  );
}
