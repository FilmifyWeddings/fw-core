import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { extractCoupleNameFromQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

import { 
  getLeadSummaryCache, 
  setLeadSummaryCache, 
  deleteLeadSummaryCache, 
  CACHE_TTL_MS 
} from '@/lib/quotation-summary-cache';

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

    // Parallel fetch: quotation_documents (metadata only), quotations, and leads
    const [docsRes, quotesRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, workspace_id, version, lead_version, content_json, created_at, updated_at')
        .not('lead_id', 'is', null),
      supabaseAdmin
        .from('quotations')
        .select('id, client_id, quotation_number, title, couple_names, client_name, status, is_final, public_token, workspace_id, created_at, updated_at'),
      supabaseAdmin
        .from('leads')
        .select('id, name, client_name, status, final_quotation_id, quotation_id, raw_payload')
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
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

    const leadMap = new Map<string, { name: string; coupleName: string; finalId: string | null; isBooked: boolean }>();
    leads.forEach((l: any) => {
      // Check final quotation id strictly (do NOT treat draft quotation_id as final!)
      const finalId = l.final_quotation_id || l.raw_payload?.final_quotation_id || null;
      const isBooked = (l.status || '').toLowerCase() === 'booked' || (l.status || '').toLowerCase() === 'closed';
      const coupleName = l.raw_payload?.couple_name || l.raw_payload?.couple_names || (l as any).couple_names || l.client_name || l.name || 'Client';

      leadMap.set(l.id, {
        name: l.name || 'Client',
        coupleName,
        finalId,
        isBooked
      });
      if (finalId || isBooked) {
        summary[l.id] = { count: 0, hasFinal: true, versions: [] };
      }
    });

    // Filter docs to those belonging to this workspace or matching leads
    const docs = allDocs.filter((d: any) => 
      d.workspace_id === workspaceId || !d.workspace_id || leadMap.has(d.lead_id)
    );

    // Filter quotes to those belonging to this workspace or matching leads
    const quotes = allQuotes.filter((q: any) =>
      q.workspace_id === workspaceId || !q.workspace_id || (q.client_id && leadMap.has(q.client_id))
    );

    const quoteByNum = new Map<string, any>();
    quotes.forEach((q: any) => {
      // Prioritize is_final: true quotations so a draft quotation never overwrites a final quotation!
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
      if (q.client_id) {
        const existingClient = quoteByNum.get(q.client_id);
        if (!existingClient || (!existingClient.is_final && q.is_final)) {
          quoteByNum.set(q.client_id, q);
        }
      }
    });

    // 1. Process quotation_documents
    docs.forEach((d: any) => {
      const leadId = d.lead_id;
      if (!leadId) return;

      if (!summary[leadId]) {
        summary[leadId] = { count: 0, hasFinal: false, versions: [] };
      }

      const leadInfo = leadMap.get(leadId);
      const matchedQ = quoteByNum.get(d.template_id) || quoteByNum.get(d.id);
      const isDocFinal = d.content_json?.is_final === true;
      const isFinal = Boolean(
        isDocFinal ||
        matchedQ?.is_final === true ||
        matchedQ?.status === 'accepted' ||
        (leadInfo?.finalId && (leadInfo.finalId === d.template_id || leadInfo.finalId === d.id))
      );

      if (isFinal) {
        summary[leadId].hasFinal = true;
      }

      const verNum = Number(d.lead_version || d.version || 1);
      const content = d.content_json || {};
      const cover = content.cover || {};
      const coupleFromCover = cover.coupleName 
        || (cover.groomName && cover.brideName ? `${cover.groomName} & ${cover.brideName}` : (cover.groomName || cover.brideName || ''));

      const coupleName = coupleFromCover
        || matchedQ?.couple_names 
        || matchedQ?.client_name 
        || leadInfo?.coupleName 
        || leadInfo?.name 
        || 'Client';

      const eventType = (cover.eventType || content.eventGroup || 'Wedding').replace(/quotation/i, '').trim();
      const rawTitle = content.designName || content.title || matchedQ?.title;
      const cleanTitle = (rawTitle && !rawTitle.startsWith('FW-') && rawTitle !== 'Wedding - Design 1')
        ? rawTitle
        : `${coupleName} - ${eventType} Quotation`;

      const quoteTitle = isFinal && !cleanTitle.includes('Final') 
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
        content_json: { cover },
        is_final: isFinal,
        public_token: matchedQ?.public_token || null,
        created_at: d.created_at,
        updated_at: d.updated_at || d.created_at
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
        (v: any) => v.template_id === (q.quotation_number || q.id) || v.id === q.id
      );

      const coupleName = q.couple_names || q.client_name || leadInfo?.coupleName || leadInfo?.name || 'Client';

      if (existingDoc) {
        if (isFinal) existingDoc.is_final = true;
        if (q.title && !q.title.startsWith('FW-') && q.title !== 'Wedding - Design 1') existingDoc.title = q.title;
        if (q.public_token) existingDoc.public_token = q.public_token;
        if (!existingDoc.couple_name && coupleName) existingDoc.couple_name = coupleName;
      } else {
        const verNum = summary[leadId].versions.length + 1;
        summary[leadId].versions.push({
          id: q.id,
          template_id: q.quotation_number || q.id,
          lead_id: leadId,
          version: verNum,
          version_label: `V${verNum}`,
          title: q.title || `${coupleName} - Quotation V${verNum}`,
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
        const matched = item.versions.find((v: any) => v.template_id === leadFinalId || v.id === leadFinalId);
        if (matched) {
          matched.is_final = true;
          item.hasFinal = true;
          item.finalVersion = matched.version;
        } else {
          item.hasFinal = false;
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
