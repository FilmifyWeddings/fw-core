import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { leadId, workflowId, workflowLogId } = await req.json();

    if (!leadId || !workflowId) {
      return NextResponse.json({ error: 'Missing leadId or workflowId parameters' }, { status: 400 });
    }

    // 1. Fetch all workflow logs for this lead and workflow
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId);

    if (logsError) throw logsError;

    // Filter logs that are failed OR pending with a temporary error (stuck in retry queue)
    const retriableLogs = (logs || []).filter(log => {
      if (workflowLogId) {
        return log.id === workflowLogId;
      }
      return log.status === 'failed' || (log.status === 'pending' && log.error_message);
    });

    if (retriableLogs.length === 0) {
      return NextResponse.json({ success: true, message: 'No failed or stuck steps found to retry.' });
    }

    // 2. Fetch workflow steps config
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('workflow_steps')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) throw new Error('Workflow configuration not found.');

    // Fetch the lead's current info
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) throw new Error('Lead not found.');

    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const cleanJid = `${cleanPhone}@s.whatsapp.net`;

    const v_variables = {
      Name: lead.name || 'Guest',
      Name_1: lead.name || 'Guest',
      lead_name: lead.name || 'Guest',
      phone: lead.phone || '',
      email: lead.email || '',
      ...(lead.raw_payload && typeof lead.raw_payload === 'object' ? lead.raw_payload : {})
    };

    // Fetch both failed and pending queue items for this workspace
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .in('status', ['failed', 'pending']);

    for (const log of retriableLogs) {
      const step = (workflow.workflow_steps || []).find((s: any) => s.sort_index === log.step_index);
      if (!step) continue;

      // Update step log to pending and reset execution timestamps
      const { error: updErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'pending',
          error_message: null,
          sent_at: new Date().toISOString(), // Reset execution timestamp to NOW
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id);

      if (updErr) throw updErr;

      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === log.id
      );

      if (matchedQueueItem) {
        // Recycle the existing queue item back to pending
        const { error: qUpdErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,
            error_message: null,
            next_retry_at: new Date().toISOString(), // Immediate dispatch
            processed_at: null
          })
          .eq('id', matchedQueueItem.id);

        if (qUpdErr) throw qUpdErr;
      } else {
        // Create a new queue item if it was somehow missing
        const { error: qInsErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .insert({
            workspace_id: tenantId,
            action_type: 'send_template',
            payload: {
              to: cleanJid,
              templateId: step.template_id,
              variables: v_variables,
              workflowLogId: log.id
            },
            status: 'pending',
            priority: 2,
            next_retry_at: new Date().toISOString()
          });

        if (qInsErr) throw qInsErr;
      }
    }

    // 3. Force-wake the queue processor instantly
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[retry-api] Failed to force-wake queue:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: `Retried ${retriableLogs.length} step(s).`
    });

  } catch (err: any) {
    console.error('Retry failed steps error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
