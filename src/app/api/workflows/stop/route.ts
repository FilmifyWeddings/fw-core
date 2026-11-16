import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { leadId, workflowId, workspaceId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required parameter: leadId' }, { status: 400 });
    }

    const tenantId = workspaceId || req.nextUrl.searchParams.get('workspace_id');
    const now = new Date().toISOString();

    // 1. Fetch lead details to obtain phone and current raw_payload
    const { data: leadData } = await supabaseAdmin
      .from('leads')
      .select('id, phone, mobile, raw_payload, workspace_id, user_id, whatsapp_group_id')
      .eq('id', leadId)
      .maybeSingle();

    const effectiveTenant = tenantId || leadData?.workspace_id || leadData?.user_id;
    const rawPhone = leadData?.phone || leadData?.mobile || leadData?.raw_payload?.phone || leadData?.raw_payload?.mobile || '';
    const cleanDigits = String(rawPhone).replace(/\D/g, '');
    const last10Phone = cleanDigits.slice(-10);

    // 1.5. Find or create default "⛔ Stopped / Opt-out" contact group for the workspace
    let stoppedGroupId: string | null = null;
    if (effectiveTenant) {
      try {
        const { data: existingStopGroup } = await supabaseAdmin
          .from('whatsapp_contact_groups')
          .select('id')
          .eq('tenant_id', effectiveTenant)
          .ilike('group_name', '%stop%')
          .maybeSingle();

        if (existingStopGroup) {
          stoppedGroupId = existingStopGroup.id;
        } else {
          const { data: newStopGroup } = await supabaseAdmin
            .from('whatsapp_contact_groups')
            .insert({
              tenant_id: effectiveTenant,
              group_name: '⛔ Stopped / Opt-out'
            })
            .select('id')
            .maybeSingle();
          if (newStopGroup) stoppedGroupId = newStopGroup.id;
        }
      } catch (grpErr) {
        console.warn('[stop API] Notice fetching/creating stopped group:', grpErr);
      }
    }

    // 2. Persistently move lead to Stopped group & flag as STOPPED
    if (leadData) {
      const existingPayload = leadData.raw_payload || {};
      await supabaseAdmin
        .from('leads')
        .update({
          whatsapp_group_id: stoppedGroupId,
          raw_payload: {
            ...existingPayload,
            previous_group_id: leadData.whatsapp_group_id,
            stop_followup: true,
            workflow_status: 'stopped',
            skip_auto_trigger: true,
            followup_stopped_at: now
          },
          updated_at: now
        })
        .eq('id', leadId);
    }

    // 3. Fetch all active/pending/scheduled workflow logs for this lead
    let logsQuery = supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, step_index, workflow_id')
      .eq('lead_id', leadId)
      .in('status', ['pending', 'queued', 'scheduled', 'processing', 'retrying']);

    if (workflowId) {
      logsQuery = logsQuery.eq('workflow_id', workflowId);
    }

    const { data: logs } = await logsQuery;
    const stoppedLogIds = new Set((logs || []).map(l => l.id));

    // 4. Mark whatsapp_workflow_logs as 'stopped'
    let logsUpdateQuery = supabaseAdmin
      .from('whatsapp_workflow_logs')
      .update({
        status: 'stopped',
        error_message: 'STOPPED',
        updated_at: now
      })
      .eq('lead_id', leadId)
      .in('status', ['pending', 'queued', 'scheduled', 'processing', 'retrying']);

    if (workflowId) {
      logsUpdateQuery = logsUpdateQuery.eq('workflow_id', workflowId);
    }
    await logsUpdateQuery;

    // 5. Mark workflow_executions & execution_steps as STOPPED
    try {
      let weq = supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'STOPPED', updated_at: now })
        .eq('lead_id', leadId);
      if (workflowId) weq = weq.eq('workflow_id', workflowId);
      await weq;

      let wesq = supabaseAdmin
        .from('workflow_execution_steps')
        .update({ status: 'STOPPED', error_message: 'STOPPED', updated_at: now })
        .eq('lead_id', leadId)
        .in('status', ['PENDING', 'pending', 'running', 'SCHEDULED', 'scheduled']);
      if (workflowId) wesq = wesq.eq('workflow_id', workflowId);
      await wesq;
    } catch (_) {}

    // 6. Mark workflow_runs as cancelled
    try {
      let wrq = supabaseAdmin
        .from('workflow_runs')
        .update({ status: 'cancelled', updated_at: now })
        .in('status', ['running', 'pending', 'scheduled']);
      if (workflowId) wrq = wrq.eq('workflow_id', workflowId);
      await wrq;
    } catch (_) {}

    // 7. Mark any pending whatsapp_automation_logs as stopped
    try {
      await supabaseAdmin
        .from('whatsapp_automation_logs')
        .update({ status: 'stopped', updated_at: now })
        .eq('lead_id', leadId)
        .eq('status', 'pending');
    } catch (_) {}

    // 8. CANCEL all pending/processing actions in baileys_action_queue matching:
    // - payload.workflowLogId in stoppedLogIds
    // - payload.leadId === leadId
    // - payload.to containing cleanPhone
    // (Notice: ZERO workspace_id mismatch filter! Cancels across workspace variants safely)
    let cancelledQueueCount = 0;
    try {
      const queueItems: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabaseAdmin
          .from('baileys_action_queue')
          .select('id, payload')
          .in('status', ['pending', 'processing'])
          .range(from, from + 999);
        if (!page || page.length === 0) break;
        queueItems.push(...page);
        if (page.length < 1000) break;
      }

      const queueIdsToCancel: string[] = [];

      for (const item of queueItems) {
        const payload = item.payload || {};
        const matchesLog = payload.workflowLogId && stoppedLogIds.has(payload.workflowLogId);
        const matchesWorkflow = !workflowId || payload.workflowId === workflowId || payload.workflow_id === workflowId;
        const matchesLead =
          payload.leadId === leadId ||
          payload.lead_id === leadId ||
          payload.variables?.id === leadId ||
          payload.variables?.lead_id === leadId;

        let matchesPhone = false;
        if (cleanDigits && cleanDigits.length >= 8) {
          const toStr = String(payload.to || payload.recipient || payload.phone || '');
          if (toStr.includes(cleanDigits) || (last10Phone.length >= 8 && toStr.includes(last10Phone))) {
            matchesPhone = true;
          }
        }

        if (matchesLog || matchesLead || (matchesWorkflow && matchesPhone)) {
          queueIdsToCancel.push(item.id);
        }
      }

      if (queueIdsToCancel.length > 0) {
        cancelledQueueCount = queueIdsToCancel.length;
        const { error: cancelErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'cancelled',
            error_message: 'Cancelled by user stop action.',
            processed_at: now
          })
          .in('id', queueIdsToCancel);

        if (cancelErr) {
          console.warn('[stop API] Update to cancelled rejected by DB constraint; deleting queue items:', cancelErr.message);
          await supabaseAdmin
            .from('baileys_action_queue')
            .delete()
            .in('id', queueIdsToCancel);
        }
      }
    } catch (qErr) {
      console.warn('[stop API] baileys_action_queue purge notice:', qErr);
    }

    // 9. Audit log in live_logs
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: tenantId || leadData?.workspace_id || leadData?.user_id,
        lead_id: leadId,
        event_type: 'workflow_stopped',
        message: `Workflow stopped for contact ${cleanPhone || leadId}. Cancelled ${logs?.length || 0} scheduled step(s) and ${cancelledQueueCount} queued action(s).`,
        metadata: {
          workflow_id: workflowId,
          phone: cleanPhone,
          stopped_steps: logs?.length || 0,
          cancelled_queue_actions: cancelledQueueCount,
          stopped_at: now
        }
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Workflow stopped. Cancelled ${logs?.length || 0} pending step(s) and purged ${cancelledQueueCount} queued message(s).`
    });
  } catch (err: any) {
    console.error('[stop API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
