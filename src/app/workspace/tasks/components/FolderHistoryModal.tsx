'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Pin,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { TaskFolder, TaskActivityLogItem } from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

// Helper to format ISO date strings into pure date "22 Sep 2026" (NO TIME)
function formatDisplayDiff(val?: string | null): string {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      const pureDate = val.includes('T') ? val.split('T')[0] : val;
      const parts = pureDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        if (y && m && d) {
          const dt = new Date(y, m - 1, d);
          return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
    } catch {}
  }
  return val;
}

interface FolderHistoryModalProps {
  folder: TaskFolder;
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: WorkspaceMemberOption[];
}

export function FolderHistoryModal({
  folder,
  isOpen,
  onClose,
  teamMembers = [],
}: FolderHistoryModalProps) {
  const [logs, setLogs] = useState<TaskActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!activePopoverId) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopoverId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activePopoverId]);

  useEffect(() => {
    if (!isOpen || !folder?.id) return;

    let isMounted = true;
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/tasks?folderActivityId=${folder.id}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Failed to load activity logs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, folder?.id]);

  if (!isOpen) return null;

  // Group logs by Day: "Today", "Yesterday", or "DD MMM YYYY"
  const groupedLogs: { [dateKey: string]: TaskActivityLogItem[] } = {};
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toDateString();

  logs.forEach((log) => {
    const d = new Date(log.created_at);
    let key = d.toDateString();
    if (key === todayStr) {
      key = 'Today';
    } else if (key === yesterdayStr) {
      key = 'Yesterday';
    } else {
      key = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    if (!groupedLogs[key]) {
      groupedLogs[key] = [];
    }
    groupedLogs[key].push(log);
  });

  // Action Badge Helper
  const getActionBadge = (actionType: string) => {
    const normalized = (actionType || '').toUpperCase();
    if (normalized.includes('COMPLETED')) {
      return {
        label: 'Task Completed',
        color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle2,
      };
    }
    if (normalized.includes('UNCHECKED') || normalized.includes('UNCOMPLETED') || normalized.includes('INCOMPLETE')) {
      return {
        label: 'Marked Incomplete',
        color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: AlertCircle,
      };
    }
    if (normalized.includes('RENAME')) {
      return {
        label: 'Task Renamed',
        color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        icon: Sparkles,
      };
    }
    if (normalized.includes('CREATED') || normalized.includes('ADDED')) {
      return {
        label: normalized.includes('FOLDER') ? 'Card Created' : 'Task Added',
        color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        icon: PlusCircle,
      };
    }
    if (normalized.includes('PIN')) {
      return {
        label: 'Pin Status',
        color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
        icon: Pin,
      };
    }
    if (normalized.includes('DEADLINE')) {
      return {
        label: 'Deadline Set',
        color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: Calendar,
      };
    }
    if (normalized.includes('PERMISSION')) {
      return {
        label: 'Permissions',
        color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        icon: ShieldAlert,
      };
    }
    return {
      label: 'Activity',
      color: 'bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-stone-700',
      icon: Clock,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[85vh] bg-white dark:bg-[#181614] rounded-3xl border border-stone-200 dark:border-[#2C2824] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-[#26221E] bg-[#FAF8F5]/80 dark:bg-[#1C1A17]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-300/40">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Card History & Audit Log
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                Folder: <span className="font-bold text-slate-800 dark:text-slate-200">"{folder.title}"</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Day-by-Day Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-semibold text-slate-500">Loading folder timeline...</p>
            </div>
          ) : Object.keys(groupedLogs).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-stone-800 flex items-center justify-center text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No activity recorded yet</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Changes to tasks, completions, and assignments will automatically appear here grouped by day.
              </p>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([dayKey, dayLogs]) => (
              <div key={dayKey} className="space-y-3">
                {/* Day Header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 py-1 bg-white/95 dark:bg-[#181614]/95 backdrop-blur-xs">
                  <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-black text-slate-800 dark:text-slate-200 border border-stone-200 dark:border-stone-700 shadow-2xs">
                    {dayKey}
                  </span>
                  <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                  <span className="text-[10px] font-semibold text-slate-400">
                    {dayLogs.length} {dayLogs.length === 1 ? 'action' : 'actions'}
                  </span>
                </div>

                {/* Day's Timeline Items */}
                <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                  {dayLogs.map((item) => {
                    const badge = getActionBadge(item.action_type);
                    const BadgeIcon = badge.icon;
                    const timeStr = new Date(item.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });

                    // Resolve member avatar if available
                    const matchedMember = teamMembers.find(
                      (m) =>
                        m.id === item.actor_id ||
                        (m as any).auth_user_id === item.actor_id ||
                        (m.name && item.actor_name && m.name.toLowerCase() === item.actor_name.toLowerCase()) ||
                        (m.email && item.actor_email && m.email.toLowerCase() === item.actor_email.toLowerCase())
                    );
                    const avatarUrl = item.actor_avatar || matchedMember?.avatar_url;
                    const actorRole = matchedMember?.role || (item.actor_name === 'Studio Admin' ? 'Studio Owner' : 'Team Member');
                    const actorEmail = item.actor_email || matchedMember?.email || '';
                    const isPopoverOpen = activePopoverId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-start gap-3 p-3 rounded-2xl bg-[#FAF8F5]/80 dark:bg-[#1F1C18] border border-stone-200/80 dark:border-[#2C2824] shadow-2xs hover:border-amber-400/40 transition ${
                          isPopoverOpen ? 'z-30 ring-1 ring-amber-400/50' : 'z-0'
                        }`}
                      >
                        {/* Timeline Bullet Node */}
                        <div className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-white dark:ring-[#181614]" />

                        {/* Actor Avatar with Click/Hover Popover */}
                        <div
                          className="shrink-0 pt-0.5 cursor-pointer relative"
                          onMouseEnter={() => setActivePopoverId(item.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePopoverId(isPopoverOpen ? null : item.id);
                          }}
                          title="Click or hover to view member details & email"
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={item.actor_name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-stone-800 shadow-2xs hover:ring-2 hover:ring-amber-400 transition"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white dark:border-stone-800 shadow-2xs hover:ring-2 hover:ring-amber-400 transition">
                              {(item.actor_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Action Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Actor Name & Email Hover Popover */}
                            <div className="relative inline-block" ref={isPopoverOpen ? popoverRef : undefined}>
                              <button
                                type="button"
                                onMouseEnter={() => setActivePopoverId(item.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePopoverId(isPopoverOpen ? null : item.id);
                                }}
                                className="group/actor inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white hover:text-amber-600 transition cursor-pointer text-left"
                                title="Click or hover to view email and profile"
                              >
                                <span className="truncate max-w-[160px]">{item.actor_name || 'Team Member'}</span>
                                {actorEmail && (
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold group-hover/actor:bg-amber-400 group-hover/actor:text-slate-950 transition">
                                    @
                                  </span>
                                )}
                              </button>

                              {/* Floating Popover on Hover / Click */}
                              {isPopoverOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute left-0 top-full mt-1.5 z-50 w-64 p-3 bg-white dark:bg-[#1E1B18] rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200"
                                >
                                  <div className="flex items-start gap-2.5">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={item.actor_name}
                                        className="w-10 h-10 rounded-full object-cover border border-amber-300 shrink-0 shadow-2xs"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center border border-amber-300 shrink-0 shadow-2xs">
                                        {(item.actor_name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <h4 className="text-xs font-black truncate">{item.actor_name}</h4>
                                        <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded text-[9px] font-bold shrink-0">
                                          {actorRole}
                                        </span>
                                      </div>

                                      {actorEmail ? (
                                        <div className="flex items-center justify-between gap-1 pt-0.5">
                                          <span className="text-[10px] text-slate-500 font-mono truncate" title={actorEmail}>
                                            {actorEmail}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(actorEmail);
                                              setCopiedEmailId(item.id);
                                              setTimeout(() => setCopiedEmailId(null), 2000);
                                            }}
                                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-400 hover:text-amber-600 transition cursor-pointer shrink-0"
                                            title="Copy email address"
                                          >
                                            {copiedEmailId === item.id ? (
                                              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-slate-400 italic">No email on record</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                              {timeStr}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug">
                            {item.description}
                          </p>

                          {/* Diff Pill for previous and new values (Pure date or title diff) */}
                          {item.previous_value && item.new_value && item.previous_value !== item.new_value && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-0.5">
                              <span className="line-through text-slate-400 truncate max-w-[140px]">{formatDisplayDiff(item.previous_value)}</span>
                              <span className="text-amber-600 font-bold">&rarr;</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{formatDisplayDiff(item.new_value)}</span>
                            </div>
                          )}

                          {/* Action Badge */}
                          <div className="pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge.color}`}
                            >
                              <BadgeIcon className="w-3 h-3" />
                              <span>{badge.label}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-100 dark:border-[#26221E] bg-[#FAF8F5]/80 dark:bg-[#1C1A17]/80 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Card actions are permanently saved for team transparency.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-stone-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
