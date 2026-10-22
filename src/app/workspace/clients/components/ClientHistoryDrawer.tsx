'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, History, Clock, Filter, Search, User, FileText, Calendar, 
  Sparkles, CheckSquare, Film, DollarSign, ArrowRight, RefreshCw,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import { formatTime12h } from '@/components/attendance/PunchDetailsModal';

export interface ClientAuditItem {
  id: string;
  client_id: string;
  workspace_id?: string;
  actor_id?: string;
  actor_name: string;
  actor_email?: string;
  actor_role?: string;
  module: 'overview' | 'quotations' | 'events' | 'moodboard' | 'tasks' | 'post_production' | 'finance' | string;
  action_type: string;
  title: string;
  description?: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

interface ClientHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
}

const MODULE_TAGS: Record<string, { label: string; icon: any; bg: string; text: string; border: string }> = {
  overview: { label: 'Overview', icon: User, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  quotations: { label: 'Quotations', icon: FileText, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  events: { label: 'Events', icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  moodboard: { label: 'Moodboard', icon: Sparkles, bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  tasks: { label: 'Tasks', icon: CheckSquare, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  post_production: { label: 'Post-Prod', icon: Film, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  finance: { label: 'Finance', icon: DollarSign, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

function formatDateHeader(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDate = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDate(d, today)) return 'Today';
    if (isSameDate(d, yesterday)) return 'Yesterday';

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return isoStr;
  }
}

export default function ClientHistoryDrawer({
  isOpen,
  onClose,
  clientId,
  clientName = 'Client'
}: ClientHistoryDrawerProps) {
  const [logs, setLogs] = useState<ClientAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const url = `/api/workspace/clients/${encodeURIComponent(clientId)}/history${selectedModule !== 'all' ? `?module=${selectedModule}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('[ClientHistoryDrawer] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, clientId, selectedModule]);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l => 
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(q)) ||
      (l.module && l.module.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  // Group logs date-wise
  const groupedLogs = useMemo(() => {
    const groups: { dateHeader: string; items: ClientAuditItem[] }[] = [];
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
      <div className="fixed inset-0 z-[100050] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
        />

        {/* Sliding Panel */}
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
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  Client Audit & Change History
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-xs">
                  {clientName} • Chronological Date-wise Log
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

          {/* Module Filter Pills */}
          <div className="p-3 border-b border-[#EAE5DA] bg-white shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search history by actor, details, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedModule('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedModule === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Modules ({logs.length})
              </button>
              {Object.entries(MODULE_TAGS).map(([key, tag]) => {
                const Icon = tag.icon;
                const active = selectedModule === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedModule(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-900 shadow-2xs'
                        : `${tag.bg} ${tag.text} border ${tag.border} hover:opacity-80`
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {loading && logs.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading chronological change history...</p>
              </div>
            ) : groupedLogs.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-700">No activity logged yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Modifications to overview, quotations, events, moodboard, tasks, post-production, or finance will be recorded here chronologically.
                </p>
              </div>
            ) : (
              groupedLogs.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-3">
                  {/* Date Header Sticky Pill */}
                  <div className="sticky top-0 z-10 flex items-center gap-2 py-1 bg-white/95 backdrop-blur-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-white shadow-2xs">
                      📅 {group.dateHeader}
                    </span>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] text-slate-400 font-bold">
                      {group.items.length} {group.items.length === 1 ? 'change' : 'changes'}
                    </span>
                  </div>

                  {/* Log Items Timeline */}
                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {group.items.map((log) => {
                      const mod = MODULE_TAGS[log.module] || MODULE_TAGS.overview;
                      const Icon = mod.icon;
                      return (
                        <div
                          key={log.id}
                          className="relative p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DA] shadow-2xs hover:shadow-xs transition-all space-y-2 group"
                        >
                          {/* Timeline node icon */}
                          <div className={`absolute -left-[27px] top-3.5 w-4 h-4 rounded-full border-2 border-white shadow-2xs flex items-center justify-center ${mod.bg}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                          </div>

                          {/* Top Meta Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 ${mod.bg} ${mod.text} ${mod.border}`}>
                                <Icon className="w-3 h-3" />
                                <span>{mod.label}</span>
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/70 text-slate-700 uppercase">
                                {log.action_type || 'UPDATE'}
                              </span>
                            </div>
                            <span className="text-[10.5px] font-mono font-bold text-slate-400">
                              {formatTime12h(log.created_at)}
                            </span>
                          </div>

                          {/* Action Title */}
                          <h4 className="text-xs font-black text-slate-900 leading-snug">
                            {log.title}
                          </h4>

                          {/* Description */}
                          {log.description && (
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-white/70 p-2 rounded-xl border border-slate-100">
                              {log.description}
                            </p>
                          )}

                          {/* Old vs New Value Diff */}
                          {(log.old_value !== null && log.old_value !== undefined && log.new_value !== null && log.new_value !== undefined) && (
                            <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-[11px] font-mono grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-rose-600 block">Previous</span>
                                <span className="text-slate-600 line-through truncate block">
                                  {typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value)}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-emerald-600 block">Updated</span>
                                <span className="text-slate-900 font-bold truncate block">
                                  {typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Actor Footer */}
                          <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                                {log.actor_name ? log.actor_name[0].toUpperCase() : 'U'}
                              </div>
                              <span className="font-bold text-slate-800">{log.actor_name || 'Team Member'}</span>
                              {log.actor_role && (
                                <span className="text-slate-400 text-[10px]">({log.actor_role})</span>
                              )}
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

          {/* Footer Close */}
          <div className="p-3.5 border-t border-[#EAE5DA] bg-[#FAF8F2] flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredLogs.length} audit {filteredLogs.length === 1 ? 'event' : 'events'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shadow-xs"
            >
              Done / Close History
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
