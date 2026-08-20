'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Calendar, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Clock, Users, ArrowUpRight, Filter, Search,
  ChevronDown, Layers, Zap, Sparkles, X, ChevronLeft, ChevronRight,
  TrendingUp, Eye, FileText, Check, ShieldAlert, ArrowDownRight
} from 'lucide-react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom' | 'all';

interface MessageLog {
  id: string;
  chat_jid: string;
  direction: string;
  message_text: string;
  status: string;
  sent_at: string;
  created_at: string;
  type?: string;
  template_name?: string;
}

export default function WhatsAppAnalyticsConsolePage() {
  const { userId } = useBhamstra();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date Filter States
  const [preset, setPreset] = useState<DatePreset>('7days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data States
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'delivered' | 'read' | 'failed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch Analytics Data
  const fetchData = async () => {
    if (!userId) return;
    try {
      setRefreshing(true);

      const [msgRes, wfRes, queueRes] = await Promise.all([
        supabase
          .from('baileys_messages')
          .select('*')
          .eq('workspace_id', userId)
          .order('sent_at', { ascending: false })
          .limit(1000),
        supabase
          .from('whatsapp_workflow_logs')
          .select('*')
          .eq('tenant_id', userId)
          .order('sent_at', { ascending: false })
          .limit(1000),
        supabase
          .from('baileys_action_queue')
          .select('*')
          .eq('workspace_id', userId)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (msgRes.data) setMessages(msgRes.data);
      if (wfRes.data) setWorkflowLogs(wfRes.data);
      if (queueRes.data) setQueueItems(queueRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Handle Preset Changes
  const handlePresetSelect = (p: DatePreset) => {
    setPreset(p);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (p === 'today') {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (p === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (p === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (p === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (p === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (p === 'all') {
      setStartDate('2024-01-01');
      setEndDate(endStr);
    }
    if (p !== 'custom') {
      setShowDatePicker(false);
    }
  };

  // Combined and Date-Filtered Logs
  const filteredData = useMemo(() => {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59').getTime();

    // Map workflow logs to uniform format
    const wfMapped: MessageLog[] = workflowLogs.map(l => ({
      id: l.id,
      chat_jid: `${l.phone_number}@s.whatsapp.net`,
      direction: 'outbound',
      message_text: `Template: ${l.template_name || 'Workflow Step'}`,
      status: l.status || 'sent',
      sent_at: l.sent_at,
      created_at: l.created_at || l.sent_at,
      type: 'Workflow Drip',
      template_name: l.template_name,
    }));

    // Combine with baileys_messages (deduping by id)
    const combined = [...messages, ...wfMapped];
    const seen = new Set<string>();
    const unique = combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    return unique.filter(item => {
      const itemTime = new Date(item.sent_at || item.created_at).getTime();
      const withinDate = itemTime >= startMs && itemTime <= endMs;
      if (!withinDate) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'sent' && !['sent', 'delivered', 'read'].includes(item.status)) return false;
        if (statusFilter === 'delivered' && !['delivered', 'read'].includes(item.status)) return false;
        if (statusFilter === 'read' && item.status !== 'read') return false;
        if (statusFilter === 'failed' && item.status !== 'failed') return false;
        if (statusFilter === 'pending' && item.status !== 'pending') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = (item.message_text || '').toLowerCase();
        const jid = (item.chat_jid || '').toLowerCase();
        const tpl = (item.template_name || '').toLowerCase();
        if (!text.includes(q) && !jid.includes(q) && !tpl.includes(q)) return false;
      }

      return true;
    });
  }, [messages, workflowLogs, startDate, endDate, statusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const delivered = filteredData.filter(m => ['delivered', 'read'].includes(m.status)).length;
    const read = filteredData.filter(m => m.status === 'read').length;
    const failed = filteredData.filter(m => m.status === 'failed').length;
    const pending = filteredData.filter(m => m.status === 'pending').length;
    const groupCount = filteredData.filter(m => m.chat_jid?.endsWith('@g.us')).length;

    const deliveryRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;
    const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

    return {
      total,
      delivered,
      read,
      failed,
      pending,
      groupCount,
      deliveryRate,
      readRate,
    };
  }, [filteredData]);

  // Chart Data Preparation (Grouped by Day or Month)
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; label: string; total: number; success: number; failed: number }> = {};

    filteredData.forEach(item => {
      const d = new Date(item.sent_at || item.created_at);
      if (isNaN(d.getTime())) return;

      const key = viewMode === 'daily'
        ? d.toISOString().split('T')[0]
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const label = viewMode === 'daily'
        ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!map[key]) {
        map[key] = { date: key, label, total: 0, success: 0, failed: 0 };
      }

      map[key].total++;
      if (item.status === 'failed') {
        map[key].failed++;
      } else {
        map[key].success++;
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, viewMode]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map(c => c.total), 10);
    return Math.ceil(max / 5) * 5;
  }, [chartData]);

  // Pagination for table
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading Analytics Console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ═══ Header Action Bar ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
              WhatsApp 3D Analytics Console
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">• Live Telemetry</span>
          </div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            Message Activity & Delivery Reports
          </h1>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 text-xs">
            {(['today', '7days', '30days', 'this_month', 'all'] as DatePreset[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  preset === p
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : p === 'this_month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Custom Date Range Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{startDate} → {endDate}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 p-4 w-72 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-30 space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Custom Date Range</span>
                  <button onClick={() => setShowDatePicker(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Apply Date Range
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ 3D Metric Stat Docks ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Sent */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Dispatches</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {metrics.total}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics.deliveryRate}% Success Rate</span>
          </div>
        </div>

        {/* Delivered / Read */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Delivered & Read</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {metrics.delivered}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
            <Eye className="w-3 h-3" />
            <span>{metrics.read} Confirmed Read</span>
          </div>
        </div>

        {/* Failed Messages */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Failed / Bounced</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {metrics.failed}
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 font-mono">
            {metrics.failed > 0 ? 'Retry backoff active' : '0 errors in range'}
          </div>
        </div>

        {/* Queued / In-Flight */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Queue In-Flight</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {metrics.pending}
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 font-mono">
            Scheduled for future steps
          </div>
        </div>

        {/* Group Alerts Sent */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Group Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
            {metrics.groupCount}
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 font-mono">
            Direct group broadcasts
          </div>
        </div>

      </div>

      {/* ═══ 3D Interactive Chart Visualizer ═══ */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-0.5">Telemetry Timeline</span>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Message Volume & Delivery Breakdown
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                Day-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                Month-wise
              </button>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {chartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400 font-mono">
            No message activity recorded for this date range.
          </div>
        ) : (
          <div className="pt-4">
            <div className="h-64 flex items-end gap-3 sm:gap-6 overflow-x-auto pb-4 pt-6 px-2">
              {chartData.map((bar, i) => {
                const heightPercent = Math.min(100, Math.round((bar.total / maxChartValue) * 100));
                const failPercent = bar.total > 0 ? (bar.failed / bar.total) * 100 : 0;
                const successPercent = 100 - failPercent;

                return (
                  <div key={i} className="flex-1 min-w-[48px] max-w-[80px] flex flex-col items-center gap-2 group relative">
                    
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20">
                      <div>Total: <span className="font-bold">{bar.total}</span></div>
                      <div className="text-emerald-400">Success: {bar.success}</div>
                      {bar.failed > 0 && <div className="text-rose-400">Failed: {bar.failed}</div>}
                    </div>

                    {/* Bar Value on top */}
                    <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      {bar.total}
                    </span>

                    {/* The 3D Gradient Stacked Bar */}
                    <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-xl overflow-hidden flex flex-col justify-end h-44 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full flex flex-col justify-end rounded-xl overflow-hidden shadow-md"
                      >
                        {bar.failed > 0 && (
                          <div 
                            style={{ height: `${failPercent}%` }} 
                            className="w-full bg-rose-500" 
                          />
                        )}
                        <div 
                          style={{ height: `${successPercent}%` }} 
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400" 
                        />
                      </motion.div>
                    </div>

                    {/* Date Label */}
                    <span className="text-[10px] font-mono text-zinc-400 text-center truncate w-full">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-5 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Delivered / Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-md bg-rose-500" />
                <span>Failed</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═══ Detailed Activity Table ═══ */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
        
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by phone, template, or message..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500/60 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer shadow-sm"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="sent">Sent / Delivered</option>
              <option value="read">Read Confirmed</option>
              <option value="failed">Failed / Bounced</option>
              <option value="pending">Pending Queue</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Recipient / Chat</th>
                <th className="py-3 px-4">Message Content / Template</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4 text-right">Sent Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-sans">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs font-mono">
                    No message activity found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((msg) => {
                  const isGroup = msg.chat_jid?.endsWith('@g.us');
                  const cleanPhone = msg.chat_jid?.replace(/@.*$/, '');

                  return (
                    <tr key={msg.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                      
                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isGroup 
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isGroup ? <Users className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white">
                              {cleanPhone}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400">
                              {isGroup ? 'WhatsApp Group' : 'Direct Contact'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Content */}
                      <td className="py-3 px-4 max-w-xs truncate text-zinc-700 dark:text-zinc-300">
                        {msg.message_text || '—'}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                          {msg.type || (isGroup ? 'Group Alert' : 'Direct Msg')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {['delivered', 'read', 'sent'].includes(msg.status) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            {msg.status === 'read' ? 'Read' : 'Delivered'}
                          </span>
                        ) : msg.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-right text-[11px] font-mono text-zinc-500">
                        {new Date(msg.sent_at || msg.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
          <span>Showing {paginatedLogs.length} of {filteredData.length} records</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-zinc-800 dark:text-zinc-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
