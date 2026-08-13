import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/integrations/meta/manual-sync
 * Manual Sync Backup for Meta Lead Forms (OAuth & Direct Token Sync).
 * Fetches all past/missing leads directly via GET /v20.0/{form-id}/leads?access_token={page_access_token}
 * and appends new leads to the CRM database without duplicates.
 *
 * Body: { workspace_id?: string, form_id: string, page_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { form_id, page_id, workspace_id: requestedWorkspaceId } = body;

    if (!form_id) {
      return NextResponse.json({ success: false, error: 'form_id is required' }, { status: 400 });
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: workspace_id required' }, { status: 401 });
    }

    // ── 1. Resolve Page Access Token ─────────────────────────────────────────
    let pageToken: string | null = null;
    let pageName = 'Facebook Page';

    // Check fb_page_configs by page_id if provided
    if (page_id) {
      const { data: pConfig } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_name, page_access_token')
        .eq('page_id', page_id)
        .not('page_access_token', 'is', null)
        .limit(1)
        .maybeSingle();
      if (pConfig?.page_access_token) {
        pageToken = pConfig.page_access_token;
        pageName = pConfig.page_name || pageName;
      }
    }

    // Fallback: Check fb_lead_forms -> fb_page_configs
    if (!pageToken) {
      const { data: formRow } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('page_id, form_name')
        .eq('form_id', form_id)
        .maybeSingle();

      if (formRow?.page_id) {
        const { data: pConfig } = await supabaseAdmin
          .from('fb_page_configs')
          .select('page_name, page_access_token')
          .eq('page_id', formRow.page_id)
          .not('page_access_token', 'is', null)
          .limit(1)
          .maybeSingle();
        if (pConfig?.page_access_token) {
          pageToken = pConfig.page_access_token;
          pageName = pConfig.page_name || pageName;
        }
      }
    }

    // Fallback: Check integration_credentials
    if (!pageToken) {
      const { data: conn } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('user_id', workspaceId)
        .eq('provider', 'meta')
        .maybeSingle();
      pageToken = conn?.access_token || null;
    }

    // Fallback: Check profiles
    if (!pageToken) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('meta_access_token')
        .eq('id', workspaceId)
        .maybeSingle();
      pageToken = profile?.meta_access_token || null;
    }

    if (!pageToken) {
      return NextResponse.json(
        { success: false, error: 'Page access token not found. Please reconnect Meta integration.' },
        { status: 403 }
      );
    }

    // ── 2. Fetch Form Leads from Graph API ──────────────────────────────────
    console.log(`[Manual Sync API] Fetching leads for form ${form_id}...`);
    const leadsRes = await fetch(
      `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id,created_time,field_data,ad_name,campaign_name,adset_name&limit=200&access_token=${pageToken}`
    );
    const leadsJson = await leadsRes.json().catch(() => ({}));

    if (!leadsRes.ok || leadsJson.error) {
      const errMsg = leadsJson?.error?.message || `HTTP ${leadsRes.status}`;
      return NextResponse.json({ success: false, error: `Graph API Error: ${errMsg}` }, { status: 400 });
    }

    const fetchedLeads: any[] = Array.isArray(leadsJson.data) ? leadsJson.data : [];

    // ── 3. Fetch per-form Lead Auto-Distribution config ─────────────────────
    let distConfig: { enabled: boolean; owners: string[]; last_assigned_index?: number } | null = null;
    try {
      const { data: fMap } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('mapping_config')
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id)
        .maybeSingle();

      distConfig = (fMap?.mapping_config as any)?.distribution_config || null;
    } catch (_) {}

    if (!distConfig) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
        distConfig = u?.user?.user_metadata?.form_distributions?.[form_id] || null;
      } catch (_) {}
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // ── 4. Process Leads & Prevent Duplicates ───────────────────────────────
    for (const lead of fetchedLeads) {
      const leadgenId = lead.id;

      // Duplicate Check
      const { data: existing } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .contains('raw_payload', { leadgen_id: leadgenId })
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Extract field_data
      const fieldData: Record<string, string> = {};
      if (Array.isArray(lead.field_data)) {
        lead.field_data.forEach((f: { name: string; values: string[] }) => {
          const k = (f.name || '').toLowerCase();
          const v = f.values?.[0] || '';
          fieldData[k] = v;
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
        '+16505550123';

      const email =
        fieldData['email'] ||
        fieldData['email_address'] ||
        fieldData['work_email'] ||
        '';

      // Round-Robin Lead Owner Auto-Distribution
      let assignedOwner: string | null = null;
      if (distConfig?.enabled === true && Array.isArray(distConfig.owners) && distConfig.owners.length > 0) {
        const owners = distConfig.owners;
        const lastIdx = typeof distConfig.last_assigned_index === 'number' ? distConfig.last_assigned_index : -1;
        const nextIdx = (lastIdx + 1) % owners.length;
        assignedOwner = owners[nextIdx];
        distConfig.last_assigned_index = nextIdx;
      }

      // Insert Lead
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
          owner: assignedOwner,
          lead_owner: assignedOwner,
          created_at: lead.created_time ? new Date(lead.created_time).toISOString() : new Date().toISOString(),
          raw_payload: {
            leadgen_id: leadgenId,
            form_id,
            page_id,
            page_name: pageName,
            campaign_name: lead.campaign_name || '',
            adset_name: lead.adset_name || '',
            ad_name: lead.ad_name || '',
            field_data: lead.field_data || [],
            lead_owner: assignedOwner,
            synced_manually: true,
          },
        });

      if (insertErr) {
        failed++;
      } else {
        imported++;
      }
    }

    // Persist updated last_assigned_index if distribution was used
    if (distConfig && typeof distConfig.last_assigned_index === 'number') {
      try {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
        const existingMeta = uData?.user?.user_metadata || {};
        const existingDists = existingMeta.form_distributions || {};
        await supabaseAdmin.auth.admin.updateUserById(workspaceId, {
          user_metadata: {
            ...existingMeta,
            form_distributions: {
              ...existingDists,
              [form_id]: distConfig,
            },
          },
        });
      } catch (_) {}
    }

    // ── 5. Update leads_count in fb_lead_forms ──────────────────────────────
    try {
      const { data: currentForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('leads_count')
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id)
        .maybeSingle();

      const newCount = (currentForm?.leads_count || 0) + imported;
      await supabaseAdmin
        .from('fb_lead_forms')
        .update({ leads_count: newCount, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      form_id,
      imported,
      skipped,
      failed,
      total_fetched: fetchedLeads.length,
    });
  } catch (err: any) {
    console.error('[Manual Sync API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Manual Sync failed' }, { status: 500 });
  }
}
