import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/clients?workspace_id=...
 * Enterprise-grade server endpoint that securely bypasses client-side RLS blockers
 * for authorized workspace members and studio owners.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    // Parallel fetch with supabaseAdmin using verified database schemas
    const [
      clientsRes,
      financeRes,
      leadsRes,
      fwProjectsRes,
      fwAssignmentsRes,
      postProjectsRes,
      qDocsRes,
      qRowsRes,
      teamMembersRes,
    ] = await Promise.all([
      // 1. Workspace Clients
      supabaseAdmin
        .from('workspace_clients')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),

      // 2. Client Finance Records
      supabaseAdmin
        .from('client_finance_records')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // 3. Leads (scoped to workspace_id)
      supabaseAdmin
        .from('leads')
        .select('id, name, client_name, couple_names, phone, email, event_date, event_type, status, stage, notes, raw_payload, final_quotation_id, client_id, workspace_id, project_manager_id, project_manager_name')
        .eq('workspace_id', effectiveWsId)
        .order('created_at', { ascending: false })
        .limit(100),

      // 4. FW Projects / Shoot Calendar Projects (scoped to user_id)
      supabaseAdmin
        .from('fw_projects')
        .select('id, client_name, project_manager_id, project_manager_name, main_date, status, user_id, client_id')
        .eq('user_id', effectiveWsId)
        .order('created_at', { ascending: false }),

      // 5. FW Assignments (Sub-Event Crew Assignments)
      supabaseAdmin
        .from('fw_assignments')
        .select('id, project_id, client_name, assigned_member_id, assigned_member_name, assigned_member_phone, sub_event_name, sub_event_date, required_role')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // 6. Post-Production Projects
      supabaseAdmin
        .from('post_production_projects')
        .select('id, client_id, project_id, project_manager_id, project_manager_name, deliverables, overall_status')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // 7. Quotation Documents
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, content_json')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // 8. Quotations
      supabaseAdmin
        .from('quotations')
        .select('id, quotation_number, client_id, client_name, couple_names, status, is_final, financials, content_json, user_id, workspace_id')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),

      // 9. FW Team Members (scoped to user_id)
      supabaseAdmin
        .from('fw_team_members')
        .select('id, name, primary_role, primary_type, member_types, phone, email, user_id')
        .eq('user_id', effectiveWsId),
    ]);

    return NextResponse.json({
      success: true,
      workspace_id: effectiveWsId,
      clients: clientsRes.data || [],
      financeRecords: financeRes.data || [],
      leads: leadsRes.data || [],
      projects: fwProjectsRes.data || [],
      assignments: fwAssignmentsRes.data || [],
      postProjects: postProjectsRes.data || [],
      quotationDocs: qDocsRes.data || [],
      quotations: qRowsRes.data || [],
      teamMembers: teamMembersRes.data || [],
    });
  } catch (err: any) {
    console.error('[API /api/workspace/clients] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
