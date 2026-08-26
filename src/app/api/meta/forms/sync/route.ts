import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { getNextDistributedLeadOwner } from '@/lib/lead-distribution';

/**
 * POST /api/meta/forms/sync
 * Streams Server-Sent Events (SSE) with real-time progress for per-form lead sync.
 *
 * Body: { form_id: string, page_id: string, workspace_id?: string }
 *
 * SSE events:
 *   { type: 'start',    total: number, form_name: string }
 *   { type: 'progress', imported: number, skipped: number, failed: number, total: number, current: number }
 *   { type: 'complete', imported: number, skipped: number, failed: number, total: number, duration_ms: number }
 *   { type: 'error',    message: string, graph_error?: object }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Parse & Auth ─────────────────────────────────────────────────────────
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response('{"error":"Invalid JSON body"}', { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { form_id, page_id, workspace_id: requestedWorkspaceId } = body;

  if (!form_id || !page_id) {
    return new Response(JSON.stringify({ error: 'form_id and page_id are required' }), { status: 400 });
  }

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
  if (!authResult.authorized) {
    return authResult.errorResponse ?? new Response('{"error":"Unauthorized"}', { status: 401 });
  }

  const workspaceId = authResult.workspaceId;

  // ── Resolve page access token with Multi-Level Fallback ───────────────────
  let pageToken: string | null = null;
  let pageName = 'Facebook Page';

  // Level 1: Check fb_page_configs for current workspace
  const { data: pageRow } = await supabaseAdmin
    .from('fb_page_configs')
    .select('page_name, page_access_token')
    .eq('workspace_id', workspaceId)
    .eq('page_id', page_id)
    .not('page_access_token', 'is', null)
    .maybeSingle();

  if (pageRow?.page_access_token) {
    pageToken = pageRow.page_access_token;
    pageName  = pageRow.page_name || 'Facebook Page';
  }

  // Level 2: Fallback to fb_page_configs by page_id (latest updated)
  if (!pageToken) {
    const { data: fallbackPage } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_name, page_access_token')
      .eq('page_id', page_id)
      .not('page_access_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackPage?.page_access_token) {
      pageToken = fallbackPage.page_access_token;
      pageName = fallbackPage.page_name || pageName;
    }
  }

  // Level 3: Fallback to integration_credentials (Meta)
  if (!pageToken) {
    const { data: creds } = await supabaseAdmin
      .from('integration_credentials')
      .select('access_token')
      .eq('user_id', workspaceId)
      .eq('provider', 'meta')
      .maybeSingle();
    if (creds?.access_token) {
      pageToken = creds.access_token;
    }
  }

  // Level 4: Fallback to profiles.meta_access_token
  if (!pageToken) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', workspaceId)
      .maybeSingle();
    pageToken = profile?.meta_access_token || null;
  }

  if (!pageToken) {
    return new Response(JSON.stringify({ error: 'Page access token not found. Please reconnect Facebook.' }), { status: 403 });
  }

  // ── Resolve form name ──────────────────────────────────────────────────────
  const { data: formRow } = await supabaseAdmin
    .from('fb_lead_forms')
    .select('form_name, is_enabled')
    .eq('workspace_id', workspaceId)
    .eq('form_id', form_id)
    .maybeSingle();

  const formName = formRow?.form_name || `Form ${form_id}`;

  // ── Create audit log entry ─────────────────────────────────────────────────
  const { data: syncLog } = await supabaseAdmin
    .from('fb_sync_logs')
    .insert({
      workspace_id: workspaceId,
      form_id,
      form_name: formName,
      page_id,
      page_name: pageName,
      status: 'running',
      initiated_by: workspaceId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const syncLogId = syncLog?.id;

  // ── SSE Stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  function sseEvent(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      let imported = 0;
      let skipped = 0;
      let failed = 0;
      let totalFetched = 0;
      let errorMessage: string | null = null;

      try {
        // ── Helper to execute Graph API with token fallback ──────────────────
        async function fetchGraphWithFallback(endpointUrl: string): Promise<any> {
          let res = await fetch(endpointUrl);
          let json = await res.json().catch(() => ({}));

          if (json?.error && (json.error.code === 190 || json.error.code === 102)) {
            // Try fetching fallback user token from integration_credentials
            const { data: altCreds } = await supabaseAdmin
              .from('integration_credentials')
              .select('access_token')
              .eq('user_id', workspaceId)
              .eq('provider', 'meta')
              .maybeSingle();

            if (altCreds?.access_token && altCreds.access_token !== pageToken) {
              const fallbackUrl = endpointUrl.replace(/access_token=[^&]+/, `access_token=${altCreds.access_token}`);
              const fallbackRes = await fetch(fallbackUrl);
              const fallbackJson = await fallbackRes.json().catch(() => ({}));
              if (!fallbackJson?.error) {
                // Update page config with working token
                pageToken = altCreds.access_token;
                await supabaseAdmin
                  .from('fb_page_configs')
                  .upsert({
                    workspace_id: workspaceId,
                    page_id,
                    page_access_token: pageToken,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'page_id' });
                return fallbackJson;
              }
            }
          }
          return json;
        }

        // ── Step 1: Fetch ALL leads with pagination ──────────────────────────
        const allLeads: any[] = [];
        let nextCursor: string | null = null;
        let pageNum = 0;

        // First, test connection & get total count
        const countData = await fetchGraphWithFallback(
          `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id&limit=1&access_token=${pageToken}`
        );

        if (countData.error) {
          controller.enqueue(sseEvent({ type: 'error', message: countData.error.message, graph_error: countData.error }));
          controller.close();
          if (syncLogId) {
            await supabaseAdmin.from('fb_sync_logs').update({
              status: 'failed', error_message: countData.error.message, completed_at: new Date().toISOString(), duration_ms: Date.now() - startTime,
            }).eq('id', syncLogId);
          }
          return;
        }

        // Emit start event with estimated total
        const estimatedTotal = countData.paging?.cursors ? -1 : (countData.data?.length || 0);
        controller.enqueue(sseEvent({ type: 'start', total: estimatedTotal, form_name: formName, page_name: pageName }));

        // Paginate through all leads
        do {
          pageNum++;
          let url = `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&limit=100&access_token=${pageToken}`;
          if (nextCursor) {
            url += `&after=${nextCursor}`;
          }

          const leadsData = await fetchGraphWithFallback(url);

          if (leadsData.error) {
            throw new Error(`Graph API Error: ${leadsData.error.message} (Code: ${leadsData.error.code})`);
          }

          const batch = leadsData.data || [];
          allLeads.push(...batch);
          totalFetched = allLeads.length;

          nextCursor = leadsData.paging?.cursors?.after || null;
          const hasMore = leadsData.paging?.next ? true : false;
          if (!hasMore) nextCursor = null;

          // Emit progress after each page fetch
          controller.enqueue(sseEvent({
            type: 'progress',
            phase: 'fetching',
            imported, skipped, failed,
            total: totalFetched,
            current: totalFetched,
            message: `Fetched ${totalFetched} leads from Meta…`,
          }));

        } while (nextCursor && pageNum < 50); // safety cap: 5000 leads max

        // ── Step 2: Import leads to CRM with duplicate detection ─────────────
        for (let i = 0; i < allLeads.length; i++) {
          const lead = allLeads[i];
          const leadgen_id = lead.id;

          // Emit progress every 5 leads or on last
          if (i % 5 === 0 || i === allLeads.length - 1) {
            controller.enqueue(sseEvent({
              type: 'progress',
              phase: 'importing',
              imported, skipped, failed,
              total: allLeads.length,
              current: i + 1,
              message: `Importing ${i + 1} / ${allLeads.length}…`,
            }));
          }

          // ── Duplicate check using meta_lead_id or leadgen_id in raw_payload ────────────────
          const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('workspace_id', workspaceId)
            .or(`meta_lead_id.eq.${leadgen_id},raw_payload->>leadgen_id.eq.${leadgen_id}`)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          // ── Extract field_data ─────────────────────────────────────────────
          const fieldData: Record<string, string> = {};
          if (lead.field_data && Array.isArray(lead.field_data)) {
            lead.field_data.forEach((field: { name: string; values: string[] }) => {
              const key = (field.name || '').toLowerCase().trim();
              const val = field.values?.[0] || '';
              fieldData[key] = val;
            });
          }

          const fullName =
            fieldData['full_name'] ||
            fieldData['name'] ||
            [fieldData['first_name'], fieldData['last_name']].filter(Boolean).join(' ') ||
            'Facebook Lead';

          const phone =
            fieldData['phone_number'] ||
            fieldData['phone'] ||
            fieldData['mobile'] ||
            fieldData['contact_number'] ||
            fieldData['whatsapp_number'] ||
            '';

          const email =
            fieldData['email'] ||
            fieldData['email_address'] ||
            fieldData['work_email'] ||
            '';

          const eventDate =
            fieldData['event_date'] ||
            fieldData['wedding_date'] ||
            fieldData['date_of_event'] ||
            fieldData['date'] ||
            fieldData['shoot_date'] ||
            null;

          const location =
            fieldData['city'] ||
            fieldData['location'] ||
            fieldData['event_location'] ||
            fieldData['wedding_location'] ||
            fieldData['venue'] ||
            '';

          const budget =
            fieldData['budget'] ||
            fieldData['expected_budget'] ||
            fieldData['package'] ||
            null;

          // ── Determine assigned Lead Owner & WhatsApp Group ───────────────
          let assignedLeadOwner: string | null = null;
          try {
            assignedLeadOwner = await getNextDistributedLeadOwner(workspaceId, form_id);
          } catch (distErr: any) {
            console.error('[Forms Sync Distribution Error]:', distErr?.message);
          }

          const { data: formMapping } = await supabaseAdmin
            .from('fb_form_mappings')
            .select('contact_group_id')
            .eq('workspace_id', workspaceId)
            .eq('form_id', form_id)
            .maybeSingle();

          const contactGroupId = formMapping?.contact_group_id || null;

          // ── Insert lead into CRM with resilient column fallback ──────────
          const newLeadItem: Record<string, any> = {
            workspace_id: workspaceId,
            tenant_id: workspaceId,
            name: fullName,
            phone: phone || null,
            email: email || null,
            source: `Facebook Ads / ${formName}`,
            status: 'new',
            source_form_id: form_id,
            form_tag: formName,
            meta_lead_id: leadgen_id,
            whatsapp_group_id: contactGroupId,
            event_date: eventDate,
            location: location,
            budget: budget,
            created_at: lead.created_time
              ? new Date(lead.created_time).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            raw_payload: {
              leadgen_id,
              meta_lead_id: leadgen_id,
              form_id,
              form_name: formName,
              page_id,
              page_name: pageName,
              campaign_name: lead.campaign_name || '',
              adset_name: lead.adset_name || '',
              ad_name: lead.ad_name || '',
              field_data: lead.field_data || [],
              lead_owner: assignedLeadOwner || 'Unassigned',
              synced_manually: true,
              ...fieldData,
            },
          };

          let insertedOk = false;
          let insertCopy = { ...newLeadItem };

          for (let attempt = 0; attempt < 6; attempt++) {
            const { error: insErr } = await supabaseAdmin
              .from('leads')
              .insert(insertCopy);

            if (!insErr) {
              insertedOk = true;
              break;
            }

            const errMsg = insErr.message || '';
            const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
            if (match && match[1]) {
              delete insertCopy[match[1]];
            } else {
              break;
            }
          }

          if (insertedOk) {
            imported++;
          } else {
            failed++;
          }
        }

        // ── Step 3: Update fb_lead_forms.leads_count ─────────────────────────
        const { data: currentForm } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('leads_count')
          .eq('workspace_id', workspaceId)
          .eq('form_id', form_id)
          .single();

        const newCount = (currentForm?.leads_count || 0) + imported;
        await supabaseAdmin
          .from('fb_lead_forms')
          .update({ leads_count: newCount, updated_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('form_id', form_id);

        // ── Step 4: Finalize audit log ─────────────────────────────────────────
        const duration_ms = Date.now() - startTime;
        if (syncLogId) {
          await supabaseAdmin.from('fb_sync_logs').update({
            status: 'complete',
            imported_count: imported,
            skipped_count: skipped,
            failed_count: failed,
            total_fetched: totalFetched,
            duration_ms,
            completed_at: new Date().toISOString(),
          }).eq('id', syncLogId);
        }

        // ── Step 5: Emit completion ────────────────────────────────────────────
        controller.enqueue(sseEvent({
          type: 'complete',
          imported, skipped, failed,
          total: totalFetched,
          duration_ms,
          new_leads_count: newCount,
        }));

      } catch (err: any) {
        errorMessage = err.message;
        const duration_ms = Date.now() - startTime;

        if (syncLogId) {
          await supabaseAdmin.from('fb_sync_logs').update({
            status: 'failed',
            imported_count: imported,
            skipped_count: skipped,
            failed_count: failed,
            total_fetched: totalFetched,
            error_message: errorMessage,
            duration_ms,
            completed_at: new Date().toISOString(),
          }).eq('id', syncLogId);
        }

        controller.enqueue(sseEvent({
          type: 'error',
          message: errorMessage,
          imported, skipped, failed,
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
