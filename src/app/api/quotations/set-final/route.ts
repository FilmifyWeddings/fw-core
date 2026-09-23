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
        const isTarget = doc.template_id === quotationId || (isQuotationUUID && doc.id === quotationId);
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

        const { error: docUpdateErr } = await supabaseAdmin
          .from('quotation_documents')
          .update({
            content_json: updatedContent,
            lead_id: leadId,
            updated_at: now
          })
          .eq('id', doc.id);

        if (docUpdateErr) {
          console.warn('[Set-Final] Warning updating quotation_document:', docUpdateErr.message);
          await supabaseAdmin
            .from('quotation_documents')
            .update({
              content_json: updatedContent,
              updated_at: now
            })
            .eq('id', doc.id);
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

            let existingQuery = supabaseAdmin.from('quotations').select('id');
            if (isQuotationUUID) {
              existingQuery = existingQuery.or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`);
            } else {
              existingQuery = existingQuery.eq('quotation_number', quotationId);
            }
            const { data: existingQ } = await existingQuery.maybeSingle();

            if (existingQ) {
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
                .eq('id', existingQ.id);

              // Clean up any stale duplicate quotations with the same quotation_number so lead-summary never gets confused
              try {
                await supabaseAdmin
                  .from('quotations')
                  .delete()
                  .eq('quotation_number', quotationId)
                  .neq('id', existingQ.id);
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
            ...(clientName ? { couple_name: clientName } : {}),
            ...(shouldUnmark ? {} : { stage: 'booked', ...(bookedStageId ? { stage_id: bookedStageId } : {}) })
          };

          const updateLeadPayload: any = {
            final_quotation_id: shouldUnmark ? null : quotationId,
            quotation_id: shouldUnmark ? null : quotationId,
            raw_payload: updatedPayload,
            updated_at: now
          };

          if (!shouldUnmark) {
            if (bookedStageId) {
              updateLeadPayload.stage_id = bookedStageId;
            }
            updateLeadPayload.status = 'closed';
          }

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

    if (shouldUnmark) {
      return NextResponse.json({
        success: true,
        unmarked: true,
        message: 'Quotation unlocked successfully. Linked booking cards kept in draft mode.'
      });
    }

    // 4. Background asynchronous sync across Client Directory, Booking Events, Post Production, and Finance
    // Runs in the background so the HTTP response returns to the user in sub-second / milliseconds!
    (async () => {
      try {
        await syncBookedLeadOrFinalQuotation({
          leadId,
          quotationId,
          workspaceId: userId,
          forceBookedStatus: true,
          supabaseClient: supabaseAdmin
        });
        clearLeadSummaryCache();
      } catch (syncErr) {
        console.error('[Set-Final] Background sync exception:', syncErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Final Quotation locked and synchronized with Finance & Bookings!',
      quotationId,
      coupleName: clientName,
      stage_id: bookedStageId
    });
  } catch (error: any) {
    console.error('[Set-Final] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to set final quotation' },
      { status: 500 }
    );
  }
}
