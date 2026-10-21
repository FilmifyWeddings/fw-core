'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, History, Calendar, Clock, User, CheckCircle2, 
  ArrowRight, Filter, AlertCircle, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';

export interface AuditLogItem {
  id: string;
  project_id: string;
  client_id?: string;
  actor_name: string;
  actor_role?: string;
  actor_avatar?: string;
  action_type: string;
  deliverable_title?: string;
  category?: string;
  segment?: string;
  title: string;
  old_value?: string;
  new_value?: string;
  details?: string;
  created_at: string;
}

interface PostProductionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientName: string;
  workspaceId?: string;
}

export default function PostProductionHistoryDrawer({
  isOpen,
  onClose,
  projectId,
  clientName,
  workspaceId
}: PostProductionHistoryDrawerProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: 'all', label: 'All Years' },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(currentYear - 1), label: String(currentYear - 1) },
  ];

  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'status_change', label: 'Status Changes' },
    { value: 'assignee_change', label: 'Editor Assignment' },
    { value: 'pm_change', label: 'Project Manager' },
    { value: 'deliverable_added', label: 'Added Items' },
    { value: 'deliverable_deleted', label: 'Deleted Items' },
    { value: 'date_change', label: 'Due Date Updates' },
  ];

  useEffect(() => {
    if (!isOpen || !projectId) return;

    fetchHistory();
  }, [isOpen, projectId, selectedMonth, selectedYear, selectedAction]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('project_id', projectId);
      if (workspaceId) params.set('workspace_id', workspaceId);
      if (selectedMonth !== 'all') params.set('month', selectedMonth);
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedAction !== 'all') params.set('action_type', selectedAction);

      const res = await fetch(`/api/workspace/post-production/history?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.history)) {
        setLogs(json.history);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('[PostProductionHistoryDrawer] Error fetching history:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { day, time };
    } catch (_) {
      return { day: dateStr, time: '' };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#181614] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shadow-inner border border-amber-500/30">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    Project Audit History
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Live Logs
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate max-w-[280px]">
                  {clientName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters Bar: Month / Year / Action */}
          <div className="p-3 bg-zinc-50 dark:bg-[#1f1d1a] border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {actions.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {years.map(y => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchHistory}
              className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-amber-600 transition cursor-pointer"
              title="Refresh History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>

          {/* Timeline List Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-2">
                    <div className="flex justify-between">
                      <div className="w-24 h-4 bg-zinc-300 dark:bg-zinc-700 rounded-md" />
                      <div className="w-16 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                    </div>
                    <div className="w-40 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <History className="w-6 h-6 opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">No Changes Recorded Yet</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Whenever an editor is assigned, deliverable status changes, or project details update, the full timeline will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800 before:z-0">
                {logs.map((log) => {
                  const { day, time } = formatLogDate(log.created_at);

                  return (
                    <div
                      key={log.id}
                      className="relative z-10 pl-7 group"
                    >
                      {/* Timeline Dot */}
                      <div className="absolute left-1.5 top-3.5 w-4.5 h-4.5 -translate-x-1/2 rounded-full bg-white dark:bg-[#181614] border-2 border-amber-500 flex items-center justify-center shadow-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      </div>

                      {/* Log Card */}
                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1c1a18] border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400/60 transition-all space-y-2 shadow-2xs">
                        {/* Top: Actor & Time */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 border border-amber-500/30">
                              {log.actor_name ? log.actor_name.slice(0, 2).toUpperCase() : <User className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-black text-zinc-900 dark:text-white truncate">
                              {log.actor_name}
                            </span>
                            {log.actor_role && (
                              <span className="text-[10px] text-zinc-400 font-medium truncate">
                                • {log.actor_role}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block leading-tight">
                              {day}
                            </span>
                            <span className="text-[9px] text-zinc-400 block font-mono">
                              {time}
                            </span>
                          </div>
                        </div>

                        {/* Title / Action Description */}
                        <div>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                            {log.title}
                          </p>
                          {log.deliverable_title && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                              Deliverable: <span className="font-bold underline">{log.deliverable_title}</span>
                              {log.segment ? ` (${log.segment})` : ''}
                            </p>
                          )}
                        </div>

                        {/* Diff / Value Change (Old -> New) */}
                        {(log.old_value || log.new_value) && (
                          <div className="flex items-center gap-2 text-[11px] pt-1">
                            {log.old_value && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20 line-through truncate max-w-[140px]">
                                {log.old_value}
                              </span>
                            )}
                            {log.old_value && log.new_value && (
                              <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                            )}
                            {log.new_value && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black border border-emerald-500/20 truncate max-w-[160px]">
                                {log.new_value}
                              </span>
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
