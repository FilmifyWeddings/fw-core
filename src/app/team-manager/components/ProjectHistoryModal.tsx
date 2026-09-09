'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, History, Calendar, MapPin, UserPlus, UserMinus, UserCheck, 
  ShieldCheck, IndianRupee, Trash2, Search, RefreshCw, 
  ChevronDown, ChevronRight, ArrowRight, Sparkles, Clock, Crown, User
} from 'lucide-react';
import { FWProject } from '@/types';
import { supabase } from '@/lib/supabase';
import { ProjectActivityLog } from '@/lib/services/projectAuditService';

export interface ProjectHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FWProject | null;
}

function formatLogTime(isoDateStr: string): string {
  try {
    return new Date(isoDateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// Return styling and icon based on actionType
function getActionConfig(actionType: string) {
  switch (actionType?.toUpperCase()) {
    case 'DATE_UPDATED':
    case 'SCHEDULE_SHIFTED':
      return {
        icon: Calendar,
        colorClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
        label: 'Schedule Shifted',
      };
    case 'DATE_TBD_TOGGLED':
      return {
        icon: Calendar,
        colorClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
        label: 'Date Status',
      };
    case 'LOCATION_UPDATED':
    case 'VENUE_UPDATED':
      return {
        icon: MapPin,
        colorClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        badgeClass: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
        label: 'Venue Updated',
      };
    case 'NOTES_UPDATED':
    case 'NOTE_UPDATED':
      return {
        icon: History,
        colorClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        badgeClass: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200',
        label: 'Notes Updated',
      };
    case 'CREW_ASSIGNED':
      return {
        icon: UserPlus,
        colorClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
        badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100',
        label: 'Crew Assigned',
      };
    case 'CREW_REPLACED':
      return {
        icon: UserCheck,
        colorClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
        badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100',
        label: 'Crew Replaced',
      };
    case 'CREW_REMOVED':
      return {
        icon: UserMinus,
        colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
        label: 'Crew Removed',
      };
    case 'PM_CHANGED':
      return {
        icon: ShieldCheck,
        colorClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
        label: 'Project Manager',
      };
    case 'RATE_CHANGED':
    case 'COMMERCIALS_UPDATED':
      return {
        icon: IndianRupee,
        colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
        label: 'Commercials',
      };
    case 'EVENT_DELETED':
    case 'SUB_EVENT_DELETED':
      return {
        icon: Trash2,
        colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
        label: 'Sub-Event Deleted',
      };
    case 'EVENT_ADDED':
    case 'SUB_EVENT_ADDED':
      return {
        icon: Sparkles,
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        label: 'Sub-Event Added',
      };
    case 'PROJECT_CREATED':
      return {
        icon: Sparkles,
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        label: 'Project Created',
      };
    case 'PROJECT_UPDATED':
    case 'CLIENT_NAME_CHANGED':
      return {
        icon: Sparkles,
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        label: 'Client Name Changed',
      };
    default:
      return {
        icon: History,
        colorClass: 'bg-stone-50 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800',
        badgeClass: 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200',
        label: 'Activity',
      };
  }
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [logs, setLogs] = useState<ProjectActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Prevent background scroll bleed when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Immediate storage-lean log fetching (50 item hard limit)
  const fetchLogs = useCallback(async () => {
    if (!project?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fw_project_activity_logs')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(50); // Hard limit to keep payload and memory super light

      if (data) {
        setLogs(data as ProjectActivityLog[]);
      }
      if (error) {
        console.warn('[ProjectHistoryModal] fetch error:', error.message);
      }
    } catch (err) {
      console.error('[ProjectHistoryModal] fetch exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [project?.id]);

  // Revalidate immediately whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      setSearchQuery('');
      setExpandedDates({});
    }
  }, [isOpen, fetchLogs]);

  // Filter logs based on search
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.description.toLowerCase().includes(q) ||
        l.actor_name.toLowerCase().includes(q) ||
        (l.event_title || '').toLowerCase().includes(q) ||
        (l.action_type || '').toLowerCase().includes(q) ||
        (l.actor_role || '').toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Collapsible Date-Wise Accordion (Recent First)
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    filteredLogs.forEach((log) => {
      const dateKey = new Date(log.created_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey] === false ? true : false,
    }));
  };

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        {/* Luxury 3D Centered Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-2xl max-h-[85vh] bg-[#FDFBF7] dark:bg-[#1C1917] rounded-2xl sm:rounded-3xl shadow-2xl border border-amber-900/20 dark:border-stone-800 flex flex-col overflow-hidden font-sans my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#EFE9DF] dark:border-amber-950/40 bg-gradient-to-b from-white to-[#FDFBF7] dark:from-[#211E1B] dark:to-[#1A1816] shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100/90 dark:bg-amber-900/40 text-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/40 flex items-center gap-1 shadow-2xs">
                    <History className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>Project History Ledger</span>
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-neutral-500">
                    {logs.length} {logs.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {project.client_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium truncate">
                  Google-Sheets style tamper-evident audit history of all project changes
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-[#25221E] hover:bg-amber-50 dark:hover:bg-neutral-800 border border-amber-900/15 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer shadow-xs"
                  title="Refresh Logs (Immediate Revalidation)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-[#25221E] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-amber-900/15 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition cursor-pointer shadow-xs"
                  title="Close History Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative mt-3.5">
              <Search className="w-3.5 h-3.5 text-amber-900/40 dark:text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by author, event title, or modification details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-[#25221E] border border-amber-900/15 dark:border-neutral-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-inner"
              />
            </div>
          </div>

          {/* Timeline List / Accordion Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                  Retrieving activity ledger...
                </p>
              </div>
            ) : Object.keys(groupedLogs).length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-neutral-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-neutral-700 shadow-xs">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                    {searchQuery ? 'No matching activity records' : 'No activity logged yet'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto mt-1 font-medium">
                    {searchQuery
                      ? 'Try clearing the search query to view all entries.'
                      : 'Changes to events, team member allocations, and rates will appear here chronologically.'}
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(groupedLogs).map(([dateKey, entries]) => {
                const isExpanded = expandedDates[dateKey] !== false;

                return (
                  <div
                    key={dateKey}
                    className="rounded-2xl border border-amber-900/15 dark:border-amber-950/60 bg-white/70 dark:bg-[#201D1A] overflow-hidden shadow-xs transition-all"
                  >
                    {/* Date Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleDateGroup(dateKey)}
                      className="w-full px-4 py-2 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-[#26221E] dark:hover:bg-[#2B2723] flex items-center justify-between gap-3 text-left transition cursor-pointer border-b border-amber-900/10 dark:border-amber-950/40 select-none"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-black text-amber-950 dark:text-amber-200 tracking-tight">
                          {dateKey}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/70 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800/40">
                        {entries.length} {entries.length === 1 ? 'change' : 'changes'}
                      </span>
                    </button>

                    {/* Google-Sheets Style Structured Timeline Cards */}
                    {isExpanded && (
                      <div className="p-3 space-y-2.5">
                        {entries.map((log) => {
                          const cfg = getActionConfig(log.action_type);
                          const isStudioOwner = !log.actor_role || 
                            log.actor_role.toLowerCase().includes('owner') || 
                            log.actor_role.toLowerCase().includes('admin');

                          return (
                            <div
                              key={log.id}
                              className="p-3.5 rounded-xl bg-white dark:bg-[#23201D] border border-amber-900/10 dark:border-stone-800 shadow-xs hover:border-amber-900/25 dark:hover:border-stone-700 transition-all"
                            >
                              {/* Top Row: The Author (Studio Owner / Admin / Team Member) */}
                              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2.5">
                                  {log.actor_avatar ? (
                                    <img 
                                      src={log.actor_avatar} 
                                      alt="" 
                                      className="w-6 h-6 rounded-full object-cover border border-amber-500/30" 
                                    />
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-xs ${
                                      isStudioOwner ? 'bg-amber-600' : 'bg-blue-600'
                                    }`}>
                                      {log.actor_name?.[0]?.toUpperCase() || (isStudioOwner ? 'O' : 'U')}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                      {log.actor_name}
                                    </span>

                                    {/* Author Role Badge */}
                                    {isStudioOwner ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-extrabold border border-amber-300/60 dark:border-amber-800/50 shadow-2xs">
                                        <Crown className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                        <span>Studio Owner</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-extrabold border border-blue-300/60 dark:border-blue-800/50 shadow-2xs">
                                        <User className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                                        <span>{log.actor_role || 'Team Member'}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                                  {formatLogTime(log.created_at)}
                                </span>
                              </div>

                              {/* Bottom Row: The Action / Modification Details */}
                              <div className="pl-8">
                                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                                  {log.event_title ? (
                                    <span>
                                      <strong className="text-slate-900 dark:text-white font-bold">{log.event_title}</strong>
                                      {' • '}
                                      <span className="text-amber-700 dark:text-amber-400 font-bold">{cfg.label}</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 dark:text-amber-400 font-bold">{cfg.label}</span>
                                  )}
                                </div>

                                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                                  {log.description}
                                </p>

                                {/* Visual Badges:
                                    - If crew replacement: Show Old Crew → New Crew pill.
                                    - If rate change included: Show strikethrough ₹18,000 → ₹0 pill in the same card.
                                */}
                                {(() => {
                                  const meta = log.metadata || {};
                                  const isCrewReplacement = Boolean(
                                    (meta.isReplacement && meta.previousMemberName && meta.newMemberName) ||
                                    (log.action_type === 'CREW_REPLACED' && (meta.previousMemberName || (log.previous_value && !log.previous_value.startsWith('₹'))))
                                  );
                                  const prevCrew = meta.previousMemberName || (!log.previous_value?.startsWith('₹') ? log.previous_value : null);
                                  const newCrew = meta.newMemberName || log.target_member_name;

                                  const hasRateChange = Boolean(
                                    (meta.previousRate !== undefined && meta.newRate !== undefined && Number(meta.previousRate) !== Number(meta.newRate)) ||
                                    (log.previous_value?.startsWith('₹') && log.new_value?.startsWith('₹')) ||
                                    (log.action_type === 'RATE_CHANGED' && log.new_value)
                                  );

                                  const prevRateFormatted = meta.previousRate !== undefined
                                    ? `₹${Number(meta.previousRate).toLocaleString('en-IN')}`
                                    : (log.previous_value?.startsWith('₹') ? log.previous_value : null);

                                  const newRateFormatted = meta.newRate !== undefined
                                    ? `₹${Number(meta.newRate).toLocaleString('en-IN')}`
                                    : (log.new_value?.startsWith('₹') ? log.new_value : null);

                                  const hasOtherChange = !isCrewReplacement && !hasRateChange && log.previous_value && log.new_value && log.previous_value !== log.new_value;

                                  if (!isCrewReplacement && !hasRateChange && !hasOtherChange) return null;

                                  return (
                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                      {/* 1. Crew Replacement Pill: Old Crew → New Crew */}
                                      {isCrewReplacement && prevCrew && newCrew && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] font-semibold text-amber-900 dark:text-amber-200 shadow-2xs">
                                          <span className="text-amber-800/90 dark:text-amber-300/90 font-medium">{prevCrew}</span>
                                          <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                                          <span className="text-amber-950 dark:text-amber-100 font-bold">{newCrew}</span>
                                        </span>
                                      )}

                                      {/* 2. Rate Strikethrough Pill: ₹18,000 → ₹0 / ₹20,000 */}
                                      {hasRateChange && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-mono shadow-2xs">
                                          {prevRateFormatted && (
                                            <>
                                              <span className="line-through text-rose-500 font-medium">{prevRateFormatted}</span>
                                              <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                                            </>
                                          )}
                                          <span className="text-emerald-700 dark:text-emerald-300 font-bold">{newRateFormatted || '₹0'}</span>
                                        </span>
                                      )}

                                      {/* 3. General Property Shift Pill (e.g. Venue, Schedule) */}
                                      {hasOtherChange && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-[11px] font-mono shadow-2xs">
                                          <span className="line-through text-rose-500">{log.previous_value}</span>
                                          <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{log.new_value}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-[#EFE9DF] dark:border-amber-950/40 bg-[#FDFBF7] dark:bg-[#1A1816] flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 shrink-0">
            <span className="text-[11px] font-medium flex items-center gap-1">
              <span>🔒 Tamper-evident ledger</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-bold transition cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectHistoryModal;
