import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * DELETE CONTACT ENDPOINT
 * ========================
 * BRAHMASTRA ISOLATION RULE: This endpoint purges ONLY the execution history
 * (whatsapp_workflow_logs + baileys_action_queue rows) for a specific
 * lead+workflow combination.
 *
 * The master lead record in public.leads is NEVER touched.
 * This allows the contact to re-enter the workflow sequence fresh
 * on next sync without losing CRM data.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { leadId, workflowId } = await req.json();

    if (!leadId || !workflowId) {
      return NextResponse.json(
        { error: 'Missing leadId or workflowId parameters. Both are required.' },
        { status: 400 }
      );
    }

    // ── 1. Fetch all workflow log IDs for this exact lead+workflow combination ──
    // Tenant-scoped query (Law 1 compliance)
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id')
      .eq('lead_id', leadId)
      .eq('workflow_id', workflowId)   // MUST match workflow_id — isolated purge
      .eq('tenant_id', tenantId);

    if (logsError) throw logsError;

    const logIds = (logs || []).map((l: any) => l.id);

    // ── 2. Purge matching baileys_action_queue rows ──────────────────────────────
    // Only delete queue items whose payload.workflowLogId references our log IDs
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
          .in('id', toDelete.map((i: any) => i.id));

        if (qDelErr) throw qDelErr;
      }

      // ── 3. Purge workflow log rows ──────────────────────────────────────────────
      const { error: logDelErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .delete()
        .in('id', logIds);

      if (logDelErr) throw logDelErr;
    }

    // ── IMPORTANT: The master `public.leads` record is NEVER deleted here. ──────
    // The lead remains in the CRM. Next time the workflow sync trigger fires for
    // this lead, it will detect no existing enrollment and create a fresh sequence.

    return NextResponse.json({
      success: true,
      deletedLogCount: logIds.length,
      message: `Workflow execution logs cleared for contact. The lead CRM record is preserved. Re-syncing the contact will restart the workflow sequence from the beginning.`
    });

  } catch (err: any) {
    console.error('[delete-contact] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
