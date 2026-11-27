import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const financeGetCache = new Map<string, { payload: any; ts: number }>();
const FINANCE_CACHE_TTL_MS = 8000;

async function fetchPagedClients(wsId: string) {
  let out: any[] = [];
  let from = 0;
  const page = 1000;
  while (from < 5000) {
    const { data, error } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`)
      .order('created_at', { ascending: false })
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out = out.concat(data);
    if (data.length < page) break;
    from += page;
  }
  return out;
}

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

    const skipCache = searchParams.get('fresh') === '1';
    const cached = !skipCache ? financeGetCache.get(effectiveWsId) : undefined;
    if (cached && Date.now() - cached.ts < FINANCE_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=5, stale-while-revalidate=15' },
      });
    }

    const [
      clients,
      financeRes,
      leadsRes,
      quoteMetaRes,
      teamRes,
      studioExpRes,
      legacyExpRes,
      settingsRes,
      catsRes,
      auditRes,
    ] = await Promise.all([
      fetchPagedClients(effectiveWsId),
      supabaseAdmin
        .from('client_finance_records')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('leads')
        .select('id, name, phone, email, event_date, status, raw_payload, final_quotation_id, quotation_id, client_id, notes, created_at')
        .or(`workspace_id.eq.${effectiveWsId},created_by_user_id.eq.${effectiveWsId}`)
        .or('final_quotation_id.not.is.null,status.in.(booked,accepted,closed,converted,trash,trashed)')
        .order('created_at', { ascending: false })
        .limit(1000),
      // Fetch lightweight quotation_documents scalar metadata ONLY (never full-table content_json!)
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, version, lead_version, created_at, updated_at')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('fw_team_members')
        .select('id, name, primary_role, roles, phone_number, email, is_active')
        .eq('user_id', effectiveWsId),
      supabaseAdmin
        .from('studio_expenses')
        .select(`*, project:fw_projects(id, client_name), member:fw_team_members(id, name, primary_role)`)
        .eq('user_id', effectiveWsId)
        .order('expense_date', { ascending: false }),
      supabaseAdmin
        .from('finance_expenses')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('payment_date', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('workspace_finance_settings')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('workspace_expense_categories')
        .select('category_name')
        .eq('workspace_id', effectiveWsId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('finance_audit_logs')
        .select('*')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: false })
        .limit(150),
    ]);

    // Select only needed quotation_documents to load content_json in small chunks (<300ms, zero 57014 timeout)
    const relevantLeadIds = new Set<string>();
    const relevantFinalTemplateIds = new Set<string>();
    for (const c of clients) {
      if (c.lead_id) relevantLeadIds.add(c.lead_id);
      if (c.final_quotation_id) relevantFinalTemplateIds.add(c.final_quotation_id);
    }
    for (const l of leadsRes.data || []) {
      relevantLeadIds.add(l.id);
      if (l.final_quotation_id) relevantFinalTemplateIds.add(l.final_quotation_id);
    }

    const docIdsToFetch: string[] = [];
    const seenPerLead = new Map<string, number>();
    for (const meta of quoteMetaRes.data || []) {
      const isFinalId = Boolean(meta.template_id && relevantFinalTemplateIds.has(meta.template_id));
      const isRelLead = Boolean(meta.lead_id && relevantLeadIds.has(meta.lead_id));
      if (!isFinalId && !isRelLead) continue;
      if (!isFinalId && meta.lead_id) {
        const count = seenPerLead.get(meta.lead_id) || 0;
        if (count >= 2) continue;
        seenPerLead.set(meta.lead_id, count + 1);
      }
      docIdsToFetch.push(meta.id);
    }

    // Fetch only lightweight financial/milestone JSON sub-keys in parallel (eliminates ~29s full-JSONB transfer)
    const quoteDocs: any[] = [];
    const CHUNK = 30;
    const chunkList: string[][] = [];
    for (let i = 0; i < docIdsToFetch.length; i += CHUNK) {
      chunkList.push(docIdsToFetch.slice(i, i + CHUNK));
    }

    const lightSelect = [
      'id', 'template_id', 'lead_id', 'version', 'lead_version', 'created_at', 'updated_at',
      'pricingPage:content_json->pricingPage',
      'pricing:content_json->pricing',
      'cover:content_json->cover',
      'eventGroup:content_json->eventGroup',
      'paymentTermsPage:content_json->paymentTermsPage',
      'paymentTerms:content_json->paymentTerms',
      'payment_terms:content_json->payment_terms',
      'payment_schedule:content_json->payment_schedule',
      'paymentSchedule:content_json->paymentSchedule',
      'pagesPaymentTerms:content_json->pages->paymentTermsPage',
      'qStatus:content_json->status',
      'qIsFinal:content_json->is_final',
    ].join(',');

    const batchResults = await Promise.all(
      chunkList.map((batchIds) =>
        supabaseAdmin
          .from('quotation_documents')
          .select(lightSelect)
          .in('id', batchIds)
      )
    );

    for (const res of batchResults) {
      if (!res.error && res.data) {
        for (const row of res.data as any[]) {
          quoteDocs.push({
            id: row.id,
            template_id: row.template_id,
            lead_id: row.lead_id,
            version: row.version,
            lead_version: row.lead_version,
            created_at: row.created_at,
            updated_at: row.updated_at,
            content_json: {
              pricingPage: row.pricingPage ?? undefined,
              pricing: row.pricing ?? undefined,
              cover: row.cover ?? undefined,
              eventGroup: row.eventGroup ?? undefined,
              paymentTermsPage: row.paymentTermsPage ?? undefined,
              paymentTerms: row.paymentTerms ?? undefined,
              payment_terms: row.payment_terms ?? undefined,
              payment_schedule: row.payment_schedule ?? undefined,
              paymentSchedule: row.paymentSchedule ?? undefined,
              pages: row.pagesPaymentTerms ? { paymentTermsPage: row.pagesPaymentTerms } : undefined,
              status: row.qStatus ?? undefined,
              is_final: row.qIsFinal ?? undefined,
            },
          });
        }
      }
    }

    const responsePayload = {
      success: true,
      workspace_id: effectiveWsId,
      clients,
      financeRecords: financeRes.data || [],
      leads: leadsRes.data || [],
      quotationDocs: quoteDocs,
      teamMembers: teamRes.data || [],
      studioExpenses: studioExpRes.data || [],
      financeExpenses: legacyExpRes.data || [],
      financeSettings: settingsRes.data || null,
      expenseCategories: (catsRes.data || []).map((c: any) => c.category_name),
      auditLogs: auditRes.data || [],
    };

    financeGetCache.set(effectiveWsId, { payload: responsePayload, ts: Date.now() });
    if (financeGetCache.size > 50) {
      const now = Date.now();
      for (const [k, v] of financeGetCache.entries()) {
        if (now - v.ts > FINANCE_CACHE_TTL_MS * 2) financeGetCache.delete(k);
      }
    }

    return NextResponse.json(responsePayload, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=5, stale-while-revalidate=15' },
    });
  } catch (err: any) {
    console.error('[API /api/workspace/finance GET] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to load finance data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedWsId = body?.workspace_id || new URL(req.url).searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    const action = body?.action;
    financeGetCache.delete(effectiveWsId);

    if (action === 'upsert_record') {
      const r = body.record || {};
      let clientId = r.client_id;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'Missing client_id' }, { status: 400 });
      }
      // Resolve canonical workspace_clients.id if clientId was temporarily a lead_id
      const { data: directWc } = await supabaseAdmin
        .from('workspace_clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (!directWc) {
        const { data: byLeadWc } = await supabaseAdmin
          .from('workspace_clients')
          .select('id')
          .eq('lead_id', clientId)
          .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
          .order('total_package_amount', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byLeadWc?.id) {
          clientId = byLeadWc.id;
        }
      }
      const nowIso = new Date().toISOString();
      const payload: any = {
        user_id: effectiveWsId,
        workspace_id: effectiveWsId,
        client_id: clientId,
        base_package_price: Math.round(Number(r.base_package_price) || 0),
        discount_amount: Math.round(Number(r.discount_amount) || 0),
        accommodation_charges: Math.round(Number(r.accommodation_charges) || 0),
        travel_charges: Math.round(Number(r.travel_charges) || 0),
        additional_charges: Math.round(Number(r.additional_charges) || 0),
        subtotal_amount: Math.round(Number(r.subtotal_amount) || 0),
        gst_rate: Number(r.gst_rate) || 0,
        gst_amount: Math.round(Number(r.gst_amount) || 0),
        final_total_amount: Math.round(Number(r.final_total_amount) || 0),
        received_amount: Math.round(Number(r.received_amount) || 0),
        pending_amount: Math.round(Number(r.pending_amount) || 0),
        payment_status: r.payment_status || 'pending',
        milestones: Array.isArray(r.milestones) ? r.milestones : [],
        updated_at: nowIso,
      };

      const { data: existingCfr } = await supabaseAdmin
        .from('client_finance_records')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (existingCfr) {
        const { error: updErr } = await supabaseAdmin
          .from('client_finance_records')
          .update(payload)
          .eq('id', existingCfr.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabaseAdmin
          .from('client_finance_records')
          .insert([{ ...payload, created_at: nowIso }]);
        if (insErr) throw insErr;
      }

      if (UUID_RE.test(clientId)) {
        const { error: wcErr } = await supabaseAdmin
          .from('workspace_clients')
          .update({
            total_package_amount: payload.final_total_amount,
            paid_amount: payload.received_amount,
            updated_at: nowIso,
          })
          .eq('id', clientId);
        if (wcErr) throw wcErr;
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'assign_team') {
      const { clientId, memberName } = body;
      if (!clientId) return NextResponse.json({ success: false, error: 'Missing clientId' }, { status: 400 });
      const nowIso = new Date().toISOString();

      const { data: curWc } = await supabaseAdmin
        .from('workspace_clients')
        .select('custom_data')
        .eq('id', clientId)
        .maybeSingle();

      const updatedCustom = { ...((curWc?.custom_data as any) || {}), handled_by: memberName || null };
      if (curWc) {
        const { error: wcErr } = await supabaseAdmin
          .from('workspace_clients')
          .update({ handled_by: memberName || null, custom_data: updatedCustom, updated_at: nowIso })
          .eq('id', clientId);
        if (wcErr) throw wcErr;
      }

      const { error: cfrErr } = await supabaseAdmin
        .from('client_finance_records')
        .update({ handled_by: memberName || null, updated_at: nowIso })
        .eq('client_id', clientId);
      if (cfrErr) throw cfrErr;

      return NextResponse.json({ success: true });
    }

    if (action === 'add_team_member') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ success: false, error: 'Member name is required' }, { status: 400 });
      const { data, error } = await supabaseAdmin
        .from('fw_team_members')
        .insert([{
          user_id: effectiveWsId,
          name,
          primary_role: 'Executive',
          is_active: true,
          created_at: new Date().toISOString(),
        }])
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, member: data });
    }

    if (action === 'soft_delete' || action === 'restore') {
      const { recordId, clientId, notes } = body;
      const nowIso = new Date().toISOString();
      const isTrash = action === 'soft_delete';

      const cfrUpdate = isTrash
        ? { status: 'trash', is_deleted: true, deleted_at: nowIso, notes: notes ?? undefined, updated_at: nowIso }
        : { status: 'active', is_deleted: false, deleted_at: null, notes: notes ?? undefined, updated_at: nowIso };

      if (recordId && UUID_RE.test(String(recordId))) {
        const { error } = await supabaseAdmin.from('client_finance_records').update(cfrUpdate).eq('id', recordId);
        if (error) throw error;
      }
      if (clientId && UUID_RE.test(String(clientId))) {
        const { error } = await supabaseAdmin.from('client_finance_records').update(cfrUpdate).eq('client_id', clientId);
        if (error) throw error;
        const { error: wcErr } = await supabaseAdmin
          .from('workspace_clients')
          .update({ status: isTrash ? 'trash' : 'active', is_deleted: isTrash, deleted_at: isTrash ? nowIso : null, updated_at: nowIso })
          .eq('id', clientId);
        if (wcErr) throw wcErr;
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'save_expense') {
      const e = body.expense || {};
      const insertPayload: any = {
        user_id: effectiveWsId,
        workspace_id: effectiveWsId,
        client_id: e.client_id || null,
        expense_type: e.expense_type || 'project_expense',
        category: e.category || 'General',
        title: e.title,
        amount: Math.round(Number(e.amount) || 0),
        paid_to: e.paid_to || null,
        team_member_id: e.team_member_id || null,
        payment_mode: e.payment_mode || 'UPI',
        payment_date: e.payment_date || new Date().toISOString().split('T')[0],
        status: 'paid',
        notes: e.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('finance_expenses').insert([insertPayload]).select('*').single();
      if (error) throw error;
      return NextResponse.json({ success: true, expense: data });
    }

    if (action === 'update_expense') {
      const e = body.expense || {};
      if (!e.id) return NextResponse.json({ success: false, error: 'Missing expense id' }, { status: 400 });
      const nowIso = new Date().toISOString();

      const { error: feErr } = await supabaseAdmin
        .from('finance_expenses')
        .update({
          title: e.title,
          amount: Math.round(Number(e.amount) || 0),
          category: e.category,
          payment_date: e.payment_date,
          payment_mode: e.payment_mode,
          paid_to: e.paid_to || null,
          team_member_id: e.team_member_id || null,
          client_id: e.client_id || null,
          notes: e.notes || null,
          updated_at: nowIso,
        })
        .eq('id', e.id);
      if (feErr) throw feErr;

      await supabaseAdmin
        .from('studio_expenses')
        .update({
          title: e.title,
          amount: Math.round(Number(e.amount) || 0),
          category: e.category,
          expense_date: e.payment_date,
          payment_mode: e.payment_mode,
          notes: e.notes || null,
          updated_at: nowIso,
        })
        .eq('id', e.id);

      return NextResponse.json({ success: true });
    }

    if (action === 'delete_expense') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Missing expense id' }, { status: 400 });
      const { error: e1 } = await supabaseAdmin.from('finance_expenses').delete().eq('id', id);
      const { error: e2 } = await supabaseAdmin.from('studio_expenses').delete().eq('id', id);
      if (e1 && e2) throw e1;
      return NextResponse.json({ success: true });
    }

    if (action === 'save_expense_category') {
      const categoryName = String(body.categoryName || '').trim();
      if (!categoryName) return NextResponse.json({ success: false, error: 'Missing categoryName' }, { status: 400 });
      const { error } = await supabaseAdmin
        .from('workspace_expense_categories')
        .insert({
          workspace_id: effectiveWsId,
          category_name: categoryName,
          is_default: false,
        });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'save_milestone_template') {
      const templates = Array.isArray(body.templates) ? body.templates : [];
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabaseAdmin
        .from('workspace_finance_settings')
        .select('id')
        .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabaseAdmin
          .from('workspace_finance_settings')
          .update({ payment_milestone_templates: templates, updated_at: nowIso })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from('workspace_finance_settings')
          .insert([{ user_id: effectiveWsId, workspace_id: effectiveWsId, payment_milestone_templates: templates, created_at: nowIso, updated_at: nowIso }]);
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'save_audit_log') {
      const l = body.entry || {};
      const { data, error } = await supabaseAdmin
        .from('finance_audit_logs')
        .insert([{
          workspace_id: effectiveWsId,
          user_id: effectiveWsId,
          client_id: UUID_RE.test(String(l.client_id || '')) ? l.client_id : null,
          client_name: l.client_name || null,
          log_type: l.log_type || 'ADJUSTMENT',
          amount: Math.round(Number(l.amount) || 0),
          actor_name: l.actor_name || 'Admin',
          description: l.description || '',
          payment_mode: l.payment_mode || null,
          created_at: new Date().toISOString(),
        }])
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, entry: data });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/workspace/finance POST] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Finance operation failed' }, { status: 500 });
  }
}
