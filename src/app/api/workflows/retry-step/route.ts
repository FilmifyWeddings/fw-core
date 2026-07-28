import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, stepIndex, workspaceId, workflowLogId } = await req.json();

    if (!leadId || !workflowId || (!workspaceId && !req.nextUrl.searchParams.get('workspace_id'))) {
      return NextResponse.json({ error: 'Missing required parameters: leadId, workflowId, workspaceId' }, { status: 400 });
    }

    const tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id');

    // 1. Find the target step log
    let query = supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId);

    if (workflowLogId) {
      query = query.eq('id', workflowLogId);
    } else if (stepIndex !== undefined) {
      query = query.eq('step_index', stepIndex);
    } else {
      query = query.eq('status', 'failed');
    }

    const { data: targetLogs, error: logErr } = await query;
    if (logErr) throw logErr;

    if (!targetLogs || targetLogs.length === 0) {
      return NextResponse.json({ success: false, error: 'Step log not found to retry.' }, { status: 404 });
    }

    const targetLog = targetLogs[0];

    // 2. Fetch custom workflow definition
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (wfError || !workflow) throw new Error('Workflow configuration not found.');

    // 3. Fetch lead details
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

    // 4. Retrieve queue items
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .in('status', ['failed', 'pending', 'processing']);

    // 5. Calculate cumulative scheduling starting from the retried step
    const workflowSteps: any[] = (workflow.workflow_steps || []).slice().sort(
      (a: any, b: any) => a.sort_index - b.sort_index
    );

    const stepScheduleMap = new Map<number, string>();
    let driftTime = new Date(); // baseline = NOW()
    
    // We only drift from the target log's step_index onwards
    for (const step of workflowSteps) {
      if (step.sort_index < targetLog.step_index) {
        continue;
      }
      if (step.delay_unit === 'seconds' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 1000);
      } else if (step.delay_unit === 'hours' && step.delay_value > 0) {
        driftTime = new Date(driftTime.getTime() + step.delay_value * 3600 * 1000);
      }
      stepScheduleMap.set(step.sort_index, driftTime.toISOString());
    }

    // 6. Update the target log and recycle or insert queue item
    const newScheduledAt = stepScheduleMap.get(targetLog.step_index) || new Date().toISOString();

    const { error: logUpdateErr } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .update({
        status: 'pending',
        error_message: null,
        sent_at: newScheduledAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetLog.id);

    if (logUpdateErr) throw logUpdateErr;

    // Try-catch for workflow_executions tracking table (updates UI badge state immediately to RUNNING/PENDING)
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'PENDING', error_message: null, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId);
      
      await supabaseAdmin
        .from('workflow_execution_steps')
        .update({ status: 'PENDING', error_message: null, scheduled_at: newScheduledAt, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId)
        .eq('step_index', targetLog.step_index);
    } catch (e) {
      console.warn('[retry-step] workflow_executions update skipped or failed:', e);
    }

    const matchedQueueItem = (queueItems || []).find(
      (item: any) => item.payload?.workflowLogId === targetLog.id
    );

    if (matchedQueueItem) {
      const { error: qUpdErr } = await supabaseAdmin
        .from('baileys_action_queue')
        .update({
          status: 'pending',
          attempt_count: 0,
          error_message: null,
          failure_reason: null,
          next_retry_at: newScheduledAt,
          processed_at: null
        })
        .eq('id', matchedQueueItem.id);

      if (qUpdErr) throw qUpdErr;
    } else {
      const { error: qInsErr } = await supabaseAdmin
        .from('baileys_action_queue')
        .insert({
          workspace_id: tenantId,
          action_type: 'send_template',
          payload: {
            to: cleanJid,
            templateId: workflowSteps.find(s => s.sort_index === targetLog.step_index)?.template_id,
            variables: v_variables,
            workflowLogId: targetLog.id
          },
          status: 'pending',
          attempt_count: 0,
          priority: 2,
          next_retry_at: newScheduledAt
        });

      if (qInsErr) throw qInsErr;
    }

    // 7. Sequentially update subsequent step schedules if they are pending/failed
    // This allows sequential execution to resume properly
    for (const step of workflowSteps) {
      if (step.sort_index <= targetLog.step_index) continue;

      const { data: subLogs } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .select('*')
        .eq('lead_id', leadId)
        .eq('workflow_id', workflowId)
        .eq('step_index', step.sort_index);

      if (subLogs && subLogs.length > 0) {
        const subLog = subLogs[0];
        const subScheduledAt = stepScheduleMap.get(step.sort_index) || new Date().toISOString();

        // Update the log timestamp
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({
            sent_at: subScheduledAt,
            status: 'pending',
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', subLog.id);

        try {
          await supabaseAdmin
            .from('workflow_execution_steps')
            .update({
              status: 'PENDING',
              error_message: null,
              scheduled_at: subScheduledAt,
              updated_at: new Date().toISOString()
            })
            .eq('lead_id', leadId)
            .eq('workflow_id', workflowId)
            .eq('step_index', step.sort_index);
        } catch (e) {}

        const matchedSubQueueItem = (queueItems || []).find(
          (item: any) => item.payload?.workflowLogId === subLog.id
        );

        if (matchedSubQueueItem) {
          await supabaseAdmin
            .from('baileys_action_queue')
            .update({
              status: 'pending',
              attempt_count: 0,
              error_message: null,
              failure_reason: null,
              next_retry_at: subScheduledAt,
              processed_at: null
            })
            .eq('id', matchedSubQueueItem.id);
        }
      }
    }

    // 8. Wake queue instantly
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[retry-step] Failed to force-wake queue:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: `Step ${targetLog.step_index} retry triggered, sequential schedules updated.`
    });
  } catch (err: any) {
    console.error('[retry-step API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
