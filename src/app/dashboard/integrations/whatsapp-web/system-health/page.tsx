'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Wifi, Server, Database, Activity, Clock, Send,
  Layers, BarChart3, Zap
} from 'lucide-react';

type HealthStatus = 'ok' | 'offline' | 'error' | 'degraded' | 'none';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  responseTimeMs: number;
  checks: {
    database: { status: HealthStatus; error?: string };
    worker: { status: HealthStatus; error?: string; socket?: string; session?: any };
    sessions: { status: HealthStatus; total: number; connected: number; disconnected: number };
    queuePoller: { status: string; initialized: boolean };
    queue: { status: HealthStatus; total: number; pending: number; processing: number; done: number; failed: number };
    lastProcessed: { status: HealthStatus; actionType?: string; createdAt?: string; processedAt?: string; message?: string; error?: string };
    lastMessageSent: { status: HealthStatus; id?: string; waMessageId?: string; messageStatus?: string; createdAt?: string; message?: string; error?: string };
    workflowLogs: { status: HealthStatus; total: number; sent: number; pending: number; failed: number };
  };
}

function StatCard({ icon, label, value, status, hint }: {
  icon: React.ReactNode; label: string; value: string | number; status: HealthStatus; hint?: string;
}) {
  const colorMap: Record<HealthStatus, string> = {
    ok: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    offline: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    degraded: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    none: 'bg-zinc-100 border-zinc-200 text-zinc-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[status] || colorMap.none}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">{icon}</div>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-lg font-extrabold">{value}</div>
      {hint && <div className="text-[10px] opacity-60 mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    ok: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Healthy', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    offline: { icon: <XCircle className="w-3.5 h-3.5" />, label: 'Offline', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    error: { icon: <XCircle className="w-3.5 h-3.5" />, label: 'Error', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    degraded: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Degraded', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    none: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'N/A', cls: 'text-zinc-400 bg-zinc-100 border-zinc-200' },
  };
  const s = map[status] || map.none;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

function ProgressBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-zinc-500">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="w-12 text-right font-bold text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/system/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const data = await res.json();
      setHealth(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const overallStatus: HealthStatus = !health ? 'none'
    : health.status === 'healthy' ? 'ok'
    : health.status === 'degraded' ? 'degraded'
    : 'error';

  const c = health?.checks;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${
            overallStatus === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-500'
              : overallStatus === 'degraded' ? 'bg-amber-50 border-amber-200 text-amber-500'
              : 'bg-rose-50 border-rose-200 text-rose-500'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white">System Health</h1>
            <p className="text-[10px] text-zinc-500">
              {health?.timestamp ? new Date(health.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
              {' '}· Response {health?.responseTimeMs}ms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={overallStatus} />
          <button onClick={fetchHealth} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !health && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-600 font-medium">
          Failed to load health data: {error}
        </div>
      )}

      {health && c && (
        <>
          {/* Row 1: Core Components */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Server className="w-4 h-4" />}
              label="Baileys Worker"
              value={c.worker?.status === 'ok' ? 'Online' : 'Offline'}
              status={c.worker?.status === 'ok' ? 'ok' : 'offline'}
              hint={c.worker?.socket ? `Socket: ${c.worker.socket}` : undefined}
            />
            <StatCard
              icon={<Activity className="w-4 h-4" />}
              label="Queue Processor"
              value={c.queuePoller?.status === 'running' ? 'Running' : 'Stopped'}
              status={c.queuePoller?.status === 'running' ? 'ok' : 'offline'}
            />
            <StatCard
              icon={<Database className="w-4 h-4" />}
              label="Database"
              value={c.database?.status === 'ok' ? 'Connected' : 'Error'}
              status={c.database?.status === 'ok' ? 'ok' : 'error'}
              hint={c.database?.error || undefined}
            />
            <StatCard
              icon={<Wifi className="w-4 h-4" />}
              label="WhatsApp Sessions"
              value={`${c.sessions?.connected || 0} / ${c.sessions?.total || 0}`}
              status={c.sessions && c.sessions.connected > 0 ? 'ok' : c.sessions?.total === 0 ? 'none' : 'offline'}
            />
          </div>

          {/* Row 2: Uptime + Queue Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Server Uptime"
              value={formatUptime(health.uptime)}
              status="ok"
            />
            <StatCard
              icon={<Layers className="w-4 h-4" />}
              label="Pending Queue"
              value={c.queue?.pending || 0}
              status={c.queue && c.queue.pending > 0 ? 'degraded' : 'ok'}
            />
            <StatCard
              icon={<BarChart3 className="w-4 h-4" />}
              label="Failed Queue"
              value={c.queue?.failed || 0}
              status={c.queue && c.queue.failed > 0 ? 'error' : 'ok'}
            />
            <StatCard
              icon={<Zap className="w-4 h-4" />}
              label="Workflow Pending"
              value={c.workflowLogs?.pending || 0}
              status={c.workflowLogs && c.workflowLogs.pending > 0 ? 'degraded' : 'ok'}
            />
          </div>

          {/* Queue Breakdown */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Queue Breakdown</h3>
            <ProgressBar value={c.queue?.done || 0} max={c.queue?.total || 1} label="Done" color="bg-emerald-400" />
            <ProgressBar value={c.queue?.failed || 0} max={c.queue?.total || 1} label="Failed" color="bg-rose-400" />
            <ProgressBar value={c.queue?.pending || 0} max={c.queue?.total || 1} label="Pending" color="bg-amber-400" />
            <ProgressBar value={c.queue?.processing || 0} max={c.queue?.total || 1} label="Processing" color="bg-blue-400" />
          </div>

          {/* Workflow Logs Breakdown */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Workflow Execution Logs</h3>
            <ProgressBar value={c.workflowLogs?.sent || 0} max={c.workflowLogs?.total || 1} label="Sent" color="bg-emerald-400" />
            <ProgressBar value={c.workflowLogs?.failed || 0} max={c.workflowLogs?.total || 1} label="Failed" color="bg-rose-400" />
            <ProgressBar value={c.workflowLogs?.pending || 0} max={c.workflowLogs?.total || 1} label="Pending" color="bg-amber-400" />
          </div>

          {/* Last Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <Send className="w-3.5 h-3.5" /> Last Queue Processed
              </div>
              {c.lastProcessed?.status === 'ok' ? (
                <div className="text-sm">
                  <p className="font-bold text-zinc-900 dark:text-white">{c.lastProcessed.actionType}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {c.lastProcessed.processedAt ? new Date(c.lastProcessed.processedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">{c.lastProcessed?.message || 'No data'}</p>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <Send className="w-3.5 h-3.5" /> Last Message Sent
              </div>
              {c.lastMessageSent?.status === 'ok' ? (
                <div className="text-sm">
                  <p className="font-bold text-zinc-900 dark:text-white font-mono text-[10px] truncate">{c.lastMessageSent.waMessageId}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {c.lastMessageSent.createdAt ? new Date(c.lastMessageSent.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    {' · '}{c.lastMessageSent.messageStatus}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">{c.lastMessageSent?.message || 'No data'}</p>
              )}
            </div>
          </div>

          {/* Worker Details */}
          {c.worker?.session && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Worker Session Details</h3>
              <pre className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(c.worker.session, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
