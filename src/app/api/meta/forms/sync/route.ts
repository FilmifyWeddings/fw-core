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

  // ── Resolve page access token ─────────────────────────────────────────────
  let pageToken: string | null = null;
  let pageName = 'Facebook Page';

  const { data: pageRow } = await supabaseAdmin
    .from('fb_page_configs')
    .select('page_name, page_access_token')
    .eq('page_id', page_id)
    .not('page_access_token', 'is', null)
    .limit(1)
    .maybeSingle();

  if (pageRow?.page_access_token) {
    pageToken = pageRow.page_access_token;
    pageName  = pageRow.page_name || 'Facebook Page';
  }

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
    .single();

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
        // ── Step 1: Fetch ALL leads with pagination ──────────────────────────
        const allLeads: any[] = [];
        let nextCursor: string | null = null;
        let pageNum = 0;

        // First, get total count
        const countRes = await fetch(
          `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id&limit=1&access_token=${pageToken}`
        );
        const countData = await countRes.json();

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

          const leadsRes = await fetch(url);
          const leadsData = await leadsRes.json();

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

          // ── Duplicate check using leadgen_id in raw_payload ────────────────
          const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('workspace_id', workspaceId)
            .contains('raw_payload', { leadgen_id })
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          // ── Extract field_data ─────────────────────────────────────────────
          const fieldData: Record<string, string> = {};
          if (lead.field_data && Array.isArray(lead.field_data)) {
            lead.field_data.forEach((field: { name: string; values: string[] }) => {
              const key = (field.name || '').toLowerCase();
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
            '';

          const email =
            fieldData['email'] ||
            fieldData['email_address'] ||
            fieldData['work_email'] ||
            '';

          // ── Determine assigned Lead Owner via Round-Robin ─────────────────
          let assignedLeadOwner: string | null = null;
          try {
            assignedLeadOwner = await getNextDistributedLeadOwner(workspaceId, form_id);
          } catch (distErr: any) {
            console.error('[Forms Sync Distribution Error]:', distErr?.message);
          }

          // ── Insert lead into CRM ───────────────────────────────────────────
          const { error: insertErr } = await supabaseAdmin
            .from('leads')
            .insert({
              workspace_id: workspaceId,
              tenant_id: workspaceId,
              name: fullName,
              phone,
              email,
              source: 'Facebook Lead Ads',
              status: 'new',
              created_at: lead.created_time
                ? new Date(lead.created_time).toISOString()
                : new Date().toISOString(),
              raw_payload: {
                leadgen_id,
                form_id,
                page_id,
                page_name: pageName,
                campaign_name: lead.campaign_name || '',
                adset_name: lead.adset_name || '',
                ad_name: lead.ad_name || '',
                field_data: lead.field_data || [],
                lead_owner: assignedLeadOwner || 'Unassigned',
                synced_manually: true,
              },
            });

          if (insertErr) {
            failed++;
          } else {
            imported++;
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
