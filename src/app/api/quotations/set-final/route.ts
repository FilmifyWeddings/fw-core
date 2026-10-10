import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractCoupleNameFromQuotation, syncBookedLeadOrFinalQuotation } from '@/lib/quotation-finance-sync';
import { clearLeadSummaryCache } from '@/lib/quotation-summary-cache';

export const runtime = 'nodejs';

/**
 * POST /api/quotations/set-final
 * Marks or Unmarks a specific quotation version as the "Final Quotation" for a lead.
 * Synchronizes budget, breakdowns, and payment terms into Finance & Payments!
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const { quotationId, leadId, unmark = false, isFinal } = body;

    const shouldUnmark = unmark === true || isFinal === false;

    if (!quotationId || !leadId) {
      return NextResponse.json({ error: 'quotationId and leadId are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const isValidUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const isQuotationUUID = isValidUUID(quotationId);
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

    // 1. Fetch all quotation documents for this lead or matching target quotationId
    let docsQuery = supabaseAdmin
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json');

    if (isQuotationUUID) {
      docsQuery = docsQuery.or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%,template_id.eq.${quotationId},id.eq.${quotationId}`);
    } else {
      docsQuery = docsQuery.or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%,template_id.eq.${quotationId}`);
    }

    let { data: allDocs } = await docsQuery;

    if (!allDocs || allDocs.length === 0) {
      let directQuery = supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, version, lead_version, content_json');

      if (isQuotationUUID) {
        directQuery = directQuery.or(`template_id.eq.${quotationId},id.eq.${quotationId}`);
      } else {
        directQuery = directQuery.eq('template_id', quotationId);
      }
      const { data: directDoc } = await directQuery.maybeSingle();
      if (directDoc) {
        allDocs = [directDoc];
      }
    }

    let finalDoc: any = null;

    if (allDocs && allDocs.length > 0) {
      await Promise.all(allDocs.map(async (doc: any) => {
        const isTarget = doc.template_id === quotationId || 
          (isQuotationUUID && doc.id === quotationId) ||
          (doc.template_id && quotationId && (doc.template_id.includes(quotationId) || quotationId.includes(doc.template_id)));
        const updatedContent = { ...(doc.content_json || {}) };
        
        if (shouldUnmark) {
          updatedContent.is_final = false;
        } else {
          updatedContent.is_final = isTarget;
          if (isTarget) {
            updatedContent.lead_id = leadId;
            finalDoc = { ...doc, lead_id: leadId, content_json: updatedContent };
          }
        }

        const updatePayload: any = {
          content_json: updatedContent,
          lead_id: leadId,
          updated_at: now
        };

        const { error: docUpdateErr } = await supabaseAdmin
          .from('quotation_documents')
          .update(updatePayload)
          .eq('id', doc.id);

        if (docUpdateErr) {
          console.warn('[Set-Final] Warning updating quotation_document:', docUpdateErr.message);
        }
      }));
    }

    // Fetch current lead details
    const { data: currentLead } = await supabaseAdmin
      .from('leads')
      .select('id, name, full_name, raw_payload, status, stage_id, workspace_id')
      .eq('id', leadId)
      .maybeSingle();

    const rawLeadCouple = 
      currentLead?.raw_payload?.couple_name ||
      currentLead?.raw_payload?.couple_names ||
      (currentLead as any)?.couple_names ||
      ((currentLead as any)?.full_name && !['client', 'valued client', 'lead'].includes((currentLead as any).full_name.toLowerCase().trim()) ? (currentLead as any).full_name : '') ||
      (currentLead?.name && !['client', 'valued client', 'lead'].includes(currentLead.name.toLowerCase().trim()) ? currentLead.name : '');

    const clientName = finalDoc?.content_json 
      ? extractCoupleNameFromQuotation(finalDoc.content_json, rawLeadCouple)
      : (rawLeadCouple || 'Client');

    // Query workspace stages to resolve the exact 'Booked' stage UUID if available
    let bookedStageId: string | null = null;
    let bookedStageName = 'Booked';
    try {
      const targetWs = currentLead?.workspace_id || userId;
      const { data: wsStages } = await supabaseAdmin
        .from('crm_stages')
        .select('id, name')
        .or(`workspace_id.eq.${targetWs},workspace_id.eq.${userId}`);

      const matchedStage = (wsStages || []).find((s: any) =>
        s.id === 'booked' || String(s.name || '').toLowerCase().includes('book')
      );
      if (matchedStage?.id && isValidUUID(matchedStage.id)) {
        bookedStageId = matchedStage.id;
        bookedStageName = matchedStage.name || 'Booked';
      }
    } catch (_) {}

    // 2 & 3. Parallel update quotations and leads tables
    await Promise.all([
      (async () => {
        try {
          if (shouldUnmark) {
            await supabaseAdmin
              .from('quotations')
              .update({ status: 'draft', is_final: false, updated_at: now })
              .eq('client_id', leadId);
          } else {
            await supabaseAdmin
              .from('quotations')
              .update({ status: 'draft', is_final: false, updated_at: now })
              .eq('client_id', leadId);

            const quoteTitle = clientName ? `${clientName} - Final Quotation` : 'Final Quotation';

            const matchFilter = isQuotationUUID
              ? `id.eq.${quotationId},quotation_number.eq.${quotationId}`
              : `quotation_number.eq.${quotationId}`;

            const { data: existingRows } = await supabaseAdmin
              .from('quotations')
              .select('id, quotation_number')
              .or(matchFilter);

            if (existingRows && existingRows.length > 0) {
              const primaryId = existingRows[0].id;
              await supabaseAdmin
                .from('quotations')
                .update({
                  client_id: leadId,
                  title: quoteTitle,
                  client_name: clientName || undefined,
                  couple_names: clientName || undefined,
                  status: 'accepted',
                  is_final: true,
                  updated_at: now
                })
                .or(matchFilter);

              // Clean up any stale duplicate quotations with the same quotation_number
              try {
                await supabaseAdmin
                  .from('quotations')
                  .delete()
                  .eq('quotation_number', quotationId)
                  .neq('id', primaryId);
              } catch (_) {}
            } else {
              await supabaseAdmin
                .from('quotations')
                .insert({
                  quotation_number: quotationId,
                  user_id: userId,
                  client_id: leadId,
                  title: quoteTitle,
                  client_name: clientName || undefined,
                  couple_names: clientName || undefined,
                  status: 'accepted',
                  is_final: true,
                  created_at: now,
                  updated_at: now
                });
            }
          }
        } catch (qErr) {
          console.error('[Set-Final] Error syncing quotations table:', qErr);
        }
      })(),
      (async () => {
        try {
          const currentPayload = currentLead?.raw_payload || {};
          const updatedPayload = {
            ...currentPayload,
            final_quotation_id: shouldUnmark ? null : quotationId,
            quotation_id: shouldUnmark ? null : quotationId,
            ...(clientName ? { couple_name: clientName } : {})
          };

          const updateLeadPayload: any = {
            final_quotation_id: shouldUnmark ? null : quotationId,
            quotation_id: shouldUnmark ? null : quotationId,
            raw_payload: updatedPayload,
            updated_at: now
          };

          const { error: leadErr } = await supabaseAdmin
            .from('leads')
            .update(updateLeadPayload)
            .eq('id', leadId);

          if (leadErr) {
            console.error('[Set-Final] Error updating lead table:', leadErr);
          }
        } catch (lErr) {
          console.error('[Set-Final] Error updating lead raw_payload and final_quotation_id:', lErr);
        }
      })()
    ]);

    clearLeadSummaryCache();

    // Audit logging into live_logs
    try {
      const actor = body.actor_name || 'Studio Admin';
      const versionNum = finalDoc?.lead_version || finalDoc?.version || body.version || 1;
      const rawTitle = finalDoc?.title || finalDoc?.content_json?.designName || finalDoc?.content_json?.title || clientName || 'Quotation';
      const cleanTitle = (rawTitle && !rawTitle.startsWith('FW-') && rawTitle !== 'Wedding - Design 1')
        ? rawTitle
        : `${clientName || 'Quotation'} - Quotation V${versionNum}`;

      let logWsId = currentLead?.workspace_id;
      if (!isValidUUID(logWsId)) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
        logWsId = prof?.id;
      }
      if (isValidUUID(logWsId)) {
        await supabaseAdmin.from('live_logs').insert({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: shouldUnmark 
            ? `${actor} unfinalized Quotation V${versionNum} ("${cleanTitle}")`
            : `${actor} marked Quotation V${versionNum} ("${cleanTitle}") as Final Quotation`,
          metadata: {
            action_type: shouldUnmark ? 'quote_unfinal' : 'quote_final',
            actor_name: actor,
            quotation_id: quotationId,
            version: versionNum,
            title: cleanTitle,
            logged_at: now
          }
        });
      }
    } catch (_) {}

    if (shouldUnmark) {
      return NextResponse.json({
        success: true,
        unmarked: true,
        message: 'Quotation unlocked successfully. Linked booking cards kept in draft mode.'
      });
    }

    // 4. Only synchronize workspace cards if the lead is ALREADY in the booked stage.
    // If not booked, do NOT force booked status and do NOT create premature cards!
    const isAlreadyBooked = Boolean(
      currentLead?.stage === 'booked' ||
      currentLead?.status === 'booked' ||
      (currentLead?.status && String(currentLead.status).toLowerCase().includes('book')) ||
      (bookedStageId && currentLead?.stage_id === bookedStageId)
    );

    if (isAlreadyBooked) {
      try {
        await syncBookedLeadOrFinalQuotation({
          leadId,
          quotationId,
          workspaceId: userId,
          forceBookedStatus: false,
          supabaseClient: supabaseAdmin
        });
        clearLeadSummaryCache();
      } catch (syncErr) {
        console.error('[Set-Final] Sync exception:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isAlreadyBooked 
        ? 'Final Quotation locked and synchronized with Bookings!' 
        : 'Final Quotation locked! Workspace cards will be created when client is confirmed & booked in CRM.',
      quotationId,
      coupleName: clientName,
      stage_id: isAlreadyBooked ? bookedStageId : undefined
    });
  } catch (error: any) {
    console.error('[Set-Final] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to set final quotation' },
      { status: 500 }
    );
  }
}
