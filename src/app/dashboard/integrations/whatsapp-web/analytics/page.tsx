'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Calendar, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Clock, Users, Search,
  ChevronDown, Layers, FileText, X, ChevronLeft, ChevronRight,
  Eye, Zap, Filter, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom' | 'all';
type SourceFilter = 'all' | 'workflow' | 'template' | 'group';
type StatusFilter = 'all' | 'sent' | 'failed' | 'pending';

interface AutomationLogItem {
  id: string;
  source: 'Workflow' | 'Template' | 'Group Broadcast';
  source_type: string;
  template_name: string;
  workflow_name?: string;
  recipient: string;
  phone_number: string;
  is_group: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | 'completed' | 'done';
  error_message?: string | null;
  sent_at: string;
  created_at: string;
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

  // Data States (Only Templates & Workflows - NO raw personal WhatsApp chat messages)
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [queueLogs, setQueueLogs] = useState<any[]>([]);
  const [autoLogs, setAutoLogs] = useState<any[]>([]);
  const [templatesMap, setTemplatesMap] = useState<Record<string, string>>({});
  const [workflowsMap, setWorkflowsMap] = useState<Record<string, string>>({});

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [hoveredNode, setHoveredNode] = useState<{ index: number; x: number; ySuccess: number; yFailed: number; data: any } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch only Workflows & Template logs
  const fetchData = async () => {
    if (!userId) return;
    try {
      setRefreshing(true);

      const [wfRes, queueRes, autoRes, tplRes, customWfRes] = await Promise.all([
        // 1. Workflow step execution logs
        supabase
          .from('whatsapp_workflow_logs')
          .select('*')
          .or('tenant_id.eq.' + userId + ',tenant_id.is.null')
          .order('sent_at', { ascending: false })
          .limit(1000),

        // 2. Action queue (Template sends, Group broadcasts, Queued triggers)
        supabase
          .from('baileys_action_queue')
          .select('*')
          .eq('workspace_id', userId)
          .order('created_at', { ascending: false })
          .limit(1000),

        // 3. Automation logs (Booking alerts, quotation shares, welcome drips)
        supabase
          .from('whatsapp_automation_logs')
          .select('*')
          .or('workspace_id.eq.' + userId + ',user_id.eq.' + userId)
          .order('created_at', { ascending: false })
          .limit(500),

        // 4. Template directory for name lookups
        supabase
          .from('tenant_whatsapp_templates')
          .select('id, template_name')
          .eq('tenant_id', userId),

        // 5. Custom workflows for workflow name lookups
        supabase
          .from('whatsapp_custom_workflows')
          .select('id, workflow_name')
          .eq('tenant_id', userId),
      ]);

      if (wfRes.data) setWorkflowLogs(wfRes.data);
      if (queueRes.data) setQueueLogs(queueRes.data);
      if (autoRes.data) setAutoLogs(autoRes.data);

      const tMap: Record<string, string> = {};
      if (tplRes.data) {
        tplRes.data.forEach((t: any) => {
          if (t.id && t.template_name) tMap[t.id] = t.template_name;
        });
      }
      setTemplatesMap(tMap);

      const wMap: Record<string, string> = {};
      if (customWfRes.data) {
        customWfRes.data.forEach((w: any) => {
          if (w.id && w.workflow_name) wMap[w.id] = w.workflow_name;
        });
      }
      setWorkflowsMap(wMap);

    } catch (err) {
      console.error('Error fetching template/workflow analytics:', err);
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

  // Harmonize & Filter All Template & Workflow Data
  const unifiedLogs = useMemo(() => {
    const list: AutomationLogItem[] = [];
    const seenIds = new Set<string>();

    // 1. Process Workflow Logs
    workflowLogs.forEach(w => {
      if (!w.id || seenIds.has(w.id)) return;
      seenIds.add(w.id);

      const phone = String(w.phone_number || '').replace(/[^0-9]/g, '');
      const isGroup = phone.includes('@g.us') || String(w.phone_number || '').endsWith('@g.us');
      const wfName = w.workflow_id ? (workflowsMap[w.workflow_id] || 'Automation Flow') : 'Workflow Step';
      const tplName = w.template_name || (w.template_id ? templatesMap[w.template_id] : '') || ('Step #' + ((w.step_index ?? 0) + 1));

      list.push({
        id: w.id,
        source: 'Workflow',
        source_type: 'Workflow Drip',
        template_name: tplName,
        workflow_name: wfName,
        recipient: isGroup ? 'WhatsApp Group' : (phone ? ('+' + phone) : 'Lead Contact'),
        phone_number: phone,
        is_group: isGroup,
        status: (w.status || 'sent').toLowerCase() as any,
        error_message: w.error_message,
        sent_at: w.sent_at || w.created_at || new Date().toISOString(),
        created_at: w.created_at || w.sent_at || new Date().toISOString(),
      });
    });

    // 2. Process Action Queue (Single Send Templates, Group Broadcasts, Queued Automations)
    queueLogs.forEach(q => {
      if (!q.id || seenIds.has(q.id)) return;
      seenIds.add(q.id);

      const payload = q.payload || {};
      const rawTo = String(payload.to || q.chat_jid || payload.phone || '');
      const phone = rawTo.replace(/@.*$/, '').replace(/[^0-9]/g, '');
      const isGroup = rawTo.endsWith('@g.us') || q.action_type === 'group_broadcast';

      // Look up template name from payload
      let tplName = payload.template_name || payload.templateTitle || '';
      if (!tplName && payload.templateId && templatesMap[payload.templateId]) {
        tplName = templatesMap[payload.templateId];
      }
      if (!tplName) {
        tplName = q.action_type === 'group_broadcast' ? 'Group Template Broadcast' : (payload.text ? 'Quick Send Template' : 'Single Send');
      }

      const source: 'Workflow' | 'Template' | 'Group Broadcast' = isGroup 
        ? 'Group Broadcast' 
        : (payload.workflowLogId || payload.workflow_id ? 'Workflow' : 'Template');

      const rawStatus = (q.status || 'pending').toLowerCase();
      const status = rawStatus === 'done' || rawStatus === 'completed' ? 'sent' : (rawStatus === 'failed' ? 'failed' : 'pending');

      list.push({
        id: q.id,
        source,
        source_type: isGroup ? 'Group Broadcast' : (source === 'Workflow' ? 'Workflow Action' : 'Single Send Template'),
        template_name: tplName,
        recipient: isGroup ? 'WhatsApp Group' : (phone ? ('+' + phone) : 'Direct Contact'),
        phone_number: phone,
        is_group: isGroup,
        status: status as any,
        error_message: q.error_message || q.failure_reason,
        sent_at: q.processed_at || q.created_at || new Date().toISOString(),
        created_at: q.created_at || new Date().toISOString(),
      });
    });

    // 3. Process Direct Automation Logs
    autoLogs.forEach(a => {
      if (!a.id || seenIds.has(a.id)) return;
      seenIds.add(a.id);

      const phone = String(a.phone || a.recipient_phone || '').replace(/[^0-9]/g, '');
      const tplName = a.template_name || ((a.automation_type || 'Booking') + ' Alert');

      list.push({
        id: a.id,
        source: 'Template',
        source_type: 'Template Trigger',
        template_name: tplName,
        recipient: phone ? ('+' + phone) : 'Client',
        phone_number: phone,
        is_group: false,
        status: (a.status || 'sent').toLowerCase() as any,
        error_message: a.error_message,
        sent_at: a.sent_at || a.created_at || new Date().toISOString(),
        created_at: a.created_at || new Date().toISOString(),
      });
    });

    // Sort by latest sent_at descending
    return list.sort((a, b) => new Date(b.sent_at || b.created_at).getTime() - new Date(a.sent_at || a.created_at).getTime());
  }, [workflowLogs, queueLogs, autoLogs, templatesMap, workflowsMap]);

  // Apply Date, Source, Status, and Search Filters
  const filteredData = useMemo(() => {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = new Date(endDate + 'T23:59:59').getTime();

    return unifiedLogs.filter(item => {
      const itemTime = new Date(item.sent_at || item.created_at).getTime();
      const withinDate = itemTime >= startMs && itemTime <= endMs;
      if (!withinDate) return false;

      // Source Filter
      if (sourceFilter === 'workflow' && item.source !== 'Workflow') return false;
      if (sourceFilter === 'template' && item.source !== 'Template') return false;
      if (sourceFilter === 'group' && item.source !== 'Group Broadcast') return false;

      // Status Filter
      if (statusFilter === 'sent' && !['sent', 'delivered', 'read', 'completed', 'done'].includes(item.status)) return false;
      if (statusFilter === 'failed' && item.status !== 'failed') return false;
      if (statusFilter === 'pending' && item.status !== 'pending') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tpl = (item.template_name || '').toLowerCase();
        const wf = (item.workflow_name || '').toLowerCase();
        const rec = (item.recipient || '').toLowerCase();
        const phone = (item.phone_number || '').toLowerCase();
        if (!tpl.includes(q) && !wf.includes(q) && !rec.includes(q) && !phone.includes(q)) return false;
      }

      return true;
    });
  }, [unifiedLogs, startDate, endDate, sourceFilter, statusFilter, searchQuery]);

  // Metric Totals
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const sentSuccess = filteredData.filter(m => ['sent', 'delivered', 'read', 'completed', 'done'].includes(m.status)).length;
    const failed = filteredData.filter(m => m.status === 'failed').length;
    const pending = filteredData.filter(m => m.status === 'pending').length;
    const workflowCount = filteredData.filter(m => m.source === 'Workflow').length;
    const templateCount = filteredData.filter(m => m.source === 'Template').length;
    const groupCount = filteredData.filter(m => m.is_group).length;

    const deliveryRate = total > 0 ? Math.round((sentSuccess / total) * 100) : 100;

    return {
      total,
      sentSuccess,
      failed,
      pending,
      workflowCount,
      templateCount,
      groupCount,
      deliveryRate,
    };
  }, [filteredData]);

  // Line Chart Data Structure (Grouped by Date)
  const lineChartData = useMemo(() => {
    const map: Record<string, { date: string; label: string; success: number; failed: number; total: number }> = {};

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    if (viewMode === 'daily') {
      const cur = new Date(start);
      let daysCount = 0;
      while (cur <= end && daysCount < 60) {
        const key = cur.toISOString().split('T')[0];
        const label = cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        map[key] = { date: key, label, success: 0, failed: 0, total: 0 };
        cur.setDate(cur.getDate() + 1);
        daysCount++;
      }
    } else {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0');
        const label = cur.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        map[key] = { date: key, label, success: 0, failed: 0, total: 0 };
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    filteredData.forEach(item => {
      const d = new Date(item.sent_at || item.created_at);
      if (isNaN(d.getTime())) return;

      const key = viewMode === 'daily'
        ? d.toISOString().split('T')[0]
        : (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));

      if (!map[key]) {
        const label = viewMode === 'daily'
          ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        map[key] = { date: key, label, success: 0, failed: 0, total: 0 };
      }

      map[key].total++;
      if (item.status === 'failed') {
        map[key].failed++;
      } else {
        map[key].success++;
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, startDate, endDate, viewMode]);

  // Dynamic SVG Line Coordinates Calculation
  const chartConfig = useMemo(() => {
    const svgWidth = 800;
    const svgHeight = 240;
    const padTop = 25;
    const padBottom = 35;
    const padLeft = 45;
    const padRight = 30;

    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;

    const dataLen = lineChartData.length;
    const maxValRaw = Math.max(...lineChartData.map(d => Math.max(d.success, d.failed)), 5);
    const maxVal = Math.ceil(maxValRaw / 5) * 5;

    const getX = (index: number) => {
      if (dataLen <= 1) return padLeft + plotWidth / 2;
      return padLeft + (index / (dataLen - 1)) * plotWidth;
    };

    const getY = (val: number) => {
      return padTop + plotHeight - (val / maxVal) * plotHeight;
    };

    const successPoints = lineChartData.map((d, i) => ({ x: getX(i), y: getY(d.success), val: d.success, d }));
    const failedPoints = lineChartData.map((d, i) => ({ x: getX(i), y: getY(d.failed), val: d.failed, d }));

    const buildPath = (points: { x: number; y: number }[]) => {
      if (points.length === 0) return '';
      if (points.length === 1) return 'M ' + points[0].x + ' ' + points[0].y;

      let path = 'M ' + points[0].x + ' ' + points[0].y;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        path += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p1.x + ' ' + p1.y;
      }
      return path;
    };

    const successPath = buildPath(successPoints);
    const failedPath = buildPath(failedPoints);

    const bottomY = padTop + plotHeight;
    const successArea = successPoints.length > 0 
      ? (successPath + ' L ' + successPoints[successPoints.length - 1].x + ' ' + bottomY + ' L ' + successPoints[0].x + ' ' + bottomY + ' Z')
      : '';
    const failedArea = failedPoints.length > 0 
      ? (failedPath + ' L ' + failedPoints[failedPoints.length - 1].x + ' ' + bottomY + ' L ' + failedPoints[0].x + ' ' + bottomY + ' Z')
      : '';

    const gridSteps = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

    return {
      svgWidth,
      svgHeight,
      padTop,
      padBottom,
      padLeft,
      padRight,
      plotWidth,
      plotHeight,
      maxVal,
      bottomY,
      gridSteps,
      successPoints,
      failedPoints,
      successPath,
      failedPath,
      successArea,
      failedArea,
      getX,
      getY,
    };
  }, [lineChartData]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Loading Template & Workflow Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
              Automation & Template Analytics
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">• Live Telemetry</span>
          </div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            WhatsApp Template & Workflow Activity Console
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
                className={'px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ' + (
                  preset === p
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                )}
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
            <RefreshCw className={'w-4 h-4 ' + (refreshing ? 'animate-spin text-emerald-500' : '')} />
          </button>
        </div>
      </div>

      {/* Metric Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Automation Dispatches */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Template & Workflow Sends</span>
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

        {/* Successful / Delivered */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Successful / Delivered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {metrics.sentSuccess}
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 font-mono">
            Templates & Workflow Drips Dispatched
          </div>
        </div>

        {/* Failed Dispatches */}
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
            {metrics.failed > 0 ? 'Retry backoff available' : '0 errors in range'}
          </div>
        </div>

        {/* Active Source Breakdown */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Source Distribution</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <span className="text-purple-600 dark:text-purple-400">{metrics.workflowCount} Workflows</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400">{metrics.templateCount} Templates</span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 font-mono">
            {metrics.groupCount} Group Broadcasts
          </div>
        </div>

      </div>

      {/* High-Precision Dual-Line Graph (Green = Sent / Red = Failed) */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
        
        {/* Graph Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-0.5">Performance Telemetry</span>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Template & Workflow Dispatch Trends (Sent vs Failed)</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Graph Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span className="text-zinc-700 dark:text-zinc-300">Sent / Success</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                <span className="text-zinc-700 dark:text-zinc-300">Failed</span>
              </div>
            </div>

            {/* View Mode Toggle (Day / Month) */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={'px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ' + (
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                )}
              >
                Day-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={'px-3 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ' + (
                  viewMode === 'monthly'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                )}
              >
                Month-wise
              </button>
            </div>

          </div>
        </div>

        {/* SVG Line Graph Container */}
        {lineChartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400 font-mono">
            No template or workflow activity recorded for this timeframe.
          </div>
        ) : (
          <div className="pt-2 relative">
            <div className="w-full overflow-x-auto">
              <svg 
                viewBox={'0 0 ' + chartConfig.svgWidth + ' ' + chartConfig.svgHeight}
                className="w-full h-64 select-none"
                style={{ minWidth: '600px' }}
              >
                <defs>
                  {/* Green Gradient Area */}
                  <linearGradient id="greenLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Red Gradient Area */}
                  <linearGradient id="redLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {chartConfig.gridSteps.map((stepVal, idx) => {
                  const y = chartConfig.getY(stepVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={chartConfig.padLeft}
                        y1={y}
                        x2={chartConfig.svgWidth - chartConfig.padRight}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-zinc-200 dark:text-zinc-800"
                        strokeWidth="1"
                      />
                      <text
                        x={chartConfig.padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-zinc-400"
                      >
                        {Math.round(stepVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fills */}
                {chartConfig.successArea && (
                  <path d={chartConfig.successArea} fill="url(#greenLineGradient)" />
                )}
                {chartConfig.failedArea && (
                  <path d={chartConfig.failedArea} fill="url(#redLineGradient)" />
                )}

                {/* Green Line (Sent / Success) */}
                {chartConfig.successPath && (
                  <path
                    d={chartConfig.successPath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Red Line (Failed) */}
                {chartConfig.failedPath && (
                  <path
                    d={chartConfig.failedPath}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Node Hover Columns & Dots */}
                {chartConfig.successPoints.map((pt, i) => {
                  const failedPt = chartConfig.failedPoints[i];
                  const isHovered = hoveredNode?.index === i;

                  return (
                    <g key={i} className="cursor-pointer">
                      
                      {/* Vertical Indicator on hover */}
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={chartConfig.padTop}
                          x2={pt.x}
                          y2={chartConfig.bottomY}
                          stroke="#94A3B8"
                          strokeDasharray="3 3"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Green Dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* Red Dot (only if failed > 0 or hovered) */}
                      {(failedPt.val > 0 || isHovered) && (
                        <circle
                          cx={failedPt.x}
                          cy={failedPt.y}
                          r={isHovered ? 6 : 4}
                          fill="#EF4444"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      )}

                      {/* X-Axis Date Labels (skip overlapping labels if more than 15) */}
                      {(chartConfig.successPoints.length <= 15 || i % Math.ceil(chartConfig.successPoints.length / 12) === 0 || i === chartConfig.successPoints.length - 1) && (
                        <text
                          x={pt.x}
                          y={chartConfig.bottomY + 18}
                          textAnchor="middle"
                          className="text-[9px] font-mono fill-zinc-400 font-medium"
                        >
                          {pt.d.label}
                        </text>
                      )}

                      {/* Invisible Hover Rect */}
                      <rect
                        x={pt.x - 15}
                        y={chartConfig.padTop}
                        width="30"
                        height={chartConfig.plotHeight + 20}
                        fill="transparent"
                        onMouseEnter={() => setHoveredNode({ index: i, x: pt.x, ySuccess: pt.y, yFailed: failedPt.y, data: pt.d })}
                        onMouseLeave={() => setHoveredNode(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip Card */}
              {hoveredNode && (
                <div
                  className="absolute pointer-events-none z-30 p-3 rounded-xl bg-zinc-900 text-white shadow-2xl border border-zinc-700 text-xs font-sans space-y-1.5 -translate-x-1/2 -translate-y-full mb-3"
                  style={{
                    left: ((hoveredNode.x / chartConfig.svgWidth) * 100) + '%',
                    top: Math.min(hoveredNode.ySuccess, hoveredNode.yFailed) + 'px',
                  }}
                >
                  <div className="font-mono text-[10px] text-zinc-400 border-b border-zinc-800 pb-1 font-bold">
                    📅 {hoveredNode.data.label} ({hoveredNode.data.date})
                  </div>
                  <div className="flex items-center justify-between gap-4 font-bold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Sent / Success:</span>
                    </span>
                    <span>{hoveredNode.data.success}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 font-bold text-rose-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Failed:</span>
                    </span>
                    <span>{hoveredNode.data.failed}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-1 flex justify-between font-mono">
                    <span>Total Dispatched:</span>
                    <span className="text-white font-bold">{hoveredNode.data.total}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Detailed Activity Table (Workflows & Templates Only) */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
        
        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center bg-slate-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => { setSourceFilter('all'); setCurrentPage(1); }}
              className={'px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ' + (
                sourceFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              )}
            >
              All Activity ({unifiedLogs.length})
            </button>
            <button
              type="button"
              onClick={() => { setSourceFilter('workflow'); setCurrentPage(1); }}
              className={'px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ' + (
                sourceFilter === 'workflow'
                  ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              )}
            >
              Workflows Only ({unifiedLogs.filter(l => l.source === 'Workflow').length})
            </button>
            <button
              type="button"
              onClick={() => { setSourceFilter('template'); setCurrentPage(1); }}
              className={'px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ' + (
                sourceFilter === 'template'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              )}
            >
              Templates Only ({unifiedLogs.filter(l => l.source === 'Template').length})
            </button>
            <button
              type="button"
              onClick={() => { setSourceFilter('group'); setCurrentPage(1); }}
              className={'px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ' + (
                sourceFilter === 'group'
                  ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              )}
            >
              Group Broadcasts ({unifiedLogs.filter(l => l.source === 'Group Broadcast').length})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search template, workflow, phone..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Delivered / Sent</option>
              <option value="failed">Failed / Bounced</option>
              <option value="pending">Queued / Pending</option>
            </select>
          </div>

        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Recipient / Phone</th>
                <th className="py-3 px-4">Template Name / Message</th>
                <th className="py-3 px-4">Source Category</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4 text-right">Dispatched Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-sans">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs font-mono">
                    No template or workflow records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isSent = ['sent', 'delivered', 'read', 'completed', 'done'].includes(log.status);
                  const isFailed = log.status === 'failed';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                      
                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ' + (
                            log.is_group 
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                              : log.source === 'Workflow'
                                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          )}>
                            {log.is_group ? <Users className="w-3.5 h-3.5" /> : (log.source === 'Workflow' ? <Layers className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />)}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white">
                              {log.recipient}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400">
                              {log.is_group ? 'WhatsApp Group' : (log.phone_number ? ('+' + log.phone_number) : 'Direct Contact')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Template / Message */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <span>{log.template_name}</span>
                          </div>
                          {log.workflow_name && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              Via {log.workflow_name}
                            </span>
                          )}
                          {log.error_message && (
                            <p className="text-[10px] text-rose-500 font-mono mt-0.5 truncate max-w-xs" title={log.error_message}>
                              Error: {log.error_message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Source Category */}
                      <td className="py-3 px-4">
                        <span className={'text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ' + (
                          log.source === 'Workflow'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : log.source === 'Group Broadcast'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        )}>
                          {log.source_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Delivered / Sent</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20" title={log.error_message || 'Dispatch failed'}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Pending Queue</span>
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-right text-[11px] font-mono text-zinc-500">
                        {new Date(log.sent_at || log.created_at).toLocaleString('en-IN', {
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
          <span>Showing {paginatedLogs.length} of {filteredData.length} automation records</span>
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
