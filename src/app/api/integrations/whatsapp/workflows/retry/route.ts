import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  try {
    const body = await req.json();
    const { leadId, workflowId, workflowLogId } = body || {};

    if (!tenantId || tenantId.trim() === '' || tenantId === 'null' || tenantId === 'undefined') {
      tenantId = body?.workspace_id || body?.tenant_id || body?.user_id;
    }

    if (!tenantId || tenantId.trim() === '' || tenantId === 'null' || tenantId === 'undefined') {
      if (workflowId) {
        const { data: wf } = await supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('tenant_id, workspace_id, user_id')
          .eq('id', workflowId)
          .maybeSingle();
        if (wf) {
          tenantId = wf.tenant_id || wf.workspace_id || wf.user_id;
        }
      }
      if (!tenantId && leadId) {
        const { data: ld } = await supabaseAdmin
          .from('leads')
          .select('workspace_id')
          .eq('id', leadId)
          .maybeSingle();
        if (ld) {
          tenantId = ld.workspace_id;
        }
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id parameter and could not resolve workspace owner' }, { status: 400 });
    }

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
      .in('status', ['failed', 'pending', 'processing']);

    // SEQUENTIAL DRIFT: Build a sorted list of workflow steps to compute cumulative delays
    // This mirrors the PostgreSQL trigger logic: each step's time = previous step's time + its own delay
    const workflowSteps: any[] = (workflow.workflow_steps || []).slice().sort(
      (a: any, b: any) => a.sort_index - b.sort_index
    );

    // Pre-compute a map of step sort_index → scheduled_at using the same drift algorithm
    const stepScheduleMap = new Map<number, string>();
    let driftTime = new Date(); // baseline = NOW()
    for (const step of workflowSteps) {
      if (step.delay_unit === 'seconds' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 1000);
      } else if (step.delay_unit === 'hours' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 3600 * 1000);
      }
      stepScheduleMap.set(step.sort_index, driftTime.toISOString());
    }

    for (const log of retriableLogs) {
      const step = workflowSteps.find((s: any) => s.sort_index === log.step_index);
      if (!step) continue;

      // Get the sequentially-computed scheduled time for this step
      const newScheduledAt = stepScheduleMap.get(log.step_index) || new Date().toISOString();

      // Update step log to pending with fresh sequential timestamp
      const { error: updErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'pending',
          error_message: null,
          sent_at: newScheduledAt, // Progressive sequential time
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id);

      if (updErr) throw updErr;

      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === log.id
      );

      if (matchedQueueItem) {
        // Recycle the existing queue item back to pending with sequential scheduled time
        const { error: qUpdErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,          // Reset attempts per Sushant's mandate
            error_message: null,
            next_retry_at: newScheduledAt, // Use sequential drift time
            processed_at: null
          })
          .eq('id', matchedQueueItem.id);

        if (qUpdErr) throw qUpdErr;
      } else {
        // Create a new queue item if it was somehow missing
        const isGroupStep = step.target_type === 'group' || (step.target_group_jid && step.target_group_jid.length > 5);
        const targetRecipient = isGroupStep ? step.target_group_jid : cleanJid;
        const targetAction = isGroupStep ? 'group_dispatch' : 'send_template';

        const { error: qInsErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .insert({
            workspace_id: tenantId,
            action_type: targetAction,
            payload: {
              to: targetRecipient,
              groupJid: isGroupStep ? targetRecipient : undefined,
              groupId: isGroupStep ? targetRecipient : undefined,
              templateId: step.template_id,
              template_name: step.template_name,
              variables: v_variables,
              leadData: v_variables,
              workflowLogId: log.id
            },
            status: 'pending',
            attempt_count: 0,
            priority: 2,
            next_retry_at: newScheduledAt  // Sequential drift time for new items too
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
