import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, workspaceId } = await req.json();

    if (!leadId || !workflowId || (!workspaceId && !req.nextUrl.searchParams.get('workspace_id'))) {
      return NextResponse.json({ error: 'Missing required parameters: leadId, workflowId, workspaceId' }, { status: 400 });
    }

    const tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id');

    // 1. Fetch pending logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId)
      .eq('status', 'pending');

    if (logsError) throw logsError;

    if (!logs || logs.length === 0) {
      // Even if no pending logs, let's make sure the tracking tables are marked as STOPPED/stopped
      try {
        await supabaseAdmin
          .from('workflow_executions')
          .update({ status: 'STOPPED', updated_at: new Date().toISOString() })
          .eq('lead_id', leadId)
          .eq('workflow_id', workflowId);
        
        await supabaseAdmin
          .from('workflow_execution_steps')
          .update({ status: 'STOPPED', updated_at: new Date().toISOString() })
          .eq('lead_id', leadId)
          .eq('workflow_id', workflowId)
          .eq('status', 'PENDING');
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'No pending steps to stop.' });
    }

    // 2. Fetch both pending and processing queue items for this workspace
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .in('status', ['pending', 'processing']);

    // Update tracking tables (try-catch)
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'STOPPED',
          updated_at: new Date().toISOString()
        })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
    } catch (e) {}

    // 3. Loop through logs, cancel corresponding queue items and mark logs as stopped (failed with STOPPED message)
    for (const log of logs) {
      // Mark log as failed with error 'STOPPED'
      await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'failed',
          error_message: 'STOPPED',
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id);

      try {
        await supabaseAdmin
          .from('workflow_execution_steps')
          .update({
            status: 'STOPPED',
            error_message: 'STOPPED',
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', leadId)
          .eq('workflow_id', workflowId)
          .eq('step_index', log.step_index);
      } catch (e) {}

      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === log.id
      );

      if (matchedQueueItem) {
        // Mark queue action as cancelled
        await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'cancelled',
            error_message: 'Cancelled by user stop action.',
            processed_at: new Date().toISOString()
          })
          .eq('id', matchedQueueItem.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Workflow cancelled. Stopped ${logs.length} pending step(s).`
    });
  } catch (err: any) {
    console.error('[stop API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
