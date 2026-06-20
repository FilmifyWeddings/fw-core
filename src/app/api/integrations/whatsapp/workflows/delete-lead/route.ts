import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId parameter' }, { status: 400 });
    }

    // 1. Fetch all workflow logs for this lead
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId);

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

    // 3. Delete the lead from leads table (enforcing tenant isolation)
    const { error: leadDelErr } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('workspace_id', tenantId);

    if (leadDelErr) throw leadDelErr;

    return NextResponse.json({
      success: true,
      message: 'Contact and all associated workflow execution history deleted successfully.'
    });

  } catch (err: any) {
    console.error('Delete lead error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
