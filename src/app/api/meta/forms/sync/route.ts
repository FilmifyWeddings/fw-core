import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { getNextDistributedLeadOwner } from '@/lib/lead-distribution';
import { extractLeadFields } from '@/lib/meta-lead-normalizer';

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

        // ── Step 1: Deep Cursor Pagination for Historical Leads (Fetch 1000+ Leads) ──
        const allLeads: any[] = [];
        let afterCursor: string | null = null;
        let hasMore = true;
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

        while (hasMore && pageNum < 200) {
          pageNum++;
          let url = `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id,created_time,field_data,ad_name,campaign_name&limit=100&access_token=${pageToken}`;
          if (afterCursor) {
            url += `&after=${afterCursor}`;
          }

          const data = await fetchGraphWithFallback(url);

          if (data.error) {
            console.error("Meta Graph API Error:", data.error);
            if (allLeads.length === 0) {
              throw new Error(`Graph API Error: ${data.error.message} (Code: ${data.error.code})`);
            }
            break;
          }

          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            allLeads.push(...data.data);
            totalFetched = allLeads.length;

            // Emit live progress during fetching
            controller.enqueue(sseEvent({
              type: 'progress',
              phase: 'fetching',
              imported: 0,
              skipped: 0,
              failed: 0,
              total: totalFetched,
              current: totalFetched,
              message: `Fetching leads... (Found ${totalFetched} leads so far)`,
            }));

            if (data.paging?.cursors?.after && data.data.length === 100) {
              afterCursor = data.paging.cursors.after;
            } else if (data.paging?.next) {
              const match = data.paging.next.match(/after=([^&]+)/);
              afterCursor = match ? match[1] : null;
              if (!afterCursor) hasMore = false;
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        // ── Step 2: Format All Leads in Memory with Smart Normalized Keys ──
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

        const formattedLeads: any[] = [];
        for (const lead of allLeads) {
          const leadgen_id = lead.id;
          if (!leadgen_id) continue;

          const extracted = extractLeadFields(lead.field_data || []);

          formattedLeads.push({
            workspace_id: workspaceId,
            tenant_id: workspaceId,
            name: extracted.fullName,
            full_name: extracted.fullName,
            phone: extracted.phone || null,
            phone_number: extracted.phone || null,
            email: extracted.email || null,
            source: `Facebook Ads / ${formName}`,
            status: 'new',
            form_id: form_id,
            source_form_id: form_id,
            form_tag: formName,
            meta_lead_id: leadgen_id,
            whatsapp_group_id: contactGroupId,
            event_date: extracted.eventDate || null,
            location: extracted.location || null,
            city: extracted.location || null,
            budget: extracted.budget || null,
            raw_field_data: extracted.rawFieldMap,
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
              ad_name: lead.ad_name || '',
              field_data: lead.field_data || [],
              lead_owner: assignedLeadOwner || 'Unassigned',
              synced_manually: true,
              ...extracted.rawFieldMap,
            },
          });
        }

        // ── Step 3: Chunked Batch Upsert to Supabase (50 records per chunk) ──
        const chunkSize = 50;
        let totalSaved = 0;

        for (let i = 0; i < formattedLeads.length; i += chunkSize) {
          const chunk = formattedLeads.slice(i, i + chunkSize);

          controller.enqueue(sseEvent({
            type: 'progress',
            phase: 'importing',
            imported: totalSaved,
            skipped,
            failed,
            total: formattedLeads.length,
            current: Math.min(i + chunkSize, formattedLeads.length),
            message: `Saving leads to database (${Math.min(i + chunkSize, formattedLeads.length)} / ${formattedLeads.length})…`,
          }));

          let chunkToUpsert = [...chunk];
          let chunkSuccess = false;

          for (let attempt = 0; attempt < 6; attempt++) {
            const { data: upsertData, error: upsertErr } = await supabaseAdmin
              .from('leads')
              .upsert(chunkToUpsert, { onConflict: 'meta_lead_id', ignoreDuplicates: true })
              .select('id');

            if (!upsertErr) {
              const savedCount = upsertData?.length ?? chunk.length;
              totalSaved += savedCount;
              chunkSuccess = true;
              break;
            }

            const errMsg = upsertErr.message || '';
            const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
            if (match && match[1]) {
              const badCol = match[1];
              chunkToUpsert = chunkToUpsert.map(row => {
                const copy = { ...row };
                delete copy[badCol];
                return copy;
              });
            } else {
              console.error('[Batch Upsert Error]:', errMsg);
              break;
            }
          }

          if (!chunkSuccess) {
            // Fallback to row-by-row upsert for this specific failing chunk
            for (const singleLead of chunk) {
              let singleCopy = { ...singleLead };
              let singleSaved = false;
              for (let attempt = 0; attempt < 6; attempt++) {
                const { error: singleErr } = await supabaseAdmin
                  .from('leads')
                  .upsert(singleCopy, { onConflict: 'meta_lead_id', ignoreDuplicates: true });
                if (!singleErr) {
                  totalSaved++;
                  singleSaved = true;
                  break;
                }
                const errMsg = singleErr.message || '';
                const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
                if (match && match[1]) {
                  delete singleCopy[match[1]];
                } else {
                  break;
                }
              }
              if (!singleSaved) failed++;
            }
          }
        }

        imported = totalSaved;

        // ── Step 4: Update Synced Count in meta_lead_forms & fb_lead_forms ────
        try {
          await supabaseAdmin
            .from('meta_lead_forms')
            .upsert({
              workspace_id: workspaceId,
              form_id: form_id,
              page_id: page_id,
              form_name: formName,
              total_leads_count: totalSaved,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,form_id' });
        } catch (_) {}

        await supabaseAdmin
          .from('fb_lead_forms')
          .update({
            leads_count: totalSaved,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId)
          .eq('form_id', form_id);

        await supabaseAdmin
          .from('fb_form_mappings')
          .update({
            sync_count: totalSaved,
            updated_at: new Date().toISOString(),
          })
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
