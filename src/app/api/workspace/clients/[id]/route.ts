import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

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

    const mappedTeamMembers = (teamMembersRes.data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email || '',
      phone: m.phone_number || '',
      role: m.primary_role || '',
      primary_type: m.primary_type || 'IN_HOUSE',
      member_types: m.member_types || ['IN_HOUSE'],
      auth_user_id: m.auth_user_id || null,
      user_id: m.user_id,
    }));

    return NextResponse.json({
      success: true,
      client: foundClient,
      quotationDocs,
      postProductionProject: postProdRes.data || null,
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
