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
    const { leadId, workflowId } = await req.json();

    if (!leadId || !workflowId) {
      return NextResponse.json({ error: 'Missing leadId or workflowId parameters' }, { status: 400 });
    }

    // 1. Fetch all workflow log IDs for this lead and workflow
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId);

    if (logsError) throw logsError;

    const logIds = (logs || []).map(l => l.id);

    // 2. Delete matching queue items from baileys_action_queue
    if (logIds.length > 0) {
      const { data: queueItems } = await supabaseAdmin
        .from('baileys_action_queue')
        .select('id, payload')
        .eq('workspace_id', tenantId)
        .in('status', ['pending', 'failed', 'processing']);

      const toDelete = (queueItems || []).filter(
        (item: any) => item.payload?.workflowLogId && logIds.includes(item.payload.workflowLogId)
      );

      if (toDelete.length > 0) {
        const { error: qDelErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .delete()
          .in('id', toDelete.map(i => i.id));

        if (qDelErr) throw qDelErr;
      }

      // Delete from whatsapp_workflow_logs
      const { error: logDelErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .delete()
        .in('id', logIds);

      if (logDelErr) throw logDelErr;
    }

    // 3. Fetch lead details to reload
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) throw new Error('Lead not found.');

    const originalGroup = lead.whatsapp_group_id;

    if (originalGroup) {
      // Toggle group ID to null and then back to trigger the postgres trigger afresh starting from NOW
      const { error: updateNullErr } = await supabaseAdmin
        .from('leads')
        .update({ whatsapp_group_id: null })
        .eq('id', leadId);

      if (updateNullErr) throw updateNullErr;

      const { error: updateGroupErr } = await supabaseAdmin
        .from('leads')
        .update({ whatsapp_group_id: originalGroup })
        .eq('id', leadId);

      if (updateGroupErr) throw updateGroupErr;
    }

    // 4. Force-wake the queue processor instantly
    forceWakeQueue(supabaseAdmin, tenantId).catch(err => {
      console.error('[resend-api] Failed to force-wake queue:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow successfully restarted and queued.'
    });

  } catch (err: any) {
    console.error('Resend workflow error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
