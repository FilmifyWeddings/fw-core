import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractFinancialsFromQuotation, syncQuotationToTeamManagerEvents } from '@/lib/quotation-finance-sync';

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
      for (const doc of allDocs) {
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

        // Update each document in Supabase
        await supabaseAdmin
          .from('quotation_documents')
          .update({
            content_json: updatedContent,
            lead_id: leadId,
            updated_at: now
          })
          .eq('id', doc.id);
      }
    }

    // 2. Also update quotations table
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

        await supabaseAdmin
          .from('quotations')
          .update({ status: 'accepted', is_final: true, updated_at: now })
          .or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`);
      }
    } catch (_) {}

    // 3. Update Leads table
    try {
      await supabaseAdmin
        .from('leads')
        .update({
          final_quotation_id: shouldUnmark ? null : quotationId,
          quotation_id: shouldUnmark ? null : quotationId,
          updated_at: now
        })
        .eq('id', leadId);
    } catch (_) {}

    if (shouldUnmark) {
      return NextResponse.json({
        success: true,
        unmarked: true,
        message: 'Quotation unlocked successfully. Linked booking cards kept in draft mode.'
      });
    }

    // 4. Sync with Finance Records & Workspace Clients (only when marking as final)
    if (finalDoc?.content_json) {
      // Fetch lead details
      const { data: leadData } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      const clientName = leadData?.name || finalDoc.content_json?.meta?.client_name || 'Wedding Client';
      const eventDate = leadData?.event_date || finalDoc.content_json?.meta?.event_date || null;
      const workspaceId = leadData?.workspace_id || userId || finalDoc.content_json?.meta?.workspace_id;

      // Extract exact totals and milestones
      const financials = extractFinancialsFromQuotation(finalDoc.content_json, eventDate);

      // Create or update workspace client
      try {
        let clientId: string | null = null;
        if (workspaceId) {
          const { data: existingClient } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('workspace_id', workspaceId)
            .ilike('name', clientName.trim())
            .maybeSingle();

          if (existingClient?.id) {
            clientId = existingClient.id;
          } else {
            const { data: newClient } = await supabaseAdmin
              .from('clients')
              .insert({
                workspace_id: workspaceId,
                name: clientName.trim(),
                phone: leadData?.phone || null,
                email: leadData?.email || null,
                created_at: now,
                updated_at: now
              })
              .select('id')
              .single();
            clientId = newClient?.id || null;
          }
        }

        // Upsert finance record
        if (workspaceId) {
          const { data: existingFinance } = await supabaseAdmin
            .from('finance_records')
            .select('id')
            .eq('workspace_id', workspaceId)
            .or(`client_name.ilike.${clientName.trim()},lead_id.eq.${leadId}`)
            .maybeSingle();

          const financePayload = {
            workspace_id: workspaceId,
            client_id: clientId,
            lead_id: leadId,
            client_name: clientName.trim(),
            event_name: finalDoc.content_json?.meta?.project_name || 'Wedding Photography',
            event_date: eventDate,
            base_package_price: financials.base_package_price || financials.subtotal_amount,
            discount_amount: financials.discount_amount || 0,
            accommodation_charges: financials.accommodation_charges || 0,
            travel_charges: financials.travel_charges || 0,
            additional_charges: financials.additional_charges || 0,
            subtotal_amount: financials.subtotal_amount,
            gst_rate: financials.gst_rate || 0,
            gst_amount: financials.gst_amount || 0,
            final_total_amount: financials.final_total_amount,
            received_amount: financials.received_amount,
            pending_amount: financials.pending_amount,
            payment_status: financials.payment_status,
            payment_type: 'custom',
            notes: `Auto-generated from Final Quotation V${finalDoc.version || finalDoc.lead_version || '1'}.`,
            updated_at: now
          };

          if (existingFinance?.id) {
            await supabaseAdmin
              .from('finance_records')
              .update(financePayload)
              .eq('id', existingFinance.id);
          } else {
            await supabaseAdmin
              .from('finance_records')
              .insert({
                ...financePayload,
                created_at: now
              });
          }
        }
      } catch (finErr) {
        console.error('[Set-Final] Error syncing finance record:', finErr);
      }

      // Sync Quotation Sub-events to Team Manager Projects & Sub-Events
      try {
        if (workspaceId) {
          await syncQuotationToTeamManagerEvents(
            supabaseAdmin,
            leadId,
            finalDoc.content_json,
            clientName,
            workspaceId,
            eventDate
          );
        }
      } catch (tmErr) {
        console.error('[Set-Final] Error syncing team manager events:', tmErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Final Quotation locked and synchronized with Finance & Bookings!',
      quotationId
    });
  } catch (error: any) {
    console.error('[Set-Final] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to set final quotation' },
      { status: 500 }
    );
  }
}
