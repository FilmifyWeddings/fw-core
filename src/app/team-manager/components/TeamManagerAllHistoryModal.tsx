'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, History, Calendar, MapPin, UserPlus, UserMinus, UserCheck,
  ShieldCheck, IndianRupee, Trash2, Search, RefreshCw,
  ChevronDown, ChevronRight, ArrowRight, Sparkles, Clock, Crown, User,
  MessageCircle, ExternalLink, Filter, CheckCircle2, Layers
} from 'lucide-react';
import { FWProject, FWSubEvent, FWTeamMember } from '@/types';
import { ProjectActivityLog, fetchAllTeamManagerActivityLogs } from '@/lib/services/projectAuditService';
import { getRoleShortCode, getRoleAbbr } from '@/lib/workspace-settings';

export interface TeamManagerAllHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: FWProject[];
  teamMembers: FWTeamMember[];
  workspaceId?: string;
  onOpenCrewModal?: (params: {
    member: FWTeamMember;
    role: string;
    project: FWProject | null;
    subEvent: FWSubEvent | null;
    previousRate?: number | string;
  }) => void;
}

function formatTime(isoDateStr: string): string {
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

function formatRelativeTime(isoDateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateHeader(isoDateStr: string): string {
  try {
    const d = new Date(isoDateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const formattedDate = d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (isToday) return `Today — ${formattedDate}`;
    if (isYesterday) return `Yesterday — ${formattedDate}`;
    return formattedDate;
  } catch {
    return 'Recent Activity';
  }
}

function getInitials(name?: string | null): string {
  if (!name) return 'TM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getActionConfig(actionType: string) {
  switch (actionType?.toUpperCase()) {
    case 'CREW_ASSIGNED':
      return {
        icon: UserPlus,
        colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100',
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
    case 'COMMERCIALS_UPDATED':
    case 'RATE_CHANGED':
      return {
        icon: IndianRupee,
        colorClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        badgeClass: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200',
        label: 'Fee Updated',
      };
    case 'DATE_UPDATED':
    case 'SCHEDULE_SHIFTED':
      return {
        icon: Calendar,
        colorClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
        label: 'Date Changed',
      };
    case 'LOCATION_UPDATED':
    case 'VENUE_UPDATED':
      return {
        icon: MapPin,
        colorClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        badgeClass: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200',
        label: 'Venue Updated',
      };
    case 'PM_CHANGED':
      return {
        icon: ShieldCheck,
        colorClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
        label: 'Project Manager',
      };
    case 'PROJECT_CREATED':
      return {
        icon: Sparkles,
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        label: 'Project Created',
      };
    case 'EVENT_ADDED':
    case 'SUB_EVENT_ADDED':
      return {
        icon: Sparkles,
        colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        badgeClass: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
        label: 'Sub-Event Added',
      };
    case 'EVENT_DELETED':
    case 'SUB_EVENT_DELETED':
      return {
        icon: Trash2,
        colorClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
        label: 'Sub-Event Deleted',
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

export const TeamManagerAllHistoryModal: React.FC<TeamManagerAllHistoryModalProps> = ({
  isOpen,
  onClose,
  projects,
  teamMembers,
  workspaceId,
  onOpenCrewModal,
}) => {
  const [logs, setLogs] = useState<ProjectActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionCategory, setActionCategory] = useState<string>('ALL');
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

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

  // Fetch all logs across workspace & projects
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const projectIds = projects.map((p) => p.id).filter(Boolean);
      const data = await fetchAllTeamManagerActivityLogs({
        workspaceId,
        projectIds,
        limit: 250,
      });
      setLogs(data);
    } catch (err) {
      console.error('[TeamManagerAllHistoryModal] fetch exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, projects]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      setSearchQuery('');
      setActionCategory('ALL');
      setCollapsedDates({});
    }
  }, [isOpen, fetchLogs]);

  // Filter logs based on search query & action category
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Action Category filter
      if (actionCategory !== 'ALL') {
        const type = (log.action_type || '').toUpperCase();
        if (actionCategory === 'CREW') {
          if (!type.includes('CREW')) return false;
        } else if (actionCategory === 'FEE') {
          if (!type.includes('COMMERCIAL') && !type.includes('RATE')) return false;
        } else if (actionCategory === 'DATE') {
          if (!type.includes('DATE') && !type.includes('SCHEDULE')) return false;
        } else if (actionCategory === 'PROJECT') {
          if (!type.includes('PROJECT') && !type.includes('EVENT') && !type.includes('SUB_EVENT')) return false;
        }
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const matchedProject = projects.find((p) => p.id === log.project_id);
      const projectName = log.project_name || matchedProject?.client_name || '';

      return (
        (log.description || '').toLowerCase().includes(q) ||
        (log.actor_name || '').toLowerCase().includes(q) ||
        (log.target_member_name || '').toLowerCase().includes(q) ||
        (log.target_role || '').toLowerCase().includes(q) ||
        (log.event_title || '').toLowerCase().includes(q) ||
        (log.action_type || '').toLowerCase().includes(q) ||
        projectName.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, actionCategory, projects]);

  // Group logs date-by-date (chronological newest first)
  const groupedLogs = useMemo(() => {
    const groups: { dateKey: string; dateHeader: string; logs: ProjectActivityLog[] }[] = [];
    const map = new Map<string, { dateHeader: string; logs: ProjectActivityLog[] }>();

    filteredLogs.forEach((log) => {
      const d = new Date(log.created_at);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateHeader: formatDateHeader(log.created_at),
          logs: [],
        });
      }
      map.get(dateKey)!.logs.push(log);
    });

    Array.from(map.entries()).forEach(([dateKey, val]) => {
      groups.push({
        dateKey,
        dateHeader: val.dateHeader,
        logs: val.logs,
      });
    });

    return groups;
  }, [filteredLogs]);

  const toggleDateGroup = (dateKey: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Helper to resolve crew member and open WhatsApp / Commercials modal
  const handleEntryClick = (log: ProjectActivityLog) => {
    if (!onOpenCrewModal) return;

    // 1. Resolve project
    const project = projects.find((p) => p.id === log.project_id) || null;

    // 2. Resolve subEvent
    let subEvent: FWSubEvent | null = null;
    if (project && log.sub_event_id) {
      subEvent = project.fw_sub_events?.find((se) => se.id === log.sub_event_id) || null;
    } else if (project && log.event_title) {
      subEvent = project.fw_sub_events?.find((se) => se.event_title?.toLowerCase() === log.event_title?.toLowerCase()) || null;
    }

    // 3. Resolve crew member
    let member: FWTeamMember | null = null;
    if (log.target_member_id) {
      member = teamMembers.find((m) => m.id === log.target_member_id) || null;
    }
    if (!member && log.target_member_name) {
      const cleanTarget = log.target_member_name.toLowerCase().trim();
      member = teamMembers.find((m) => m.name.toLowerCase().trim() === cleanTarget) || null;
    }

    // 4. Resolve role
    const role = log.target_role || (log.metadata as any)?.roleName || 'Crew';

    if (member) {
      onOpenCrewModal({
        member,
        role,
        project,
        subEvent,
        previousRate: (log.metadata as any)?.previousRate || (log.metadata as any)?.newRate,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Main Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* ─── MODAL HEADER ─── */}
          <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Team Manager History
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {filteredLogs.length} {filteredLogs.length === 1 ? 'Action' : 'Actions'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Day-by-day audit logs of all crew assignments, changes, fees &amp; project updates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 text-slate-600 dark:text-slate-300 transition shadow-2xs cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by actor, client, member, role, or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8.5 pl-8.5 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'CREW', label: 'Crew' },
                  { id: 'FEE', label: 'Fees' },
                  { id: 'DATE', label: 'Dates' },
                  { id: 'PROJECT', label: 'Projects' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActionCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      actionCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── MODAL BODY: TIMELINE ACCORDION ─── */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
            {isLoading && logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Loading Team Manager history...
                </p>
              </div>
            ) : groupedLogs.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">
                  No activity logs found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || actionCategory !== 'ALL'
                    ? 'Try adjusting your search query or category filter.'
                    : 'Any member assignments, date changes, fee updates, or project modifications will automatically appear here.'}
                </p>
              </div>
            ) : (
              groupedLogs.map((group) => {
                const isCollapsed = Boolean(collapsedDates[group.dateKey]);

                return (
                  <div key={group.dateKey} className="space-y-3">
                    {/* Date Section Header */}
                    <div
                      onClick={() => toggleDateGroup(group.dateKey)}
                      className="sticky top-0 z-10 flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition select-none shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">
                          {group.dateHeader}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600">
                          {group.logs.length}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </div>

                    {/* Timeline items under this date */}
                    {!isCollapsed && (
                      <div className="space-y-2.5 pl-1 sm:pl-2">
                        {group.logs.map((log) => {
                          const actionCfg = getActionConfig(log.action_type);
                          const ActionIcon = actionCfg.icon;

                          // Resolve client & project name
                          const matchedProject = projects.find((p) => p.id === log.project_id);
                          const clientName = log.project_name || matchedProject?.client_name || 'Wedding Client';

                          // Resolve target crew member if applicable
                          const isCrewAction =
                            Boolean(log.target_member_name) ||
                            log.action_type?.toUpperCase().includes('CREW') ||
                            log.action_type?.toUpperCase().includes('COMMERCIAL') ||
                            log.action_type?.toUpperCase().includes('RATE');

                          const matchedMember = log.target_member_id
                            ? teamMembers.find((m) => m.id === log.target_member_id)
                            : log.target_member_name
                            ? teamMembers.find((m) => m.name.toLowerCase().trim() === log.target_member_name?.toLowerCase().trim())
                            : null;

                          const targetMemberAvatar =
                            log.target_member_avatar ||
                            matchedMember?.avatar_url ||
                            null;

                          const targetMemberName =
                            log.target_member_name ||
                            matchedMember?.name ||
                            'Crew Member';

                          const targetRole =
                            log.target_role ||
                            (log.metadata as any)?.roleName ||
                            matchedMember?.primary_role ||
                            '';

                          const isClickableForCrew = Boolean(onOpenCrewModal && matchedMember);

                          return (
                            <div
                              key={log.id}
                              onClick={() => {
                                if (isClickableForCrew) handleEntryClick(log);
                              }}
                              className={`group relative bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-200 ${
                                isClickableForCrew ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                {/* Left: Actor Avatar & Info */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Actor Avatar */}
                                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-[11px] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs ring-2 ring-white dark:ring-slate-800">
                                    {log.actor_avatar ? (
                                      <img
                                        src={log.actor_avatar}
                                        alt={log.actor_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{getInitials(log.actor_name)}</span>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                        {log.actor_name || 'Admin'}
                                      </span>
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                        {log.actor_role || 'Admin'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatTime(log.created_at)}</span>
                                      <span>•</span>
                                      <span>{formatRelativeTime(log.created_at)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Action Badge */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border shadow-2xs ${actionCfg.colorClass}`}
                                  >
                                    <ActionIcon className="w-3 h-3" />
                                    <span>{actionCfg.label}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Description Text */}
                              <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
                                {log.description}
                              </div>

                              {/* Context Bridge: Project, Sub-Event, Target Crew */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                                <div className="flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400 text-[11px]">
                                  {/* Project / Client Name */}
                                  <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    <span>{clientName}</span>
                                  </div>

                                  {log.event_title && (
                                    <>
                                      <span>•</span>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span>{log.event_title}</span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Crew Assignment Info Box if applicable */}
                                {isCrewAction && (
                                  <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70">
                                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center overflow-hidden shrink-0">
                                        {targetMemberAvatar ? (
                                          <img
                                            src={targetMemberAvatar}
                                            alt={targetMemberName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span>{getInitials(targetMemberName)}</span>
                                        )}
                                      </div>
                                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate max-w-[130px]">
                                        {targetMemberName}
                                      </span>
                                      {targetRole && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                                          {getRoleAbbr(targetRole) || targetRole}
                                        </span>
                                      )}
                                    </div>

                                    {/* Action button to trigger WhatsApp / Commercials modal */}
                                    {isClickableForCrew && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEntryClick(log);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs transition cursor-pointer"
                                        title="View Commercials & WhatsApp"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>Manage</span>
                                      </button>
                                    )}
                                  </div>
                                )}
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

          {/* ─── MODAL FOOTER ─── */}
          <div className="px-5 sm:px-7 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="font-medium">
              Showing {filteredLogs.length} audit entries
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TeamManagerAllHistoryModal;
