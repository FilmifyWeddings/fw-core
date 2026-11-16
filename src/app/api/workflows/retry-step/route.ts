import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue, buildLeadVariables } from '@/lib/baileys-serverless';
import { calculateSmartAntiBanSchedule } from '@/lib/whatsapp-antiban';
import { fetchWorkspaceQueueItems } from '@/lib/queue-processor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, workflowId, stepIndex, stepIndexes, workspaceId, workflowLogId, delayValue, delayUnit } = body;
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
      ...(lead.raw_payload && typeof lead.raw_payload === 'object' ? lead.raw_payload : {}),
      ...buildLeadVariables(lead),
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

    let finalTargetLogs = targetLogs || [];

    // If step was unsent or not found in logs, dynamically create the missing log on-demand!
    if (finalTargetLogs.length === 0) {
      const targetStepIdx = stepIndex !== undefined ? Number(stepIndex) : 0;
      const currentStep = workflowSteps.find((s: any) => s.sort_index === targetStepIdx) || workflowSteps[0];
      if (!currentStep) {
        return NextResponse.json({ success: false, error: 'Step configuration not found in workflow.' }, { status: 404 });
      }

      const isGroupStep = currentStep?.target_type === 'group' || (currentStep?.target_group_jid && currentStep.target_group_jid.length > 5);
      const targetRecipient = isGroupStep ? currentStep.target_group_jid : cleanPhone;
      const newLogId = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const { data: insertedLog, error: insErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .insert({
          id: newLogId,
          tenant_id: tenantId,
          lead_id: leadId,
          workflow_id: workflowId,
          step_index: currentStep.sort_index ?? targetStepIdx,
          phone_number: targetRecipient,
          template_name: currentStep.template_name,
          status: 'pending',
          sent_at: nowIso,
        })
        .select('*')
        .single();

      if (insErr) throw insErr;
      finalTargetLogs = [insertedLog];

      // Remove skip_auto_trigger if present so lead is active
      if (lead.raw_payload?.skip_auto_trigger) {
        const cleanedPayload = { ...lead.raw_payload };
        delete cleanedPayload.skip_auto_trigger;
        await supabaseAdmin
          .from('leads')
          .update({ raw_payload: cleanedPayload, updated_at: nowIso })
          .eq('id', leadId);
      }
    }

    // 4. Retrieve queue items (paginated so workspaces >1k queue items never duplicate)
    const queueItems = await fetchWorkspaceQueueItems(tenantId, {
      columns: '*',
      statuses: ['failed', 'pending', 'processing', 'cancelled'],
    });

    // 5. Retry ONLY targeted steps with safe Anti-Ban pacing
    // If multiple steps are selected, space them out safely (e.g. 10s + 2-5s random jitter)
    let baseTime = new Date();
    const retriedStepIndices: number[] = [];

    for (let i = 0; i < finalTargetLogs.length; i++) {
      const targetLog = finalTargetLogs[i];
      retriedStepIndices.push(targetLog.step_index);

      // Safe anti-ban delay: immediate (500ms) for 1st step, staggered with calculateSmartAntiBanSchedule for subsequent steps
      let scheduledTimeIso: string;
      if (i === 0) {
        scheduledTimeIso = new Date(baseTime.getTime() + 500).toISOString();
      } else {
        baseTime = calculateSmartAntiBanSchedule(
          baseTime,
          delayValue !== undefined ? Number(delayValue) : 10,
          delayUnit || 'seconds',
          i,
          false
        );
        scheduledTimeIso = baseTime.toISOString();
      }

      // Update ONLY this target step log to pending
      // Preserve targetLog.sent_at (the original time when it was supposed to send)
      const preservedScheduledAt = targetLog.sent_at || scheduledTimeIso;
      const { error: logUpdateErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({
          status: 'pending',
          error_message: null,
          sent_at: preservedScheduledAt,
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
            priority: 1,
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
              workflowId: workflowId,
              leadId: leadId,
              stepIndex: targetLog.step_index,
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
              workflowLogId: targetLog.id,
              workflowId: workflowId,
              leadId: leadId,
              stepIndex: targetLog.step_index,
            },
            status: 'pending',
            attempt_count: 0,
            priority: 1,
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
