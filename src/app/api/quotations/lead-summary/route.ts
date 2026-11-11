import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { isInvalidCoupleName } from '@/lib/ai-quotation-extractor';

export const runtime = 'nodejs';

import { 
  getLeadSummaryCache, 
  setLeadSummaryCache, 
  deleteLeadSummaryCache, 
  CACHE_TTL_MS 
} from '@/lib/quotation-summary-cache';

const pickCleanCoupleName = (...candidates: Array<string | null | undefined>): string => {
  for (const c of candidates) {
    if (c && !isInvalidCoupleName(c)) {
      return String(c)
        .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return 'Client';
};

const isBadOrEmptyTitle = (title?: string | null): boolean => {
  if (!title) return true;
  const trimmed = String(title).trim();
  if (!trimmed || trimmed.startsWith('FW-')) return true;
  if (/^(?:Wedding Quotation|Wedding - Design 1|Quotation Template)$/i.test(trimmed)) return true;
  if (/^[।|.,:;!?'"\-–—\s]*(?:उनकी|इनकी|उनका|उनके|उनको|मेरी|हमारी)/i.test(trimmed)) return true;
  const prefix = trimmed.split(/\s*-\s*/)[0]?.trim();
  if (prefix && isInvalidCoupleName(prefix)) return true;
  return false;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id') || searchParams.get('studio') || '';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    const workspaceId = authResult.workspaceId || requestedWorkspaceId;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Workspace ID is required' }, { status: 400 });
    }

    // Check memory cache
    const cacheKey = `lead_quote_summary_${workspaceId}`;
    if (forceRefresh) {
      deleteLeadSummaryCache(cacheKey);
    } else {
      const cached = getLeadSummaryCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, summary: cached.data, cached: true });
      }
    }

    const candidateSet = new Set<string>();
    if (workspaceId) candidateSet.add(workspaceId);
    if (authResult.workspaceId) candidateSet.add(authResult.workspaceId);
    if (authResult.userId) candidateSet.add(authResult.userId);
    if (requestedWorkspaceId) candidateSet.add(requestedWorkspaceId);
    const candidates = Array.from(candidateSet);
    const orConditions = candidates.flatMap(c => [`workspace_id.eq.${c}`, `tenant_id.eq.${c}`]).join(',');

    const isValidUUID = (str?: string | null) => {
      if (!str) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    };

    const validUuidCandidates = candidates.filter(isValidUUID);
    const wsOrFilter = validUuidCandidates.length > 0 
      ? validUuidCandidates.map(c => `workspace_id.eq.${c}`).join(',')
      : null;

    // Parallel SCALAR-ONLY fetch (never select TOASTed multi-MB content_json so query runs in <500ms!)
    const docOrFilter = validUuidCandidates.length > 0
      ? `${wsOrFilter},workspace_id.is.null,user_id.in.(${validUuidCandidates.join(',')})`
      : wsOrFilter;

    const [docsRes, quotesRes, leadsRes] = await Promise.all([
      docOrFilter
        ? supabaseAdmin
            .from('quotation_documents')
            .select('id, template_id, lead_id, workspace_id, user_id, version, lead_version, created_at, updated_at')
            .or(docOrFilter)
        : supabaseAdmin
            .from('quotation_documents')
            .select('id, template_id, lead_id, workspace_id, user_id, version, lead_version, created_at, updated_at')
            .limit(200),
      wsOrFilter
        ? supabaseAdmin
            .from('quotations')
            .select('id, client_id, quotation_number, title, couple_names, client_name, status, is_final, public_token, workspace_id, created_at, updated_at')
            .or(wsOrFilter)
        : supabaseAdmin
            .from('quotations')
            .select('id, client_id, quotation_number, title, couple_names, client_name, status, is_final, public_token, workspace_id, created_at, updated_at')
            .limit(200),
      orConditions
        ? supabaseAdmin
            .from('leads')
            .select('id, name, full_name, status, stage_id, final_quotation_id, quotation_id, raw_payload')
            .or(orConditions)
        : supabaseAdmin
            .from('leads')
            .select('id, name, full_name, status, stage_id, final_quotation_id, quotation_id, raw_payload')
    ]);

    const allDocs = docsRes.data || [];
    const allQuotes = quotesRes.data || [];
    const leads = leadsRes.data || [];

    const summary: Record<string, {
      count: number;
      hasFinal: boolean;
      finalVersion?: number;
      versions: any[];
    }> = {};

    const leadMap = new Map<string, {
      name: string;
      coupleName: string;
      finalId: string | null;
      isBooked: boolean;
      rawVersions: any[];
      rawVersionByTid: Map<string, any>;
    }>();
    const rawVersionLeadByTid = new Map<string, string>();
    const leadShortMap = new Map<string, string>();

    leads.forEach((l: any) => {
      const finalId = l.final_quotation_id || l.raw_payload?.final_quotation_id || null;
      const isBooked = (l.status || '').toLowerCase() === 'booked' || 
                       (l.status || '').toLowerCase() === 'closed' ||
                       (l.raw_payload?.stage || '').toLowerCase() === 'booked' ||
                       (l.stage_id && String(l.stage_id).toLowerCase().includes('book')) ||
                       Boolean(finalId);
      const coupleName = pickCleanCoupleName(
        l.raw_payload?.couple_name,
        l.raw_payload?.couple_names,
        (l as any).couple_names,
        (l as any).full_name,
        l.name
      );

      const rawVersions: any[] = Array.isArray(l.raw_payload?.quotation_versions) ? l.raw_payload.quotation_versions : [];
      const rawVersionByTid = new Map<string, any>();
      rawVersions.forEach((rv: any) => {
        const tids = [rv.template_id, rv.id].filter(Boolean);
        tids.forEach((t: string) => {
          const upper = String(t).toUpperCase();
          rawVersionByTid.set(upper, rv);
          rawVersionLeadByTid.set(upper, l.id);
        });
      });

      const lShort = String(l.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
      if (lShort) leadShortMap.set(lShort, l.id);

      leadMap.set(l.id, {
        name: l.name || 'Client',
        coupleName,
        finalId,
        isBooked,
        rawVersions,
        rawVersionByTid
      });
      if (finalId || isBooked) {
        summary[l.id] = { count: 0, hasFinal: true, versions: [] };
      }
    });

    // Filter docs to those belonging to this workspace or matching leads
    const candidateSetRef = new Set(candidates);
    const docs = allDocs.filter((d: any) => 
      candidateSetRef.has(d.workspace_id) ||
      candidateSetRef.has(d.user_id) ||
      !d.workspace_id ||
      leadMap.has(d.lead_id) ||
      (d.template_id && rawVersionLeadByTid.has(String(d.template_id).toUpperCase()))
    );

    // Filter quotes to those belonging to this workspace or matching leads
    const quotes = allQuotes.filter((q: any) =>
      candidateSetRef.has(q.workspace_id) || !q.workspace_id || (q.client_id && leadMap.has(q.client_id))
    );

    const quoteByNum = new Map<string, any>();
    quotes.forEach((q: any) => {
      if (q.quotation_number) {
        const existing = quoteByNum.get(q.quotation_number);
        if (!existing || (!existing.is_final && q.is_final)) {
          quoteByNum.set(q.quotation_number, q);
        }
      }
      const existingId = quoteByNum.get(q.id);
      if (!existingId || (!existingId.is_final && q.is_final)) {
        quoteByNum.set(q.id, q);
      }
    });

    // Group quotation_documents per lead first so unversioned auto-stubs never hide real explicit versions
    const docsByLead = new Map<string, any[]>();
    docs.forEach((d: any) => {
      const tidUpper = String(d.template_id || '').toUpperCase();
      let leadId = d.lead_id || (tidUpper ? rawVersionLeadByTid.get(tidUpper) : undefined);
      if (!leadId && tidUpper) {
        const prefixMatch = tidUpper.match(/^FW-[LQ]-([A-Z0-9]{6,8})-/);
        if (prefixMatch && leadShortMap.has(prefixMatch[1])) {
          leadId = leadShortMap.get(prefixMatch[1]);
        } else {
          for (const [lShort, lId] of leadShortMap.entries()) {
            if (tidUpper.includes(lId.toUpperCase()) || (lShort && (tidUpper.includes(`FW-L-${lShort}`) || tidUpper.includes(`FW-Q-${lShort}`)))) {
              leadId = lId;
              break;
            }
          }
        }
      }
      if (!leadId) return;
      if (!docsByLead.has(leadId)) docsByLead.set(leadId, []);
      docsByLead.get(leadId)!.push(d);
    });

    // 1. Process quotation_documents cleanly per lead
    docsByLead.forEach((leadDocs, leadId) => {
      if (!summary[leadId]) {
        summary[leadId] = { count: 0, hasFinal: false, versions: [] };
      }
      const leadInfo = leadMap.get(leadId);

      // Track explicit lead_version numbers so unversioned (lead_version: null) orphan stubs never overwrite them
      const explicitVerNums = new Set<number>();
      leadDocs.forEach((d: any) => {
        if (d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0) {
          explicitVerNums.add(Number(d.lead_version));
        }
      });

      const orphanSupersededTids = new Set<string>();
      const seenTids = new Set<string>();

      // Sort explicit lead_version > 0 FIRST so they are always preserved cleanly
      const prioritizedDocs = [...leadDocs].sort((a, b) => {
        const aExp = Number(a.lead_version) > 0 ? 1 : 0;
        const bExp = Number(b.lead_version) > 0 ? 1 : 0;
        if (aExp !== bExp) return bExp - aExp;
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      });

      prioritizedDocs.forEach((d: any) => {
        const tidRaw = String(d.template_id || d.id || '');
        const tidUpper = tidRaw.toUpperCase();
        if (!tidUpper || seenTids.has(tidUpper)) return;

        const matchedQ = quoteByNum.get(d.template_id) || quoteByNum.get(d.id);
        const rawVer = leadInfo?.rawVersionByTid.get(tidUpper);

        const isFinal = Boolean(
          matchedQ?.is_final === true ||
          matchedQ?.status === 'accepted' ||
          rawVer?.is_final === true ||
          (leadInfo?.finalId && (
            leadInfo.finalId === d.template_id || 
            leadInfo.finalId === d.id || 
            (d.template_id && (leadInfo.finalId.includes(d.template_id) || d.template_id.includes(leadInfo.finalId)))
          ))
        );

        const tidVerMatch = tidRaw.match(/-V(\d+)-/i);
        const tidVer = tidVerMatch ? parseInt(tidVerMatch[1], 10) : 0;
        const explicitVer = (d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0)
          ? Number(d.lead_version)
          : 0;
        const verNum = explicitVer
          || (rawVer?.version && Number(rawVer.version) > 0 ? Number(rawVer.version) : 0)
          || tidVer
          || (Number(d.version) > 0 ? Number(d.version) : 1);

        // Skip unversioned auto-draft stub (lead_version === null & version === 1) if explicit lead_version docs already exist for that version or lead
        const isUnversionedOrphanStub = !explicitVer && Number(d.version || 1) === 1 && !matchedQ && !isFinal;
        if (isUnversionedOrphanStub && (explicitVerNums.has(verNum) || (explicitVerNums.size > 0 && isBadOrEmptyTitle(rawVer?.title)))) {
          orphanSupersededTids.add(tidUpper);
          return;
        }

        seenTids.add(tidUpper);
        if (isFinal) summary[leadId].hasFinal = true;

        const coupleFromRawTitle = rawVer?.title && !isBadOrEmptyTitle(rawVer.title)
          ? rawVer.title.split(/\s*-\s*/)[0]?.trim()
          : null;

        const coupleName = pickCleanCoupleName(
          rawVer?.couple_name,
          coupleFromRawTitle,
          matchedQ?.couple_names,
          matchedQ?.client_name,
          leadInfo?.coupleName,
          leadInfo?.name
        );

        const candidateTitle = (!isBadOrEmptyTitle(matchedQ?.title) ? matchedQ.title : null)
          || (!isBadOrEmptyTitle(rawVer?.title) ? rawVer.title : null);

        const cleanTitle = candidateTitle || `${coupleName} - Wedding Quotation`;
        const quoteTitle = isFinal && !cleanTitle.toLowerCase().includes('final')
          ? `${coupleName} - Final Quotation`
          : cleanTitle;

        summary[leadId].versions.push({
          id: d.id,
          template_id: d.template_id,
          lead_id: leadId,
          version: verNum,
          version_label: `V${verNum}`,
          title: quoteTitle,
          couple_name: coupleName,
          is_final: isFinal,
          public_token: matchedQ?.public_token || null,
          created_at: d.created_at,
          updated_at: d.updated_at || d.created_at
        });
      });

      // Also retain any valid version recorded in leads.raw_payload.quotation_versions that wasn't returned in docsRes
      (leadInfo?.rawVersions || []).forEach((rv: any) => {
        const tidRaw = String(rv.template_id || rv.id || '');
        const tidUpper = tidRaw.toUpperCase();
        if (!tidUpper || seenTids.has(tidUpper) || orphanSupersededTids.has(tidUpper)) return;
        const verNum = Number(rv.version) || (summary[leadId].versions.length + 1);
        if (explicitVerNums.has(verNum) && isBadOrEmptyTitle(rv.title)) return;
        seenTids.add(tidUpper);

        const isFinal = Boolean(
          rv.is_final === true ||
          (leadInfo?.finalId && (leadInfo.finalId === tidRaw || tidRaw.includes(leadInfo.finalId)))
        );
        if (isFinal) summary[leadId].hasFinal = true;

        const coupleFromRaw = rv.title && !isBadOrEmptyTitle(rv.title) ? rv.title.split(/\s*-\s*/)[0]?.trim() : null;
        const coupleName = pickCleanCoupleName(rv.couple_name, coupleFromRaw, leadInfo?.coupleName, leadInfo?.name);
        const cleanTitle = !isBadOrEmptyTitle(rv.title) ? rv.title : `${coupleName} - Wedding Quotation`;

        summary[leadId].versions.push({
          id: rv.id || tidRaw,
          template_id: tidRaw,
          lead_id: leadId,
          version: verNum,
          version_label: rv.version_label || `V${verNum}`,
          title: isFinal && !cleanTitle.toLowerCase().includes('final') ? `${coupleName} - Final Quotation` : cleanTitle,
          couple_name: coupleName,
          is_final: isFinal,
          public_token: rv.public_token || null,
          created_at: rv.created_at,
          updated_at: rv.updated_at || rv.created_at
        });
      });
    });

    // Also include leads that only have versions inside raw_payload.quotation_versions (e.g. brand-new doc just saved)
    leadMap.forEach((leadInfo, leadId) => {
      if (docsByLead.has(leadId) || leadInfo.rawVersions.length === 0) return;
      if (!summary[leadId]) {
        summary[leadId] = { count: 0, hasFinal: false, versions: [] };
      }
      const seenTids = new Set<string>();
      leadInfo.rawVersions.forEach((rv: any, idx: number) => {
        const tidRaw = String(rv.template_id || rv.id || '');
        const tidUpper = tidRaw.toUpperCase();
        if (!tidUpper || seenTids.has(tidUpper)) return;
        seenTids.add(tidUpper);
        const verNum = Number(rv.version) || (idx + 1);
        const isFinal = Boolean(rv.is_final === true || (leadInfo.finalId && leadInfo.finalId === tidRaw));
        if (isFinal) summary[leadId].hasFinal = true;
        const coupleFromRaw = rv.title && !isBadOrEmptyTitle(rv.title) ? rv.title.split(/\s*-\s*/)[0]?.trim() : null;
        const coupleName = pickCleanCoupleName(rv.couple_name, coupleFromRaw, leadInfo.coupleName, leadInfo.name);
        const cleanTitle = !isBadOrEmptyTitle(rv.title) ? rv.title : `${coupleName} - Wedding Quotation`;
        summary[leadId].versions.push({
          id: rv.id || tidRaw,
          template_id: tidRaw,
          lead_id: leadId,
          version: verNum,
          version_label: rv.version_label || `V${verNum}`,
          title: isFinal && !cleanTitle.toLowerCase().includes('final') ? `${coupleName} - Final Quotation` : cleanTitle,
          couple_name: coupleName,
          is_final: isFinal,
          public_token: rv.public_token || null,
          created_at: rv.created_at,
          updated_at: rv.updated_at || rv.created_at
        });
      });
    });

    // 2. Process quotations table (legacy or additional versions)
    quotes.forEach((q: any) => {
      const leadId = q.client_id;
      if (!leadId) return;

      if (!summary[leadId]) {
        summary[leadId] = { count: 0, hasFinal: false, versions: [] };
      }

      const leadInfo = leadMap.get(leadId);
      const isFinal = Boolean(
        q.is_final === true || 
        q.status === 'accepted' ||
        (leadInfo?.finalId && (leadInfo.finalId === q.id || leadInfo.finalId === q.quotation_number))
      );

      if (isFinal) {
        summary[leadId].hasFinal = true;
      }

      const existingDoc = summary[leadId].versions.find(
        (v: any) =>
          String(v.template_id || '').toUpperCase() === String(q.quotation_number || q.id || '').toUpperCase() ||
          v.id === q.id
      );

      const coupleName = pickCleanCoupleName(q.couple_names, q.client_name, leadInfo?.coupleName, leadInfo?.name);

      if (existingDoc) {
        if (isFinal) existingDoc.is_final = true;
        if (!isBadOrEmptyTitle(q.title)) {
          if (existingDoc.is_final && !q.title.toLowerCase().includes('final')) {
            existingDoc.title = `${coupleName} - Final Quotation`;
          } else {
            existingDoc.title = q.title;
          }
        }
        if (q.public_token) existingDoc.public_token = q.public_token;
        if (isInvalidCoupleName(existingDoc.couple_name) && coupleName) existingDoc.couple_name = coupleName;
      } else {
        const tidStr = String(q.quotation_number || q.id || '');
        const tidVerMatch = tidStr.match(/-V(\d+)-/i);
        const verNum = tidVerMatch ? parseInt(tidVerMatch[1], 10) : (summary[leadId].versions.length + 1);
        summary[leadId].versions.push({
          id: q.id,
          template_id: tidStr,
          lead_id: leadId,
          version: verNum,
          version_label: `V${verNum}`,
          title: !isBadOrEmptyTitle(q.title) ? q.title : `${coupleName} - Quotation V${verNum}`,
          couple_name: coupleName,
          is_final: isFinal,
          public_token: q.public_token || null,
          created_at: q.created_at,
          updated_at: q.updated_at || q.created_at
        });
      }
    });

    // Finalize counts and sorting for each lead
    Object.keys(summary).forEach((lid) => {
      const item = summary[lid];
      item.count = item.versions.length;
      item.versions.sort((a, b) => b.version - a.version);

      const leadInfo = leadMap.get(lid);
      const leadFinalId = leadInfo?.finalId;
      const finalVerItem = item.versions.find((v: any) => v.is_final);
      if (finalVerItem) {
        item.hasFinal = true;
        item.finalVersion = finalVerItem.version;
      } else if (leadFinalId) {
        const leadShort = leadFinalId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
        const matched = item.versions.find((v: any) => 
          v.template_id === leadFinalId || 
          v.id === leadFinalId ||
          (leadShort && v.template_id && v.template_id.includes(leadShort))
        );
        if (matched) {
          matched.is_final = true;
          item.hasFinal = true;
          item.finalVersion = matched.version;
          if (!matched.title.toLowerCase().includes('final')) {
            matched.title = `${matched.couple_name || 'Client'} - Final Quotation`;
          }
        } else {
          item.hasFinal = true;
          if (item.versions[0]) {
            item.versions[0].is_final = true;
            item.finalVersion = item.versions[0].version;
          }
        }
      } else if (leadInfo?.isBooked && item.versions.length > 0) {
        item.hasFinal = true;
        item.finalVersion = item.versions[0]?.version || 1;
        if (item.versions[0] && !item.versions[0].title.toLowerCase().includes('final')) {
          item.versions[0].is_final = true;
          item.versions[0].title = `${item.versions[0].couple_name || 'Client'} - Final Quotation`;
        }
      } else {
        item.hasFinal = false;
      }
    });

    // Save to server memory cache
    setLeadSummaryCache(cacheKey, summary);

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      summary,
      total_leads_with_quotations: Object.keys(summary).length
    });
  } catch (err: any) {
    console.error('[Quotation Lead Summary Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch quotation summary' }, { status: 500 });
  }
}
