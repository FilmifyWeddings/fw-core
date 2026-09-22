import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractCoupleNameFromQuotation, syncBookedLeadOrFinalQuotation } from '@/lib/quotation-finance-sync';

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

    // 1. Fetch all quotation documents for this lead or matching target quotationId
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    let { data: allDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%,template_id.eq.${quotationId},id.eq.${quotationId}`);

    if (!allDocs || allDocs.length === 0) {
      const { data: directDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, lead_id, version, lead_version, content_json')
        .or(`template_id.eq.${quotationId},id.eq.${quotationId}`)
        .maybeSingle();
      if (directDoc) {
        allDocs = [directDoc];
      }
    }

    let finalDoc: any = null;

    if (allDocs && allDocs.length > 0) {
      await Promise.all(allDocs.map(async (doc: any) => {
        const isTarget = doc.template_id === quotationId || doc.id === quotationId;
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

        return supabaseAdmin
          .from('quotation_documents')
          .update({
            content_json: updatedContent,
            lead_id: leadId,
            updated_at: now
          })
          .eq('id', doc.id);
      }));
    }

    // 2 & 3. Parallel update quotations and leads tables
    const clientName = finalDoc?.content_json 
      ? extractCoupleNameFromQuotation(finalDoc.content_json, '')
      : '';

    await Promise.all([
      (async () => {
        try {
          if (shouldUnmark) {
            await supabaseAdmin
              .from('quotations')
              .update({ status: 'draft', is_final: false, updated_at: now })
              .or(`id.eq.${quotationId},quotation_number.eq.${quotationId},client_id.eq.${leadId}`);
          } else {
            await supabaseAdmin
              .from('quotations')
              .update({ status: 'draft', is_final: false, updated_at: now })
              .eq('client_id', leadId);

            const quoteTitle = clientName ? `${clientName} - Final Quotation` : 'Final Quotation';

            const { data: existingQ } = await supabaseAdmin
              .from('quotations')
              .select('id')
              .or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`)
              .maybeSingle();

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
          const { data: currentLead } = await supabaseAdmin
            .from('leads')
            .select('raw_payload, status')
            .eq('id', leadId)
            .maybeSingle();

          const currentPayload = currentLead?.raw_payload || {};
          const updatedPayload = {
            ...currentPayload,
            final_quotation_id: shouldUnmark ? null : quotationId,
            quotation_id: shouldUnmark ? null : quotationId,
            ...(clientName ? { couple_name: clientName } : {})
          };

          await supabaseAdmin
            .from('leads')
            .update({
              final_quotation_id: shouldUnmark ? null : quotationId,
              quotation_id: shouldUnmark ? null : quotationId,
              raw_payload: updatedPayload,
              ...(shouldUnmark ? {} : { status: 'booked' }),
              updated_at: now
            })
            .eq('id', leadId);
        } catch (lErr) {
          console.error('[Set-Final] Error updating lead raw_payload and final_quotation_id:', lErr);
        }
      })()
    ]);

    if (shouldUnmark) {
      return NextResponse.json({
        success: true,
        unmarked: true,
        message: 'Quotation unlocked successfully. Linked booking cards kept in draft mode.'
      });
    }

    // 4. Non-blocking asynchronous sync across Client Directory, Booking Events, Post Production, and Finance
    // Triggered in background so the client receives a fast <100ms response with zero UI lag or timeout!
    (async () => {
      try {
        await syncBookedLeadOrFinalQuotation({
          leadId,
          quotationId,
          workspaceId: userId,
          forceBookedStatus: true,
          supabaseClient: supabaseAdmin
        });
      } catch (syncErr) {
        console.error('[Set-Final] Background sync exception:', syncErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Final Quotation locked and synchronized with Finance & Bookings!',
      quotationId,
      coupleName: clientName
    });
  } catch (error: any) {
    console.error('[Set-Final] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to set final quotation' },
      { status: 500 }
    );
  }
}
