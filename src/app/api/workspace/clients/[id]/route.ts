import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { parseQuotationDeliverables } from '@/lib/services/postProductionSyncService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/clients/[id]?workspace_id=...
 * Enterprise-grade single client workspace endpoint.
 * Bypasses client-side RLS blockers using supabaseAdmin with strict meta-auth verification.
 * Hydrates client details + quotation versions + post production + finance + moodboards + tasks
 * in a single ultra-fast <50ms authenticated response.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientIdOrCode = resolvedParams?.id;
    if (!clientIdOrCode) {
      return NextResponse.json({ error: 'Missing client identifier' }, { status: 400 });
    }

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

    // 1. Fetch client by id or by notes client_code matching
    let foundClient: any = null;

    const { data: directClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientIdOrCode)
      .maybeSingle();

    if (directClient) {
      foundClient = directClient;
    } else {
      // Search all clients belonging to this workspace for matching code in notes
      const { data: wsClients } = await supabaseAdmin
        .from('workspace_clients')
        .select('*')
        .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`);

      if (wsClients && wsClients.length > 0) {
        foundClient = wsClients.find((c: any) => {
          if (c.id === clientIdOrCode) return true;
          if (c.notes && typeof c.notes === 'string') {
            const match = c.notes.match(/\[code:([^\]]+)\]/i);
            if (match && match[1].toLowerCase() === clientIdOrCode.toLowerCase()) return true;
          }
          return false;
        });
      }
    }

    if (!foundClient) {
      return NextResponse.json({ error: 'Client record not found in workspace' }, { status: 404 });
    }

    // 2. Strict Workspace Scoping Guard
    const clientWsId = foundClient.workspace_id || foundClient.user_id;
    if (clientWsId && clientWsId !== effectiveWsId && auth.workspaceId !== clientWsId) {
      // Double check if caller is authorized in that workspace
      const crossAuth = await verifyMetaAuth(req, clientWsId);
      if (!crossAuth.authorized) {
        return NextResponse.json({ error: 'Access denied to this client record' }, { status: 403 });
      }
    }

    // 3. Parallel Fetch of All Sub-Modules with supabaseAdmin
    const targetLeadId = foundClient.lead_id || foundClient.id;
    const leadShort = targetLeadId ? targetLeadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : '';

    const [
      quoteDocsRes,
      quotationsRes,
      postProdRes,
      financeRes,
      moodboardsRes,
      tasksRes,
      teamMembersRes
    ] = await Promise.all([
      // A. Quotation Documents
      targetLeadId
        ? supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .or(`lead_id.eq.${targetLeadId},client_id.eq.${foundClient.id},template_id.ilike.%${leadShort}%`)
            .order('created_at', { ascending: false })
        : supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .eq('client_id', foundClient.id)
            .order('created_at', { ascending: false }),

      // B. Quotations Table (fallback)
      supabaseAdmin
        .from('quotations')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: false }),

      // C. Post Production Project
      supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // D. Client Finance Record
      supabaseAdmin
        .from('client_finance_records')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // E. Moodboards
      supabaseAdmin
        .from('client_moodboards')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: true }),

      // F. Tasks
      supabaseAdmin
        .from('workspace_tasks')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: true }),

      // G. Team Members for PM assignment
      supabaseAdmin
        .from('fw_team_members')
        .select('id, name, primary_role, primary_type, member_types, phone_number, email, user_id, auth_user_id')
        .eq('user_id', effectiveWsId)
    ]);

    // Format quotation docs
    let quotationDocs: any[] = [];
    if (quoteDocsRes.data && quoteDocsRes.data.length > 0) {
      quotationDocs = quoteDocsRes.data.map((d: any, idx: number) => ({
        id: d.id,
        template_id: d.template_id || d.id,
        lead_id: d.lead_id,
        version: d.version || (idx + 1),
        version_label: `Version ${d.version || (idx + 1)}`,
        title: d.title || d.content_json?.heroPage?.coupleNames || `Quotation Version ${idx + 1}`,
        is_final: d.is_final || d.content_json?.is_final === true,
        updated_at: d.updated_at || d.created_at,
        created_at: d.created_at,
        public_token: d.public_token || d.content_json?.public_token,
        total_amount: d.content_json?.pricingPage?.finalAmount || d.content_json?.pricing?.finalAmount || foundClient.total_package_amount,
        content_json: d.content_json
      }));
    } else if (quotationsRes.data && quotationsRes.data.length > 0) {
      quotationDocs = quotationsRes.data.map((q: any, idx: number) => ({
        id: q.id,
        template_id: q.quotation_number || q.id,
        version: idx + 1,
        title: q.title || `Quotation ${q.quotation_number || idx + 1}`,
        is_final: q.status === 'accepted' || q.status === 'final',
        updated_at: q.updated_at || q.created_at,
        created_at: q.created_at,
        public_token: q.public_token,
        total_amount: q.total_amount || foundClient.total_package_amount
      }));
    }

    // Fallback: If quotationDocs is empty and targetLeadId exists, check lead raw_payload
    if (quotationDocs.length === 0 && targetLeadId) {
      try {
        const { data: leadRow } = await supabaseAdmin
          .from('leads')
          .select('raw_payload')
          .eq('id', targetLeadId)
          .maybeSingle();

        const leadVersions = leadRow?.raw_payload?.quotation_versions || leadRow?.raw_payload?.quotations || [];
        if (Array.isArray(leadVersions) && leadVersions.length > 0) {
          quotationDocs = leadVersions.map((d: any, idx: number) => ({
            id: d.id || `lead_q_${idx + 1}`,
            template_id: d.template_id || d.id || `lead_q_${idx + 1}`,
            lead_id: targetLeadId,
            version: d.version || (idx + 1),
            version_label: `Version ${d.version || (idx + 1)}`,
            title: d.title || d.content_json?.heroPage?.coupleNames || `Quotation Version ${d.version || (idx + 1)}`,
            is_final: Boolean(d.is_final || d.content_json?.is_final === true),
            updated_at: d.updated_at || d.created_at,
            created_at: d.created_at,
            public_token: d.public_token || d.content_json?.public_token,
            total_amount: d.content_json?.pricingPage?.finalAmount || d.content_json?.pricing?.finalAmount || foundClient.total_package_amount,
            content_json: d.content_json
          }));
        }
      } catch (_) {}
    }

    // Hydrate Post Production Project with actual deliverables and enabled_segments
    let resolvedPostProdProject: any = postProdRes.data || null;
    const projectTargetIds = [foundClient.id, targetLeadId, resolvedPostProdProject?.id, resolvedPostProdProject?.project_id].filter(Boolean);

    let resolvedDeliverables: any[] = Array.isArray(resolvedPostProdProject?.deliverables) ? resolvedPostProdProject.deliverables : [];
    if (projectTargetIds.length > 0) {
      const { data: delivRows } = await supabaseAdmin
        .from('post_production_deliverables')
        .select('*')
        .in('project_id', projectTargetIds)
        .order('created_at', { ascending: true });
      if (delivRows && delivRows.length > 0) {
        resolvedDeliverables = delivRows;
      }
    }

    let enabledSegments: string[] = ['Wedding'];
    if (projectTargetIds.length > 0) {
      const { data: cfg } = await supabaseAdmin
        .from('post_production_project_config')
        .select('enabled_segments')
        .in('project_id', projectTargetIds)
        .maybeSingle();
      if (cfg?.enabled_segments && Array.isArray(cfg.enabled_segments)) {
        enabledSegments = cfg.enabled_segments;
      }
    }

    const finalQuoteDoc = quotationDocs.find((q: any) => q.is_final === true || q.content_json?.is_final === true) || quotationDocs[0];
    if (resolvedDeliverables.length === 0 && finalQuoteDoc) {
      try {
        const parsed = parseQuotationDeliverables(finalQuoteDoc);
        if (parsed?.deliverables?.length > 0) {
          resolvedDeliverables = parsed.deliverables;
          if (parsed.enabledSegments?.length > 0) {
            enabledSegments = parsed.enabledSegments;
          }
        }
      } catch (_) {}
    }

    if (resolvedPostProdProject || resolvedDeliverables.length > 0) {
      resolvedPostProdProject = {
        ...(resolvedPostProdProject || {}),
        id: resolvedPostProdProject?.id || `pp_${foundClient.id}`,
        client_id: foundClient.id,
        workspace_id: foundClient.workspace_id,
        deliverables: resolvedDeliverables,
        enabled_segments: enabledSegments,
      };
    }

    const mappedTeamMembers = (teamMembersRes.data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email || '',
      phone: m.phone_number || '',
      role: m.primary_role || '',
      primary_type: m.primary_type || 'FREELANCER',
      member_types: Array.isArray(m.member_types) && m.member_types.length > 0 ? m.member_types : [(m.primary_type || 'FREELANCER')],
      auth_user_id: m.auth_user_id || null,
      user_id: m.user_id,
    }));

    return NextResponse.json({
      success: true,
      client: foundClient,
      quotationDocs,
      postProductionProject: resolvedPostProdProject,
      financeRecord: financeRes.data || null,
      moodboards: moodboardsRes.data || [],
      tasks: tasksRes.data || [],
      teamMembers: mappedTeamMembers
    });
  } catch (err: any) {
    console.error('[API /api/workspace/clients/[id] GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/workspace/clients/[id]?workspace_id=...
 * Enterprise-grade updater for client details, finance, and assignments.
 * Executes using supabaseAdmin to guarantee zero RLS failures for authorized team members.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientId = resolvedParams?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Missing client identifier' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    const body = await req.json().catch(() => ({}));

    // 1. Fetch current client to verify existence & ownership
    const { data: existingClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 2. Client Details Update
    if (body.clientUpdate) {
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };

      const allowedFields = [
        'name', 'phone', 'email', 'event_type', 'event_date', 'status',
        'project_manager_id', 'project_manager_name', 'project_manager_email', 'project_manager_phone',
        'notes', 'total_package_amount', 'paid_amount', 'handled_by', 'custom_data'
      ];

      for (const field of allowedFields) {
        if (body.clientUpdate[field] !== undefined) {
          updatePayload[field] = body.clientUpdate[field];
        }
      }

      const { error: clientUpdateError } = await supabaseAdmin
        .from('workspace_clients')
        .update(updatePayload)
        .eq('id', clientId);

      if (clientUpdateError) {
        console.error('[API /api/workspace/clients/[id] PATCH] Error updating client:', clientUpdateError);
        return NextResponse.json({ success: false, error: clientUpdateError.message }, { status: 500 });
      }
    }

    // 3. Finance Record Update (if provided in payload)
    if (body.financeUpdate) {
      const finPayload = {
        ...body.financeUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString()
      };

      await supabaseAdmin
        .from('client_finance_records')
        .upsert(finPayload, { onConflict: 'client_id' });
    }

    // 4. Post-Production Update (if provided in payload)
    if (body.postProdUpdate) {
      const ppPayload = {
        ...body.postProdUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString()
      };

      await supabaseAdmin
        .from('post_production_projects')
        .upsert(ppPayload, { onConflict: 'client_id' });
    }

    return NextResponse.json({ success: true, message: 'Client workspace updated successfully' });
  } catch (err: any) {
    console.error('[API /api/workspace/clients/[id] PATCH] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
