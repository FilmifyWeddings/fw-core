import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { safelyExtractFields } from '@/lib/meta-lead-normalizer';
import { getNextDistributedLeadOwner } from '@/lib/lead-distribution';

/**
 * POST /api/meta/sync-leads
 * 
 * Robust Incremental Historical Meta Leads Sync Engine.
 * 1. Resolves permanent page access token for the form's connected page.
 * 2. Fetches leads in batches of 50 via Meta Graph API.
 * 3. Immediately upserts each batch to Supabase (Zero Progress Loss).
 * 4. Updates form sync counts and returns live result.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { form_id: formId, page_id: requestedPageId, workspace_id: requestedWorkspaceId } = body;

    if (!formId) {
      return NextResponse.json({ success: false, error: 'form_id is required' }, { status: 400 });
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    const workspaceId = authResult.workspaceId || requestedWorkspaceId;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing workspace_id' }, { status: 401 });
    }

    // ── 1. Resolve Form Name and Page ID ──────────────────────────────────────────
    let pageId = requestedPageId || '';
    let formName = 'Instant Lead Form';

    const { data: formObj } = await supabaseAdmin
      .from('meta_lead_forms')
      .select('page_id, form_name')
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId)
      .maybeSingle();

    if (formObj) {
      if (formObj.page_id) pageId = formObj.page_id;
      if (formObj.form_name) formName = formObj.form_name;
    }

    if (!pageId) {
      const { data: fbForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('page_id, form_name')
        .eq('workspace_id', workspaceId)
        .eq('form_id', formId)
        .maybeSingle();

      if (fbForm) {
        if (fbForm.page_id) pageId = fbForm.page_id;
        if (fbForm.form_name) formName = fbForm.form_name;
      }
    }

    // ── 2. Retrieve Permanent Page Token for that page_id ───────────────────────
    let pageToken = '';

    if (pageId) {
      const { data: metaPage } = await supabaseAdmin
        .from('meta_connected_pages')
        .select('permanent_page_token')
        .eq('workspace_id', workspaceId)
        .eq('page_id', pageId)
        .maybeSingle();

      if (metaPage?.permanent_page_token) {
        pageToken = metaPage.permanent_page_token;
      }
    }

    if (!pageToken && pageId) {
      const { data: fbConfig } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_access_token')
        .eq('workspace_id', workspaceId)
        .eq('page_id', pageId)
        .maybeSingle();

      if (fbConfig?.page_access_token) {
        pageToken = fbConfig.page_access_token;
      }
    }

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

    if (!pageToken) {
      return NextResponse.json({
        success: false,
        error: 'No valid Page Access Token found for this form. Please reconnect your Facebook account.',
      }, { status: 400 });
    }

    // ── 3. Resolve Distribution Owner & WhatsApp Group ────────────────────────
    let assignedOwner: string | null = null;
    try {
      assignedOwner = await getNextDistributedLeadOwner(workspaceId, formId);
    } catch (_) {}

    const { data: formMapping } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('contact_group_id')
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId)
      .maybeSingle();

    const contactGroupId = formMapping?.contact_group_id || null;

    // ── 4. Immediate Incremental Chunk Saving ──────────────────────────────────
    let totalSaved = 0;
    let totalFetched = 0;
    let loopCount = 0;
    let nextUrl: string | null = `https://graph.facebook.com/v20.0/${formId}/leads?fields=id,created_time,field_data,ad_name,campaign_name&limit=50&access_token=${pageToken}`;

    while (nextUrl && loopCount < 200) {
      loopCount++;
      const res = await fetch(nextUrl);
      const result = await res.json().catch(() => ({}));

      if (result.error) {
        console.error('[Meta Graph API sync-leads error]:', result.error);
        if (totalSaved === 0 && loopCount === 1) {
          return NextResponse.json({
            success: false,
            error: result.error.message || 'Meta Graph API Error',
            code: result.error.code,
          }, { status: 400 });
        }
        break;
      }

      const leadsBatch = Array.isArray(result.data) ? result.data : [];
      if (leadsBatch.length === 0) break;

      totalFetched += leadsBatch.length;

      const formattedBatch = leadsBatch.map((lead: any) => {
        const parsed = safelyExtractFields(lead.field_data || []);
        return {
          workspace_id: workspaceId,
          tenant_id: workspaceId,
          meta_lead_id: lead.id,
          form_id: formId,
          source_form_id: formId,
          name: parsed.fullName || 'Facebook Lead',
          full_name: parsed.fullName || 'Facebook Lead',
          phone: parsed.phone !== '-' ? parsed.phone : '',
          phone_number: parsed.phone !== '-' ? parsed.phone : '',
          email: parsed.email !== '-' ? parsed.email : '',
          city: parsed.city !== '-' ? parsed.city : '',
          location: parsed.city !== '-' ? parsed.city : '',
          budget: parsed.budget !== '-' ? parsed.budget : '',
          event_date: parsed.eventDate !== '-' ? parsed.eventDate : '',
          source: lead.campaign_name ? `Facebook Ads / ${lead.campaign_name}` : `Facebook Ads / ${formName}`,
          status: 'new',
          whatsapp_group_id: contactGroupId,
          form_tag: formName,
          raw_field_data: lead,
          created_at: lead.created_time ? new Date(lead.created_time).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          raw_payload: {
            leadgen_id: lead.id,
            meta_lead_id: lead.id,
            form_id: formId,
            form_name: formName,
            page_id: pageId,
            campaign_name: lead.campaign_name || '',
            ad_name: lead.ad_name || '',
            field_data: lead.field_data || [],
            lead_owner: assignedOwner || 'Unassigned',
            synced_via: 'manual_incremental_sync',
            ...parsed,
          },
        };
      });

      // Save batch immediately to database with resilient column fallback
      let chunkToUpsert = [...formattedBatch];
      let chunkSuccess = false;

      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: upsertData, error: upsertErr } = await supabaseAdmin
          .from('leads')
          .upsert(chunkToUpsert, { onConflict: 'meta_lead_id', ignoreDuplicates: true })
          .select('id');

        if (!upsertErr) {
          totalSaved += (upsertData?.length ?? chunkToUpsert.length);
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
          console.error('[Incremental Sync Batch Upsert Error]:', errMsg);
          break;
        }
      }

      if (!chunkSuccess) {
        // Fallback to row-by-row upsert for failing chunk
        for (const singleLead of chunkToUpsert) {
          let singleCopy = { ...singleLead };
          for (let attempt = 0; attempt < 6; attempt++) {
            const { error: singleErr } = await supabaseAdmin
              .from('leads')
              .upsert(singleCopy, { onConflict: 'meta_lead_id', ignoreDuplicates: true });
            if (!singleErr) {
              totalSaved++;
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
        }
      }

      // Check next page
      if (result.paging?.next) {
        nextUrl = result.paging.next;
      } else if (result.paging?.cursors?.after && leadsBatch.length === 50) {
        nextUrl = `https://graph.facebook.com/v20.0/${formId}/leads?fields=id,created_time,field_data,ad_name,campaign_name&limit=50&after=${result.paging.cursors.after}&access_token=${pageToken}`;
      } else {
        nextUrl = null;
      }
    }

    // ── 5. Update Synced Count in Database ─────────────────────────────────────
    const now = new Date().toISOString();

    try {
      await supabaseAdmin
        .from('meta_lead_forms')
        .upsert({
          workspace_id: workspaceId,
          form_id: formId,
          page_id: pageId,
          form_name: formName,
          total_leads_count: totalSaved,
          last_synced_at: now,
          updated_at: now,
        }, { onConflict: 'workspace_id,form_id' });
    } catch (_) {}

    await supabaseAdmin
      .from('fb_lead_forms')
      .update({
        leads_count: totalSaved,
        updated_at: now,
      })
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId);

    await supabaseAdmin
      .from('fb_form_mappings')
      .update({
        sync_count: totalSaved,
        updated_at: now,
      })
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId);

    return NextResponse.json({
      success: true,
      count: totalSaved,
      total_fetched: totalFetched,
      form_id: formId,
      form_name: formName,
      duration_ms: Date.now() - startTime,
      message: totalSaved > 0
        ? `Successfully synced ${totalSaved} leads from Meta!`
        : 'No historical leads found for this form in Meta',
    });

  } catch (err: any) {
    console.error('[POST /api/meta/sync-leads fatal error]:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error during lead sync',
    }, { status: 500 });
  }
}
