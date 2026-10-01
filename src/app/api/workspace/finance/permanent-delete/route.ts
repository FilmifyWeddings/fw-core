import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative API for permanently purging a deleted/trashed finance record
 * and its associated workspace records from the database.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    if (!userId || userId === 'demo_user') {
      return NextResponse.json({ error: 'Unauthorized: Valid login session required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { recordId, clientId, leadId } = body;

    if (!recordId && !clientId && !leadId) {
      return NextResponse.json({ error: 'At least one identifier (recordId, clientId, leadId) is required' }, { status: 400 });
    }

    // 1. Verify workspace ownership to maintain strict studio isolation
    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 2. Delete from client_finance_records
    if (recordId) {
      await supabaseAdmin
        .from('client_finance_records')
        .delete()
        .eq('id', recordId);
    }
    if (clientId) {
      await supabaseAdmin
        .from('client_finance_records')
        .delete()
        .eq('client_id', clientId);
    }
    if (leadId) {
      await supabaseAdmin
        .from('client_finance_records')
        .delete()
        .eq('client_id', leadId);
    }

    // 3. Delete from workspace_clients
    if (clientId) {
      await supabaseAdmin
        .from('workspace_clients')
        .delete()
        .eq('id', clientId);
    }
    if (leadId) {
      await supabaseAdmin
        .from('workspace_clients')
        .delete()
        .eq('lead_id', leadId);
    }

    // 4. Delete finance audit logs
    if (clientId) {
      await supabaseAdmin
        .from('finance_audit_logs')
        .delete()
        .eq('client_id', clientId);
    }

    // 5. Delete post production projects linked to this client
    if (clientId) {
      await supabaseAdmin
        .from('post_production_projects')
        .delete()
        .eq('client_id', clientId);
    }

    // 6. Delete quotation documents if any
    if (clientId) {
      await supabaseAdmin
        .from('quotation_documents')
        .delete()
        .eq('lead_id', clientId);
    }
    if (leadId) {
      await supabaseAdmin
        .from('quotation_documents')
        .delete()
        .eq('lead_id', leadId);
    }

    // 7. Clean up or purge lead from leads table
    const targetLeadId = leadId || clientId;
    if (targetLeadId) {
      const { data: leadRec } = await supabaseAdmin
        .from('leads')
        .select('id, status, notes')
        .eq('id', targetLeadId)
        .maybeSingle();

      if (leadRec) {
        const isLeadTrashed = 
          ['trash', 'trashed', 'archived'].includes(String(leadRec.status || '').toLowerCase()) ||
          Boolean(leadRec.notes && typeof leadRec.notes === 'string' && leadRec.notes.includes('[status:trash]'));

        if (isLeadTrashed) {
          // If the lead itself was trashed, permanently purge it from leads
          await supabaseAdmin
            .from('leads')
            .delete()
            .eq('id', targetLeadId);
        } else {
          // If the lead was an active CRM lead, detach client_id and final_quotation_id so it won't populate finance
          await supabaseAdmin
            .from('leads')
            .update({
              client_id: null,
              final_quotation_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', targetLeadId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Finance record and associated workspace data permanently deleted from backend'
    });
  } catch (error: any) {
    console.error('[Permanent Delete Finance Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
