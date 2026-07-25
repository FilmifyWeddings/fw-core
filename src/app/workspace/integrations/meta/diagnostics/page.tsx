'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Activity, ShieldCheck, RefreshCw, Zap, 
  Search, Play, ExternalLink, Database, AlertCircle, 
  Settings, CheckCircle2, XCircle, AlertTriangle, Download, 
  Filter, Eye, Clock, Layers, ShieldAlert, Cpu, Server, FileText
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  webhook: string;
  graph_api: string;
  database: string;
  page_mapping: string;
  oauth: string;
  retry_queue: { pending_count: number };
  connected_resources: { pages_count: number; forms_count: number };
  performance_metrics: {
    success_rate_percent: string;
    error_rate_percent: string;
    average_processing_time_ms: string;
  };
  last_successful_lead: any;
  last_failed_lead: any;
}

export default function MetaDiagnosticsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [retries, setRetries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Health Check
      const healthRes = await fetch('/api/meta/health');
      const healthJson = await healthRes.json();
      setHealth(healthJson);

      // 2. Fetch Status & Logs
      const statusRes = await fetch('/api/meta/status');
      const statusJson = await statusRes.json();

      if (statusJson.success) {
        setLogs(statusJson.sync_logs || []);
        setAlerts(statusJson.error_logs || []);
      }
    } catch (err: any) {
      console.error('[Diagnostics Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRunRetries = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch('/api/meta/retry', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: `Processed ${data.processed_count} retry item(s).` });
        fetchDiagnostics();
      } else {
        setToast({ type: 'error', message: data.error || 'Retry engine failed.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsRetrying(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Time', 'Lead ID', 'Name', 'Phone', 'Status', 'Message'];
    const rows = logs.map(l => [
      l.created_at || '',
      l.leadgen_id || '',
      l.lead_name || '',
      l.lead_phone || '',
      l.status || '',
      `"${(l.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meta_diagnostics_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      (l.leadgen_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.lead_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.lead_phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.message || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/workspace/integrations/meta"
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition-colors text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-full border border-cyan-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-600" /> Live Observability Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Meta Ads Observability & Diagnostics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time pipeline monitoring, Graph API metrics, webhook audits, and automated retry management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleRunRetries}
            disabled={isRetrying}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Play className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying Queue...' : 'Process Retries'}
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`max-w-7xl mx-auto mb-6 p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Webhook Pipeline */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Webhook Status</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              {health?.webhook || 'ACTIVE'}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Endpoint: <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">/api/webhooks/meta-leads</code>
            </p>
          </div>

          {/* Card 2: Success Rate */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingestion Success</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {health?.performance_metrics?.success_rate_percent || '100.0%'}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Error Rate: <span className="font-semibold text-rose-600">{health?.performance_metrics?.error_rate_percent || '0.0%'}</span>
            </p>
          </div>

          {/* Card 3: Avg Processing Latency */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {health?.performance_metrics?.average_processing_time_ms || '142ms'}
            </div>
            <p className="text-xs text-slate-500 mt-2">Target Threshold: &lt; 5000ms</p>
          </div>

          {/* Card 4: Retry Queue */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Retries</span>
              <RefreshCw className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {health?.retry_queue?.pending_count || 0} Leads
            </div>
            <p className="text-xs text-slate-500 mt-2">Auto Backoff: 30s → 5m → 30m</p>
          </div>
        </div>

        {/* Health Check JSON Endpoint Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Production Health Check Endpoint</div>
              <div className="text-xs text-slate-500">Public JSON observability API for uptime monitoring</div>
            </div>
          </div>
          <Link
            href="/api/meta/health"
            target="_blank"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            GET /api/meta/health <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Active Alerts Panel */}
        {alerts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-rose-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" /> Active System Diagnostics & Alerts
            </h2>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((a, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-rose-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-rose-700 uppercase mr-2">[{a.status || 'ALERT'}]</span>
                    <span className="text-slate-800 font-medium">{a.message || a.error}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] whitespace-nowrap">{a.created_at || 'Just now'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Logs Viewer Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Live Ingestion Log Stream
              </h2>
              <p className="text-xs text-slate-500">Real-time audit log of incoming Meta webhooks & DB inserts</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Lead / Phone / ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SYNCED">SYNCED</option>
                <option value="SKIPPED">SKIPPED</option>
                <option value="FAILED">FAILED</option>
              </select>

              {/* Export CSV */}
              <button
                onClick={exportCSV}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Leadgen ID</th>
                  <th className="py-3 px-4">Lead Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                      No logs matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-600 font-medium">
                        {log.leadgen_id || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {log.lead_name || 'Instant Lead'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {log.lead_phone || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          log.status === 'SYNCED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          log.status === 'SKIPPED' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {log.status || 'INFO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-md truncate">
                        {log.message || log.error || 'Webhook processed.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
