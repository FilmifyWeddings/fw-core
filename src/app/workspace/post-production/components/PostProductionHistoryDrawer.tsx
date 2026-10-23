'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  X, History, Calendar, Clock, User, CheckCircle2, 
  ArrowRight, Filter, AlertCircle, RefreshCw, Layers, ShieldCheck,
  Search, Film, Tag
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
  const [searchQuery, setSearchQuery] = useState('');
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
    { value: String(currentYear - 2), label: String(currentYear - 2) },
  ];

  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'status_changed', label: 'Status Changes' },
    { value: 'assignee_changed', label: 'Editor Assignments' },
    { value: 'due_date_changed', label: 'Due Date Updates' },
    { value: 'comment_added', label: 'Notes & Comments' },
    { value: 'link_added', label: 'Drive Links' },
    { value: 'deliverable_added', label: 'Items Added' },
    { value: 'deliverable_deleted', label: 'Items Deleted' },
    { value: 'pm_assigned', label: 'PM Assignments' },
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

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/workspace/post-production/history?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
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

  const formatDateHeader = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Previous History';
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (d.toDateString() === today.toDateString()) {
        return 'Today';
      }
      if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return 'Previous History';
    }
  };

  const formatLogTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return '';
    }
  };

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(l => 
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(q)) ||
      (l.deliverable_title && l.deliverable_title.toLowerCase().includes(q)) ||
      (l.category && l.category.toLowerCase().includes(q)) ||
      (l.segment && l.segment.toLowerCase().includes(q)) ||
      (l.old_value && l.old_value.toLowerCase().includes(q)) ||
      (l.new_value && l.new_value.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  // Group chronological logs date-wise (Leads CRM standard)
  const groupedLogs = useMemo(() => {
    const groups: { dateHeader: string; items: AuditLogItem[] }[] = [];
    filteredLogs.forEach(item => {
      const header = formatDateHeader(item.created_at);
      let group = groups.find(g => g.dateHeader === header);
      if (!group) {
        group = { dateHeader: header, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [filteredLogs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100050] overflow-hidden flex justify-end font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#EAE5DA]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#EAE5DA] bg-[#FAF8F2] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    Post-Production Audit History
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                    Date-Wise Logs
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-sm">
                  {clientName} • Complete Timeline of Moments & Changes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchHistory}
                disabled={loading}
                title="Refresh history"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-[#EAE5DA] transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-[#EAE5DA] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="p-3.5 bg-[#FFFDF9] border-b border-[#EAE5DA] space-y-2.5 shrink-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by deliverable, editor, old/new value, note..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#EAE5DA] text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {actions.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#EAE5DA] text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#EAE5DA] text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {years.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>

              <span className="ml-auto text-[11px] font-black font-mono text-slate-500 whitespace-nowrap pl-2">
                {filteredLogs.length} events
              </span>
            </div>
          </div>

          {/* Timeline List Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#FDFBF7]">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading audit history timeline...</p>
              </div>
            ) : groupedLogs.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <History className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">No Changes Recorded Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Whenever deliverable status changes, editor is assigned, due date is modified, or comments are added, each moment is logged here date-wise.
                  </p>
                </div>
              </div>
            ) : (
              groupedLogs.map(group => (
                <div key={group.dateHeader} className="space-y-3">
                  {/* Sticky Date Header (Leads CRM standard) */}
                  <div className="sticky top-0 z-10 flex items-center gap-2 py-1 bg-[#FDFBF7]/90 backdrop-blur-xs">
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-xs">
                      {group.dateHeader}
                    </span>
                    <div className="flex-1 h-px bg-[#EAE5DA]" />
                    <span className="text-[10px] font-bold text-slate-400">
                      {group.items.length} {group.items.length === 1 ? 'change' : 'changes'}
                    </span>
                  </div>

                  {/* List of Changes under this Date */}
                  <div className="space-y-3 pl-2">
                    {group.items.map(log => {
                      const timeStr = formatLogTime(log.created_at);

                      return (
                        <div
                          key={log.id}
                          className="p-4 rounded-2xl bg-white border border-[#EAE5DA] shadow-xs hover:border-amber-300 transition-all space-y-2.5"
                        >
                          {/* Row 1: Actor info + Time */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center shrink-0 border border-amber-200">
                                {log.actor_name ? log.actor_name.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-slate-900 truncate block">
                                  {log.actor_name}
                                </span>
                                {log.actor_role && (
                                  <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
                                    {log.actor_role}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-xs font-bold font-mono text-slate-600">
                                {timeStr}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Action Title & Tags */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                {log.action_type.replace(/_/g, ' ')}
                              </span>
                              {log.segment && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {log.segment}
                                </span>
                              )}
                              {log.category && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {log.category}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {log.title}
                            </p>
                            {log.deliverable_title && (
                              <p className="text-xs text-amber-900 font-semibold flex items-center gap-1">
                                <Film className="w-3.5 h-3.5 text-amber-600" />
                                <span>Deliverable: <strong className="font-bold underline">{log.deliverable_title}</strong></span>
                              </p>
                            )}
                          </div>

                          {/* Row 3: Diff (Old -> New) */}
                          {(log.old_value !== null && log.old_value !== undefined || log.new_value !== null && log.new_value !== undefined) && (
                            <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#EAE5DA] flex items-center gap-2 text-xs flex-wrap">
                              {log.old_value && (
                                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200 line-through truncate max-w-[200px]">
                                  {log.old_value}
                                </span>
                              )}
                              {log.old_value && log.new_value && (
                                <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                              {log.new_value && (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black border border-emerald-300 truncate max-w-[220px]">
                                  {log.new_value}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Row 4: Details / Description */}
                          {log.details && (
                            <p className="text-xs text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                              {log.details}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
