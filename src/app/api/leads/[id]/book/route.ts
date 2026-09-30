import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncBookedLeadOrFinalQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

/**
 * POST /api/leads/[id]/book
 * High-performance server-side booking onboarder.
 * Reliably creates or updates all 4 workspace cards (Client Directory, Bookings, Post-Production, Finance)
 * using supabaseAdmin (bypassing RLS).
 * 
 * If a final quotation exists: fully synchronizes quotation events, deliverables, and financials.
 * If NO final quotation exists: creates clean empty cards with 0 demo events, 0 fake deliverables, and 'unsettled' finance status.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await context.params;
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const explicitQuotationId = body.quotationId || null;
    const nowIso = new Date().toISOString();

    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    let targetQuotationId = explicitQuotationId || lead.final_quotation_id || (lead.raw_payload as any)?.final_quotation_id || null;
    const workspaceId = lead.workspace_id || lead.tenant_id || lead.created_by_user_id || 'ws_demo';

    if (!targetQuotationId) {
      const { data: finalQ } = await supabaseAdmin
        .from('quotations')
        .select('id, quotation_number')
        .eq('client_id', leadId)
        .eq('is_final', true)
        .maybeSingle();
      if (finalQ) targetQuotationId = finalQ.quotation_number || finalQ.id;
    }

    if (!targetQuotationId) {
      const { data: finalDocs } = await supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, content_json')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false });
      const finalDoc = (finalDocs || []).find((d: any) => d.content_json?.is_final === true);
      if (finalDoc) targetQuotationId = finalDoc.template_id || finalDoc.id;
    }

    // 2. If a final quotation exists, run full synchronizer!
    if (targetQuotationId) {
      const syncResult = await syncBookedLeadOrFinalQuotation({
        leadId,
        quotationId: targetQuotationId,
        workspaceId,
        forceBookedStatus: true,
        supabaseClient: supabaseAdmin
      });

      return NextResponse.json({
        success: true,
        hasFinalQuotation: true,
        clientId: syncResult?.workspaceClientId || lead.client_id,
        coupleName: syncResult?.coupleName || lead.name
      });
    }

    // 3. NO Final Quotation: Create / Restore clean EMPTY cards across all 4 modules
    const raw = lead.raw_payload || {};
    const coupleName = raw.couple_name 
      || raw.couple_names 
      || (lead as any).couple_names 
      || lead.client_name 
      || lead.name 
      || 'Valued Client';

    const eventDate = lead.event_date || raw.event_date || null;
    const mainVenue = lead.location || raw.venue || raw.location || raw.city || '';
    const eventType = lead.event_type || raw.event_type || 'Wedding Photography';

    // 3A. Workspace Clients: Locate existing or insert new
    let workspaceClientId: string | null = lead.client_id || null;

    if (workspaceClientId) {
      const { data: existingClient } = await supabaseAdmin
        .from('workspace_clients')
        .select('id, notes')
        .eq('id', workspaceClientId)
        .maybeSingle();
      if (!existingClient) workspaceClientId = null;
    }

    if (!workspaceClientId) {
      const { data: clientsByLeadId } = await supabaseAdmin
        .from('workspace_clients')
        .select('id, notes, total_package_amount, paid_amount')
        .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
        .order('created_at', { ascending: false });
      if (clientsByLeadId && clientsByLeadId.length > 0) {
        const withPkg = clientsByLeadId.find(c => Number(c.total_package_amount) > 0);
        workspaceClientId = withPkg ? withPkg.id : clientsByLeadId[0].id;
      }
    }

    if (!workspaceClientId) {
      const leadPhone = lead.phone ? lead.phone.replace(/\D/g, '').slice(-10) : '';
      if (leadPhone && leadPhone.length >= 7) {
        const { data: clientByPhone } = await supabaseAdmin
          .from('workspace_clients')
          .select('id, total_package_amount, paid_amount')
          .ilike('phone', `%${leadPhone}%`)
          .limit(1);
        if (clientByPhone && clientByPhone.length > 0) {
          workspaceClientId = clientByPhone[0].id;
        }
      }
    }

    let initialPackageAmount = 0;
    let initialPaidAmount = 0;
    if (workspaceClientId) {
      const { data: existingData } = await supabaseAdmin
        .from('workspace_clients')
        .select('total_package_amount, paid_amount')
        .eq('id', workspaceClientId)
        .maybeSingle();
      if (existingData && Number(existingData.total_package_amount) > 0) {
        initialPackageAmount = Number(existingData.total_package_amount);
        initialPaidAmount = Number(existingData.paid_amount) || 0;
      }
    }

    const extendedNotesPayload = JSON.stringify({
      client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      whatsapp_group_link: lead.whatsapp_group_id ? `https://chat.whatsapp.com/${lead.whatsapp_group_id}` : '',
      whatsapp_group_id: lead.whatsapp_group_id || '',
      portal_token: `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      portal_pin: '1234',
      portal_enabled: true,
      plain_notes: `Auto-synced from Booked CRM Lead (${coupleName})`,
      notes: `Auto-synced from Booked CRM Lead (${coupleName})`,
      events: [] // STRICTLY EMPTY: No demo events!
    });

    const clientPayload: any = {
      user_id: workspaceId,
      workspace_id: workspaceId,
      lead_id: leadId,
      name: coupleName.trim(),
      phone: lead.phone || null,
      email: lead.email || null,
      event_type: eventType,
      event_date: eventDate,
      total_package_amount: initialPackageAmount,
      paid_amount: initialPaidAmount,
      status: 'active',
      is_deleted: false,
      deleted_at: null,
      notes: extendedNotesPayload,
      updated_at: nowIso
    };

    if (workspaceClientId) {
      await supabaseAdmin
        .from('workspace_clients')
        .update(clientPayload)
        .eq('id', workspaceClientId);
    } else {
      const { data: newClient } = await supabaseAdmin
        .from('workspace_clients')
        .insert({ ...clientPayload, created_at: nowIso })
        .select('id')
        .single();
      workspaceClientId = newClient?.id || null;
    }

    if (workspaceClientId) {
      // 3B. Update Lead with client_id
      await supabaseAdmin
        .from('leads')
        .update({
          client_id: workspaceClientId,
          status: 'closed',
          raw_payload: {
            ...raw,
            client_id: workspaceClientId,
            stage: 'booked'
          },
          updated_at: nowIso
        })
        .eq('id', leadId);

      // Run 3 remaining module cards in parallel for maximum speed
      await Promise.all([
        // 3C. Client Finance Records: ₹0 Unsettled record (preserve existing amounts if already set)
        (async () => {
          const { data: existingFins } = await supabaseAdmin
            .from('client_finance_records')
            .select('id, final_total_amount, received_amount, base_package_price')
            .or(`client_id.eq.${workspaceClientId},client_id.eq.${leadId}`);

          const primaryFin = existingFins?.[0];
          if (primaryFin && (Number(primaryFin.final_total_amount) > 0 || Number(primaryFin.base_package_price) > 0)) {
            // Finance already has amounts populated from quotation! Do NOT wipe with 0!
            return;
          }

          const finPayload = {
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: workspaceClientId,
            base_package_price: 0,
            discount_amount: 0,
            accommodation_charges: 0,
            travel_charges: 0,
            additional_charges: 0,
            subtotal_amount: 0,
            gst_rate: 0,
            gst_amount: 0,
            final_total_amount: 0,
            received_amount: 0,
            pending_amount: 0,
            payment_status: 'unsettled',
            status: 'active',
            is_deleted: false,
            deleted_at: null,
            milestones: [],
            notes: `Auto-generated for booked lead (${coupleName}) without final quotation.`,
            updated_at: nowIso
          };

          if (primaryFin?.id) {
            await supabaseAdmin
              .from('client_finance_records')
              .update(finPayload)
              .eq('id', primaryFin.id);
          } else {
            await supabaseAdmin
              .from('client_finance_records')
              .insert({ ...finPayload, created_at: nowIso });
          }
        })(),

        // 3D. Post-Production Projects: Clean empty card (Purge duplicate leadId rows, preserve deliverables if present!)
        (async () => {
          const { data: existingPPPs } = await supabaseAdmin
            .from('post_production_projects')
            .select('id, client_id, deliverables')
            .or(`client_id.eq.${workspaceClientId},client_id.eq.${leadId}`);

          if (existingPPPs && existingPPPs.length > 0) {
            const primaryId = existingPPPs[0].id;
            const existingDelivs = existingPPPs[0].deliverables;
            const hasDeliverables = Array.isArray(existingDelivs) && existingDelivs.length > 0;

            if (hasDeliverables) {
              // Preserve existing deliverables from quotation!
              await supabaseAdmin
                .from('post_production_projects')
                .update({
                  client_id: workspaceClientId,
                  overall_status: 'active',
                  is_deleted: false,
                  deleted_at: null,
                  updated_at: nowIso
                })
                .eq('id', primaryId);
            } else {
              await supabaseAdmin
                .from('post_production_projects')
                .update({
                  client_id: workspaceClientId,
                  overall_status: 'active',
                  is_deleted: false,
                  deleted_at: null,
                  deliverables: [],
                  notes: `Empty post-production card for (${coupleName})`,
                  updated_at: nowIso
                })
                .eq('id', primaryId);
            }

            // Delete any duplicate extra rows
            if (existingPPPs.length > 1) {
              const dupIds = existingPPPs.slice(1).map(p => p.id);
              await supabaseAdmin
                .from('post_production_projects')
                .delete()
                .in('id', dupIds);
            }
          } else {
            await supabaseAdmin
              .from('post_production_projects')
              .insert({
                user_id: workspaceId,
                workspace_id: workspaceId,
                client_id: workspaceClientId,
                overall_status: 'active',
                is_deleted: false,
                deliverables: [],
                notes: `Empty post-production card for (${coupleName})`,
                created_at: nowIso,
                updated_at: nowIso
              });
          }

          // Ensure project config is clean
          try {
            await supabaseAdmin
              .from('post_production_project_config')
              .upsert({
                project_id: workspaceClientId,
                enabled_segments: ['Wedding'],
                updated_at: nowIso
              }, { onConflict: 'project_id' });
          } catch (_) {}
        })(),

        // 3E. Bookings & Events (fw_projects): 1 Master Project with 0 ceremonies
        (async () => {
          const { data: existingProjs } = await supabaseAdmin
            .from('fw_projects')
            .select('id')
            .or(`client_id.eq.${workspaceClientId},client_name.ilike.%${coupleName.trim()}%`);

          if (existingProjs && existingProjs.length > 0) {
            await supabaseAdmin
              .from('fw_projects')
              .update({
                client_id: workspaceClientId,
                client_name: coupleName.trim(),
                main_date: eventDate || nowIso.split('T')[0],
                main_venue: mainVenue || null,
                status: 'active',
                is_archived: false,
                updated_at: nowIso
              })
              .eq('id', existingProjs[0].id);
          } else {
            await supabaseAdmin
              .from('fw_projects')
              .insert({
                user_id: workspaceId,
                client_id: workspaceClientId,
                client_name: coupleName.trim(),
                main_date: eventDate || nowIso.split('T')[0],
                main_venue: mainVenue || null,
                status: 'active',
                is_archived: false
              });
          }
        })()
      ]);
    }

    return NextResponse.json({
      success: true,
      hasFinalQuotation: false,
      clientId: workspaceClientId,
      coupleName
    });
  } catch (err: any) {
    console.error('[API /api/leads/[id]/book Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
