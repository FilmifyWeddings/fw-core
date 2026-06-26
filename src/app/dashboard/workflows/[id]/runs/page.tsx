'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Activity, CheckCircle2, XCircle, AlertCircle,
  Clock, ChevronDown, RefreshCw, Zap, ChevronRight, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkflowRun {
  id: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  trigger_type: string;
  trigger_payload: Record<string, unknown>;
  steps_total: number;
  steps_completed: number;
  steps_failed: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

interface StepLog {
  id: string;
  step_index: number;
  step_type: string;
  step_label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

const STATUS_CONFIG = {
  running: { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Running', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  success: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Success', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  failed:  { icon: <XCircle className="w-3.5 h-3.5" />, label: 'Failed', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  partial: { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Partial', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  pending: { icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
  skipped: { icon: <X className="w-3.5 h-3.5" />, label: 'Skipped', color: 'text-zinc-500 bg-zinc-800/60 border-zinc-700/60' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RunRow({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const status = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;

  const loadStepLogs = async () => {
    if (stepLogs.length > 0) { setExpanded(e => !e); return; }
    setLoadingLogs(true);
    setExpanded(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await (await import('@/lib/supabase')).supabase
      .from('workflow_step_logs')
      .select('*')
      .eq('run_id', run.id)
      .order('step_index');

    setStepLogs(data || []);
    setLoadingLogs(false);
  };

  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      {/* Run header row */}
      <div
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={loadStepLogs}
      >
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${status.color}`}>
          {status.icon} {status.label}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 truncate">{run.id.slice(0, 8)}…</span>
            <span className="text-[10px] text-zinc-600">
              {run.steps_completed}/{run.steps_total} steps
              {run.steps_failed > 0 && <span className="text-rose-500 ml-1">· {run.steps_failed} failed</span>}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-zinc-400">{timeAgo(run.started_at)}</p>
          {run.duration_ms && (
            <p className="text-[10px] text-zinc-600">{(run.duration_ms / 1000).toFixed(1)}s</p>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-zinc-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Step logs */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800/60 bg-zinc-950/40"
          >
            {/* Trigger payload */}
            <div className="px-4 py-3 border-b border-zinc-900">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide mb-1.5">Trigger Payload</p>
              <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900/60 rounded-lg p-2.5 overflow-x-auto max-h-24">
                {JSON.stringify(run.trigger_payload, null, 2)}
              </pre>
            </div>

            {loadingLogs ? (
              <div className="py-6 flex items-center justify-center text-zinc-600 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Loading step logs...
              </div>
            ) : stepLogs.length === 0 ? (
              <div className="py-6 text-center text-zinc-600 text-xs">No step logs found</div>
            ) : (
              <div className="p-3 space-y-2">
                {stepLogs.map((log) => {
                  const logStatus = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={log.id} className="bg-zinc-900/60 rounded-xl border border-zinc-800/60 overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${logStatus.color}`}>
                          {logStatus.icon} {logStatus.label}
                        </span>
                        <span className="text-[10px] text-zinc-500">Step {log.step_index + 1}</span>
                        <span className="text-[11px] font-semibold text-zinc-300 flex-1 truncate">{log.step_label || log.step_type}</span>
                        {log.duration_ms && (
                          <span className="text-[10px] text-zinc-600">{log.duration_ms}ms</span>
                        )}
                      </div>

                      {log.error_message && (
                        <div className="px-3 pb-2">
                          <p className="text-[10px] font-mono text-rose-400 bg-rose-500/10 rounded-lg px-2.5 py-1.5 border border-rose-500/10">
                            {log.error_message}
                          </p>
                        </div>
                      )}

                      {log.status === 'success' && Object.keys(log.output_data).length > 0 && (
                        <div className="px-3 pb-2">
                          <pre className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10 overflow-x-auto">
                            {JSON.stringify(log.output_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkflowRunsPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params?.id as string;

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [workflowName, setWorkflowName] = useState('Workflow');

  const fetchRuns = useCallback(async (p: number = 1) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const [runsRes, wfRes] = await Promise.all([
      fetch(`/api/workflows/${workflowId}/runs?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      fetch(`/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ]);

    if (runsRes.ok) {
      const json = await runsRes.json();
      setRuns(json.runs || []);
      setTotal(json.total || 0);
    }
    if (wfRes.ok) {
      const json = await wfRes.json();
      setWorkflowName(json.workflow?.name || 'Workflow');
    }
    setLoading(false);
  }, [workflowId, router]);

  useEffect(() => { fetchRuns(page); }, [fetchRuns, page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#070708] text-white font-sans p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.push(`/dashboard/workflows/${workflowId}`)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-600 mb-0.5">
              <span
                className="hover:text-zinc-400 cursor-pointer transition-colors"
                onClick={() => router.push('/dashboard/workflows')}
              >
                Workflows
              </span>
              <ChevronRight className="w-3 h-3" />
              <span
                className="hover:text-zinc-400 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/workflows/${workflowId}`)}
              >
                {workflowName}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-zinc-400">Run History</span>
            </div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Run Logs
            </h1>
          </div>

          <button
            onClick={() => fetchRuns(page)}
            className="ml-auto p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Runs', value: total, color: 'text-white' },
            { label: 'Successful', value: runs.filter(r => r.status === 'success').length, color: 'text-emerald-400' },
            { label: 'Failed', value: runs.filter(r => r.status === 'failed').length, color: 'text-rose-400' },
            { label: 'Partial', value: runs.filter(r => r.status === 'partial').length, color: 'text-amber-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 text-center">
              <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Run List */}
        {loading ? (
          <div className="py-16 text-center text-zinc-600">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
            Loading run history...
          </div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl">
            <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-500">No runs yet</p>
            <p className="text-xs text-zinc-700 mt-1">Test the workflow to create the first run log</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {runs.map((run, i) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <RunRow run={run} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-bold hover:text-white disabled:opacity-40 transition-all"
                >
                  ← Prev
                </button>
                <span className="text-xs text-zinc-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-bold hover:text-white disabled:opacity-40 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
