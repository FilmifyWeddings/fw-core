import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, workspaceId } = await req.json();

    if (!leadId || !workflowId || (!workspaceId && !req.nextUrl.searchParams.get('workspace_id'))) {
      return NextResponse.json({ error: 'Missing required parameters: leadId, workflowId, workspaceId' }, { status: 400 });
    }

    const tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id');
    const now = new Date().toISOString();

    // 1. Fetch pending logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, step_index')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId)
      .eq('status', 'pending');

    if (logsError) throw logsError;

    const stoppedLogIds = new Set((logs || []).map(l => l.id));

    // 2. Mark whatsapp_workflow_logs as 'stopped' (NOT 'failed'!)
    if (logs && logs.length > 0) {
      await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'stopped',
          error_message: 'STOPPED',
          updated_at: now
        })
        .in('id', Array.from(stoppedLogIds));
    }

    // 3. Mark workflow_executions & execution_steps as STOPPED
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'STOPPED', updated_at: now })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
      
      await supabaseAdmin
        .from('workflow_execution_steps')
        .update({ status: 'STOPPED', error_message: 'STOPPED', updated_at: now })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId)
        .in('status', ['PENDING', 'pending', 'running', 'SCHEDULED', 'scheduled']);
    } catch (e) {}

    // 4. Mark workflow_runs and step runs as cancelled if any
    try {
      await supabaseAdmin
        .from('workflow_runs')
        .update({ status: 'cancelled', updated_at: now })
        .eq('workflow_id', workflowId)
        .in('status', ['running', 'pending', 'scheduled']);
    } catch (_) {}

    // 5. Mark any pending whatsapp_automation_logs as stopped
    try {
      await supabaseAdmin
        .from('whatsapp_automation_logs')
        .update({ status: 'stopped', updated_at: now })
        .eq('lead_id', leadId)
        .eq('status', 'pending');
    } catch (_) {}

    // 6. Fetch all pending/processing items in baileys_action_queue for this workspace
    // and CANCEL any action linked to this log, workflow, or lead
    let cancelledQueueCount = 0;
    try {
      const { data: queueItems } = await supabaseAdmin
        .from('baileys_action_queue')
        .select('id, payload')
        .eq('workspace_id', tenantId)
        .in('status', ['pending', 'processing']);

      const queueIdsToCancel: string[] = [];

      for (const item of (queueItems || [])) {
        const payload = item.payload || {};
        const matchesLog = payload.workflowLogId && stoppedLogIds.has(payload.workflowLogId);
        const matchesWorkflow = payload.workflowId === workflowId || payload.workflow_id === workflowId;
        const matchesLead = payload.leadId === leadId || payload.lead_id === leadId;

        if (matchesLog || (matchesWorkflow && matchesLead) || (payload.workflowLogId && stoppedLogIds.has(payload.workflowLogId))) {
          queueIdsToCancel.push(item.id);
        }
      }

      if (queueIdsToCancel.length > 0) {
        cancelledQueueCount = queueIdsToCancel.length;
        await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'cancelled',
            error_message: 'Cancelled by user stop action.',
            processed_at: now
          })
          .in('id', queueIdsToCancel);
      }
    } catch (qErr) {
      console.warn('[stop API] baileys_action_queue purge notice:', qErr);
    }

    // 7. Audit log
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: tenantId,
        lead_id: leadId,
        event_type: 'workflow_stopped',
        message: `Workflow stopped for lead ${leadId}. Cancelled ${logs?.length || 0} scheduled step(s) and ${cancelledQueueCount} queued action(s).`,
        metadata: {
          workflow_id: workflowId,
          stopped_steps: logs?.length || 0,
          cancelled_queue_actions: cancelledQueueCount,
          stopped_at: now
        }
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Workflow cancelled. Stopped ${logs?.length || 0} pending step(s) and purged ${cancelledQueueCount} queued messages.`
    });
  } catch (err: any) {
    console.error('[stop API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
