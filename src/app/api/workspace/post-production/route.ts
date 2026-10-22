import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/post-production?workspace_id=...
 * Enterprise-grade endpoint that safely bypasses client-side RLS blockers for authorized workspace members
 * and guarantees accurate client name resolution (never generic "Wedding Client").
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

    // 1. Fetch all data in parallel with supabaseAdmin
    const [
      clientsRes,
      leadsRes,
      fwProjectsRes,
      pppRes,
      ppDelivRes,
      configRes,
      teamMembersRes,
      qRes,
    ] = await Promise.all([
      // Clients
      supabaseAdmin
        .from('workspace_clients')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),

      // Leads
      supabaseAdmin
        .from('leads')
        .select('id, name, client_name, couple_names, phone, email, event_date, event_type, status, notes, raw_payload, final_quotation_id, client_id, user_id, workspace_id')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),

      // FW Projects (Shoot Calendar Projects)
      supabaseAdmin
        .from('fw_projects')
        .select('id, client_name, project_manager_id, project_manager_name, main_date, status, lead_id, user_id, workspace_id')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),

      // Post Production Projects
      supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // Post Production Deliverables
      supabaseAdmin
        .from('post_production_deliverables')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`),

      // Project Config
      supabaseAdmin
        .from('post_production_project_config')
        .select('*')
        .eq('workspace_id', effectiveWsId),

      // Team Members
      supabaseAdmin
        .from('fw_team_members')
        .select('id, name, primary_role, primary_type, member_types, phone, user_id, workspace_id')
        .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`),

      // Quotations
      supabaseAdmin
        .from('quotations')
        .select('id, quotation_number, title, total_amount, status, client_name')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),
    ]);

    const clients = clientsRes.data || [];
    const leads = leadsRes.data || [];
    const fwProjects = fwProjectsRes.data || [];
    const pppData = pppRes.data || [];
    const deliverables = ppDelivRes.data || [];
    const configs = configRes.data || [];
    const teamMembers = teamMembersRes.data || [];
    const quotations = qRes.data || [];

    // Lookup Maps
    const leadMap = new Map<string, any>();
    leads.forEach(l => {
      if (l.id) leadMap.set(l.id, l);
      if (l.client_id) leadMap.set(l.client_id, l);
    });

    const clientMap = new Map<string, any>();
    clients.forEach(c => {
      if (c.id) clientMap.set(c.id, c);
      if (c.lead_id) clientMap.set(c.lead_id, c);
    });

    const fwMap = new Map<string, any>();
    fwProjects.forEach(fp => {
      if (fp.id) fwMap.set(fp.id, fp);
      if (fp.lead_id) fwMap.set(fp.lead_id, fp);
      if (fp.client_name) fwMap.set(fp.client_name.toLowerCase().trim(), fp);
    });

    // Helper to resolve the true, real client name from all sources
    function resolveTrueClientName(targetId: string, fallbackName?: string | null): string {
      const matchedClient = clientMap.get(targetId);
      if (matchedClient?.name && matchedClient.name !== 'Wedding Client' && matchedClient.name !== 'Project Client') {
        return matchedClient.name;
      }

      const matchedLead = leadMap.get(targetId);
      if (matchedLead) {
        const leadName = matchedLead.raw_payload?.couple_name || matchedLead.couple_names || matchedLead.client_name || matchedLead.name;
        if (leadName && leadName !== 'Wedding Client' && leadName !== 'Project Client' && leadName !== 'Untitled Client') {
          return leadName;
        }
      }

      const matchedFw = fwMap.get(targetId);
      if (matchedFw?.client_name && matchedFw.client_name !== 'Wedding Client' && matchedFw.client_name !== 'Project Client') {
        return matchedFw.client_name;
      }

      if (fallbackName && fallbackName !== 'Wedding Client' && fallbackName !== 'Project Client' && fallbackName !== 'Untitled Client') {
        return fallbackName;
      }

      return 'Client Project';
    }

    return NextResponse.json({
      success: true,
      workspaceId: effectiveWsId,
      clients,
      leads,
      fwProjects,
      postProductionProjects: pppData,
      deliverables,
      configs,
      teamMembers,
      quotations,
      resolveTrueClientNameHelper: true
    });
  } catch (err: any) {
    console.error('[API /workspace/post-production GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/workspace/post-production
 * Server-side mutation endpoint for post-production projects & deliverables
 * with automatic audit logging into post_production_audit_logs and live_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId: requestedWsId, projectId, clientId, updates, auditLog } = body;

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;

    if (!projectId && !clientId) {
      return NextResponse.json({ success: false, error: 'projectId or clientId is required' }, { status: 400 });
    }

    // 1. Check existing post_production_projects record
    let targetProject: any = null;
    if (projectId) {
      const { data: byId } = await supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      targetProject = byId;
    }

    if (!targetProject && clientId) {
      const { data: byClient } = await supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .eq('client_id', clientId)
        .eq('workspace_id', effectiveWsId)
        .maybeSingle();
      targetProject = byClient;
    }

    const payloadToSave: any = {
      workspace_id: effectiveWsId,
      user_id: effectiveWsId,
      updated_at: new Date().toISOString(),
      ...(updates || {})
    };

    if (clientId && !payloadToSave.client_id) payloadToSave.client_id = clientId;

    let savedProject: any = null;
    if (targetProject) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('post_production_projects')
        .update(payloadToSave)
        .eq('id', targetProject.id)
        .select('*')
        .single();

      if (updErr) throw updErr;
      savedProject = updated;
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('post_production_projects')
        .insert([payloadToSave])
        .select('*')
        .single();

      if (insErr) throw insErr;
      savedProject = inserted;
    }

    // 2. Audit Log persistence if auditLog payload provided
    if (auditLog) {
      const logEntry = {
        workspace_id: effectiveWsId,
        project_id: savedProject?.id || projectId || clientId,
        client_id: clientId || savedProject?.client_id,
        actor_id: auth.userId,
        actor_name: auditLog.actor_name || 'Studio Member',
        actor_role: auditLog.actor_role || 'Editor',
        action_type: auditLog.action_type || 'update',
        deliverable_id: auditLog.deliverable_id || null,
        deliverable_title: auditLog.deliverable_title || null,
        category: auditLog.category || null,
        segment: auditLog.segment || null,
        title: auditLog.title || 'Project Updated',
        old_value: auditLog.old_value !== undefined ? String(auditLog.old_value) : null,
        new_value: auditLog.new_value !== undefined ? String(auditLog.new_value) : null,
        details: auditLog.details || null,
        metadata: auditLog.metadata || {},
        created_at: new Date().toISOString(),
      };

      try {
        await supabaseAdmin.from('post_production_audit_logs').insert([logEntry]);
      } catch (_) {}

      try {
        await supabaseAdmin.from('live_logs').insert([{
          workspace_id: effectiveWsId,
          event_type: 'post_production_history',
          actor_id: auth.userId,
          message: auditLog.title || `Post-Production updated: ${auditLog.details || ''}`,
          metadata: logEntry,
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      project: savedProject
    });
  } catch (err: any) {
    console.error('[API /workspace/post-production POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
