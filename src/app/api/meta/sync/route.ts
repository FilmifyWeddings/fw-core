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

    let importedCount = 0;
    let duplicateCount = 0;
    let totalFetched = 0;
    const insertedLeads: any[] = [];
    let pageIterations = 0;

    let nextUrl: string | null = `https://graph.facebook.com/v20.0/${form_id || '1193618092947278'}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&limit=100${sinceQuery}&access_token=${pageToken}`;

    while (nextUrl && pageIterations < 150) {
      pageIterations++;
      const graphRes = await fetch(nextUrl);
      if (!graphRes.ok) {
        const err = await graphRes.json().catch(() => ({}));
        if (totalFetched === 0) {
          return NextResponse.json({
            success: false,
            error: err?.error?.message || `Meta Graph API Error: ${graphRes.status}`,
          }, { status: graphRes.status });
        }
        break;
      }

      const graphData = await graphRes.json();
      const leadsList = graphData.data || [];
      totalFetched += leadsList.length;

      for (const leadItem of leadsList) {
        const leadgenId = leadItem.id;

        // Deduplication check: check if already exists in DB
        const { data: existing } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(`meta_lead_id.eq.${leadgenId},raw_payload->>leadgen_id.eq.${leadgenId}`)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
          continue;
        }

        if (estimate_only) {
          continue;
        }

        // Parse normalized field_data
        const extracted = extractLeadFields(leadItem.field_data || []);

        const newLeadPayload: Record<string, any> = {
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
            adset_name: leadItem.adset_name || '',
            ad_name: leadItem.ad_name || '',
            field_data: leadItem.field_data || [],
            synced_via: 'manual_bulk_sync',
            ...extracted.rawFieldMap,
          },
        };

        // Resilient dynamic column-stripping insert
        let insertedItem: any = null;
        let payloadCopy = { ...newLeadPayload };

        for (let attempt = 0; attempt < 6; attempt++) {
          const { data: ins, error: insertErr } = await supabaseAdmin
            .from('leads')
            .insert(payloadCopy)
            .select('*')
            .maybeSingle();

          if (!insertErr && ins) {
            insertedItem = ins;
            break;
          }

          if (insertErr) {
            const errMsg = insertErr.message || '';
            const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
            if (match && match[1]) {
              delete payloadCopy[match[1]];
            } else {
              console.warn('[Historical Lead Insert Notice]:', errMsg);
              break;
            }
          }
        }

        if (insertedItem) {
          importedCount++;
          insertedLeads.push(insertedItem);
        } else {
          duplicateCount++;
        }
      }

      nextUrl = graphData.paging?.next || null;
      if (!nextUrl && graphData.paging?.cursors?.after && leadsList.length >= 100) {
        nextUrl = `https://graph.facebook.com/v20.0/${form_id || '1193618092947278'}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&limit=100${sinceQuery}&after=${graphData.paging.cursors.after}&access_token=${pageToken}`;
      }
    }

    if (estimate_only) {
      return NextResponse.json({
        success: true,
        estimated_total: totalFetched,
        already_imported: duplicateCount,
        duplicates: duplicateCount,
        expected_new: Math.max(0, totalFetched - duplicateCount),
      });
    }

    // Update sync count in `fb_lead_forms` & `fb_form_mappings`
    if (importedCount > 0 && form_id) {
      await supabaseAdmin
        .from('fb_form_mappings')
        .update({ sync_count: importedCount, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);

      const { data: curForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('leads_count')
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id)
        .maybeSingle();

      const newCount = (curForm?.leads_count || 0) + importedCount;
      await supabaseAdmin
        .from('fb_lead_forms')
        .update({ leads_count: newCount, updated_at: new Date().toISOString() })
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
