import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith('https://')) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (host && !isLocal) {
    const cleanHost = host.split(':')[0];
    return `https://${cleanHost}`;
  }

  if (host && isLocal) {
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}`;
  }

  return 'https://studiocore.in';
}

// Code -> 60-Day Long-Lived Token Exchange
async function exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '1279608780825934';
  const appSecret = process.env.FACEBOOK_APP_SECRET || '4da60a4bc30f64db3570ffde1508b2b6';

  console.log(`[Meta Graph API] Exchanging OAuth code for access token. Redirect URI: ${redirectUri}`);

  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_secret=${appSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    console.error('[RAW GRAPH API ERROR] OAuth Code exchange failed:\n', JSON.stringify(err, null, 2));
    throw new Error(`OAuth Code Exchange Failed: ${err?.error?.message || tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const shortToken: string = tokenData.access_token;

  // Short Lived -> Long Lived Token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${appId}&` +
    `client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );

  if (!longRes.ok) {
    console.warn('[Meta Callback] Long-lived token exchange warning, using short-lived token');
    return shortToken;
  }

  const longData = await longRes.json();
  return longData.access_token || shortToken;
}

// Audit Granted & Declined Scopes for User Access Token
async function auditTokenScopes(token: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[RAW GRAPH API ERROR] /me/permissions:\n', JSON.stringify(err, null, 2));
      return { granted_scopes: [], declined_scopes: [] };
    }
    const data = await res.json();
    const perms = data.data || [];
    const granted_scopes = perms.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
    const declined_scopes = perms.filter((p: any) => p.status === 'declined').map((p: any) => p.permission);

    console.log('[RAW PERMISSIONS AUDIT] User Access Token Scopes:');
    console.log('[RAW PERMISSIONS AUDIT] granted_scopes:\n', JSON.stringify(granted_scopes, null, 2));
    console.log('[RAW PERMISSIONS AUDIT] declined_scopes:\n', JSON.stringify(declined_scopes, null, 2));

    return { granted_scopes, declined_scopes };
  } catch (err: any) {
    console.error('[RAW PERMISSIONS AUDIT EXCEPTION]:', err.message);
    return { granted_scopes: [], declined_scopes: [] };
  }
}

async function fetchUserProfile(token: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[RAW GRAPH API ERROR] /me profile:\n', JSON.stringify(err, null, 2));
    throw new Error('Failed to fetch Meta User profile');
  }
  const prof = await res.json();
  console.log('[RAW GRAPH API RESPONSE] /me User Profile:\n', JSON.stringify(prof, null, 2));
  return prof;
}

// Multi-Source Graph API Discovery Engine with Explicit RAW JSON Response Logging
async function fetchUserPages(token: string) {
  console.log('[Meta Discovery Engine] Querying Facebook Pages from all Graph API sources...');
  const pagesMap = new Map<string, any>();

  // Source 1: Standard GET /me/accounts
  try {
    console.log('[RAW GRAPH API QUERY] Executing GET https://graph.facebook.com/v20.0/me/accounts...');
    const res = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${token}`);
    const data = await res.json().catch(() => ({}));

    console.log('[RAW GRAPH API RESPONSE] GET /me/accounts:\n', JSON.stringify(data, null, 2));

    if (!res.ok || data.error) {
      console.error('[RAW GRAPH API ERROR] GET /me/accounts Failed:\n', JSON.stringify(data.error || data, null, 2));
    } else {
      const pageList = data.data || [];
      console.log(`[RAW GRAPH API AUDIT] GET /me/accounts returned ${pageList.length} page(s).`);
      pageList.forEach((p: any) => {
        pagesMap.set(p.id, {
          page_id: p.id,
          page_name: p.name,
          page_category: p.category || 'Business Page',
          page_access_token: p.access_token || token,
          picture_url: p.picture?.data?.url || null,
        });
      });
    }
  } catch (err: any) {
    console.error('[RAW GRAPH API EXCEPTION] Source 1 GET /me/accounts:', err.message);
  }

  // Source 2: Meta Business Manager GET /me/businesses
  try {
    console.log('[RAW GRAPH API QUERY] Executing GET https://graph.facebook.com/v20.0/me/businesses...');
    const bizRes = await fetch(`https://graph.facebook.com/v20.0/me/businesses?fields=id,name,client_pages{id,name,category,access_token},owned_pages{id,name,category,access_token}&access_token=${token}`);
    const bizData = await bizRes.json().catch(() => ({}));

    console.log('[RAW GRAPH API RESPONSE] GET /me/businesses:\n', JSON.stringify(bizData, null, 2));

    if (bizRes.ok && bizData.data) {
      bizData.data.forEach((biz: any) => {
        const owned = biz.owned_pages?.data || [];
        const client = biz.client_pages?.data || [];
        [...owned, ...client].forEach((op: any) => {
          if (!pagesMap.has(op.id)) {
            pagesMap.set(op.id, {
              page_id: op.id,
              page_name: op.name,
              page_category: op.category || 'Business Page',
              page_access_token: op.access_token || token,
              picture_url: null,
            });
          }
        });
      });
    }
  } catch (err: any) {
    console.error('[RAW GRAPH API EXCEPTION] Source 2 GET /me/businesses:', err.message);
  }

  console.log(`[Meta Discovery Engine COMPLETE] Discovered ${pagesMap.size} unique Facebook Page(s).`);
  return Array.from(pagesMap.values());
}

// Fetch Lead Forms for a Page with RAW JSON Logging
async function fetchLeadFormsForPage(pageId: string, pageAccessToken: string) {
  console.log(`[RAW GRAPH API QUERY] GET /${pageId}/leadgen_forms...`);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${pageAccessToken}`);
    const data = await res.json().catch(() => ({}));
    console.log(`[RAW GRAPH API RESPONSE] GET /${pageId}/leadgen_forms:\n`, JSON.stringify(data, null, 2));

    if (!res.ok || data.error) {
      console.error(`[RAW GRAPH API ERROR] GET /${pageId}/leadgen_forms:\n`, JSON.stringify(data.error || data, null, 2));
      return [];
    }

    const formsList = (data.data || []).map((f: any) => ({
      form_id: f.id,
      form_name: f.name || 'Instant Lead Form',
      status: f.status || 'ACTIVE',
      sync_count: f.leads_count || 0,
      questions_count: f.questions ? f.questions.length : 0,
      questions: f.questions || [],
      created_time: f.created_time || new Date().toISOString(),
    }));
    return formsList;
  } catch (err: any) {
    console.error(`[RAW GRAPH API EXCEPTION] GET /${pageId}/leadgen_forms:`, err.message);
    return [];
  }
}

// Subscribe Leadgen Webhook to Page
async function subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        subscribed_fields: 'leadgen',
        access_token: pageAccessToken,
      }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    console.log(`[RAW GRAPH API RESPONSE] POST /${pageId}/subscribed_apps:\n`, JSON.stringify(data, null, 2));
    return res.ok && !data.error;
  } catch (_) {
    return false;
  }
}

// Ingest ALL Historical Leads for a Lead Gen Form (Full Pagination)
async function ingestHistoricalLeadsForForm(
  workspaceId: string,
  formId: string,
  formName: string,
  pageId: string,
  pageName: string,
  pageAccessToken: string
): Promise<{ imported: number; skipped: number; total: number }> {
  let imported = 0;
  let skipped = 0;
  let totalFetched = 0;
  let nextCursor: string | null = null;
  let pageCount = 0;

  console.log(`[Historical Ingestion] Starting full lead pull for Form "${formName}" (${formId})...`);

  try {
    do {
      pageCount++;
      let url = `https://graph.facebook.com/v20.0/${formId}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&limit=100&access_token=${pageAccessToken}`;
      if (nextCursor) url += `&after=${nextCursor}`;

      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.error) {
        console.error(`[Historical Ingestion ERROR] Form ${formId}:`, json.error || res.status);
        break;
      }

      const leads = json.data || [];
      totalFetched += leads.length;

      for (const lead of leads) {
        const leadgenId = lead.id;

        // Deduplication Check
        const { data: existing } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(`meta_lead_id.eq.${leadgenId},raw_payload->>leadgen_id.eq.${leadgenId}`)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Parse Field Data
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

        const leadPayload: Record<string, any> = {
          workspace_id: workspaceId,
          tenant_id: workspaceId,
          name: fullName,
          phone: phone || null,
          email: email || null,
          source: `Facebook Ads / ${formName}`,
          status: 'new',
          source_form_id: formId,
          form_tag: formName,
          meta_lead_id: leadgenId,
          event_date: eventDate,
          location: location,
          budget: budget,
          created_at: lead.created_time ? new Date(lead.created_time).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          raw_payload: {
            leadgen_id: leadgenId,
            meta_lead_id: leadgenId,
            form_id: formId,
            form_name: formName,
            page_id: pageId,
            page_name: pageName,
            campaign_name: lead.campaign_name || '',
            adset_name: lead.adset_name || '',
            ad_name: lead.ad_name || '',
            field_data: lead.field_data || [],
            synced_via: '1-click_oauth_initial_sync',
            ...fieldData,
          },
        };

        // Resilient dynamic column-stripping insert
        let inserted = false;
        let currentLeadPayload = { ...leadPayload };

        for (let attempt = 0; attempt < 6; attempt++) {
          const { error: insErr } = await supabaseAdmin
            .from('leads')
            .insert(currentLeadPayload);

          if (!insErr) {
            inserted = true;
            break;
          }

          const errMsg = insErr.message || '';
          const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
          if (match && match[1]) {
            delete currentLeadPayload[match[1]];
          } else {
            console.warn('[Historical Lead Insert Notice]:', errMsg);
            break;
          }
        }

        if (inserted) {
          imported++;
        } else {
          skipped++;
        }
      }

      nextCursor = json.paging?.cursors?.after || null;
      const hasMore = Boolean(json.paging?.next);
      if (!hasMore) nextCursor = null;

    } while (nextCursor && pageCount < 50); // Up to 5,000 leads per form

    // Update fb_lead_forms count
    if (imported > 0) {
      const { data: curForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('leads_count')
        .eq('workspace_id', workspaceId)
        .eq('form_id', formId)
        .maybeSingle();

      const newCount = (curForm?.leads_count || 0) + imported;
      await supabaseAdmin
        .from('fb_lead_forms')
        .update({ leads_count: newCount, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('form_id', formId);
    }

    console.log(`[Historical Ingestion COMPLETE] Form ${formId}: ${imported} imported, ${skipped} skipped (out of ${totalFetched} fetched).`);
  } catch (err: any) {
    console.error(`[Historical Ingestion EXCEPTION] Form ${formId}:`, err.message);
  }

  return { imported, skipped, total: totalFetched };
}

// GET /api/meta/callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_description') || error;

  const baseUrl = getBaseUrl(req);
  const targetRedirect = `${baseUrl}/workspace/integrations/meta`;

  if (error) {
    console.error('[Meta OAuth Callback] Authorization error:', errorReason);
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent(errorReason || 'User Cancelled Login')}`);
  }

  if (!code) {
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent('Invalid OAuth Code')}`);
  }

  let requestedWorkspaceId: string | null = null;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      if (decoded.workspace_id) requestedWorkspaceId = decoded.workspace_id;
    } catch (_) {}
  }

  let workspaceId: string | null = null;
  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (authResult.authorized && authResult.workspaceId) {
    workspaceId = authResult.workspaceId;
  } else if (requestedWorkspaceId && requestedWorkspaceId !== '00000000-0000-0000-0000-000000000000') {
    const { data: validProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', requestedWorkspaceId)
      .maybeSingle();

    if (validProfile?.id) {
      workspaceId = validProfile.id;
    }
  }

  if (!workspaceId) {
    console.error('[Meta Callback Security Failure] Could not resolve authenticated workspace_id.');
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent('Authentication failure: workspace could not be verified')}`);
  }

  console.log(`[Meta OAuth Callback] Storing connection for Workspace ID: ${workspaceId}`);

  try {
    const redirectUri = `${baseUrl}/api/meta/callback`;
    const userToken = await exchangeCodeForLongLivedToken(code, redirectUri);
    const scopeAudit = await auditTokenScopes(userToken);
    const userProfile = await fetchUserProfile(userToken);

    // 1. Save Connection Token in integration_credentials with raw audit details
    const { data: credResult, error: credErr } = await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspaceId,
        provider: 'meta',
        status: 'connected',
        access_token: userToken,
        config: {
          meta_user_name: userProfile.name || 'Meta Account',
          meta_user_email: userProfile.email || '',
          meta_user_id: userProfile.id || '',
          granted_scopes: scopeAudit.granted_scopes,
          declined_scopes: scopeAudit.declined_scopes,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })
      .select('*');

    console.log('[Supabase DB Write Audit] integration_credentials upsert result:\n', JSON.stringify(credResult, null, 2));
    if (credErr) {
      console.error('[Supabase DB Error] integration_credentials upsert failed:', credErr.message, credErr.details);
    }

    // 2. Save Token in profiles
    await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: userToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // Optional multi-table upsert for legacy and enterprise schema compatibility
    try {
      await supabaseAdmin
        .from('meta_integrations')
        .upsert({
          workspace_id: workspaceId,
          facebook_user_id: userProfile.id || workspaceId,
          user_name: userProfile.name || 'Meta Account',
          long_lived_token: userToken,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,facebook_user_id' });
    } catch (_) {}

    // 3. Fetch Managed Facebook Pages
    const pages = await fetchUserPages(userToken);

    let totalFormsCount = 0;
    let totalHistoricalLeadsImported = 0;

    for (const page of pages) {
      // Subscribe Webhook
      await subscribePageWebhook(page.page_id, page.page_access_token);

      // Save Page into fb_page_configs with explicit Database Error Audit Logging
      console.log(`[Supabase DB Write Audit] Upserting page "${page.page_name}" (${page.page_id}) into fb_page_configs...`);
      const { data: pageResult, error: pageErr } = await supabaseAdmin
        .from('fb_page_configs')
        .upsert({
          workspace_id: workspaceId,
          page_id: page.page_id,
          page_name: page.page_name,
          page_category: page.page_category,
          page_access_token: page.page_access_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'page_id' })
        .select('*');

      console.log(`[Supabase DB Write Audit] fb_page_configs upsert result for ${page.page_id}:\n`, JSON.stringify(pageResult, null, 2));
      if (pageErr) {
        console.error(`[Supabase DB ERROR] fb_page_configs upsert FAILED for page ${page.page_id}:`, pageErr.message, pageErr.details, pageErr.code);
      }

      try {
        await supabaseAdmin
          .from('meta_connected_pages')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            page_name: page.page_name,
            permanent_page_token: page.page_access_token,
            is_webhook_subscribed: true,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,page_id' });
      } catch (_) {}

      try {
        await supabaseAdmin
          .from('facebook_pages')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            page_name: page.page_name,
            access_token: page.page_access_token,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'page_id' });
      } catch (_) {}

      // Fetch Lead Forms for this Page
      const forms = await fetchLeadFormsForPage(page.page_id, page.page_access_token);
      totalFormsCount += forms.length;

      for (const form of forms) {
        console.log(`[Supabase DB Write Audit] Registering form "${form.form_name}" (${form.form_id}) in disabled state by default...`);

        // Check if form already exists to preserve user toggle state across reconnects
        const { data: existingForm } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('is_enabled')
          .eq('workspace_id', workspaceId)
          .eq('form_id', form.form_id)
          .maybeSingle();

        const currentToggleState = existingForm?.is_enabled ?? false;

        // SAVE FORM INTO fb_lead_forms
        const { data: formResult, error: formErr } = await supabaseAdmin
          .from('fb_lead_forms')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            status: form.status || 'ACTIVE',
            leads_count: form.sync_count || 0,
            created_time: form.created_time || new Date().toISOString(),
            is_enabled: currentToggleState,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' })
          .select('*');

        if (formErr) {
          console.error(`[Supabase DB ERROR] fb_lead_forms upsert FAILED for form ${form.form_id}:`, formErr.message, formErr.details);
        }

        try {
          await supabaseAdmin
            .from('meta_lead_forms')
            .upsert({
              workspace_id: workspaceId,
              page_id: page.page_id,
              form_id: form.form_id,
              form_name: form.form_name,
              status: form.status || 'ACTIVE',
              is_enabled: currentToggleState,
              total_leads_count: form.sync_count || 0,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,form_id' });
        } catch (_) {}

        // ALSO SAVE FORM INTO fb_form_mappings
        await supabaseAdmin
          .from('fb_form_mappings')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            is_active: currentToggleState,
            is_tagging_enabled: true,
            mapping_config: { questions: form.questions || [] },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });
      }
    }

    console.log(`[Meta OAuth Callback SUCCESS] Saved ${pages.length} Pages & ${totalFormsCount} Forms (Toggles default to OFF) for workspace ${workspaceId}.`);

    const successParams = new URLSearchParams({
      meta_success: 'connected',
      pages_count: String(pages.length),
      forms_count: String(totalFormsCount),
      user_name: userProfile.name || 'Meta Account',
    });

    return NextResponse.redirect(`${targetRedirect}?${successParams.toString()}`);

  } catch (err: any) {
    console.error('[Meta Callback Exception]:', err.message);
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent(err.message || 'Meta OAuth Failed')}`);
  }
}
