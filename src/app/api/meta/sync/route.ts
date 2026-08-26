import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { extractLeadFields } from '@/lib/meta-lead-normalizer';

/**
 * POST /api/meta/sync
 * Body: { workspace_id, form_id, page_id, days: 7 | 30 | 90 | 'all' }
 *
 * Imports past leads directly from Meta Graph API with time-range filtering,
 * pre-import estimation, and duplicate skipping. Works even for disabled forms.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, form_id, page_id, days = '30', estimate_only = false } = body;

    const authResult = await verifyMetaAuth(req, workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    // 1. Get Page Access Token from Supabase
    let pageToken = '';
    if (page_id) {
      const { data: metaPage } = await supabaseAdmin
        .from('meta_connected_pages')
        .select('permanent_page_token')
        .eq('workspace_id', workspaceId)
        .eq('page_id', page_id)
        .maybeSingle();

      if (metaPage?.permanent_page_token) {
        pageToken = metaPage.permanent_page_token;
      }
    }

    if (!pageToken && page_id) {
      const { data: pageConfig } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_access_token')
        .eq('workspace_id', workspaceId)
        .eq('page_id', page_id)
        .maybeSingle();

      if (pageConfig?.page_access_token) {
        pageToken = pageConfig.page_access_token;
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
        error: 'No valid Page Access Token found for this workspace. Please reconnect Facebook.',
      }, { status: 400 });
    }

    // 2. Compute date threshold for Meta Graph API query
    let sinceQuery = '';
    if (days !== 'all') {
      const numDays = parseInt(days, 10) || 30;
      const sinceTimestamp = Math.floor((Date.now() - numDays * 24 * 60 * 60 * 1000) / 1000);
      sinceQuery = `&since=${sinceTimestamp}`;
    }

    // Fetch form details if form_id provided
    let formName = 'Instant Lead Form';
    if (form_id) {
      const { data: formObj } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('form_name')
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id)
        .maybeSingle();
      if (formObj?.form_name) formName = formObj.form_name;
    }

    let allLeads: any[] = [];
    let afterCursor: string | null = null;
    let hasMore = true;
    let pageNum = 0;

    while (hasMore && pageNum < 200) {
      pageNum++;
      let url = `https://graph.facebook.com/v20.0/${form_id || '1193618092947278'}/leads?fields=id,created_time,field_data,ad_name,campaign_name&limit=100${sinceQuery}&access_token=${pageToken}`;
      if (afterCursor) {
        url += `&after=${afterCursor}`;
      }

      const graphRes = await fetch(url);
      if (!graphRes.ok) {
        const err = await graphRes.json().catch(() => ({}));
        if (allLeads.length === 0) {
          return NextResponse.json({
            success: false,
            error: err?.error?.message || `Meta Graph API Error: ${graphRes.status}`,
          }, { status: graphRes.status });
        }
        break;
      }

      const graphData = await graphRes.json();
      const leadsList = graphData.data || [];

      if (Array.isArray(leadsList) && leadsList.length > 0) {
        allLeads.push(...leadsList);
        if (graphData.paging?.cursors?.after && leadsList.length === 100) {
          afterCursor = graphData.paging.cursors.after;
        } else if (graphData.paging?.next) {
          const match = graphData.paging.next.match(/after=([^&]+)/);
          afterCursor = match ? match[1] : null;
          if (!afterCursor) hasMore = false;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    totalFetched = allLeads.length;

    if (estimate_only) {
      return NextResponse.json({
        success: true,
        estimated_total: totalFetched,
        already_imported: 0,
        duplicates: 0,
        expected_new: totalFetched,
      });
    }

    // Format all leads in memory
    const formattedLeads: any[] = [];
    for (const leadItem of allLeads) {
      const leadgenId = leadItem.id;
      if (!leadgenId) continue;

      const extracted = extractLeadFields(leadItem.field_data || []);

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
        form_id: form_id || leadItem.form_id,
        source_form_id: form_id || leadItem.form_id,
        form_tag: formName,
        meta_lead_id: leadgenId,
        event_date: extracted.eventDate || null,
        location: extracted.location || null,
        city: extracted.location || null,
        budget: extracted.budget || null,
        raw_field_data: extracted.rawFieldMap,
        created_at: leadItem.created_time || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_payload: {
          leadgen_id: leadgenId,
          meta_lead_id: leadgenId,
          form_id: form_id || leadItem.form_id,
          form_name: formName,
          page_id: page_id,
          campaign_name: leadItem.campaign_name || '',
          ad_name: leadItem.ad_name || '',
          field_data: leadItem.field_data || [],
          synced_via: 'manual_bulk_sync',
          ...extracted.rawFieldMap,
        },
      });
    }

    // Chunked Batch Upsert (50 records per chunk)
    const chunkSize = 50;
    let totalSaved = 0;

    for (let i = 0; i < formattedLeads.length; i += chunkSize) {
      const chunk = formattedLeads.slice(i, i + chunkSize);
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
          console.error('[Bulk Sync Upsert Error]:', errMsg);
          break;
        }
      }

      if (!chunkSuccess) {
        for (const singleLead of chunk) {
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
    }

    importedCount = totalSaved;

    // Update total synced count for the form
    if (form_id) {
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
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);

      await supabaseAdmin
        .from('fb_form_mappings')
        .update({
          sync_count: totalSaved,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);
    }

    return NextResponse.json({
      success: true,
      form_id,
      imported_count: importedCount,
      duplicate_skipped_count: duplicateCount,
      total_fetched: totalFetched,
      inserted_leads: insertedLeads,
      message: `Historical Lead Sync Complete! Imported ${importedCount} new lead(s) from Meta (${duplicateCount} existing duplicates skipped).`,
    });

  } catch (err: any) {
    console.error('[Meta Historical Sync Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
