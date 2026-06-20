'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
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
  Check,
  Send,
  MessageSquare
} from 'lucide-react';

// Interfaces mapping database schemas
interface Workflow {
  id: string;
  workflow_name: string;
  target_group_id: string | null;
  workflow_steps: WorkflowStep[];
  execution_count: number;
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
  status: 'completed' | 'running' | 'failed';
  totalSteps: number;
  completedSteps: number;
  leftSteps: number;
  failedSteps: number;
  runsCount: number;
  updatedAt: string;
  stepsLogs: WorkflowLog[];
}

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WorkflowAnalyticsPage() {
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  // State Management
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggeringManual, setTriggeringManual] = useState<boolean>(false);

  // Modal Details
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch Workflows
      const { data: workflowsData, error: wfError } = await supabase
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('tenant_id', tenantId);

      if (wfError) throw wfError;
      setWorkflows(workflowsData || []);

      // Auto-select first workflow if none selected
      let currentWorkflow = selectedWorkflow;
      if (workflowsData && workflowsData.length > 0 && !selectedWorkflow) {
        currentWorkflow = workflowsData[0];
        setSelectedWorkflow(workflowsData[0]);
      }

      if (currentWorkflow) {
        // 2. Fetch Leads in Target Group
        let targetLeads: Lead[] = [];
        if (currentWorkflow.target_group_id) {
          const { data: leadsData, error: leadsError } = await supabase
            .from('leads')
            .select('id, name, phone, whatsapp_group_id')
            .eq('tenant_id', tenantId)
            .eq('whatsapp_group_id', currentWorkflow.target_group_id);

          if (!leadsError && leadsData) {
            targetLeads = leadsData;
          }
        }
        setLeads(targetLeads);

        // 3. Fetch Workflow Logs
        const { data: logsData, error: logsError } = await supabase
          .from('whatsapp_workflow_logs')
          .select('*')
          .eq('workflow_id', currentWorkflow.id)
          .eq('tenant_id', tenantId)
          .order('step_index', { ascending: true });

        if (!logsError && logsData) {
          setLogs(logsData);
        }

        // Calculate Execution Grid
        calculateExecutions(targetLeads, logsData || [], currentWorkflow);
      } else {
        setExecutions([]);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedWorkflow]);

  // Calculate grid execution rows dynamically
  const calculateExecutions = (targetLeads: Lead[], stepLogs: WorkflowLog[], workflow: Workflow) => {
    const totalStepsCount = workflow.workflow_steps?.length || 0;

    const rows: ExecutionRow[] = targetLeads.map(lead => {
      const leadLogs = stepLogs.filter(log => log.lead_id === lead.id);
      
      const completedCount = leadLogs.filter(log => ['sent', 'delivered', 'read'].includes(log.status)).length;
      const failedCount = leadLogs.filter(log => log.status === 'failed').length;
      const leftCount = Math.max(0, totalStepsCount - completedCount - failedCount);

      // Determine Status
      let status: 'completed' | 'running' | 'failed' = 'running';
      if (failedCount > 0) {
        status = 'failed';
      } else if (completedCount === totalStepsCount && totalStepsCount > 0) {
        status = 'completed';
      }

      // Calculate last update time
      let lastUpdate = leadLogs.length > 0 
        ? new Date(leadLogs[leadLogs.length - 1].updated_at).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
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
        runsCount: leadLogs.length > 0 ? 1 : 0,
        updatedAt: lastUpdate,
        stepsLogs: leadLogs
      };
    });

    setExecutions(rows);

    // Update active modal row if open
    if (selectedExecution) {
      const updatedModalRow = rows.find(r => r.leadId === selectedExecution.leadId);
      if (updatedModalRow) {
        setSelectedExecution(updatedModalRow);
      }
    }
  };

  // Real-Time subscription hook (Supabase Realtime Broadcast Channels)
  useEffect(() => {
    fetchData();

    // Subscribe to workflow logs updates (realtime channel)
    const logsChannel = supabase
      .channel('wa-workflow-logs-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'whatsapp_workflow_logs' 
      }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to leads updates (detect group assignment shifts)
    const leadsChannel = supabase
      .channel('wa-leads-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leads' 
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [tenantId, selectedWorkflow, fetchData]);

  // Fetch data again when selected workflow changes
  const handleWorkflowChange = (workflowId: string) => {
    const wf = workflows.find(w => w.id === workflowId);
    if (wf) {
      setSelectedWorkflow(wf);
    }
  };

  // Retroactive injection execution trigger
  const handleRetroactiveExecute = async () => {
    if (!selectedWorkflow) return;
    try {
      setTriggeringManual(true);
      const { data, error } = await supabase.rpc('rpc_execute_workflow_sequence', {
        p_workflow_id: selectedWorkflow.id
      });

      if (error) throw error;
      
      const res = data as any;
      if (res && res.success) {
        alert(`Successfully injected sequence! Triggered steps: ${res.triggered_steps_count}, Skipped steps: ${res.skipped_steps_count}`);
        fetchData();
      } else {
        alert(`Error executing sequence: ${res?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Retroactive execution failed:', err);
      alert(`Execution Failed: ${err.message || err}`);
    } finally {
      setTriggeringManual(false);
    }
  };

  // Resend or force restart full workflow for single contact
  const handleForceResendWorkflow = async (leadId: string) => {
    if (!selectedWorkflow) return;
    const confirmRestart = window.confirm("Are you sure you want to completely restart the workflow nodes for this contact? This will delete previous run logs.");
    if (!confirmRestart) return;

    try {
      // 1. Delete logs for this lead & workflow to reset idempotency
      await supabase
        .from('whatsapp_workflow_logs')
        .delete()
        .eq('lead_id', leadId)
        .eq('workflow_id', selectedWorkflow.id);

      // 2. Query target lead details
      const { data: targetLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (targetLead) {
        const originalGroupId = targetLead.whatsapp_group_id;
        
        // Nullify first
        await supabase
          .from('leads')
          .update({ whatsapp_group_id: null })
          .eq('id', leadId);

        // Re-assign group ID to fire DB trigger fn_trigger_whatsapp_workflow
        const { error: triggerErr } = await supabase
          .from('leads')
          .update({ whatsapp_group_id: originalGroupId })
          .eq('id', leadId);

        if (triggerErr) throw triggerErr;
        
        alert("Workflow sequence reset and queued successfully!");
        fetchData();
      }
    } catch (err: any) {
      alert(`Error resetting workflow: ${err.message || err}`);
    }
  };

  // Stop Workflow (delete pending queue rows for a specific contact)
  const handleStopWorkflow = async (leadId: string, phone: string) => {
    if (!selectedWorkflow) return;
    const confirmStop = window.confirm("Are you sure you want to cancel all pending/scheduled steps in this workflow for this contact?");
    if (!confirmStop) return;

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      // 1. Delete pending items in baileys_action_queue
      const { data: queueItems, error: qErr } = await supabase
        .from('baileys_action_queue')
        .select('id, payload')
        .eq('workspace_id', tenantId)
        .eq('status', 'pending');

      if (qErr) throw qErr;

      // Filter local payload items
      const itemsToDelete = (queueItems || []).filter(item => {
        const payload = item.payload || {};
        return payload.to === jid && payload.workflowLogId;
      });

      if (itemsToDelete.length > 0) {
        const ids = itemsToDelete.map(i => i.id);
        const { error: delErr } = await supabase
          .from('baileys_action_queue')
          .delete()
          .in('id', ids);
        
        if (delErr) throw delErr;

        // 2. Mark remaining pending logs as failed/stopped in logs table
        await supabase
          .from('whatsapp_workflow_logs')
          .update({
            status: 'failed',
            error_message: 'Cancelled by operator'
          })
          .eq('lead_id', leadId)
          .eq('workflow_id', selectedWorkflow.id)
          .eq('status', 'pending');

        alert(`Successfully stopped workflow! Cancelled ${itemsToDelete.length} pending scheduled queue messages.`);
        fetchData();
      } else {
        alert("No active pending queue messages found for this contact.");
      }
    } catch (err: any) {
      alert(`Failed to stop workflow: ${err.message || err}`);
    }
  };

  // Metrics summary
  const totalExecutions = executions.length;
  const runningExecutions = executions.filter(e => e.status === 'running').length;
  const completedExecutions = executions.filter(e => e.status === 'completed').length;
  const failedExecutions = executions.filter(e => e.status === 'failed').length;

  // WhatsBoost Custom Metrics from Log Table
  const totalSent = logs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
  const totalDelivered = logs.filter(l => ['delivered', 'read'].includes(l.status)).length;
  const totalRead = logs.filter(l => l.status === 'read').length;
  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;
  const totalFailed = logs.filter(l => l.status === 'failed').length;

  // Filtered list
  const filteredExecutions = executions.filter(row => {
    const matchesSearch = 
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.phone.includes(searchQuery) ||
      row.leadId.includes(searchQuery);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && row.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-zinc-100 font-sans">
      
      {/* 🔱 Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-zinc-450 text-xs font-semibold mb-1">
            <a href="/dashboard/integrations/whatsapp-web/workflows" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to Workflows
            </a>
            <span>•</span>
            <span className="text-zinc-550">Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            Workflow Execution
          </h1>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Real-time delivery status, duplicate prevention filters, and node execution stats.
          </p>
        </div>

        {/* Workflow Selection & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedWorkflow?.id || ''} 
            onChange={(e) => handleWorkflowChange(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500/40 cursor-pointer"
          >
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>{wf.workflow_name}</option>
            ))}
          </select>

          <button 
            onClick={handleRetroactiveExecute}
            disabled={triggeringManual || !selectedWorkflow}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-1.5 cursor-pointer"
          >
            {triggeringManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Sync Staged Group
          </button>

          <button 
            onClick={fetchData} 
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-xl text-zinc-455 hover:text-zinc-200 transition-all cursor-pointer"
            title="Refresh logs grid"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 📊 Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Contacts */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
          <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">CONTACTS</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-blue-400">{totalExecutions}</span>
            <span className="text-xs text-zinc-500">enrolled</span>
          </div>
          <span className="text-[9px] text-zinc-550 block mt-2 font-mono">Dispatched Sent: {totalSent}</span>
        </div>

        {/* Metric 2: Running */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden group hover:border-yellow-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-all" />
          <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">RUNNING</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-yellow-400">{runningExecutions}</span>
            <span className="text-xs text-zinc-500">active drips</span>
          </div>
          <span className="text-[9px] text-zinc-550 block mt-2 font-mono">Delivered Success: {totalDelivered}</span>
        </div>

        {/* Metric 3: Completed */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden group hover:border-green-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all" />
          <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">COMPLETED</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-green-400">{completedExecutions}</span>
            <span className="text-xs text-zinc-500">finished</span>
          </div>
          <span className="text-[9px] text-zinc-550 block mt-2 font-mono">Read Rate: {readRate}% ({totalRead} read)</span>
        </div>

        {/* Metric 4: Failed */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden group hover:border-red-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
          <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">FAILED</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-red-400">{failedExecutions}</span>
            <span className="text-xs text-zinc-500">errored</span>
          </div>
          <span className="text-[9px] text-zinc-550 block mt-2 font-mono">Failed Logs Count: {totalFailed}</span>
        </div>
      </div>

      {/* 🔍 Filter & Registry Section */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-lg space-y-4">
        
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by contact name/phone/jid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500/30 text-zinc-200 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500 whitespace-nowrap">Filter Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-pointer focus:border-amber-500/30"
            >
              <option value="all">All Contacts</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* 📊 Dynamic Registry Grid Table */}
        <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-850 text-zinc-450 uppercase font-bold tracking-wider select-none text-[10px]">
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Total Steps</th>
                <th className="py-3.5 px-4 text-center">Completed</th>
                <th className="py-3.5 px-4 text-center">Left</th>
                <th className="py-3.5 px-4 text-center">Failed</th>
                <th className="py-3.5 px-4 text-center">Runs</th>
                <th className="py-3.5 px-4 text-center">Updated</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500/50" />
                    <span>Loading execution analytics...</span>
                  </td>
                </tr>
              ) : filteredExecutions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    <Ban className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
                    <p className="font-semibold text-zinc-455">No execution logs found</p>
                    <p className="text-[10px] text-zinc-600 max-w-xs mx-auto mt-1">
                      Enroll contacts in the "{selectedWorkflow?.workflow_name}" workflow target group to trigger steps.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExecutions.map(row => {
                  return (
                    <tr key={row.leadId} className="hover:bg-zinc-850/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-150 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-amber-400">
                          {row.name.charAt(0)}
                        </div>
                        <span>{row.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">+{row.phone}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          row.status === 'completed' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : row.status === 'failed'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-300 font-medium">{row.totalSteps}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-semibold">{row.completedSteps}</td>
                      <td className="py-3 px-4 text-center text-zinc-400">{row.leftSteps}</td>
                      <td className="py-3 px-4 text-center text-red-400 font-medium">{row.failedSteps}</td>
                      <td className="py-3 px-4 text-center text-zinc-300">{row.runsCount}</td>
                      <td className="py-3 px-4 text-center text-zinc-500 font-mono text-[10px]">{row.updatedAt}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedExecution(row);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-400 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔱 Timeline Modal (Execution Details Popup) */}
      {isModalOpen && selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  Execution Timeline
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1 select-none">
                  <span className="flex items-center gap-1 font-semibold text-zinc-200">
                    <User className="w-3.5 h-3.5 text-zinc-550" />
                    Contact: {selectedExecution.name}
                  </span>
                  <span className="text-zinc-650">•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-550" />
                    +{selectedExecution.phone}
                  </span>
                  <span className="text-zinc-650">•</span>
                  <span>Total Runs: {selectedExecution.runsCount}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Table */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              
              {/* Quick Actions inside Timeline */}
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/50 pb-3">
                <button
                  onClick={() => handleForceResendWorkflow(selectedExecution.leadId)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resend Full Workflow
                </button>

                <button
                  onClick={() => handleStopWorkflow(selectedExecution.leadId, selectedExecution.phone)}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 hover:text-red-400 active:scale-95 text-zinc-300 font-bold text-xs border border-zinc-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Stop Workflow
                </button>
              </div>

              {/* Steps Execution logs Table */}
              <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/60 border-b border-zinc-850 text-zinc-450 uppercase font-bold tracking-wider select-none text-[10px]">
                      <th className="py-2.5 px-3.5 text-center">Step</th>
                      <th className="py-2.5 px-3.5">Action</th>
                      <th className="py-2.5 px-3.5 text-center">Status</th>
                      <th className="py-2.5 px-3.5 text-center">Scheduled</th>
                      <th className="py-2.5 px-3.5 text-center">Completed</th>
                      <th className="py-2.5 px-3.5">Error</th>
                      <th className="py-2.5 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {selectedExecution.totalSteps === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-zinc-500">
                          No steps defined in this workflow.
                        </td>
                      </tr>
                    ) : (
                      selectedWorkflow?.workflow_steps?.map((step, idx) => {
                        const stepIndex = step.sort_index;
                        const logEntry = selectedExecution.stepsLogs.find(l => l.step_index === stepIndex);

                        // Calculate status
                        let status: 'completed' | 'pending' | 'failed' | 'unsent' = 'unsent';
                        let completedAt = '-';
                        let scheduledAt = '-';
                        let errorText = '-';

                        if (logEntry) {
                          if (['sent', 'delivered', 'read'].includes(logEntry.status)) {
                            status = 'completed';
                          } else if (logEntry.status === 'failed') {
                            status = 'failed';
                          } else {
                            status = 'pending';
                          }
                          scheduledAt = new Date(logEntry.sent_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                          });
                          completedAt = logEntry.status !== 'pending' && logEntry.status !== 'failed'
                            ? new Date(logEntry.updated_at).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                              })
                            : '-';
                          errorText = logEntry.error_message || '-';
                        } else {
                          const delayLabel = `${step.delay_value} ${step.delay_unit}`;
                          scheduledAt = `T+${delayLabel}`;
                        }

                        return (
                          <tr key={stepIndex} className="hover:bg-zinc-850/10 transition-colors">
                            <td className="py-2.5 px-3.5 text-center font-bold text-zinc-450">{stepIndex + 1}</td>
                            <td className="py-2.5 px-3.5">
                              <span className="font-semibold text-zinc-200">Send Template</span>
                              <span className="text-[10px] text-zinc-550 block font-mono">Template: {step.template_name}</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                status === 'completed' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : status === 'failed'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                  : status === 'pending'
                                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                  : 'bg-zinc-800/40 border-zinc-800 text-zinc-550'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-mono text-[10px] text-zinc-350">{scheduledAt}</td>
                            <td className="py-2.5 px-3.5 text-center font-mono text-[10px] text-zinc-350">{completedAt}</td>
                            <td className="py-2.5 px-3.5 text-red-400/90 max-w-[150px] truncate" title={errorText}>{errorText}</td>
                            <td className="py-2.5 px-3.5 text-center">
                              <button
                                onClick={async () => {
                                  if (!selectedWorkflow) return;
                                  const confirmResend = window.confirm(`Queue step ${stepIndex + 1} manually for dispatch?`);
                                  if (!confirmResend) return;
                                  
                                  try {
                                    const { error: insErr } = await supabase
                                      .from('baileys_action_queue')
                                      .insert({
                                        workspace_id: tenantId,
                                        action_type: 'send_template',
                                        payload: {
                                          to: `${selectedExecution.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`,
                                          templateId: step.template_id,
                                          variables: {
                                            Name: selectedExecution.name,
                                            lead_name: selectedExecution.name,
                                            phone: selectedExecution.phone
                                          }
                                        },
                                        status: 'pending',
                                        priority: 3
                                      });

                                    if (insErr) throw insErr;
                                    alert("Step successfully queued!");
                                    fetchData();
                                  } catch (err: any) {
                                    alert(`Failed: ${err.message}`);
                                  }
                                }}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-amber-400 transition-colors mx-auto flex items-center justify-center cursor-pointer"
                                title="Run this step manually"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-755 text-zinc-305 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
