import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await context.params;
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const moveToTrash = body.moveToTrash !== false;
    const restore = body.restore === true;
    const clientName = body.clientName;
    const nowIso = new Date().toISOString();

    // 1. Locate linked workspace client
    const { data: clients } = await supabaseAdmin
      .from('workspace_clients')
      .select('id, name, notes')
      .or(`lead_id.eq.${leadId},id.eq.${leadId}`);

    const targetClient = clients?.[0];
    const resolvedClientId = targetClient?.id || null;

    if (restore) {
      // RESTORE FLOW
      if (resolvedClientId) {
        const cleanNotes = (targetClient?.notes || '').replace(/\[status:trash\]/g, '').trim();

        await supabaseAdmin
          .from('workspace_clients')
          .update({
            status: 'active',
            is_deleted: false,
            deleted_at: null,
            notes: cleanNotes,
            updated_at: nowIso
          })
          .eq('id', resolvedClientId);

        await supabaseAdmin
          .from('client_finance_records')
          .update({
            status: 'active',
            is_deleted: false,
            deleted_at: null,
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);

        await supabaseAdmin
          .from('post_production_projects')
          .update({
            overall_status: 'active',
            is_deleted: false,
            deleted_at: null,
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);

        await supabaseAdmin
          .from('fw_projects')
          .update({
            status: 'active',
            is_archived: false,
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);
      }

      if (clientName) {
        await supabaseAdmin
          .from('fw_projects')
          .update({
            status: 'active',
            is_archived: false,
            updated_at: nowIso
          })
          .ilike('client_name', `%${clientName}%`);
      }

      return NextResponse.json({ success: true, restored: true, clientId: resolvedClientId });
    }

    if (moveToTrash) {
      // SOFT DELETE / MOVE TO TRASH FLOW
      if (resolvedClientId) {
        const trashedNotes = (targetClient?.notes || '') + ' [status:trash]';

        await supabaseAdmin
          .from('workspace_clients')
          .update({
            status: 'archived',
            is_deleted: true,
            deleted_at: nowIso,
            notes: trashedNotes,
            updated_at: nowIso
          })
          .eq('id', resolvedClientId);

        await supabaseAdmin
          .from('client_finance_records')
          .update({
            status: 'trash',
            is_deleted: true,
            deleted_at: nowIso,
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);

        await supabaseAdmin
          .from('post_production_projects')
          .update({
            overall_status: 'trash',
            is_deleted: true,
            deleted_at: nowIso,
            notes: '[status:trash]',
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);

        await supabaseAdmin
          .from('fw_projects')
          .update({
            status: 'trash',
            is_archived: true,
            updated_at: nowIso
          })
          .eq('client_id', resolvedClientId);
      }

      if (clientName) {
        await supabaseAdmin
          .from('fw_projects')
          .update({
            status: 'trash',
            is_archived: true,
            updated_at: nowIso
          })
          .ilike('client_name', `%${clientName}%`);
      }

      return NextResponse.json({ success: true, trashed: true, clientId: resolvedClientId });
    }

    return NextResponse.json({ success: true, noAction: true });
  } catch (error: any) {
    console.error('[API /api/leads/[id]/unbook Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
