import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { extractCoupleNameFromQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

// Fast server-side memory cache with 15-second TTL
const summaryCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 15 * 1000;

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
      summaryCache.delete(cacheKey);
    } else {
      const cached = summaryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, summary: cached.data, cached: true });
      }
    }

    // Parallel fetch: quotation_documents (metadata only), quotations, and leads
    const [docsRes, quotesRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, workspace_id, version, lead_version, created_at, updated_at')
        .not('lead_id', 'is', null),
      supabaseAdmin
        .from('quotations')
        .select('id, client_id, quotation_number, title, status, is_final, public_token, workspace_id, created_at, updated_at'),
      supabaseAdmin
        .from('leads')
        .select('id, name, status, final_quotation_id, quotation_id, raw_payload')
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
      // Check final quotation id in direct column or raw_payload, or booked status
      const finalId = l.final_quotation_id || l.raw_payload?.final_quotation_id || l.raw_payload?.quotation_id || l.quotation_id || null;
      const isBooked = (l.status as string) === 'booked' || l.status === 'closed';
      const coupleName = l.raw_payload?.couple_name || l.name || 'Client';

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
      if (q.quotation_number) quoteByNum.set(q.quotation_number, q);
      quoteByNum.set(q.id, q);
      if (q.client_id && !quoteByNum.has(q.client_id)) quoteByNum.set(q.client_id, q);
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
      const isFinal = Boolean(
        matchedQ?.is_final === true ||
        matchedQ?.status === 'accepted' ||
        (leadInfo?.finalId && (leadInfo.finalId === d.template_id || leadInfo.finalId === d.id))
      );

      if (isFinal) {
        summary[leadId].hasFinal = true;
      }

      const verNum = Number(d.lead_version || d.version || 1);
      const quoteTitle = matchedQ?.title || (leadInfo?.coupleName ? `${leadInfo.coupleName} - Quotation V${verNum}` : `${leadInfo?.name || 'Client'} - Quotation V${verNum}`);

      summary[leadId].versions.push({
        id: d.id,
        template_id: d.template_id,
        lead_id: leadId,
        version: verNum,
        version_label: `V${verNum}`,
        title: isFinal && !quoteTitle.includes('Final') ? `${leadInfo?.coupleName || leadInfo?.name || 'Client'} - Final Quotation` : quoteTitle,
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

      if (existingDoc) {
        if (isFinal) existingDoc.is_final = true;
        if (q.title) existingDoc.title = q.title;
        if (q.public_token) existingDoc.public_token = q.public_token;
      } else {
        const verNum = summary[leadId].versions.length + 1;
        summary[leadId].versions.push({
          id: q.id,
          template_id: q.quotation_number || q.id,
          lead_id: leadId,
          version: verNum,
          version_label: `V${verNum}`,
          title: q.title || (leadInfo?.coupleName ? `${leadInfo.coupleName} - Quotation V${verNum}` : `${leadInfo?.name || 'Client'} - Quotation V${verNum}`),
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
        item.hasFinal = true;
        const matched = item.versions.find((v: any) => v.template_id === leadFinalId || v.id === leadFinalId);
        if (matched) {
          matched.is_final = true;
          item.finalVersion = matched.version;
        } else if (item.versions.length > 0) {
          item.finalVersion = item.versions[0].version;
          item.versions[0].is_final = true;
        }
      } else if (leadInfo?.isBooked && item.versions.length > 0) {
        item.hasFinal = true;
        item.finalVersion = item.versions[0].version;
        item.versions[0].is_final = true;
      } else {
        item.hasFinal = false;
      }
    });

    // Save to server memory cache
    summaryCache.set(cacheKey, { timestamp: Date.now(), data: summary });

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
