'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Plus, Play, Pause, Trash2, ExternalLink, Zap,
  CheckCircle2, XCircle, Clock, Activity, ChevronRight,
  Webhook, MousePointer, Users, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  trigger_type: string;
  run_count: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'partial' | null;
  created_at: string;
}

const TRIGGER_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  facebook_lead:  { label: 'Facebook Lead',    icon: <FacebookIcon className="w-3.5 h-3.5" />,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  webhook:        { label: 'Webhook',           icon: <Webhook className="w-3.5 h-3.5" />,      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  manual:         { label: 'Manual / Test',     icon: <MousePointer className="w-3.5 h-3.5" />, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  crm_entry:      { label: 'CRM Entry',         icon: <Users className="w-3.5 h-3.5" />,        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  success: { label: 'Success', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  failed:  { label: 'Failed',  icon: <XCircle className="w-3.5 h-3.5" />,      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  partial: { label: 'Partial', icon: <AlertCircle className="w-3.5 h-3.5" />,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const res = await fetch('/api/workflows', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setWorkflows(json.workflows || []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleToggle = async (workflow: Workflow) => {
    setTogglingId(workflow.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/workflows/${workflow.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !workflow.is_enabled }),
    });

    setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, is_enabled: !w.is_enabled } : w));
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow? All run logs will also be deleted.')) return;
    setDeletingId(id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/workflows/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setWorkflows(prev => prev.filter(w => w.id !== id));
    setDeletingId(null);
  };

  const handleTestRun = async (workflow: Workflow) => {
    setRunningId(workflow.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/workflows/${workflow.id}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setRunningId(null);
    if (json.success) {
      alert(`✅ Test run completed! ${json.stepsCompleted} step(s) passed.`);
    } else {
      alert(`⚠️ Run finished with ${json.stepsFailed} failure(s). Check run logs for details.`);
    }
    fetchWorkflows();
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white font-sans p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">Automation Workflows</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Build multi-step automations across all your connected apps</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWorkflows}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/dashboard/workflows/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-xs font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Workflows', value: workflows.length, icon: <GitBranch className="w-4 h-4" />, color: 'text-orange-400' },
            { label: 'Active', value: workflows.filter(w => w.is_enabled).length, icon: <Activity className="w-4 h-4" />, color: 'text-emerald-400' },
            { label: 'Total Runs', value: workflows.reduce((s, w) => s + w.run_count, 0), icon: <Zap className="w-4 h-4" />, color: 'text-blue-400' },
          ].map(stat => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className={`w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5 uppercase tracking-wide">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Workflow List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-600">
            <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl"
          >
            <GitBranch className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-zinc-400 mb-2">No workflows yet</h3>
            <p className="text-xs text-zinc-600 mb-6">Create your first automation to connect your apps</p>
            <button
              onClick={() => router.push('/dashboard/workflows/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Workflow
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {workflows.map((workflow, i) => {
                const trigger = TRIGGER_META[workflow.trigger_type] || TRIGGER_META.manual;
                const status = workflow.last_run_status ? STATUS_META[workflow.last_run_status] : null;

                return (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700/60 rounded-2xl p-5 transition-all"
                  >
                    {/* Enabled indicator strip */}
                    <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all ${workflow.is_enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`} />

                    <div className="pl-4 flex items-center justify-between gap-4">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${trigger.color}`}>
                            {trigger.icon} {trigger.label}
                          </span>
                          {status && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                          )}
                          {!workflow.is_enabled && (
                            <span className="text-[10px] font-bold text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">PAUSED</span>
                          )}
                        </div>

                        <h3
                          className="text-sm font-extrabold text-white cursor-pointer hover:text-orange-400 transition-colors truncate"
                          onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                        >
                          {workflow.name}
                        </h3>
                        {workflow.description && (
                          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{workflow.description}</p>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-zinc-600">
                            <Zap className="w-3 h-3 inline mr-1 text-amber-500/70" />
                            {workflow.run_count} run{workflow.run_count !== 1 ? 's' : ''}
                          </span>
                          {workflow.last_run_at && (
                            <span className="text-[10px] text-zinc-600">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {timeAgo(workflow.last_run_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Test Run */}
                        <button
                          onClick={() => handleTestRun(workflow)}
                          disabled={!!runningId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          {runningId === workflow.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          Test
                        </button>

                        {/* Run History */}
                        <button
                          onClick={() => router.push(`/dashboard/workflows/${workflow.id}/runs`)}
                          className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all"
                          title="Run history"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                          className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all"
                          title="Edit workflow"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(workflow)}
                          disabled={togglingId === workflow.id}
                          className={`p-2 rounded-lg border transition-all ${workflow.is_enabled
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/20'
                          }`}
                          title={workflow.is_enabled ? 'Pause workflow' : 'Enable workflow'}
                        >
                          {workflow.is_enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          disabled={deletingId === workflow.id}
                          className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all"
                          title="Delete workflow"
                        >
                          {deletingId === workflow.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>

                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
