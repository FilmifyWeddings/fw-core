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

    // 1. Fetch stopped logs for this lead and workflow
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId)
      .eq('error_message', 'STOPPED');

    if (logsError) throw logsError;

    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, message: 'No stopped steps found to resume.' });
    }

    // 2. Fetch workflow definition
    const { data: workflow } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('*')
      .eq('id', workflowId)
      .maybeSingle();

    const workflowSteps: any[] = workflow?.workflow_steps || [];

    // 3. Fetch lead details for variables
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    const cleanPhone = (lead?.phone || '').replace(/[^0-9]/g, '');
    const cleanJid = `${cleanPhone}@s.whatsapp.net`;
    const v_variables = {
      Name: lead?.name || 'Guest',
      Name_1: lead?.name || 'Guest',
      lead_name: lead?.name || 'Guest',
      phone: lead?.phone || '',
      email: lead?.email || '',
      ...(lead?.raw_payload && typeof lead.raw_payload === 'object' ? lead.raw_payload : {})
    };

    // 4. Retrieve existing queue items
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId);

    const nowTime = Date.now();
    let futureResumedCount = 0;
    let pastSkippedCount = 0;

    for (const log of logs) {
      const scheduledTime = new Date(log.sent_at).getTime();

      // If scheduled time already passed while stopped, skip it (do not send outdated messages)
      if (scheduledTime < nowTime) {
        pastSkippedCount++;
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({
            status: 'failed',
            error_message: 'EXPIRED_WHILE_STOPPED',
            updated_at: new Date().toISOString()
          })
          .eq('id', log.id);

        try {
          await supabaseAdmin
            .from('workflow_execution_steps')
            .update({
              status: 'FAILED',
              error_message: 'EXPIRED_WHILE_STOPPED',
              updated_at: new Date().toISOString()
            })
            .eq('lead_id', leadId)
            .eq('workflow_id', workflowId)
            .eq('step_index', log.step_index);
        } catch (e) {}
        continue;
      }

      // Step is scheduled in the future: Unstop and return to pending!
      futureResumedCount++;
      await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id);

      try {
        await supabaseAdmin
          .from('workflow_execution_steps')
          .update({
            status: 'PENDING',
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', leadId)
          .eq('workflow_id', workflowId)
          .eq('step_index', log.step_index);
      } catch (e) {}

      // Re-queue in baileys_action_queue
      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === log.id
      );

      const currentStep = workflowSteps.find(s => s.sort_index === log.step_index);
      const isGroupStep = currentStep?.target_type === 'group' || (currentStep?.target_group_jid && currentStep.target_group_jid.length > 5);
      const targetRecipient = isGroupStep ? currentStep.target_group_jid : cleanJid;
      const targetAction = isGroupStep ? 'group_dispatch' : 'send_template';

      if (matchedQueueItem) {
        await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,
            error_message: null,
            failure_reason: null,
            next_retry_at: log.sent_at,
            processed_at: null
          })
          .eq('id', matchedQueueItem.id);
      } else {
        await supabaseAdmin
          .from('baileys_action_queue')
          .insert({
            workspace_id: tenantId,
            action_type: targetAction,
            payload: {
              to: targetRecipient,
              groupJid: isGroupStep ? targetRecipient : undefined,
              groupId: isGroupStep ? targetRecipient : undefined,
              templateId: currentStep?.template_id,
              template_name: currentStep?.template_name,
              templateName: currentStep?.template_name,
              variables: v_variables,
              leadData: v_variables,
              workflowLogId: log.id
            },
            status: 'pending',
            attempt_count: 0,
            priority: 2,
            next_retry_at: log.sent_at
          });
      }
    }

    // Update workflow_executions tracking state
    try {
      const newStatus = futureResumedCount > 0 ? 'RUNNING' : 'COMPLETED';
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: newStatus, error_message: null, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
    } catch (e) {}

    // Wake queue
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[resume] Failed to force-wake queue:', err?.message);
    });

    return NextResponse.json({
      success: true,
      message: `Workflow unstopped/resumed. Resumed ${futureResumedCount} upcoming step(s), skipped ${pastSkippedCount} past step(s).`,
      resumedCount: futureResumedCount,
      skippedCount: pastSkippedCount
    });
  } catch (err: any) {
    console.error('[resume API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
