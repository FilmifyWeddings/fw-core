import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { parseQuotationDeliverables } from '@/lib/services/postProductionSyncService';
import { DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

export const dynamic = 'force-dynamic';

const isBadVersionTitle = (title?: string | null): boolean => {
  if (!title) return true;
  const trimmed = String(title).trim();
  if (!trimmed || trimmed.startsWith('FW-')) return true;
  if (/^(?:Wedding Quotation|Wedding - Design 1|Quotation Template)$/i.test(trimmed)) return true;
  const prefix = trimmed.split(/\s*-\s*/)[0]?.trim();
  if (!prefix || prefix.length < 2) return true;
  return false;
};

const normalizePhoneLast10 = (phone?: string | null): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const normalizeNameKey = (name?: string | null): string => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * GET /api/workspace/clients/[id]?workspace_id=...
 * Enterprise-grade single client workspace endpoint.
 * Bypasses client-side RLS blockers using supabaseAdmin with strict meta-auth verification.
 * Hydrates client details + quotation versions + fw_project/sub-events/assignments + post production
 * + finance + moodboards + tasks + team members + crew roles in one authenticated response.
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
    const clientWsId = foundClient.workspace_id || foundClient.user_id || effectiveWsId;
    if (clientWsId && clientWsId !== effectiveWsId && auth.workspaceId !== clientWsId) {
      const crossAuth = await verifyMetaAuth(req, clientWsId);
      if (!crossAuth.authorized) {
        return NextResponse.json({ error: 'Access denied to this client record' }, { status: 403 });
      }
    }

    // 3. Resolve Linked Lead ID & Lead Metadata reliably (even if workspace_clients.lead_id wasn't backfilled)
    let resolvedLeadRow: any = null;
    if (foundClient.lead_id) {
      const { data: directLead } = await supabaseAdmin
        .from('leads')
        .select('id, workspace_id, user_id, client_id, name, full_name, email, phone, quotation_id, final_quotation_id, raw_payload')
        .eq('id', foundClient.lead_id)
        .maybeSingle();
      if (directLead) resolvedLeadRow = directLead;
    }

    if (!resolvedLeadRow) {
      const { data: linkedByClient } = await supabaseAdmin
        .from('leads')
        .select('id, workspace_id, user_id, client_id, name, full_name, email, phone, quotation_id, final_quotation_id, raw_payload')
        .eq('client_id', foundClient.id)
        .limit(1)
        .maybeSingle();
      if (linkedByClient) resolvedLeadRow = linkedByClient;
    }

    if (!resolvedLeadRow && (foundClient.phone || foundClient.name)) {
      try {
        const { data: wsLeads } = await supabaseAdmin
          .from('leads')
          .select('id, workspace_id, user_id, client_id, name, full_name, email, phone, quotation_id, final_quotation_id, raw_payload')
          .or(`workspace_id.eq.${clientWsId},user_id.eq.${clientWsId}`)
          .order('created_at', { ascending: false })
          .limit(300);

        if (wsLeads && wsLeads.length > 0) {
          const targetPhone = normalizePhoneLast10(foundClient.phone);
          const targetName = normalizeNameKey(foundClient.name);

          resolvedLeadRow =
            wsLeads.find((l: any) => l.client_id === foundClient.id) ||
            (targetPhone
              ? wsLeads.find((l: any) => normalizePhoneLast10(l.phone) === targetPhone)
              : null) ||
            (targetName
              ? wsLeads.find(
                  (l: any) =>
                    normalizeNameKey(l.name) === targetName ||
                    normalizeNameKey(l.full_name) === targetName
                )
              : null) ||
            null;
        }
      } catch (_) {}
    }

    const resolvedLeadId: string | null = resolvedLeadRow?.id || foundClient.lead_id || null;
    const rawPayload = resolvedLeadRow?.raw_payload || {};
    const knownIds = new Set<string>();
    if (resolvedLeadRow?.quotation_id) knownIds.add(resolvedLeadRow.quotation_id);
    if (resolvedLeadRow?.final_quotation_id) knownIds.add(resolvedLeadRow.final_quotation_id);
    if (rawPayload.quotation_id) knownIds.add(rawPayload.quotation_id);
    if (rawPayload.final_quotation_id) knownIds.add(rawPayload.final_quotation_id);
    const rawVersions: any[] = Array.isArray(rawPayload.quotation_versions)
      ? rawPayload.quotation_versions
      : Array.isArray(rawPayload.quotations)
      ? rawPayload.quotations
      : [];
    const rawVersionByTid = new Map<string, any>();
    rawVersions.forEach((v: any) => {
      if (v?.id) {
        knownIds.add(String(v.id));
        rawVersionByTid.set(String(v.id).toUpperCase(), v);
      }
      if (v?.template_id) {
        knownIds.add(String(v.template_id));
        rawVersionByTid.set(String(v.template_id).toUpperCase(), v);
      }
    });

    const leadShortSeed = (resolvedLeadId || foundClient.id || '').replace(/[^a-zA-Z0-9]/g, '');
    const leadShort8Lower = leadShortSeed.slice(0, 8).toLowerCase();
    const leadShort8Upper = leadShortSeed.slice(0, 8).toUpperCase();
    const leadShort6Lower = leadShortSeed.slice(0, 6).toLowerCase();
    const leadShort6Upper = leadShortSeed.slice(0, 6).toUpperCase();
    const clientShort8Upper = String(foundClient.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();

    const docOrFilters = [`client_id.eq.${foundClient.id}`];
    if (resolvedLeadId) docOrFilters.push(`lead_id.eq.${resolvedLeadId}`);
    if (leadShort6Lower.length >= 6) {
      docOrFilters.push(`template_id.ilike.%${leadShort6Lower}%`);
      docOrFilters.push(`template_id.ilike.%${leadShort6Upper}%`);
    }
    if (leadShort8Upper.length >= 8 && clientShort8Upper !== leadShort8Upper && clientShort8Upper.length >= 6) {
      docOrFilters.push(`template_id.ilike.%${clientShort8Upper}%`);
    }

    const knownIdsList = Array.from(knownIds);
    if (knownIdsList.length > 0) {
      const safeQuoted = knownIdsList.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
      docOrFilters.push(`template_id.in.(${safeQuoted})`);
      const validUuids = knownIdsList.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      if (validUuids.length > 0) {
        docOrFilters.push(`id.in.(${validUuids.map((id) => `"${id}"`).join(',')})`);
      }
    }

    const quotesOrFilters = [`client_id.eq.${foundClient.id}`];
    if (resolvedLeadId && resolvedLeadId !== foundClient.id) {
      quotesOrFilters.push(`client_id.eq.${resolvedLeadId}`);
    }
    if (leadShort6Upper.length >= 6) {
      quotesOrFilters.push(`quotation_number.ilike.%${leadShort6Lower}%`);
      quotesOrFilters.push(`quotation_number.ilike.%${leadShort6Upper}%`);
    }

    // Build fw_projects matching OR filter
    const fwProjectOrParts = [`client_id.eq.${foundClient.id}`];
    if (resolvedLeadId && resolvedLeadId !== foundClient.id) {
      fwProjectOrParts.push(`lead_id.eq.${resolvedLeadId}`);
    }
    if (foundClient.name && String(foundClient.name).trim()) {
      const escapedName = String(foundClient.name).trim().replace(/[,%()]/g, ' ');
      if (escapedName) {
        fwProjectOrParts.push(`client_name.ilike.%${escapedName}%`);
      }
    }

    // 4. Parallel Fetch of All Sub-Modules with supabaseAdmin
    const [
      quoteDocsRes,
      quotationsRes,
      responsesRes,
      postProdRes,
      financeRes,
      moodboardsRes,
      tasksRes,
      fwTeamMembersRes,
      wsMembersRes,
      wsRatesRes,
      fwProjectsRes,
      crewRolesRes,
    ] = await Promise.all([
      // A. Quotation Documents
      supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .or(docOrFilters.join(','))
        .order('created_at', { ascending: false }),

      // B. Quotations Table
      supabaseAdmin
        .from('quotations')
        .select('*')
        .or(quotesOrFilters.join(','))
        .order('created_at', { ascending: false }),

      // C. Client Responses (accepted / budget discussion)
      resolvedLeadId
        ? supabaseAdmin
            .from('quotation_responses')
            .select('quotation_id, lead_version, response_type, client_name, client_notes, budget_amount, created_at')
            .eq('lead_id', resolvedLeadId)
        : Promise.resolve({ data: [], error: null }),

      // D. Post Production Project
      supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // E. Client Finance Record
      supabaseAdmin
        .from('client_finance_records')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // F. Moodboards
      supabaseAdmin
        .from('client_moodboards')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: true }),

      // G. Tasks
      supabaseAdmin
        .from('workspace_tasks')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: true }),

      // H. Full Team Members (with avatars & rates matching Booking Events)
      supabaseAdmin
        .from('fw_team_members')
        .select('*')
        .or(`user_id.eq.${clientWsId},user_id.eq.${effectiveWsId}`)
        .order('name', { ascending: true }),

      // I. Workspace Members (joined users & avatars)
      supabaseAdmin
        .from('workspace_members')
        .select('*')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`),

      // J. Custom Team Member Rates
      supabaseAdmin
        .from('workspace_team_member_rates')
        .select('team_member_id, daily_rate')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`),

      // K. Bookings Events Project + Sub-Events + Assignments
      supabaseAdmin
        .from('fw_projects')
        .select(`
          *,
          fw_sub_events (
            *,
            fw_assignments (*)
          )
        `)
        .or(fwProjectOrParts.join(','))
        .neq('status', 'trash')
        .order('created_at', { ascending: false }),

      // L. Workspace Crew Roles (short codes for crew badges)
      supabaseAdmin
        .from('master_crew_roles')
        .select('*')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: true }),
    ]);

    // 5. Filter & Merge Quotations matching /api/leads/[id]/quotations logic cleanly
    const matchedDocs: any[] = ((quoteDocsRes.data || []) as any[]).filter((doc: any) => {
      if (doc.client_id && doc.client_id === foundClient.id) return true;
      const docLeadId = doc.lead_id || doc.content_json?.lead_id;
      if (resolvedLeadId && docLeadId === resolvedLeadId) return true;
      if (doc.template_id) {
        const tidUpper = String(doc.template_id).toUpperCase();
        if (leadShort8Upper && tidUpper.includes(leadShort8Upper)) return true;
        if (leadShort6Upper && tidUpper.includes(leadShort6Upper)) return true;
        if (clientShort8Upper && tidUpper.includes(clientShort8Upper)) return true;
        if (knownIdsList.some((k) => tidUpper.includes(String(k).toUpperCase()))) return true;
      }
      return false;
    });

    const allQuotes: any[] = (quotationsRes.data || []) as any[];
    const allResponses: any[] = (responsesRes.data || []) as any[];
    const finalTargetId = resolvedLeadRow?.final_quotation_id || rawPayload?.final_quotation_id || null;

    const explicitVerNums = new Set<number>();
    matchedDocs.forEach((d: any) => {
      if (d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0) {
        explicitVerNums.add(Number(d.lead_version));
      }
    });

    const findMatchingQuote = (doc: any) =>
      allQuotes.find(
        (q: any) =>
          q.id === doc.template_id ||
          q.quotation_number === doc.template_id ||
          q.id === doc.id ||
          (q.quotation_number &&
            doc.template_id &&
            (q.quotation_number.includes(doc.template_id) || doc.template_id.includes(q.quotation_number)))
      );

    const orphanSupersededTids = new Set<string>();
    const activeMatchedDocs = matchedDocs.filter((d: any) => {
      const tidUpper = String(d.template_id || d.id || '').toUpperCase();
      const matchedQ = findMatchingQuote(d);
      const rawVer = rawVersionByTid.get(tidUpper);
      const isFinalMatch = Boolean(
        d.is_final === true ||
          d.content_json?.is_final === true ||
          (finalTargetId && (finalTargetId === d.template_id || finalTargetId === d.id)) ||
          matchedQ?.is_final === true ||
          matchedQ?.status === 'accepted' ||
          rawVer?.is_final === true
      );
      const explicitVer =
        d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0
          ? Number(d.lead_version)
          : 0;
      const tidVerMatch = typeof d.template_id === 'string' ? d.template_id.match(/-V(\d+)-/i) : null;
      const tidVer = tidVerMatch ? parseInt(tidVerMatch[1], 10) : 0;

      if (!explicitVer && Number(d.version || 1) === 1 && !matchedQ && !isFinalMatch) {
        if ((tidVer > 0 && explicitVerNums.has(tidVer)) || (explicitVerNums.size > 0 && isBadVersionTitle(rawVer?.title))) {
          orphanSupersededTids.add(tidUpper);
          return false;
        }
      }
      return true;
    });

    const docTemplateIds = new Set(activeMatchedDocs.map((d: any) => String(d.template_id || d.id).toUpperCase()));
    const legacyOnlyQuotes = allQuotes.filter((q: any) => {
      const qIdU = String(q.id || '').toUpperCase();
      const qNumU = String(q.quotation_number || '').toUpperCase();
      return !docTemplateIds.has(qIdU) && (!qNumU || !docTemplateIds.has(qNumU));
    });

    const missingRawVersions = rawVersions.filter((rv: any) => {
      const rId = String(rv?.template_id || rv?.id || '').toUpperCase();
      if (!rId || orphanSupersededTids.has(rId)) return false;
      const rvVer = Number(rv.version || 0);
      if (rvVer > 0 && explicitVerNums.has(rvVer) && isBadVersionTitle(rv.title)) return false;
      return (
        !docTemplateIds.has(rId) &&
        !legacyOnlyQuotes.some(
          (q: any) =>
            String(q.id || '').toUpperCase() === rId || String(q.quotation_number || '').toUpperCase() === rId
        )
      );
    });

    const combinedQuoteRows = [
      ...activeMatchedDocs,
      ...legacyOnlyQuotes.map((q: any, i: number) => ({
        id: q.id,
        template_id: q.quotation_number || q.id,
        lead_id: resolvedLeadId || foundClient.id,
        version: (activeMatchedDocs.length || 0) + i + 1,
        lead_version: (activeMatchedDocs.length || 0) + i + 1,
        title: q.title,
        is_final: q.is_final === true || q.status === 'accepted' || q.status === 'final',
        public_token: q.public_token,
        total_amount: q.total_amount,
        content_json: q.canvas_data || q.content_json || {},
        created_at: q.created_at || new Date().toISOString(),
        updated_at: q.updated_at || q.created_at || new Date().toISOString(),
      })),
      ...missingRawVersions.map((rv: any, i: number) => ({
        id: rv.id || `raw_v_${rv.version || i + 1}`,
        template_id: rv.template_id || rv.id,
        lead_id: resolvedLeadId || foundClient.id,
        version: rv.version || i + 1,
        lead_version: rv.version || i + 1,
        title: rv.title,
        is_final: Boolean(rv.is_final),
        public_token: rv.public_token,
        total_amount: rv.total_amount,
        content_json: rv.content_json || {},
        created_at: rv.created_at || new Date().toISOString(),
        updated_at: rv.updated_at || rv.created_at || new Date().toISOString(),
      })),
    ];

    const sortedQuoteRows = combinedQuoteRows.sort((a: any, b: any) => {
      const aExp = a.lead_version !== null && a.lead_version !== undefined && Number(a.lead_version) > 0 ? 1 : 0;
      const bExp = b.lead_version !== null && b.lead_version !== undefined && Number(b.lead_version) > 0 ? 1 : 0;
      if (aExp !== bExp) return bExp - aExp;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    const quotationDocs = sortedQuoteRows.map((d: any, idx: number) => {
      const content = d.content_json || {};
      const tidUpper = String(d.template_id || d.id || '').toUpperCase();
      const rawVer = rawVersionByTid.get(tidUpper);
      const matchedQ = findMatchingQuote(d);
      const tidVerMatch = typeof d.template_id === 'string' ? d.template_id.match(/-V(\d+)-/i) : null;
      const tidVer = tidVerMatch ? parseInt(tidVerMatch[1], 10) : null;
      const explicitLeadVer =
        d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0
          ? Number(d.lead_version)
          : null;
      const resolvedVer =
        explicitLeadVer ||
        (Number(content.lead_version) > 0 ? Number(content.lead_version) : null) ||
        (rawVer?.version && Number(rawVer.version) > 0 ? Number(rawVer.version) : null) ||
        tidVer ||
        (d.version && Number(d.version) > 0 ? Number(d.version) : null) ||
        idx + 1;

      const cover = content.cover || {};
      const coverCouple =
        cover.coupleName ||
        (cover.groomName && cover.brideName
          ? `${cover.groomName} & ${cover.brideName}`
          : cover.groomName || cover.brideName || '');

      const isFinal = Boolean(
        (finalTargetId &&
          (finalTargetId === d.template_id ||
            finalTargetId === d.id ||
            (matchedQ && (matchedQ.id === finalTargetId || matchedQ.quotation_number === finalTargetId)) ||
            (d.template_id && (finalTargetId.includes(d.template_id) || d.template_id.includes(finalTargetId))))) ||
          d.is_final === true ||
          content.is_final === true ||
          rawVer?.is_final === true ||
          matchedQ?.is_final === true ||
          matchedQ?.status === 'accepted' ||
          matchedQ?.status === 'final'
      );

      const totalAmt =
        Number(content?.pricingPage?.finalAmount) ||
        Number(content?.pricing?.finalAmount) ||
        Number(d.total_amount) ||
        Number(rawVer?.total_amount) ||
        Number(matchedQ?.total_amount) ||
        foundClient.total_package_amount ||
        0;

      const versionResponses = allResponses.filter(
        (r: any) => r.quotation_id === d.template_id || Number(r.lead_version) === Number(resolvedVer)
      );

      return {
        id: d.id,
        template_id: d.template_id || d.id,
        lead_id: d.lead_id || resolvedLeadId,
        version: resolvedVer,
        version_label: `Version ${resolvedVer}`,
        title:
          (!isBadVersionTitle(d.title) ? d.title : null) ||
          (!isBadVersionTitle(content.designName) ? content.designName : null) ||
          coverCouple ||
          content?.heroPage?.coupleNames ||
          (!isBadVersionTitle(rawVer?.title) ? rawVer.title : null) ||
          `${foundClient.name || 'Client'} - Quotation V${resolvedVer}`,
        is_final: isFinal,
        updated_at: d.updated_at || d.created_at,
        created_at: d.created_at,
        public_token: d.public_token || matchedQ?.public_token || content?.public_token,
        total_amount: totalAmt,
        content_json: content,
        responseBadge: versionResponses[0]
          ? {
              type: versionResponses[0].response_type,
              label: versionResponses[0].response_type === 'accepted' ? 'Accepted' : 'Budget Discussion',
              clientNotes: versionResponses[0].client_notes,
            }
          : null,
      };
    });

    // 6. Hydrate Post Production Project
    let resolvedPostProdProject: any = postProdRes.data || null;
    const projectTargetIds = [
      foundClient.id,
      resolvedLeadId,
      resolvedPostProdProject?.id,
      resolvedPostProdProject?.project_id,
    ].filter(Boolean);

    let resolvedDeliverables: any[] = Array.isArray(resolvedPostProdProject?.deliverables)
      ? resolvedPostProdProject.deliverables
      : [];
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

    const finalQuoteDoc =
      quotationDocs.find((q: any) => q.is_final === true || q.content_json?.is_final === true) || quotationDocs[0];
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

    // 7. Merge Team Members + Workspace Members + Rates cleanly (matching team-manager/page.tsx)
    const ratesMap = new Map<string, number>();
    (wsRatesRes.data || []).forEach((r: any) => {
      if (r?.team_member_id) ratesMap.set(r.team_member_id, Number(r.daily_rate) || 0);
    });

    const combinedMembersMap = new Map<string, any>();
    (wsMembersRes.data || []).forEach((m: any) => {
      if (m.status === 'REVOKED' || m.status === 'INACTIVE') return;
      const calcRate = ratesMap.has(m.id)
        ? ratesMap.get(m.id)!
        : Number(m.default_daily_rate) || Number(m.daily_rate) || 0;
      const mapped = {
        id: m.id,
        user_id: m.workspace_id || clientWsId,
        auth_user_id: m.auth_user_id || m.user_id || null,
        name: m.name || 'Team Member',
        email: m.email || '',
        phone: m.phone || '',
        phone_number: m.phone || '',
        country_code: m.country_code || '+91',
        role: m.primary_role || m.role || 'Crew',
        primary_role: m.primary_role || m.role || 'Crew',
        roles: Array.isArray(m.roles) ? m.roles : [m.primary_role || m.role || 'Crew'],
        avatar_url: m.avatar_url || '',
        primary_type: m.primary_type || 'IN_HOUSE',
        member_types:
          Array.isArray(m.member_types) && m.member_types.length > 0
            ? m.member_types
            : [m.primary_type || 'IN_HOUSE'],
        default_daily_rate: calcRate,
        default_currency: m.default_currency || 'INR',
        is_active: m.status === 'ACTIVE' || m.status === undefined,
      };
      combinedMembersMap.set(String(m.id), mapped);
    });

    (fwTeamMembersRes.data || []).forEach((f: any) => {
      const calcRate = ratesMap.has(f.id) ? ratesMap.get(f.id)! : Number(f.default_daily_rate) || 0;
      const existingEntry =
        combinedMembersMap.get(String(f.id)) ||
        Array.from(combinedMembersMap.values()).find(
          (cm) =>
            (f.email && cm.email && cm.email.toLowerCase() === f.email.toLowerCase()) ||
            (f.name && cm.name && cm.name.toLowerCase().trim() === f.name.toLowerCase().trim())
        );

      if (existingEntry) {
        if (!existingEntry.avatar_url && f.avatar_url) existingEntry.avatar_url = f.avatar_url;
        if (!existingEntry.default_daily_rate && calcRate > 0) existingEntry.default_daily_rate = calcRate;
        if (!existingEntry.phone_number && f.phone_number) {
          existingEntry.phone_number = f.phone_number;
          existingEntry.phone = f.phone_number;
        }
        if (!existingEntry.primary_role && f.primary_role) {
          existingEntry.primary_role = f.primary_role;
          existingEntry.role = f.primary_role;
        }
      } else {
        combinedMembersMap.set(String(f.id), {
          ...f,
          role: f.primary_role || '',
          phone: f.phone_number || '',
          phone_number: f.phone_number || '',
          primary_type: f.primary_type || 'FREELANCER',
          member_types:
            Array.isArray(f.member_types) && f.member_types.length > 0
              ? f.member_types
              : [f.primary_type || 'FREELANCER'],
          default_daily_rate: calcRate,
          default_currency: f.default_currency || 'INR',
          is_active: f.is_active !== false,
        });
      }
    });

    const mappedTeamMembers = Array.from(combinedMembersMap.values()).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );

    // 8. Pick Best Matching fw_projects Record & Hydrate Sub-Events / Assignments
    const candidateProjects: any[] = (fwProjectsRes.data || []).filter(
      (p: any) => p.user_id === clientWsId || p.user_id === effectiveWsId || p.client_id === foundClient.id
    );
    const clientNameNorm = normalizeNameKey(foundClient.name);

    const matchedFwProjectRaw =
      candidateProjects.find((p: any) => p.client_id === foundClient.id) ||
      (resolvedLeadId ? candidateProjects.find((p: any) => p.lead_id === resolvedLeadId) : null) ||
      (clientNameNorm
        ? candidateProjects.find((p: any) => normalizeNameKey(p.client_name) === clientNameNorm)
        : null) ||
      null;

    let hydratedFwProject: any = null;
    if (matchedFwProjectRaw) {
      const seenSubEvents = new Set<string>();
      const cleanSubEvents = (matchedFwProjectRaw.fw_sub_events || [])
        .filter((se: any) => {
          const normTitle = (se.event_title || se.name || '').trim().toLowerCase();
          const dateStr = se.event_date || '';
          const key = `${normTitle}_${dateStr}`;
          if (seenSubEvents.has(key)) return false;
          seenSubEvents.add(key);
          return true;
        })
        .sort((a: any, b: any) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
        .map((se: any) => ({
          ...se,
          fw_assignments: (se.fw_assignments || []).map((a: any) => {
            const cleanAssigneeName = String(
              a.assigned_member_name || a.clean_name || a.member_name || (a.fw_team_members as any)?.name || ''
            )
              .trim()
              .toLowerCase();
            const isPlaceholder =
              !cleanAssigneeName ||
              ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(cleanAssigneeName) ||
              cleanAssigneeName.startsWith('not fixed');

            const matchedMem =
              a.fw_team_members ||
              (a.assigned_member_id
                ? mappedTeamMembers.find(
                    (m) =>
                      m.id === a.assigned_member_id ||
                      (!isPlaceholder && m.name.trim().toLowerCase() === cleanAssigneeName)
                  )
                : !isPlaceholder
                ? mappedTeamMembers.find((m) => m.name.trim().toLowerCase() === cleanAssigneeName)
                : null);

            return {
              ...a,
              fw_team_members: matchedMem || a.fw_team_members || null,
            };
          }),
        }));

      hydratedFwProject = {
        ...matchedFwProjectRaw,
        client_id: matchedFwProjectRaw.client_id || foundClient.id,
        project_manager_id: matchedFwProjectRaw.project_manager_id || foundClient.project_manager_id || null,
        project_manager_name: matchedFwProjectRaw.project_manager_name || foundClient.project_manager_name || null,
        fw_sub_events: cleanSubEvents,
      };
    }

    const crewRoles =
      Array.isArray(crewRolesRes.data) && crewRolesRes.data.length > 0
        ? crewRolesRes.data
        : DEFAULT_CREW_ROLES;

    return NextResponse.json({
      success: true,
      client: {
        ...foundClient,
        lead_id: foundClient.lead_id || resolvedLeadId || null,
        linkedLeadId: resolvedLeadId || foundClient.lead_id || null,
      },
      quotationDocs,
      fwProject: hydratedFwProject,
      crewRoles,
      postProductionProject: resolvedPostProdProject,
      financeRecord: financeRes.data || null,
      moodboards: moodboardsRes.data || [],
      tasks: tasksRes.data || [],
      teamMembers: mappedTeamMembers,
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

    const { data: existingClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (body.clientUpdate) {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      const allowedFields = [
        'name',
        'phone',
        'email',
        'event_type',
        'event_date',
        'status',
        'project_manager_id',
        'project_manager_name',
        'project_manager_email',
        'project_manager_phone',
        'notes',
        'total_package_amount',
        'paid_amount',
        'handled_by',
        'custom_data',
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

    if (body.financeUpdate) {
      const finPayload = {
        ...body.financeUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('client_finance_records').upsert(finPayload, { onConflict: 'client_id' });
    }

    if (body.postProdUpdate) {
      const ppPayload = {
        ...body.postProdUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('post_production_projects').upsert(ppPayload, { onConflict: 'client_id' });
    }

    return NextResponse.json({ success: true, message: 'Client workspace updated successfully' });
  } catch (err: any) {
    console.error('[API /api/workspace/clients/[id] PATCH] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
