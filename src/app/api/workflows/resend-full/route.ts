import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, workspaceId } = await req.json();

    if (!leadId || !workflowId || (!workspaceId && !req.nextUrl.searchParams.get('workspace_id'))) {
      return NextResponse.json({ error: 'Missing required parameters: leadId, workflowId, workspaceId' }, { status: 400 });
    }

    const tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id');

    // 1. Fetch custom workflow definition
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) throw new Error('Workflow configuration not found.');

    // 2. Fetch lead details
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

    // 3. Fetch existing logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId);

    if (logsError) throw logsError;

    // 4. Retrieve queue items
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .in('status', ['failed', 'pending', 'processing', 'done']);

    // 5. Calculate cumulative scheduling starting from NOW
    const workflowSteps: any[] = (workflow.workflow_steps || []).slice().sort(
      (a: any, b: any) => a.sort_index - b.sort_index
    );

    const stepScheduleMap = new Map<number, string>();
    let driftTime = new Date(); // baseline = NOW()
    
    for (const step of workflowSteps) {
      if (step.delay_unit === 'seconds' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 1000);
      } else if (step.delay_unit === 'minutes' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 60 * 1000);
      } else if (step.delay_unit === 'hours' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 3600 * 1000);
      } else if (step.delay_unit === 'days' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 24 * 3600 * 1000);
      }
      stepScheduleMap.set(step.sort_index, driftTime.toISOString());
    }

    // Update tracking tables (try-catch)
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'PENDING', error_message: null, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
    } catch (e) {}

    // 6. Reset each step log and queue item
    for (const step of workflowSteps) {
      const stepScheduledAt = stepScheduleMap.get(step.sort_index) || new Date().toISOString();
      const matchedLog = (logs || []).find((l: any) => l.step_index === step.sort_index);

      let logId = matchedLog?.id;

      if (matchedLog) {
        // Reset existing log to pending
        const { error: logUpdErr } = await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({
            status: 'pending',
            error_message: null,
            sent_at: stepScheduledAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedLog.id);

        if (logUpdErr) throw logUpdErr;
      } else {
        // Create log if missing
        logId = crypto.randomUUID();
        const { error: logInsErr } = await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .insert({
            id: logId,
            tenant_id: tenantId,
            lead_id: leadId,
            workflow_id: workflowId,
            step_index: step.sort_index,
            phone_number: cleanPhone,
            template_name: step.template_name,
            status: 'pending',
            sent_at: stepScheduledAt
          });

        if (logInsErr) throw logInsErr;
      }

      try {
        // Reset or insert execution steps tracking
        await supabaseAdmin
          .from('workflow_execution_steps')
          .upsert({
            lead_id: leadId,
            workflow_id: workflowId,
            step_index: step.sort_index,
            status: 'PENDING',
            error_message: null,
            scheduled_at: stepScheduledAt,
            updated_at: new Date().toISOString()
          }, { onConflict: 'lead_id,workflow_id,step_index' });
      } catch (e) {}

      // Reset or insert queue item
      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === logId
      );

      if (matchedQueueItem) {
        const { error: qUpdErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,
            error_message: null,
            failure_reason: null,
            next_retry_at: stepScheduledAt,
            processed_at: null
          })
          .eq('id', matchedQueueItem.id);

        if (qUpdErr) throw qUpdErr;
      } else {
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
              workflowLogId: logId
            },
            status: 'pending',
            attempt_count: 0,
            priority: 2,
            next_retry_at: stepScheduledAt
          });

        if (qInsErr) throw qInsErr;
      }
    }

    // 7. Wake queue processor
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[resend-full] Failed to force-wake queue:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Full workflow reset and execution restarted from Step 1.'
    });
  } catch (err: any) {
    console.error('[resend-full API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
