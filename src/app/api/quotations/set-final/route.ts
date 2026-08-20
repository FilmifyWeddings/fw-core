import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractFinancialsFromQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

/**
 * POST /api/quotations/set-final
 * Marks a specific quotation version as the "Final Quotation" for a lead.
 * Directly synchronizes the exact budget, breakdowns, and payment terms into Finance & Payments!
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const { quotationId, leadId } = body;

    if (!quotationId || !leadId) {
      return NextResponse.json({ error: 'quotationId and leadId are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Fetch all quotation documents for this lead
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const { data: allDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%`);

    let finalDoc: any = null;

    if (allDocs && allDocs.length > 0) {
      for (const doc of allDocs) {
        const isTarget = doc.template_id === quotationId || doc.id === quotationId;
        const updatedContent = { ...(doc.content_json || {}) };
        updatedContent.is_final = isTarget;

        if (isTarget) {
          finalDoc = { ...doc, content_json: updatedContent };
        }

        // Update each document in Supabase
        await supabaseAdmin
          .from('quotation_documents')
          .update({
            content_json: updatedContent,
            updated_at: now
          })
          .eq('id', doc.id);
      }
    }

    // 2. Also update quotations table
    try {
      await supabaseAdmin
        .from('quotations')
        .update({ status: 'draft', updated_at: now })
        .eq('client_id', leadId);

      await supabaseAdmin
        .from('quotations')
        .update({ status: 'accepted', updated_at: now })
        .or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`);
    } catch (_) {}

    // 3. Update Leads table
    try {
      await supabaseAdmin
        .from('leads')
        .update({
          final_quotation_id: quotationId,
          quotation_id: quotationId,
          updated_at: now
        })
        .eq('id', leadId);
    } catch (_) {}

    // 4. Sync with Finance Records & Workspace Clients
    if (finalDoc?.content_json) {
      // Fetch lead details
      const { data: leadData } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      const calcFin = extractFinancialsFromQuotation(finalDoc.content_json, leadData?.event_date);
      const effectiveUserId = leadData?.user_id || leadData?.workspace_id || userId;
      const effectiveWorkspaceId = leadData?.workspace_id || leadData?.user_id || userId;

      // Find linked workspace_clients
      let { data: linkedClients } = await supabaseAdmin
        .from('workspace_clients')
        .select('id, user_id, workspace_id, name, phone, email, event_date')
        .eq('lead_id', leadId);

      // If no workspace_client exists for this lead yet, create one!
      if (!linkedClients || linkedClients.length === 0) {
        const newClientPayload = {
          lead_id: leadId,
          name: leadData?.name || leadData?.client_name || 'Client',
          phone: leadData?.phone || '',
          email: leadData?.email || '',
          city: leadData?.city || leadData?.location || '',
          event_type: calcFin.event_type || leadData?.event_type || 'Wedding',
          event_date: calcFin.event_date || leadData?.event_date || null,
          total_package_amount: calcFin.final_total_amount,
          paid_amount: calcFin.received_amount,
          status: 'active',
          user_id: effectiveUserId,
          workspace_id: effectiveWorkspaceId,
          created_at: now,
          updated_at: now
        };

        const { data: createdClient, error: clientCreateErr } = await supabaseAdmin
          .from('workspace_clients')
          .insert([newClientPayload])
          .select('id, user_id, workspace_id, name, phone, email, event_date')
          .single();

        if (!clientCreateErr && createdClient) {
          linkedClients = [createdClient];
        }
      }

      if (linkedClients && linkedClients.length > 0) {
        for (const lc of linkedClients) {
          await supabaseAdmin
            .from('workspace_clients')
            .update({
              total_package_amount: calcFin.final_total_amount,
              paid_amount: calcFin.received_amount,
              event_date: calcFin.event_date || lc.event_date || null,
              updated_at: now
            })
            .eq('id', lc.id);

          const finPayload = {
            user_id: lc.user_id || effectiveUserId,
            workspace_id: lc.workspace_id || effectiveWorkspaceId,
            client_id: lc.id,
            base_package_price: calcFin.base_package_price,
            discount_amount: calcFin.discount_amount,
            accommodation_charges: calcFin.accommodation_charges,
            travel_charges: calcFin.travel_charges,
            additional_charges: calcFin.additional_charges,
            subtotal_amount: calcFin.subtotal_amount,
            gst_rate: calcFin.gst_rate,
            gst_amount: calcFin.gst_amount,
            final_total_amount: calcFin.final_total_amount,
            received_amount: calcFin.received_amount,
            pending_amount: calcFin.pending_amount,
            payment_status: calcFin.payment_status,
            milestones: calcFin.milestones,
            updated_at: now
          };

          const { data: exFin } = await supabaseAdmin
            .from('client_finance_records')
            .select('id')
            .eq('client_id', lc.id)
            .maybeSingle();

          if (exFin) {
            await supabaseAdmin
              .from('client_finance_records')
              .update(finPayload)
              .eq('client_id', lc.id);
          } else {
            await supabaseAdmin
              .from('client_finance_records')
              .insert([{ ...finPayload, created_at: now }]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      quotationId,
      message: 'Quotation marked as Final and synced with Finance & Payments!'
    });
  } catch (err: any) {
    console.error('[POST /api/quotations/set-final Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to set final quotation' }, { status: 500 });
  }
}
