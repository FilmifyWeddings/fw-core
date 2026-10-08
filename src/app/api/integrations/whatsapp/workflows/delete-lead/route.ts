import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const rawIds = body.leadIds || (body.leadId ? [body.leadId] : []);
    const targetLeadIds = (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean);

    if (targetLeadIds.length === 0) {
      return NextResponse.json({ error: 'Missing leadId or leadIds parameter' }, { status: 400 });
    }

    // 1. Fetch leads first to capture phone numbers before deletion
    const { data: targetLeads } = await supabaseAdmin
      .from('leads')
      .select('id, phone')
      .in('id', targetLeadIds)
      .eq('workspace_id', tenantId);

    const cleanPhones = (targetLeads || [])
      .map(l => (l.phone || '').replace(/[^0-9]/g, ''))
      .filter(p => p.length >= 7);

    // 2. Fetch all workflow logs for these leads
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id')
      .in('lead_id', targetLeadIds)
      .eq('tenant_id', tenantId);

    const logIds = (logs || []).map(l => l.id);

    // 3. Purge matching queue items from baileys_action_queue by workflowLogId, leadId, or phone
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('id, payload')
      .eq('workspace_id', tenantId)
      .in('status', ['pending', 'failed', 'processing']);

    const queueIdsToDelete = (queueItems || []).filter((item: any) => {
      const p = item.payload || {};
      const qWfLogId = p.workflowLogId;
      const qLeadId = p.leadId || p.lead_id;
      const qPhone = String(p.to || p.recipient || p.phone || '').replace(/@.*$/, '').replace(/[^0-9]/g, '');

      const matchesLog = qWfLogId && logIds.includes(qWfLogId);
      const matchesLead = qLeadId && targetLeadIds.includes(qLeadId);
      const matchesPhone = qPhone && cleanPhones.includes(qPhone);

      return matchesLog || matchesLead || matchesPhone;
    }).map(i => i.id);

    if (queueIdsToDelete.length > 0) {
      const { error: qDelErr } = await supabaseAdmin
        .from('baileys_action_queue')
        .delete()
        .in('id', queueIdsToDelete);

      if (qDelErr) console.warn('[delete-lead] Queue delete warning:', qDelErr.message);
    }

    // 4. Delete from whatsapp_workflow_logs
    if (logIds.length > 0) {
      const { error: logDelErr } = await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .delete()
        .in('id', logIds);

      if (logDelErr) console.warn('[delete-lead] Logs delete warning:', logDelErr.message);
    }

    // 5. Delete from leads table (enforcing tenant isolation)
    const { error: leadDelErr } = await supabaseAdmin
      .from('leads')
      .delete()
      .in('id', targetLeadIds)
      .eq('workspace_id', tenantId);

    if (leadDelErr) throw leadDelErr;

    // Also attempt deletion from client_leads if any mirrored records exist
    try {
      await supabaseAdmin
        .from('client_leads')
        .delete()
        .in('id', targetLeadIds);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetLeadIds.length} contact(s) and purged all queued WhatsApp messages.`,
      purgedQueueCount: queueIdsToDelete.length,
      purgedLogsCount: logIds.length
    });

  } catch (err: any) {
    console.error('Delete lead error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
