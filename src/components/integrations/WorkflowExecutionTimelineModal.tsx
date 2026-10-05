'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import {
  X,
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Search,
  Activity,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle,
  Edit,
  CheckCheck,
  XCircle,
  Hourglass,
  Circle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface WorkflowStep {
  template_id: string;
  template_name: string;
  delay_value: number;
  delay_unit: string;
  sort_index: number;
}

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

interface WorkflowExecutionTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: any | null;
  onEditWorkflow?: (wf: any) => void;
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

export function WorkflowExecutionTimelineModal({
  isOpen,
  onClose,
  workflow,
  onEditWorkflow,
}: WorkflowExecutionTimelineModalProps) {
  const { userId, workspaceId } = useBhamstra();
  const tenantId = (workspaceId && workspaceId !== 'all') ? workspaceId : (userId || '');

  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLeadQuery, setSearchLeadQuery] = useState('');
  const [retryingStepId, setRetryingStepId] = useState<string | null>(null);
  const [retryingFull, setRetryingFull] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [resumingWorkflow, setResumingWorkflow] = useState(false);

  // Failed steps selection modal
  const [failedStepsModalOpen, setFailedStepsModalOpen] = useState(false);
  const [selectedFailedIndices, setSelectedFailedIndices] = useState<number[]>([]);

  const fetchTelemetry = useCallback(async () => {
    if (!workflow?.id) return;
    setLoading(true);
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch(`/api/integrations/whatsapp/workflows/execution?tenant_id=${activeTenant}&workflow_id=${workflow.id}`);
      const data = await res.json();
      if (data.success && data.executions) {
        setExecutions(data.executions);
        if (!selectedLeadId && data.executions.length > 0) {
          setSelectedLeadId(data.executions[0].leadId);
        }
      }
    } catch (err) {
      console.error('[WorkflowExecutionTimelineModal] Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [workflow?.id, tenantId, selectedLeadId]);

  useEffect(() => {
    if (isOpen && workflow?.id) {
      fetchTelemetry();
    }
  }, [isOpen, workflow?.id]);

  if (!isOpen || !workflow) return null;

  const currentExecution = executions.find(e => e.leadId === selectedLeadId) || executions[0] || null;

  const filteredExecutions = executions.filter(e => {
    const q = searchLeadQuery.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.phone.includes(q);
  });

  // Action: Single Step Manual Retry / Dispatch
  const handleRetrySingleStep = async (stepLog: StepLog) => {
    if (!currentExecution) return;
    setRetryingStepId(stepLog.id || String(stepLog.step_index));
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch('/api/workflows/retry-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentExecution.leadId,
          workflowId: workflow.id,
          stepIndex: stepLog.step_index,
          workflowLogId: stepLog.id,
          workspaceId: activeTenant,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retry step');
      }
      alert('✅ Step re-queued for immediate dispatch! (Other steps remained untouched)');
      fetchTelemetry();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRetryingStepId(null);
    }
  };

  // Action: Resend Full Workflow
  const handleResendFull = async () => {
    if (!currentExecution) return;
    if (!window.confirm(`Resend full "${workflow.workflow_name}" sequence to ${currentExecution.name}? All steps will be paced safely with anti-ban delay.`)) return;
    setRetryingFull(true);
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch('/api/workflows/resend-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentExecution.leadId,
          workflowId: workflow.id,
          workspaceId: activeTenant,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to restart workflow');
      alert('✅ Full workflow sequence re-queued with Anti-Ban pacing!');
      fetchTelemetry();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRetryingFull(false);
    }
  };

  // Action: Open Failed Steps Dialog
  const handleOpenFailedModal = () => {
    if (!currentExecution) return;
    const retriable = currentExecution.stepsLogs.filter(
      l => l.status === 'failed' || (l.status === 'pending' && l.error_message)
    );
    if (retriable.length === 0) {
      alert('No failed or stuck steps found for this contact.');
      return;
    }
    setSelectedFailedIndices(retriable.map(l => l.step_index));
    setFailedStepsModalOpen(true);
  };

  // Action: Confirm Retry Selected Steps
  const handleConfirmRetrySelected = async () => {
    if (!currentExecution || selectedFailedIndices.length === 0) return;
    setRetryingFailed(true);
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch('/api/workflows/retry-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentExecution.leadId,
          workflowId: workflow.id,
          stepIndexes: selectedFailedIndices,
          workspaceId: activeTenant,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to retry steps');
      alert(`✅ ${data.message || 'Selected steps re-queued with Anti-Ban pacing!'}`);
      setFailedStepsModalOpen(false);
      fetchTelemetry();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRetryingFailed(false);
    }
  };

  // Action: Stop Workflow
  const handleStopWorkflow = async () => {
    if (!currentExecution) return;
    if (!window.confirm(`Stop all upcoming scheduled steps for ${currentExecution.name}?`)) return;
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch('/api/workflows/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentExecution.leadId,
          workflowId: workflow.id,
          workspaceId: activeTenant,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to stop workflow');
      alert('✅ Workflow stopped. Pending steps cancelled.');
      fetchTelemetry();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Action: Resume Workflow
  const handleResumeWorkflow = async () => {
    if (!currentExecution) return;
    setResumingWorkflow(true);
    try {
      const activeTenant = tenantId || workflow.tenant_id || workflow.workspace_id;
      const res = await fetch('/api/workflows/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentExecution.leadId,
          workflowId: workflow.id,
          workspaceId: activeTenant,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resume workflow');
      alert(`✅ ${data.message || 'Workflow resumed.'}`);
      fetchTelemetry();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setResumingWorkflow(false);
    }
  };

  const isExecutionStopped = currentExecution && (
    currentExecution.status === 'stopped' ||
    currentExecution.stepsLogs.some(l => l.status === 'stopped' || l.error_message === 'STOPPED')
  );

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-zinc-900 dark:text-white truncate">
                  {workflow.workflow_name}
                </h2>
                <StatusBadge status={workflow.status || 'Active'} />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold font-mono">
                  {executions.length} Total Executions
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                Execution Timeline & Delivery Telemetry · WhatsApp Gateway Automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditWorkflow && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditWorkflow(workflow);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                title="Open node flow editor"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Flow</span>
              </button>
            )}

            <Link
              href={`/dashboard/integrations/whatsapp-web/workflows/analytics?workflowId=${workflow.id}`}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-850 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all"
            >
              <span>Full View</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Area: 2-Column Split (Contacts list + Execution Detail) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Sidebar: Contacts list */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col shrink-0">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchLeadQuery}
                  onChange={e => setSearchLeadQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-850">
              {loading ? (
                <div className="py-12 text-center text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  <span className="text-xs">Loading contacts...</span>
                </div>
              ) : filteredExecutions.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 px-4">
                  <p className="text-xs font-semibold">No contacts found</p>
                  <p className="text-[10px] text-zinc-500 mt-1">This workflow has not processed any leads yet.</p>
                </div>
              ) : (
                filteredExecutions.map(exec => {
                  const isSelected = exec.leadId === currentExecution?.leadId;
                  return (
                    <div
                      key={exec.leadId}
                      onClick={() => setSelectedLeadId(exec.leadId)}
                      className={`p-3 transition-colors cursor-pointer text-left flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500'
                          : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-850/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate block">
                            {exec.name}
                          </span>
                          <StatusBadge status={exec.status} />
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500 block truncate mt-0.5">
                          +{exec.phone.replace(/[^0-9]/g, '')}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                          <span className="text-emerald-500 font-bold">{exec.completedSteps} done</span>
                          {exec.failedSteps > 0 && <span className="text-red-500 font-bold">· {exec.failedSteps} failed</span>}
                          {exec.pendingSteps > 0 && <span className="text-amber-500 font-bold">· {exec.pendingSteps} pending</span>}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-amber-500 translate-x-0.5' : 'text-zinc-300 dark:text-zinc-700'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Selected Contact Execution Timeline */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950 overflow-y-auto p-4 sm:p-6 space-y-5">
            {loading && !currentExecution ? (
              <div className="py-24 text-center text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                <p className="text-sm font-semibold">Loading execution nodes...</p>
              </div>
            ) : !currentExecution ? (
              <div className="py-24 text-center text-zinc-400">
                <p className="text-sm font-semibold">Select a contact to view execution timeline</p>
              </div>
            ) : (
              <>
                {/* Contact Profile Banner & Actions */}
                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-500 text-sm">
                        {currentExecution.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                            {currentExecution.name}
                          </h3>
                          <StatusBadge status={currentExecution.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                          <span className="font-mono flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-zinc-400" />
                            +{currentExecution.phone.replace(/[^0-9]/g, '')}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            Joined: <span className="font-mono text-zinc-600 dark:text-zinc-300">{currentExecution.groupJoinTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResendFull}
                      disabled={retryingFull}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {retryingFull ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      <span>Resend Full Flow</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenFailedModal}
                      disabled={retryingFailed || currentExecution.stepsLogs.filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message)).length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {retryingFailed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>Retry Failed ({currentExecution.stepsLogs.filter(l => l.status === 'failed' || (l.status === 'pending' && l.error_message)).length})</span>
                    </button>

                    {isExecutionStopped ? (
                      <button
                        type="button"
                        onClick={handleResumeWorkflow}
                        disabled={resumingWorkflow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {resumingWorkflow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>Resume Flow</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopWorkflow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-red-500 font-bold text-xs border border-zinc-300 dark:border-zinc-700 rounded-xl transition-all cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Stop Flow</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Counter Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Steps', val: currentExecution.totalSteps, color: 'text-zinc-900 dark:text-zinc-100' },
                    { label: 'Completed', val: currentExecution.completedSteps, color: 'text-emerald-500 dark:text-emerald-400' },
                    { label: 'Pending', val: currentExecution.pendingSteps, color: 'text-amber-500 dark:text-amber-400' },
                    { label: 'Failed', val: currentExecution.failedSteps, color: 'text-red-500 dark:text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-3 text-center">
                      <div className={`text-2xl font-black ${color}`}>{val}</div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Step Nodes List */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Execution Sequence Nodes
                  </h4>

                  {currentExecution.stepsLogs.map((stepLog, idx) => {
                    const nodeStatus = stepLog.status;
                    const scheduledAt = stepLog.sent_at_formatted;
                    const completedAt = (stepLog.updated_at_formatted && stepLog.updated_at_formatted !== '—')
                      ? stepLog.updated_at_formatted
                      : (stepLog.updated_at ? new Date(stepLog.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—');
                    const errorText = stepLog.error_message;

                    const nodeColor = {
                      completed: 'border-emerald-500/40 bg-emerald-500/5',
                      pending:   'border-amber-500/40 bg-amber-500/5',
                      failed:    'border-red-500/40 bg-red-500/5',
                      unsent:    'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30',
                      sent:      'border-emerald-500/40 bg-emerald-500/5',
                      delivered: 'border-emerald-500/40 bg-emerald-500/5',
                      read:      'border-emerald-500/40 bg-emerald-500/5',
                      stopped:   'border-rose-900/40 bg-rose-950/20',
                    }[nodeStatus] || 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30';

                    const iconColor = {
                      completed: 'text-emerald-500 dark:text-emerald-400',
                      pending:   'text-amber-500 dark:text-amber-400',
                      failed:    'text-red-500 dark:text-red-400',
                      unsent:    'text-zinc-400',
                      sent:      'text-emerald-500 dark:text-emerald-400',
                      delivered: 'text-emerald-500 dark:text-emerald-400',
                      read:      'text-emerald-500 dark:text-emerald-400',
                      stopped:   'text-rose-500 dark:text-rose-400',
                    }[nodeStatus] || 'text-zinc-400';

                    const StepIcon = ['completed', 'sent', 'delivered', 'read'].includes(nodeStatus) ? CheckCheck
                      : nodeStatus === 'failed' ? XCircle
                      : nodeStatus === 'stopped' ? Ban
                      : nodeStatus === 'pending' ? Hourglass
                      : Circle;

                    const isRetrying = retryingStepId === (stepLog.id || String(stepLog.step_index));

                    return (
                      <div key={stepLog.id || stepLog.step_index} className={`relative border rounded-2xl p-4 transition-all ${nodeColor}`}>
                        {/* Step Pill */}
                        <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-[9px] font-black text-zinc-300 tracking-wider uppercase">
                          Step {idx + 1}
                        </div>

                        <div className="flex items-start justify-between gap-4 mt-1">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`mt-0.5 ${iconColor}`}>
                              <StepIcon className="w-5 h-5 shrink-0" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Send Template</span>
                                <StatusBadge status={nodeStatus} />
                              </div>
                              <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block truncate">
                                📄 {stepLog.template_name}
                              </span>

                              {/* Timestamps */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
                                <div className="flex items-center gap-1 text-zinc-500">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="font-mono text-zinc-600 dark:text-zinc-400">{scheduledAt}</span>
                                </div>

                                {nodeStatus === 'failed' && (
                                  <div className="flex items-center gap-1 text-red-500">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-semibold text-zinc-500">Failed at:</span>
                                    <span className="font-mono font-bold">{completedAt !== '—' ? completedAt : scheduledAt}</span>
                                  </div>
                                )}

                                {['completed', 'sent', 'delivered', 'read'].includes(nodeStatus) && (
                                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-semibold text-zinc-500">Completed:</span>
                                    <span className="font-mono font-bold">{completedAt !== '—' ? completedAt : scheduledAt}</span>
                                  </div>
                                )}

                                {nodeStatus === 'stopped' && (
                                  <div className="flex items-center gap-1 text-rose-500">
                                    <Ban className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-semibold text-zinc-500">Stopped:</span>
                                    <span className="font-mono">{completedAt !== '—' ? completedAt : scheduledAt}</span>
                                  </div>
                                )}
                              </div>

                              {/* Error Reason */}
                              {errorText && (
                                <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 max-w-xl">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span className="font-mono break-all">{errorText}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Orange Tone Dispatch Button */}
                          <button
                            type="button"
                            onClick={() => handleRetrySingleStep(stepLog)}
                            disabled={isRetrying}
                            title="Re-queue this step for manual dispatch"
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500 hover:text-zinc-950 text-amber-500 dark:text-amber-400 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isRetrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>Dispatch</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono">
            Workflow: {workflow.workflow_name} · Gateway Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-750 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Failed Steps Selection Dialog */}
      {failedStepsModalOpen && currentExecution && (
        <div className="fixed inset-0 z-[100001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Select Failed Steps to Retry
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select which failed steps to retry. Messages are safely paced with Anti-Ban delay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFailedStepsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {currentExecution.stepsLogs
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 text-amber-500 rounded border-zinc-400 focus:ring-amber-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-200">
                            Step {stepLog.step_index + 1}: {stepLog.template_name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">{stepLog.sent_at_formatted}</span>
                        </div>
                        {stepLog.error_message && (
                          <p className="text-[11px] text-red-500 font-mono mt-1 break-all bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                            {stepLog.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const retriable = currentExecution.stepsLogs.filter(
                    l => l.status === 'failed' || (l.status === 'pending' && l.error_message)
                  );
                  if (selectedFailedIndices.length === retriable.length) {
                    setSelectedFailedIndices([]);
                  } else {
                    setSelectedFailedIndices(retriable.map(l => l.step_index));
                  }
                }}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
              >
                {selectedFailedIndices.length > 0 ? 'Deselect All' : 'Select All'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFailedStepsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRetrySelected}
                  disabled={retryingFailed || selectedFailedIndices.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {retryingFailed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  Dispatch Selected ({selectedFailedIndices.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
