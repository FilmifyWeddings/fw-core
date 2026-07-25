import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/meta/sync
 * Body: { workspace_id, form_id, page_id }
 *
 * Fetches historical lead submissions directly from Meta Graph API:
 * GET /{form-id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id
 *
 * Saves unique leads into CRM leads table and updates meta_sync_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, form_id, page_id } = body;

    const workspaceId = workspace_id || '00000000-0000-0000-0000-000000000000';

    if (!form_id) {
      return NextResponse.json({ error: 'form_id required' }, { status: 400 });
    }

    // 1. Page Access Token fetch
    let pageToken = '';
    if (page_id) {
      const { data: page } = await supabaseAdmin
        .from('meta_pages')
        .select('page_access_token')
        .eq('workspace_id', workspaceId)
        .eq('page_id', page_id)
        .maybeSingle();

      if (page?.page_access_token) {
        pageToken = page.page_access_token;
      }
    }

    if (!pageToken) {
      const { data: conn } = await supabaseAdmin
        .from('meta_connections')
        .select('access_token')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (conn?.access_token) pageToken = conn.access_token;
    }

    if (!pageToken) {
      return NextResponse.json({
        success: false,
        error: 'No active Page or User Access Token found to fetch leads. Reconnect Meta.',
      }, { status: 401 });
    }

    // 2. Fetch Leads from Meta Graph API
    const metaGraphUrl = `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic&limit=100&access_token=${pageToken}`;
    const graphRes = await fetch(metaGraphUrl);

    if (!graphRes.ok) {
      const err = await graphRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: err?.error?.message || `Meta API Error: ${graphRes.status}`,
      }, { status: graphRes.status });
    }

    const graphData = await graphRes.json();
    const leadsList = graphData.data || [];

    let importedCount = 0;
    let duplicateCount = 0;
    const insertedLeads: any[] = [];

    for (const leadItem of leadsList) {
      const leadgenId = leadItem.id;
      const fieldData = leadItem.field_data || [];

      let fullName = 'Facebook Lead';
      let phone = '';
      let email = '';
      let eventDate = '';
      let city = '';

      fieldData.forEach((f: { name: string; values: string[] }) => {
        const name = (f.name || '').toLowerCase();
        const val = f.values ? f.values[0] || '' : '';
        if (name.includes('name')) fullName = val;
        if (name.includes('phone')) phone = val;
        if (name.includes('email')) email = val;
        if (name.includes('date') || name.includes('event')) eventDate = val;
        if (name.includes('city') || name.includes('venue') || name.includes('location')) city = val;
      });

      if (!phone) phone = `+91 ${Date.now().toString().slice(-10)}`;
      if (!email) email = `meta_lead_${leadgenId}@fwstudio.in`;

      // Deduplication check
      const { data: existing } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(`phone.eq.${phone},id.eq.${leadgenId}`)
        .maybeSingle();

      if (existing) {
        duplicateCount++;
        continue;
      }

      // Insert into CRM leads table
      const newLead = {
        workspace_id: workspaceId,
        name: fullName,
        phone,
        email,
        source: 'Facebook Lead Ads',
        status: 'new',
        score: 'High-Value 🔥',
        notes: `Imported via Form #${form_id}. Ad: ${leadItem.ad_name || 'N/A'}, Campaign: ${leadItem.campaign_name || 'N/A'}`,
        created_at: leadItem.created_time || new Date().toISOString(),
        raw_payload: {
          leadgen_id: leadgenId,
          form_id,
          page_id,
          campaign_id: leadItem.campaign_id,
          campaign_name: leadItem.campaign_name,
          adset_id: leadItem.adset_id,
          adset_name: leadItem.adset_name,
          ad_id: leadItem.ad_id,
          ad_name: leadItem.ad_name,
          raw_meta_lead: leadItem,
        },
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert(newLead)
        .select('*')
        .single();

      if (!insertErr && inserted) {
        importedCount++;
        insertedLeads.push(inserted);

        // Save in meta_sync_logs
        await supabaseAdmin.from('meta_sync_logs').insert({
          workspace_id: workspaceId,
          lead_id: inserted.id,
          leadgen_id: leadgenId,
          form_id,
          page_id,
          lead_name: fullName,
          lead_phone: phone,
          lead_email: email,
          status: 'SYNCED',
          duplicate_status: 'UNIQUE',
        });
      }
    }

    // Update sync count in meta_lead_forms
    if (importedCount > 0) {
      await supabaseAdmin
        .from('meta_lead_forms')
        .update({ sync_count: importedCount, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);
    }

    return NextResponse.json({
      success: true,
      form_id,
      imported_count: importedCount,
      duplicate_skipped_count: duplicateCount,
      inserted_leads: insertedLeads,
      message: `Historical Lead Sync Complete! Imported ${importedCount} new lead(s) from Meta (${duplicateCount} duplicate(s) skipped).`,
    });

  } catch (err: any) {
    console.error('[Meta Historical Sync Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
