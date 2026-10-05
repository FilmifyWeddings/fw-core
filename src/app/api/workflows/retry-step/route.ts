import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, stepIndex, stepIndexes, workspaceId, workflowLogId } = await req.json();
    let tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('tenant_id');

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
      return NextResponse.json({ error: 'Missing required tenant_id/workspaceId parameter' }, { status: 400 });
    }

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

    const workflowSteps: any[] = (workflow.workflow_steps || []).slice().sort(
      (a: any, b: any) => a.sort_index - b.sort_index
    );

    // 3. Find the target step logs
    let targetLogsQuery = supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId);

    if (Array.isArray(stepIndexes) && stepIndexes.length > 0) {
      targetLogsQuery = targetLogsQuery.in('step_index', stepIndexes);
    } else if (workflowLogId) {
      targetLogsQuery = targetLogsQuery.eq('id', workflowLogId);
    } else if (stepIndex !== undefined) {
      targetLogsQuery = targetLogsQuery.eq('step_index', stepIndex);
    } else {
      targetLogsQuery = targetLogsQuery.eq('status', 'failed');
    }

    const { data: targetLogs, error: logErr } = await targetLogsQuery;
    if (logErr) throw logErr;

    if (!targetLogs || targetLogs.length === 0) {
      return NextResponse.json({ success: false, error: 'Step log(s) not found to retry.' }, { status: 404 });
    }

    // 4. Retrieve queue items
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .in('status', ['failed', 'pending', 'processing', 'cancelled']);

    // 5. Retry ONLY targeted steps with safe Anti-Ban pacing
    // If multiple steps are selected, space them out safely (e.g. 10s + 2-5s random jitter)
    let baseTime = new Date();
    const retriedStepIndices: number[] = [];

    for (let i = 0; i < targetLogs.length; i++) {
      const targetLog = targetLogs[i];
      retriedStepIndices.push(targetLog.step_index);

      // Safe anti-ban delay: immediate for 1st step, staggered with jitter for subsequent steps
      let scheduledTimeIso: string;
      if (i === 0) {
        scheduledTimeIso = new Date(baseTime.getTime() + 1000).toISOString();
      } else {
        const antiBanDelayMs = (10 + Math.floor(Math.random() * 6)) * 1000; // 10-15s
        baseTime = new Date(baseTime.getTime() + antiBanDelayMs);
        scheduledTimeIso = baseTime.toISOString();
      }

      // Update ONLY this target step log to pending
      const { error: logUpdateErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'pending',
          error_message: null,
          sent_at: scheduledTimeIso,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetLog.id);

      if (logUpdateErr) console.warn('[retry-step] logUpdateErr for log', targetLog.id, logUpdateErr);

      // Try-catch tracking step update
      try {
        await supabaseAdmin
          .from('workflow_execution_steps')
          .update({ status: 'PENDING', error_message: null, scheduled_at: scheduledTimeIso, updated_at: new Date().toISOString() })
          .eq('lead_id', leadId)
          .eq('workflow_id', workflowId)
          .eq('step_index', targetLog.step_index);
      } catch (e) {}

      // Re-queue or insert in baileys_action_queue
      const matchedQueueItem = (queueItems || []).find(
        (item: any) => item.payload?.workflowLogId === targetLog.id
      );

      const currentStep = workflowSteps.find(s => s.sort_index === targetLog.step_index);
      const isGroupStep = currentStep?.target_type === 'group' || (currentStep?.target_group_jid && currentStep.target_group_jid.length > 5);
      const targetRecipient = isGroupStep ? currentStep.target_group_jid : cleanJid;
      const targetAction = isGroupStep ? 'group_dispatch' : 'send_template';

      if (matchedQueueItem) {
        const { error: qUpdErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,
            error_message: null,
            failure_reason: null,
            next_retry_at: scheduledTimeIso,
            processed_at: null,
            payload: {
              ...(matchedQueueItem.payload || {}),
              templateId: currentStep?.template_id || matchedQueueItem.payload?.templateId,
              template_name: currentStep?.template_name || matchedQueueItem.payload?.template_name,
              templateName: currentStep?.template_name || matchedQueueItem.payload?.template_name,
            }
          })
          .eq('id', matchedQueueItem.id);

        if (qUpdErr) console.warn('[retry-step] qUpdErr:', qUpdErr);
      } else {
        const { error: qInsErr } = await supabaseAdmin
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
              workflowLogId: targetLog.id
            },
            status: 'pending',
            attempt_count: 0,
            priority: 2,
            next_retry_at: scheduledTimeIso
          });

        if (qInsErr) console.warn('[retry-step] qInsErr:', qInsErr);
      }
    }

    // Update parent workflow_executions state to PENDING / RUNNING
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'PENDING', error_message: null, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
    } catch (e) {}

    // Wake queue instantly
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[retry-step] Failed to force-wake queue:', err?.message);
    });

    return NextResponse.json({
      success: true,
      message: `Step(s) [${retriedStepIndices.join(', ')}] re-queued successfully with Anti-Ban pacing. Other steps remained unchanged.`,
      retriedCount: retriedStepIndices.length
    });
  } catch (err: any) {
    console.error('[retry-step API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
