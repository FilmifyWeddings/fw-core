import { supabaseAdmin } from '@/lib/supabase';

const isBadVersionTitle = (title?: string | null): boolean => {
  if (!title) return true;
  const trimmed = String(title).trim();
  if (!trimmed || trimmed.startsWith('FW-')) return true;
  if (/^(?:Wedding Quotation|Wedding - Design 1|Quotation Template)$/i.test(trimmed)) return true;
  const prefix = trimmed.split(/\s*-\s*/)[0]?.trim();
  if (!prefix || prefix.length < 2) return true;
  return false;
};

export const normalizePhoneLast10 = (phone?: string | null): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const normalizeNameKey = (name?: string | null): string => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Strips heavy presentation-only fields (pages, galleryImages, terms, base64 blobs, etc.)
 * from quotation content_json while preserving all fields needed by Client Directory,
 * Finance Sync, Events Sync, and Post-Production Sync.
 * Shrinks payload size from ~600KB down to ~5-15KB.
 */
export function slimQuotationContentJson(content: any): any {
  if (!content || typeof content !== 'object') return {};
  const slim: Record<string, any> = {};

  if (content.lead_version !== undefined) slim.lead_version = content.lead_version;
  if (content.is_final !== undefined) slim.is_final = content.is_final;
  if (content.designName !== undefined) slim.designName = content.designName;
  if (content.lead_id !== undefined) slim.lead_id = content.lead_id;

  if (content.cover && typeof content.cover === 'object') {
    slim.cover = {
      coupleName: content.cover.coupleName,
      groomName: content.cover.groomName,
      brideName: content.cover.brideName,
    };
  }

  if (content.heroPage && typeof content.heroPage === 'object') {
    slim.heroPage = {
      coupleNames: content.heroPage.coupleNames,
    };
  }

  if (content.functionsPage !== undefined) slim.functionsPage = content.functionsPage;
  if (content.shootDetails !== undefined) slim.shootDetails = content.shootDetails;
  if (content.pricingPage !== undefined) slim.pricingPage = content.pricingPage;
  if (content.pricing !== undefined) slim.pricing = content.pricing;
  if (content.paymentSchedule !== undefined) slim.paymentSchedule = content.paymentSchedule;
  if (content.packagePricing !== undefined) slim.packagePricing = content.packagePricing;
  if (content.discount !== undefined) slim.discount = content.discount;
  if (content.taxes !== undefined) slim.taxes = content.taxes;
  if (content.deliverablesPage !== undefined) slim.deliverablesPage = content.deliverablesPage;
  if (content.deliverables !== undefined) slim.deliverables = content.deliverables;
  if (content.preWeddingDeliverables !== undefined) slim.preWeddingDeliverables = content.preWeddingDeliverables;
  if (content.addOns !== undefined) slim.addOns = content.addOns;

  return slim;
}

export interface LoadedClientQuotations {
  quotationDocs: any[];
  resolvedLeadId: string | null;
  resolvedLeadRow: any | null;
  finalTargetId: string | null;
}

/**
 * Resolves a client's linked lead and all quotation versions in minimal DB round-trips,
 * avoiding 300-row raw_payload scans and returning slimmed payloads in milliseconds.
 */
export async function loadClientQuotationsFast(
  foundClient: any,
  clientWsId: string
): Promise<LoadedClientQuotations> {
  // 1. Resolve Linked Lead ID & Metadata without downloading 300 raw_payload JSONs
  let resolvedLeadRow: any = null;
  const leadSelectCols = 'id, workspace_id, user_id, client_id, name, full_name, email, phone, quotation_id, final_quotation_id, raw_payload';

  if (foundClient.lead_id) {
    const { data: directLead } = await supabaseAdmin
      .from('leads')
      .select(leadSelectCols)
      .eq('id', foundClient.lead_id)
      .maybeSingle();
    if (directLead) resolvedLeadRow = directLead;
  }

  if (!resolvedLeadRow) {
    const { data: linkedByClient } = await supabaseAdmin
      .from('leads')
      .select(leadSelectCols)
      .eq('client_id', foundClient.id)
      .limit(1)
      .maybeSingle();
    if (linkedByClient) resolvedLeadRow = linkedByClient;
  }

  if (!resolvedLeadRow && (foundClient.phone || foundClient.name)) {
    try {
      // Lightweight scan: do NOT select raw_payload across 300 rows
      const { data: wsLeads } = await supabaseAdmin
        .from('leads')
        .select('id, client_id, name, full_name, phone')
        .or(`workspace_id.eq.${clientWsId},user_id.eq.${clientWsId}`)
        .order('created_at', { ascending: false })
        .limit(300);

      if (wsLeads && wsLeads.length > 0) {
        const targetPhone = normalizePhoneLast10(foundClient.phone);
        const targetName = normalizeNameKey(foundClient.name);

        const matchedStub =
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

        if (matchedStub?.id) {
          const { data: fullLead } = await supabaseAdmin
            .from('leads')
            .select(leadSelectCols)
            .eq('id', matchedStub.id)
            .maybeSingle();
          if (fullLead) resolvedLeadRow = fullLead;
        }
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

  const [quoteDocsRes, quotationsRes, responsesRes] = await Promise.all([
    supabaseAdmin
      .from('quotation_documents')
      .select('id, template_id, lead_id, client_id, lead_version, version, title, is_final, total_amount, public_token, created_at, updated_at, content_json')
      .or(docOrFilters.join(','))
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('quotations')
      .select('id, quotation_number, client_id, title, is_final, status, total_amount, public_token, created_at, updated_at')
      .or(quotesOrFilters.join(','))
      .order('created_at', { ascending: false }),
    resolvedLeadId
      ? supabaseAdmin
          .from('quotation_responses')
          .select('quotation_id, lead_version, response_type, client_name, client_notes, budget_amount, created_at')
          .eq('lead_id', resolvedLeadId)
      : Promise.resolve({ data: [], error: null }),
  ]);

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

  const clientNotesJson = (() => {
    try {
      return typeof foundClient?.notes === 'string' ? JSON.parse(foundClient.notes) : foundClient?.notes || {};
    } catch (_) {
      return {};
    }
  })();

  const finalTargetId =
    foundClient?.final_quotation_id ||
    clientNotesJson?.final_quotation_id ||
    resolvedLeadRow?.final_quotation_id ||
    rawPayload?.final_quotation_id ||
    null;

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
        (q.quotation_number && doc.template_id && q.quotation_number === doc.template_id) ||
        q.id === doc.id
    );

  const seenMatchedDocKeys = new Set<string>();
  const activeMatchedDocs = matchedDocs.filter((d: any) => {
    const tidUpper = String(d.template_id || d.id || '').toUpperCase();
    if (!tidUpper || seenMatchedDocKeys.has(tidUpper)) return false;

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
    const hasContent = Boolean(d.content_json && Object.keys(d.content_json).length > 0);

    if (!explicitVer && !hasContent && !matchedQ && !isFinalMatch && tidVer > 0 && explicitVerNums.has(tidVer)) {
      return false;
    }

    seenMatchedDocKeys.add(tidUpper);
    return true;
  });

  const existingKeys = new Set(
    activeMatchedDocs.flatMap((d: any) => [d.template_id, d.id].filter(Boolean).map((s: string) => s.toUpperCase()))
  );

  const orphanQuotes = allQuotes.filter((q: any) => {
    const qKey = String(q.quotation_number || q.id || '').toUpperCase();
    return qKey && !existingKeys.has(qKey) && !existingKeys.has(String(q.id).toUpperCase());
  });

  const seenRawKeys = new Set<string>();
  const missingRawVersions = rawVersions.filter((rv: any) => {
    const rId = String(rv?.template_id || rv?.id || '').toUpperCase();
    if (!rId || seenRawKeys.has(rId)) return false;
    seenRawKeys.add(rId);
    return (
      !existingKeys.has(rId) &&
      !orphanQuotes.some(
        (q: any) =>
          String(q.id || '').toUpperCase() === rId || String(q.quotation_number || '').toUpperCase() === rId
      )
    );
  });

  const combinedQuoteRows = [
    ...activeMatchedDocs,
    ...orphanQuotes.map((q: any, idx: number) => ({
      id: q.id,
      template_id: q.quotation_number || q.id,
      lead_id: resolvedLeadId,
      lead_version: activeMatchedDocs.length + idx + 1,
      title: q.title,
      is_final: q.is_final === true || q.status === 'accepted' || q.status === 'final',
      total_amount: q.total_amount,
      public_token: q.public_token,
      created_at: q.created_at,
      updated_at: q.updated_at || q.created_at,
      content_json: {},
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

  let authoritativeFinalKey: string | null = null;
  if (finalTargetId) {
    const exactFinal = sortedQuoteRows.find((d: any) => {
      const matchedQ = findMatchingQuote(d);
      return (
        d.template_id === finalTargetId ||
        d.id === finalTargetId ||
        (matchedQ && (matchedQ.id === finalTargetId || matchedQ.quotation_number === finalTargetId))
      );
    });
    if (exactFinal) {
      authoritativeFinalKey = String(exactFinal.template_id || exactFinal.id);
    }
  }
  if (!authoritativeFinalKey) {
    const colFinal = [...sortedQuoteRows]
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .find((d: any) => {
        const tidUpper = String(d.template_id || d.id || '').toUpperCase();
        const rawVer = rawVersionByTid.get(tidUpper);
        const matchedQ = findMatchingQuote(d);
        return Boolean(
          d.is_final === true ||
            rawVer?.is_final === true ||
            matchedQ?.is_final === true ||
            matchedQ?.status === 'accepted' ||
            matchedQ?.status === 'final'
        );
      });
    if (colFinal) {
      authoritativeFinalKey = String(colFinal.template_id || colFinal.id);
    }
  }
  if (!authoritativeFinalKey) {
    const contentFinal = [...sortedQuoteRows]
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .find((d: any) => d.content_json?.is_final === true);
    if (contentFinal) {
      authoritativeFinalKey = String(contentFinal.template_id || contentFinal.id);
    }
  }

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

    const docKey = String(d.template_id || d.id);
    const isFinal = Boolean(authoritativeFinalKey && docKey === authoritativeFinalKey);

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
      public_token: d.public_token || matchedQ?.public_token,
      total_amount: totalAmt,
      content_json: slimQuotationContentJson(content),
      responseBadge: versionResponses[0]
        ? {
            type: versionResponses[0].response_type,
            label: versionResponses[0].response_type === 'accepted' ? 'Accepted' : 'Budget Discussion',
            clientNotes: versionResponses[0].client_notes,
          }
        : null,
    };
  });

  return {
    quotationDocs,
    resolvedLeadId,
    resolvedLeadRow,
    finalTargetId,
  };
}
