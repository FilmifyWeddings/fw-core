'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Activity,
  Loader2,
  AlertTriangle,
  CheckCheck,
  XCircle,
  Hourglass,
  Circle,
  User,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';

interface StepLog {
  id: string | null;
  step_index: number;
  template_name: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  sent_at_formatted: string;
  updated_at: string | null;
  updated_at_formatted: string;
}

interface ExecutionRow {
  leadId: string;
  workflowId?: string;
  workflowName?: string;
  name: string;
  phone: string;
  status: 'completed' | 'running' | 'failed' | 'not_started' | 'stopped';
  totalSteps: number;
  completedSteps: number;
  leftSteps: number;
  failedSteps: number;
  pendingSteps: number;
  runsCount: number;
  updatedAt: string;
  groupJoinTime: string;
  stepsLogs: StepLog[];
}

interface LeadExecutionTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  workspaceId?: string;
  onStatusUpdated?: (leadId: string, status: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const norm = (status || '').toLowerCase();
  const cfg: Record<string, { cls: string; label: string; dot?: boolean }> = {
    completed: { cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Completed', dot: true },
    running:   { cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400',       label: 'Running',   dot: true },
    failed:    { cls: 'bg-red-500/15 border-red-500/30 text-red-400',         label: 'Failed',    dot: true },
    stopped:   { cls: 'bg-rose-950/40 border-rose-800/40 text-rose-300',      label: 'Stopped',   dot: true },
    cancelled: { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500',      label: 'Cancelled' },
    not_started: { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500',    label: 'Not Started' },
    sent:      { cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400',      label: 'Sent',      dot: true },
    delivered: { cls: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400', label: 'Delivered', dot: true },
    read:      { cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Read', dot: true },
    pending:   { cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400',   label: 'Pending',   dot: true },
    unsent:    { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500',      label: 'Unsent' },
  };
  const c = cfg[norm] ?? cfg.unsent;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${c.cls}`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />}
      {c.label}
    </span>
  );
}

function StepNode({
  stepIndex,
  stepLog,
  onRetry,
}: {
  stepIndex: number;
  stepLog: StepLog;
  onRetry: () => void;
}) {
  const nodeStatus = stepLog.status;
  const errorText = stepLog.error_message;
  const scheduledAt = stepLog.sent_at_formatted;
  const completedAt = stepLog.updated_at_formatted;

  const nodeColor =
    nodeStatus === 'completed' || nodeStatus === 'sent' || nodeStatus === 'delivered' || nodeStatus === 'read'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : nodeStatus === 'failed'
        ? 'border-red-500/40 bg-red-500/10'
        : nodeStatus === 'stopped'
          ? 'border-rose-800/40 bg-rose-950/20'
          : nodeStatus === 'pending'
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40';

  const iconColor =
    ['completed', 'sent', 'delivered', 'read'].includes(nodeStatus) ? 'text-emerald-500'
      : nodeStatus === 'failed' ? 'text-red-500'
      : nodeStatus === 'stopped' ? 'text-rose-400'
      : nodeStatus === 'pending' ? 'text-amber-500'
      : 'text-zinc-400';

  const StepIcon = ['completed', 'sent', 'delivered', 'read'].includes(nodeStatus) ? CheckCheck
    : nodeStatus === 'failed' ? XCircle
    : nodeStatus === 'stopped' ? Ban
    : nodeStatus === 'pending' ? Hourglass
    : Circle;

  return (
    <div className={`relative border rounded-xl p-4 transition-all ${nodeColor}`}>
      <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-[9px] font-black text-zinc-400 tracking-wider uppercase">
        Step {stepIndex + 1}
      </div>

      <div className="flex items-start justify-between gap-4 mt-1">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${iconColor}`}>
            <StepIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Send Template</span>
              <StatusBadge status={nodeStatus} />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
              📄 {stepLog.template_name}
            </span>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                <span className="font-mono text-zinc-600 dark:text-zinc-400">{scheduledAt}</span>
              </div>
              {nodeStatus === 'failed' && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-semibold text-zinc-400">Failed at:</span>
                  <span className="font-mono text-red-400 font-bold">{completedAt !== '—' ? completedAt : '—'}</span>
                </div>
              )}
              {['completed', 'sent', 'delivered', 'read'].includes(nodeStatus) && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-zinc-400">Completed:</span>
                  <span className="font-mono text-emerald-400 font-bold">{completedAt !== '—' ? completedAt : '—'}</span>
                </div>
              )}
            </div>

            {errorText && (
              <div className="mt-2 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-2.5 py-1.5 max-w-sm">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="font-mono break-all">{errorText}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onRetry}
          title="Dispatch this step immediately"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500 hover:text-zinc-950 text-amber-500 dark:text-amber-400 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Dispatch</span>
        </button>
      </div>
    </div>
  );
}

export function LeadExecutionTimelineModal({
  isOpen,
  onClose,
  lead,
  workspaceId,
  onStatusUpdated,
}: LeadExecutionTimelineModalProps) {
  const [execution, setExecution] = useState<ExecutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [failedModalOpen, setFailedModalOpen] = useState(false);
  const [selectedFailedIndices, setSelectedFailedIndices] = useState<number[]>([]);
  const [resumingWorkflow, setResumingWorkflow] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch(`/api/integrations/whatsapp/workflows/execution?tenant_id=${activeWs}&workflow_id=all&lead_id=${lead.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.executions)) {
        const matched = data.executions.find((e: any) => e.leadId === lead.id) || data.executions[0] || null;
        setExecution(matched);
      }
    } catch (err) {
      console.error('[LeadExecutionTimelineModal] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [lead?.id, workspaceId]);

  useEffect(() => {
    if (isOpen && lead?.id) {
      fetchTimeline();

      // Realtime subscription on logs
      const ch = supabase
        .channel(`wa-lead-timeline-${lead.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_workflow_logs' }, () => {
          fetchTimeline();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
      };
    }
  }, [isOpen, lead?.id, fetchTimeline]);

  // Actions
  const handleForceResend = async () => {
    if (!execution || !lead) return;
    if (!window.confirm('Restart full workflow for this contact? Previous logs will be reset.')) return;
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/resend-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workflowId: execution.workflowId || 'all',
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Workflow restarted and queued!');
        fetchTimeline();
        if (onStatusUpdated) onStatusUpdated(lead.id, 'running');
      } else {
        alert(`❌ Error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOpenRetryFailed = () => {
    if (!execution) return;
    const failedSteps = (execution.stepsLogs || []).filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message));
    if (failedSteps.length === 0) {
      alert('No failed or stuck steps found to retry.');
      return;
    }
    setSelectedFailedIndices(failedSteps.map(s => s.step_index));
    setFailedModalOpen(true);
  };

  const handleConfirmRetryFailed = async () => {
    if (!execution || !lead || selectedFailedIndices.length === 0) return;
    setRetryingFailed(true);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/retry-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workflowId: execution.workflowId,
          stepIndexes: selectedFailedIndices,
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message || 'Selected steps re-queued with Anti-Ban pacing!'}`);
        setFailedModalOpen(false);
        fetchTimeline();
        if (onStatusUpdated) onStatusUpdated(lead.id, 'running');
      } else {
        alert(`❌ Error: ${data.error || 'Failed to retry'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRetryingFailed(false);
    }
  };

  const handleResumeWorkflow = async () => {
    if (!execution || !lead) return;
    setResumingWorkflow(true);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workflowId: execution.workflowId,
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Workflow resumed.');
        fetchTimeline();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setResumingWorkflow(false);
    }
  };

  const handleStopWorkflow = async () => {
    if (!execution || !lead) return;
    if (!window.confirm('Cancel all pending scheduled steps for this contact?')) return;
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workflowId: execution.workflowId,
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Stopped workflow.');
        fetchTimeline();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRetrySingleStep = async (stepLog: StepLog) => {
    if (!execution || !lead) return;
    if (!window.confirm(`Re-queue Step ${stepLog.step_index + 1} (${stepLog.template_name}) for dispatch?`)) return;
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/retry-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workflowId: execution.workflowId,
          workflowLogId: stepLog.id,
          stepIndexes: [stepLog.step_index],
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Step re-queued for dispatch!');
        fetchTimeline();
      } else {
        alert(`❌ Error: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative z-10 w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Gold/Amber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {/* Modal Header */}
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">Execution Timeline</h3>
                {execution && <StatusBadge status={execution.status} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {lead.name || 'Lead'}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  {lead.phone ? '+' + String(lead.phone).replace(/[^0-9]/g, '') : '—'}
                </span>
                {execution?.groupJoinTime && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Joined: <span className="font-mono text-zinc-600 dark:text-zinc-400">{execution.groupJoinTime}</span>
                    </span>
                  </>
                )}
                {execution && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span>{execution.totalSteps} steps · {execution.completedSteps} done · {execution.failedSteps} failed</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading && !execution ? (
              <div className="py-24 text-center text-zinc-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-semibold">Loading execution telemetry...</p>
              </div>
            ) : !execution ? (
              <div className="py-20 text-center text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="text-sm font-bold">No workflow active for this lead</p>
                <p className="text-xs text-zinc-400 mt-1">Lead is not assigned to an active WhatsApp contact group workflow.</p>
              </div>
            ) : (
              <>
                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-1">Actions:</span>

                  <button
                    onClick={handleForceResend}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resend Full Workflow
                  </button>

                  <button
                    onClick={handleOpenRetryFailed}
                    disabled={retryingFailed || execution.stepsLogs.filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message)).length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer shadow-xs"
                  >
                    {retryingFailed ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    Retry Failed/Stuck Steps ({execution.stepsLogs.filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message)).length})
                  </button>

                  {execution.status === 'stopped' || execution.stepsLogs.some(l => l.status === 'stopped') ? (
                    <button
                      onClick={handleResumeWorkflow}
                      disabled={resumingWorkflow}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {resumingWorkflow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      Resume Workflow
                    </button>
                  ) : (
                    <button
                      onClick={handleStopWorkflow}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-750 hover:text-red-500 active:scale-95 text-zinc-700 dark:text-zinc-300 font-bold text-xs border border-zinc-300 dark:border-zinc-700 rounded-xl transition-all cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Stop Workflow
                    </button>
                  )}
                </div>

                {/* Progress Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Steps', val: execution.totalSteps, color: 'text-zinc-800 dark:text-zinc-200' },
                    { label: 'Completed', val: execution.completedSteps, color: 'text-emerald-500 dark:text-emerald-400' },
                    { label: 'Pending', val: execution.pendingSteps, color: 'text-amber-500 dark:text-amber-400' },
                    { label: 'Failed', val: execution.failedSteps, color: 'text-red-500 dark:text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-3 text-center">
                      <div className={`text-2xl font-black ${color}`}>{val}</div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Step Nodes */}
                <div>
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Step-by-Step Execution Nodes
                  </h4>

                  {execution.totalSteps === 0 ? (
                    <div className="py-8 text-center text-zinc-500 border border-zinc-200 dark:border-zinc-850 rounded-xl">
                      No steps defined in this workflow.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(execution.stepsLogs || []).map((stepLog, idx) => (
                        <StepNode
                          key={stepLog.id || stepLog.step_index}
                          stepIndex={idx}
                          stepLog={stepLog}
                          onRetry={() => handleRetrySingleStep(stepLog)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-zinc-500 font-mono">
              Workflow: {execution?.workflowName || 'Default'} · Telemetry Realtime
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>

        {/* Failed Steps Selection Modal */}
        {failedModalOpen && execution && (
          <div className="fixed inset-0 z-[1000000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Select Failed / Stuck Steps to Retry
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Choose specific steps to re-dispatch with safe spacing.
                  </p>
                </div>
                <button
                  onClick={() => setFailedModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {execution.stepsLogs
                  .filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message))
                  .map(stepLog => {
                    const isChecked = selectedFailedIndices.includes(stepLog.step_index);
                    return (
                      <div
                        key={stepLog.step_index}
                        onClick={() => {
                          setSelectedFailedIndices(prev =>
                            prev.includes(stepLog.step_index)
                              ? prev.filter(i => i !== stepLog.step_index)
                              : [...prev, stepLog.step_index]
                          );
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-zinc-900 dark:text-zinc-100'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-2">
                            <span>Step {stepLog.step_index + 1}: {stepLog.template_name}</span>
                            <StatusBadge status={stepLog.status} />
                          </div>
                          {stepLog.error_message && (
                            <span className="text-[10px] text-red-400 font-mono block mt-0.5">
                              {stepLog.error_message}
                            </span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-amber-500 focus:ring-amber-500 pointer-events-none"
                        />
                      </div>
                    );
                  })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setFailedModalOpen(false)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRetryFailed}
                  disabled={retryingFailed || selectedFailedIndices.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl disabled:opacity-50"
                >
                  {retryingFailed ? 'Re-queueing...' : `Retry ${selectedFailedIndices.length} Selected`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
