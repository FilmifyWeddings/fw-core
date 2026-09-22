import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractFinancialsFromQuotation, extractCoupleNameFromQuotation, syncQuotationToTeamManagerEvents } from '@/lib/quotation-finance-sync';
import { parseQuotationDeliverables } from '@/lib/services/postProductionSyncService';

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

    // 4. Sync with Finance Records & Workspace Clients (only when marking as final)
    if (finalDoc?.content_json) {
      // Fetch lead details
      const { data: leadData } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      const clientName = extractCoupleNameFromQuotation(finalDoc.content_json, leadData?.name);
      const eventDate = leadData?.event_date || finalDoc.content_json?.meta?.event_date || null;
      const workspaceId = leadData?.workspace_id || userId || finalDoc.content_json?.meta?.workspace_id;

      // Extract exact totals and milestones
      const financials = extractFinancialsFromQuotation(finalDoc.content_json, eventDate);

      let workspaceClientId: string | null = null;

      // Create or update workspace_clients and client_finance_records
      try {
        if (workspaceId) {
          const { data: existingWorkspaceClients } = await supabaseAdmin
            .from('workspace_clients')
            .select('id, total_package_amount, paid_amount')
            .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
            .order('created_at', { ascending: true });

          const existingWorkspaceClient = existingWorkspaceClients?.[0];

          // Clean up any extraneous duplicate rows if present
          if (existingWorkspaceClients && existingWorkspaceClients.length > 1) {
            const extraIds = existingWorkspaceClients.slice(1).map(c => c.id);
            await supabaseAdmin.from('workspace_clients').delete().in('id', extraIds);
          }

          if (existingWorkspaceClient?.id) {
            workspaceClientId = existingWorkspaceClient.id;
            await supabaseAdmin
              .from('workspace_clients')
              .update({
                name: clientName.trim(),
                phone: leadData?.phone || undefined,
                email: leadData?.email || undefined,
                event_date: eventDate || undefined,
                event_type: financials.event_type || undefined,
                total_package_amount: financials.final_total_amount,
                paid_amount: financials.received_amount,
                lead_id: leadId,
                updated_at: now
              })
              .eq('id', workspaceClientId);
          } else {
            // Also check by workspace_id + name
            const { data: clientByName } = await supabaseAdmin
              .from('workspace_clients')
              .select('id')
              .eq('workspace_id', workspaceId)
              .ilike('name', clientName.trim())
              .maybeSingle();

            if (clientByName?.id) {
              workspaceClientId = clientByName.id;
              await supabaseAdmin
                .from('workspace_clients')
                .update({
                  lead_id: leadId,
                  event_date: eventDate || undefined,
                  event_type: financials.event_type || undefined,
                  total_package_amount: financials.final_total_amount,
                  paid_amount: financials.received_amount,
                  updated_at: now
                })
                .eq('id', workspaceClientId);
            } else {
              const { data: newWsClient } = await supabaseAdmin
                .from('workspace_clients')
                .insert({
                  user_id: workspaceId,
                  workspace_id: workspaceId,
                  lead_id: leadId,
                  name: clientName.trim(),
                  phone: leadData?.phone || null,
                  email: leadData?.email || null,
                  event_type: financials.event_type || 'Wedding Photography',
                  event_date: eventDate || null,
                  total_package_amount: financials.final_total_amount,
                  paid_amount: financials.received_amount,
                  status: 'active',
                  notes: `Auto-created from Final Quotation V${finalDoc.version || finalDoc.lead_version || '1'}.`,
                  created_at: now,
                  updated_at: now
                })
                .select('id')
                .single();
              workspaceClientId = newWsClient?.id || null;
            }
          }
        }

        // Upsert client_finance_records (Direct source of truth for Finance page)
        if (workspaceId && workspaceClientId) {
          const clientFinPayload = {
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: workspaceClientId,
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
            milestones: financials.milestones,
            notes: `Auto-generated from Final Quotation V${finalDoc.version || finalDoc.lead_version || '1'}.`,
            updated_at: now
          };

          const { data: existingClientFin } = await supabaseAdmin
            .from('client_finance_records')
            .select('id')
            .eq('client_id', workspaceClientId)
            .maybeSingle();

          if (existingClientFin?.id) {
            await supabaseAdmin
              .from('client_finance_records')
              .update(clientFinPayload)
              .eq('id', existingClientFin.id);
          } else {
            await supabaseAdmin
              .from('client_finance_records')
              .insert({
                ...clientFinPayload,
                created_at: now
              });
          }
        }

        // Legacy fallback: clients & finance_records for backwards compatibility
        if (workspaceId) {
          try {
            const { data: existingClient } = await supabaseAdmin
              .from('clients')
              .select('id')
              .eq('workspace_id', workspaceId)
              .ilike('name', clientName.trim())
              .maybeSingle();

            let legacyClientId = existingClient?.id;
            if (!legacyClientId) {
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
              legacyClientId = newClient?.id;
            }

            const { data: existingFinance } = await supabaseAdmin
              .from('finance_records')
              .select('id')
              .eq('workspace_id', workspaceId)
              .or(`client_name.ilike.${clientName.trim()},lead_id.eq.${leadId}`)
              .maybeSingle();

            const legacyFinancePayload = {
              workspace_id: workspaceId,
              client_id: legacyClientId || workspaceClientId,
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
                .update(legacyFinancePayload)
                .eq('id', existingFinance.id);
            } else {
              await supabaseAdmin
                .from('finance_records')
                .insert({ ...legacyFinancePayload, created_at: now });
            }
          } catch (_) {}
        }
      } catch (finErr) {
        console.error('[Set-Final] Error syncing finance record:', finErr);
      }

      // Sync Quotation Sub-events to Team Manager Projects & Deliverables to Post-Production concurrently
      await Promise.allSettled([
        (async () => {
          try {
            if (workspaceId) {
              await syncQuotationToTeamManagerEvents(
                supabaseAdmin,
                leadId,
                finalDoc.content_json,
                clientName,
                workspaceId,
                eventDate,
                finalDoc.content_json?.meta?.venue || finalDoc.content_json?.cover?.venue || finalDoc.content_json?.cover?.locationName || 'TBD Venue',
                workspaceClientId
              );
            }
          } catch (tmErr) {
            console.error('[Set-Final] Error syncing team manager events:', tmErr);
          }
        })(),
        (async () => {
          try {
            if (workspaceId && finalDoc.content_json) {
              const parsed = parseQuotationDeliverables(finalDoc);
              if (parsed.deliverables && parsed.deliverables.length > 0) {
                const clientTargets = [workspaceClientId, leadId].filter(Boolean) as string[];
                const ppNotes = `quotation_id:${finalDoc.template_id || quotationId};quotation_title:${finalDoc.content_json?.meta?.project_name || 'Final Quotation'};pp_config:${encodeURIComponent(JSON.stringify({ enabled_segments: parsed.enabledSegments }))};`;

                for (const cId of clientTargets) {
                  const { data: existingPPP } = await supabaseAdmin
                    .from('post_production_projects')
                    .select('id, client_id')
                    .eq('client_id', cId)
                    .maybeSingle();

                  if (existingPPP) {
                    await supabaseAdmin
                      .from('post_production_projects')
                      .update({
                        deliverables: parsed.deliverables,
                        notes: ppNotes,
                        overall_status: 'active',
                        updated_at: now
                      })
                      .eq('id', existingPPP.id);
                  } else {
                    await supabaseAdmin
                      .from('post_production_projects')
                      .insert({
                        user_id: workspaceId,
                        workspace_id: workspaceId,
                        client_id: cId,
                        deliverables: parsed.deliverables,
                        notes: ppNotes,
                        overall_status: 'active',
                        created_at: now,
                        updated_at: now
                      });
                  }
                }

                if (workspaceClientId) {
                  try {
                    await supabaseAdmin
                      .from('post_production_project_config')
                      .upsert({
                        project_id: workspaceClientId,
                        enabled_segments: parsed.enabledSegments || ['Wedding'],
                        updated_at: now
                      }, { onConflict: 'project_id' });
                  } catch (_) {}

                  try {
                    await supabaseAdmin
                      .from('post_production_deliverables')
                      .delete()
                      .eq('project_id', workspaceClientId);

                    if (parsed.deliverables && parsed.deliverables.length > 0) {
                      const rowsToInsert = parsed.deliverables.map(deliv => ({
                        project_id: workspaceClientId,
                        segment: deliv.segment || 'Wedding',
                        category: deliv.category || 'Photos',
                        title: deliv.title,
                        specs: deliv.specs || deliv.count || null,
                        status: 'Upcoming',
                        is_custom: false,
                        updated_at: now
                      }));
                      await supabaseAdmin.from('post_production_deliverables').insert(rowsToInsert);
                    }
                  } catch (_) {}
                }
              }
            }
          } catch (ppErr) {
            console.error('[Set-Final] Error syncing post-production project deliverables:', ppErr);
          }
        })()
      ]);
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
