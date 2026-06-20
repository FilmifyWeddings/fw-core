'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Clock,
  Play,
  AlertTriangle,
  RotateCcw,
  Ban,
  User,
  Phone,
  BarChart3,
  MessageSquare,
  Zap,
  Activity,
  ChevronDown,
  Timer,
  Loader2,
  CheckCheck,
  XCircle,
  Circle,
  Hourglass,
  Filter,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface Workflow {
  id: string;
  workflow_name: string;
  target_group_id: string | null;
  workflow_steps: WorkflowStep[];
  execution_count: number;
  status: string;
}

interface WorkflowStep {
  template_id: string;
  template_name: string;
  delay_value: number;
  delay_unit: 'seconds' | 'hours';
  sort_index: number;
}

interface WorkflowLog {
  id: string;
  lead_id: string;
  workflow_id: string;
  step_index: number;
  phone_number: string;
  template_name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  sent_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  whatsapp_group_id: string | null;
}

interface ExecutionRow {
  leadId: string;
  name: string;
  phone: string;
  status: 'completed' | 'running' | 'failed' | 'not_started';
  totalSteps: number;
  completedSteps: number;
  leftSteps: number;
  failedSteps: number;
  pendingSteps: number;
  runsCount: number;
  updatedAt: string;
  stepsLogs: WorkflowLog[];
}

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

// ─── Status Badge Component ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; dot?: boolean }> = {
    completed: { cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Completed', dot: true },
    running:   { cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400',   label: 'Running',   dot: true },
    failed:    { cls: 'bg-red-500/15 border-red-500/30 text-red-400',         label: 'Failed',    dot: true },
    not_started: { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500',    label: 'Not Started' },
    sent:      { cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400',      label: 'Sent',      dot: true },
    delivered: { cls: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400', label: 'Delivered', dot: true },
    read:      { cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Read', dot: true },
    pending:   { cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400',   label: 'Pending',   dot: true },
    unsent:    { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500',      label: 'Unsent' },
  };
  const c = cfg[status] ?? cfg.unsent;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${c.cls}`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />}
      {c.label}
    </span>
  );
}

// ─── Step Node Component ───────────────────────────────────────────────────────
function StepNode({
  step,
  stepIndex,
  logEntry,
  onRetry,
  tenantId,
  execution,
}: {
  step: WorkflowStep;
  stepIndex: number;
  logEntry: WorkflowLog | undefined;
  onRetry: () => void;
  tenantId: string;
  execution: ExecutionRow;
}) {
  let nodeStatus: 'completed' | 'pending' | 'failed' | 'unsent' = 'unsent';
  let scheduledAt = `T+${step.delay_value}${step.delay_unit === 'seconds' ? 's' : 'h'}`;
  let completedAt = '—';
  let errorText: string | null = null;

  if (logEntry) {
    if (['sent', 'delivered', 'read'].includes(logEntry.status)) {
      nodeStatus = 'completed';
    } else if (logEntry.status === 'failed') {
      nodeStatus = 'failed';
    } else {
      nodeStatus = 'pending';
    }

    scheduledAt = new Date(logEntry.sent_at).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    });

    if (nodeStatus === 'completed') {
      completedAt = new Date(logEntry.updated_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
      });
    }

    errorText = logEntry.error_message;
  }

  const nodeColor = {
    completed: 'border-emerald-500/40 bg-emerald-500/5',
    pending:   'border-amber-500/40 bg-amber-500/5',
    failed:    'border-red-500/40 bg-red-500/5',
    unsent:    'border-zinc-800 bg-zinc-900/30',
  }[nodeStatus];

  const iconColor = {
    completed: 'text-emerald-400',
    pending:   'text-amber-400',
    failed:    'text-red-400',
    unsent:    'text-zinc-600',
  }[nodeStatus];

  const StepIcon = nodeStatus === 'completed' ? CheckCheck
    : nodeStatus === 'failed' ? XCircle
    : nodeStatus === 'pending' ? Hourglass
    : Circle;

  return (
    <div className={`relative border rounded-xl p-4 transition-all ${nodeColor}`}>
      {/* Step number badge */}
      <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-[9px] font-black text-zinc-400 tracking-wider uppercase">
        Step {stepIndex + 1}
      </div>

      <div className="flex items-start justify-between gap-4 mt-1">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${iconColor}`}>
            <StepIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-200">Send Template</span>
              <StatusBadge status={nodeStatus} />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
              📄 {step.template_name}
            </span>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Timer className="w-3 h-3 text-zinc-600" />
                <span className="font-semibold text-zinc-400">Delay:</span>
                <span className="font-mono">{step.delay_value} {step.delay_unit}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Clock className="w-3 h-3 text-zinc-600" />
                <span className="font-semibold text-zinc-400">Scheduled:</span>
                <span className="font-mono">{scheduledAt}</span>
              </div>
              {completedAt !== '—' && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="font-semibold text-zinc-400">Done:</span>
                  <span className="font-mono text-emerald-400/80">{completedAt}</span>
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

        {/* Right: Retry action */}
        <button
          onClick={onRetry}
          title="Re-queue this step for manual dispatch"
          className="shrink-0 p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-800 text-zinc-550 hover:text-amber-400 transition-all active:scale-90 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function WorkflowAnalyticsInner() {
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;
  const searchParams = useSearchParams();
  const urlWorkflowId = searchParams.get('workflowId');

  const [workflows, setWorkflows]           = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [leads, setLeads]                   = useState<Lead[]>([]);
  const [logs, setLogs]                     = useState<WorkflowLog[]>([]);
  const [executions, setExecutions]         = useState<ExecutionRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [triggeringManual, setTriggeringManual] = useState(false);

  // Modal state
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRow | null>(null);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: workflowsData } = await supabase
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('tenant_id', tenantId);

      const wfList = workflowsData || [];
      setWorkflows(wfList);

      let currentWorkflow = selectedWorkflow;
      if (wfList.length > 0 && !selectedWorkflow) {
        const matched = urlWorkflowId ? wfList.find(w => w.id === urlWorkflowId) : null;
        currentWorkflow = matched || wfList[0];
        setSelectedWorkflow(currentWorkflow);
      }

      if (!currentWorkflow) { setExecutions([]); return; }

      // Fetch leads in target group
      let targetLeads: Lead[] = [];
      if (currentWorkflow.target_group_id) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, name, phone, whatsapp_group_id')
          .eq('workspace_id', tenantId)
          .eq('whatsapp_group_id', currentWorkflow.target_group_id);
        targetLeads = leadsData || [];
      }
      setLeads(targetLeads);

      // Fetch workflow logs
      const { data: logsData } = await supabase
        .from('whatsapp_workflow_logs')
        .select('*')
        .eq('workflow_id', currentWorkflow.id)
        .eq('tenant_id', tenantId)
        .order('step_index', { ascending: true });

      const allLogs = logsData || [];
      setLogs(allLogs);

      buildExecutionRows(targetLeads, allLogs, currentWorkflow);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, selectedWorkflow, urlWorkflowId]);

  const buildExecutionRows = (targetLeads: Lead[], stepLogs: WorkflowLog[], workflow: Workflow) => {
    const totalStepsCount = workflow.workflow_steps?.length || 0;

    const rows: ExecutionRow[] = targetLeads.map(lead => {
      const leadLogs = stepLogs.filter(log => log.lead_id === lead.id);
      const completedCount = leadLogs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
      const failedCount    = leadLogs.filter(l => l.status === 'failed').length;
      const pendingCount   = leadLogs.filter(l => l.status === 'pending').length;
      const leftCount      = Math.max(0, totalStepsCount - completedCount - failedCount - pendingCount);

      let status: ExecutionRow['status'] = 'not_started';
      if (leadLogs.length === 0) {
        status = 'not_started';
      } else if (failedCount > 0) {
        status = 'failed';
      } else if (completedCount === totalStepsCount && totalStepsCount > 0) {
        status = 'completed';
      } else {
        status = 'running';
      }

      const lastLog = leadLogs.length > 0 ? leadLogs[leadLogs.length - 1] : null;
      const lastUpdate = lastLog
        ? new Date(lastLog.updated_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
          })
        : 'Not started';

      return {
        leadId: lead.id,
        name: lead.name || 'Unknown Contact',
        phone: lead.phone,
        status,
        totalSteps: totalStepsCount,
        completedSteps: completedCount,
        leftSteps: leftCount,
        failedSteps: failedCount,
        pendingSteps: pendingCount,
        runsCount: leadLogs.length > 0 ? 1 : 0,
        updatedAt: lastUpdate,
        stepsLogs: leadLogs,
      };
    });

    setExecutions(rows);

    // Update modal row if open
    if (selectedExecution) {
      const updated = rows.find(r => r.leadId === selectedExecution.leadId);
      if (updated) setSelectedExecution(updated);
    }
  };

  // Realtime subscriptions
  useEffect(() => {
    fetchData();

    const logsChannel = supabase
      .channel('wa-analytics-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_workflow_logs' }, () => fetchData(true))
      .subscribe();

    const leadsChannel = supabase
      .channel('wa-analytics-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [tenantId]);

  // Workflow switch handler
  const handleWorkflowChange = (wfId: string) => {
    const wf = workflows.find(w => w.id === wfId);
    if (wf) {
      setSelectedWorkflow(wf);
      setLeads([]);
      setLogs([]);
      setExecutions([]);
      setLoading(true);
    }
  };

  useEffect(() => {
    if (selectedWorkflow) fetchData();
  }, [selectedWorkflow?.id]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRetroactiveExecute = async () => {
    if (!selectedWorkflow) return;
    setTriggeringManual(true);
    try {
      const { data, error } = await supabase.rpc('rpc_execute_workflow_sequence', {
        p_workflow_id: selectedWorkflow.id,
      });
      if (error) throw error;
      const res = data as any;
      if (res?.success) {
        alert(`✅ Sequence injected! Triggered: ${res.triggered_steps_count} steps, Skipped: ${res.skipped_steps_count}`);
        fetchData(true);
      } else {
        alert(`❌ Error: ${res?.error || 'Unknown'}`);
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setTriggeringManual(false);
    }
  };

  const handleForceResendWorkflow = async (leadId: string) => {
    if (!selectedWorkflow) return;
    if (!window.confirm('Restart full workflow for this contact? Previous logs will be deleted.')) return;
    try {
      await supabase.from('whatsapp_workflow_logs').delete()
        .eq('lead_id', leadId).eq('workflow_id', selectedWorkflow.id);

      const { data: targetLead } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (targetLead) {
        const origGroup = targetLead.whatsapp_group_id;
        await supabase.from('leads').update({ whatsapp_group_id: null }).eq('id', leadId);
        await supabase.from('leads').update({ whatsapp_group_id: origGroup }).eq('id', leadId);
        alert('✅ Workflow restarted and queued!');
        fetchData(true);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRetryFailedSteps = async (execution: ExecutionRow) => {
    if (!selectedWorkflow) return;
    setRetryingFailed(true);
    try {
      const failedLogs = execution.stepsLogs.filter(l => l.status === 'failed');
      if (failedLogs.length === 0) { alert('No failed steps found.'); return; }

      const targetStep = selectedWorkflow.workflow_steps.find(
        s => s.sort_index === failedLogs[0].step_index
      );
      if (!targetStep) { alert('Cannot find step config.'); return; }

      const cleanPhone = execution.phone.replace(/[^0-9]/g, '');

      for (const failedLog of failedLogs) {
        const step = selectedWorkflow.workflow_steps.find(s => s.sort_index === failedLog.step_index);
        if (!step) continue;

        // Reset log to pending
        await supabase.from('whatsapp_workflow_logs')
          .update({ status: 'pending', error_message: null, updated_at: new Date().toISOString() })
          .eq('id', failedLog.id);

        // Re-queue action
        await supabase.from('baileys_action_queue').insert({
          workspace_id: tenantId,
          action_type: 'send_template',
          payload: {
            to: `${cleanPhone}@s.whatsapp.net`,
            templateId: step.template_id,
            variables: {
              Name: execution.name,
              lead_name: execution.name,
              phone: execution.phone,
            },
            workflowLogId: failedLog.id,
          },
          status: 'pending',
          priority: 2,
        });
      }

      alert(`✅ Retried ${failedLogs.length} failed step(s). Queue updated.`);
      fetchData(true);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingFailed(false);
    }
  };

  const handleStopWorkflow = async (leadId: string, phone: string) => {
    if (!selectedWorkflow) return;
    if (!window.confirm('Cancel all pending scheduled steps for this contact?')) return;
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      const { data: queueItems } = await supabase
        .from('baileys_action_queue')
        .select('id, payload')
        .eq('workspace_id', tenantId)
        .eq('status', 'pending');

      const toDelete = (queueItems || []).filter((item: any) => item.payload?.to === jid && item.payload?.workflowLogId);
      if (toDelete.length > 0) {
        await supabase.from('baileys_action_queue').delete().in('id', toDelete.map((i: any) => i.id));
      }

      await supabase.from('whatsapp_workflow_logs')
        .update({ status: 'failed', error_message: 'Cancelled by operator' })
        .eq('lead_id', leadId).eq('workflow_id', selectedWorkflow.id).eq('status', 'pending');

      alert(`✅ Stopped workflow. ${toDelete.length} queue items cancelled.`);
      fetchData(true);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRetryStepManual = async (step: WorkflowStep, execution: ExecutionRow) => {
    if (!selectedWorkflow) return;
    if (!window.confirm(`Re-queue Step ${step.sort_index + 1} (${step.template_name}) for immediate dispatch?`)) return;
    try {
      const cleanPhone = execution.phone.replace(/[^0-9]/g, '');
      const { error } = await supabase.from('baileys_action_queue').insert({
        workspace_id: tenantId,
        action_type: 'send_template',
        payload: {
          to: `${cleanPhone}@s.whatsapp.net`,
          templateId: step.template_id,
          variables: { Name: execution.name, lead_name: execution.name, phone: execution.phone },
        },
        status: 'pending',
        priority: 2,
      });
      if (error) throw error;
      alert('✅ Step queued for dispatch!');
      fetchData(true);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalContacts     = executions.length;
  const runningCount      = executions.filter(e => e.status === 'running').length;
  const completedCount    = executions.filter(e => e.status === 'completed').length;
  const failedCount       = executions.filter(e => e.status === 'failed').length;
  const notStartedCount   = executions.filter(e => e.status === 'not_started').length;
  const totalSent         = logs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
  const totalDelivered    = logs.filter(l => ['delivered', 'read'].includes(l.status)).length;
  const totalRead         = logs.filter(l => l.status === 'read').length;
  const totalFailed       = logs.filter(l => l.status === 'failed').length;
  const readRate          = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  // Filtered rows
  const filteredExecutions = executions.filter(row => {
    const q = searchQuery.toLowerCase();
    const matchSearch = row.name.toLowerCase().includes(q) || row.phone.includes(q);
    return matchSearch && (statusFilter === 'all' || row.status === statusFilter);
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-zinc-100 min-h-screen">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold mb-2">
            <a
              href="/dashboard/integrations/whatsapp-web/workflows"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Workflows
            </a>
            <span className="text-zinc-700">›</span>
            <span className="text-zinc-600">Execution Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent tracking-tight">
            Workflow Execution Tracker
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">
            Real-time delivery metrics · Duplicate prevention · Step-by-step node analytics
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workflow selector */}
          <div className="relative">
            <select
              value={selectedWorkflow?.id || ''}
              onChange={e => handleWorkflowChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500/40 cursor-pointer"
            >
              {workflows.length === 0 && <option value="">No workflows</option>}
              {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>{wf.workflow_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>

          <button
            onClick={handleRetroactiveExecute}
            disabled={triggeringManual || !selectedWorkflow}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 text-amber-400 font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {triggeringManual
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />}
            Sync Staged Group
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 rounded-xl text-zinc-500 hover:text-zinc-200 transition-all cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Contacts */}
        <div className="relative group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 overflow-hidden hover:border-blue-500/20 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Contacts</span>
            <User className="w-4 h-4 text-blue-500/40" />
          </div>
          <div className="text-3xl font-black text-blue-400">{totalContacts}</div>
          <div className="text-[9px] text-zinc-600 mt-1.5 font-mono">Dispatched: {totalSent}</div>
        </div>

        {/* Running */}
        <div className="relative group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 overflow-hidden hover:border-amber-500/20 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Running</span>
            <Activity className="w-4 h-4 text-amber-500/40" />
          </div>
          <div className="text-3xl font-black text-amber-400">{runningCount}</div>
          <div className="text-[9px] text-zinc-600 mt-1.5 font-mono">Delivered: {totalDelivered}</div>
        </div>

        {/* Completed */}
        <div className="relative group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 overflow-hidden hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500/40" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{completedCount}</div>
          <div className="text-[9px] text-zinc-600 mt-1.5 font-mono">Read Rate: {readRate}%</div>
        </div>

        {/* Failed */}
        <div className="relative group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 overflow-hidden hover:border-red-500/20 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Failed</span>
            <AlertCircle className="w-4 h-4 text-red-500/40" />
          </div>
          <div className="text-3xl font-black text-red-400">{failedCount}</div>
          <div className="text-[9px] text-zinc-600 mt-1.5 font-mono">Failed Logs: {totalFailed}</div>
        </div>
      </div>

      {/* ── Main Table Panel ── */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 md:p-5 backdrop-blur-lg space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search contact name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs placeholder-zinc-600 focus:outline-none focus:border-amber-500/30 text-zinc-200 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-600" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-pointer focus:border-amber-500/30"
            >
              <option value="all">All Contacts</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="not_started">Not Started</option>
            </select>
            <span className="text-[10px] text-zinc-600 font-mono">{filteredExecutions.length} rows</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-zinc-950/60 border-b border-zinc-800/80 text-zinc-500 uppercase text-[9px] font-black tracking-widest select-none">
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Steps</th>
                <th className="py-3.5 px-4 text-center">Done</th>
                <th className="py-3.5 px-4 text-center">Left</th>
                <th className="py-3.5 px-4 text-center">Failed</th>
                <th className="py-3.5 px-4 text-center">Runs</th>
                <th className="py-3.5 px-4 text-center">Updated</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500/50" />
                    <span className="text-xs">Loading execution analytics...</span>
                  </td>
                </tr>
              ) : filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-zinc-600">
                    <Ban className="w-7 h-7 mx-auto mb-3 text-zinc-700" />
                    <p className="font-bold text-zinc-500 text-sm">No execution data yet</p>
                    <p className="text-[11px] text-zinc-700 max-w-xs mx-auto mt-1">
                      Assign contacts to the &quot;{selectedWorkflow?.workflow_name}&quot; target group to trigger the workflow sequence.
                    </p>
                  </td>
                </tr>
              ) : filteredExecutions.map(row => (
                <tr
                  key={row.leadId}
                  className="hover:bg-zinc-800/20 transition-colors group"
                >
                  {/* Contact */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{row.name}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4 font-mono text-zinc-450 text-[10px]">+{row.phone.replace(/[^0-9]/g,'')}</td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={row.status} />
                  </td>

                  {/* Steps */}
                  <td className="py-3.5 px-4 text-center font-bold text-zinc-300">{row.totalSteps}</td>

                  {/* Completed */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-emerald-400">{row.completedSteps}</span>
                  </td>

                  {/* Left */}
                  <td className="py-3.5 px-4 text-center text-zinc-500">{row.leftSteps}</td>

                  {/* Failed */}
                  <td className="py-3.5 px-4 text-center">
                    {row.failedSteps > 0
                      ? <span className="font-bold text-red-400">{row.failedSteps}</span>
                      : <span className="text-zinc-700">0</span>}
                  </td>

                  {/* Runs */}
                  <td className="py-3.5 px-4 text-center text-zinc-400">{row.runsCount}</td>

                  {/* Updated */}
                  <td className="py-3.5 px-4 text-center font-mono text-[9px] text-zinc-600">{row.updatedAt}</td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => { setSelectedExecution(row); setIsModalOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/30 text-zinc-350 hover:text-amber-400 text-[10px] font-bold rounded-lg transition-all active:scale-90 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Execution Timeline Modal ── */}
      {isModalOpen && selectedExecution && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6"
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

            {/* Glow accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800/80 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-5 h-5 text-amber-500 shrink-0" />
                  <h3 className="text-base font-black text-zinc-100">Execution Timeline</h3>
                  <StatusBadge status={selectedExecution.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-600" />
                    {selectedExecution.name}
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-600" />
                    +{selectedExecution.phone.replace(/[^0-9]/g, '')}
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span>{selectedExecution.totalSteps} steps · {selectedExecution.completedSteps} done · {selectedExecution.failedSteps} failed</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mr-1">Actions:</span>

                <button
                  onClick={() => handleForceResendWorkflow(selectedExecution.leadId)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resend Full Workflow
                </button>

                <button
                  onClick={() => handleRetryFailedSteps(selectedExecution)}
                  disabled={retryingFailed || selectedExecution.failedSteps === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer"
                >
                  {retryingFailed
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <AlertTriangle className="w-3.5 h-3.5" />}
                  Retry Failed Steps ({selectedExecution.failedSteps})
                </button>

                <button
                  onClick={() => handleStopWorkflow(selectedExecution.leadId, selectedExecution.phone)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 hover:text-red-400 active:scale-95 text-zinc-300 font-bold text-xs border border-zinc-700 hover:border-red-500/30 rounded-xl transition-all cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Stop Workflow
                </button>
              </div>

              {/* Progress Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Steps', val: selectedExecution.totalSteps, color: 'text-zinc-200' },
                  { label: 'Completed', val: selectedExecution.completedSteps, color: 'text-emerald-400' },
                  { label: 'Pending', val: selectedExecution.pendingSteps, color: 'text-amber-400' },
                  { label: 'Failed', val: selectedExecution.failedSteps, color: 'text-red-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-black ${color}`}>{val}</div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Step Nodes */}
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Step-by-Step Execution Nodes
                </h4>

                {selectedExecution.totalSteps === 0 ? (
                  <div className="py-8 text-center text-zinc-600 border border-zinc-800 rounded-xl">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-800" />
                    No steps defined in this workflow.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedWorkflow?.workflow_steps?.map((step, idx) => {
                      const logEntry = selectedExecution.stepsLogs.find(l => l.step_index === step.sort_index);
                      return (
                        <StepNode
                          key={step.sort_index}
                          step={step}
                          stepIndex={idx}
                          logEntry={logEntry}
                          onRetry={() => handleRetryStepManual(step, selectedExecution)}
                          tenantId={tenantId}
                          execution={selectedExecution}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/60 flex items-center justify-between shrink-0">
              <span className="text-[9px] text-zinc-700 font-mono">
                Workflow: {selectedWorkflow?.workflow_name} · Last updated: {selectedExecution.updatedAt}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Suspense Wrapper (required for useSearchParams in Next.js 14) ─────────────
export default function WorkflowAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <WorkflowAnalyticsInner />
    </Suspense>
  );
}
