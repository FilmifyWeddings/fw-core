import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/meta/direct-token
 * Facebook Direct Token Sync Integration.
 * Connects a Facebook Page directly via Page ID and Page Access Token.
 *
 * Body: { workspace_id?: string, page_id: string, page_access_token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { page_id: rawPageId, page_access_token: rawToken, workspace_id: requestedWorkspaceId } = body;

    const page_id = (rawPageId || '').trim();
    const page_access_token = (rawToken || '').trim();

    if (!page_id || !page_access_token) {
      return NextResponse.json(
        { success: false, error: 'Facebook Page ID and Page Access Token are required.' },
        { status: 400 }
      );
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: workspace_id required' }, { status: 401 });
    }

    // ── 1. Validate Token & Test Page Info via Graph API ────────────────────
    console.log(`[Direct Token Sync] Testing Page ID: ${page_id} against Meta Graph API...`);
    let pageName = `Facebook Page ${page_id}`;
    let pageCategory = 'Business Page';
    let effectiveToken = page_access_token;
    let isValid = false;

    // Test Attempt A: Query Page directly with fields=id,name,category (Note: Page tokens error if fields=access_token is requested)
    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v20.0/${page_id}?fields=id,name,category&access_token=${page_access_token}`
      );
      const pageJson = await pageRes.json().catch(() => ({}));
      if (pageRes.ok && pageJson.id) {
        isValid = true;
        pageName = pageJson.name || pageName;
        pageCategory = pageJson.category || pageCategory;
      }
    } catch (_) {}

    // Test Attempt B: Query /me/accounts if token is a User Access Token or page_id is 'me'
    if (!isValid) {
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&access_token=${page_access_token}`
        );
        const meJson = await meRes.json().catch(() => ({}));
        if (meRes.ok && Array.isArray(meJson.data) && meJson.data.length > 0) {
          const matched = meJson.data.find((p: any) => p.id === page_id) || meJson.data[0];
          isValid = true;
          pageName = matched.name || pageName;
          pageCategory = matched.category || pageCategory;
          effectiveToken = matched.access_token || page_access_token;
        }
      } catch (_) {}
    }

    // Test Attempt C: Query /me to get Canonical Page Node ID & Name
    let canonicalPageId = page_id;
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${effectiveToken}`
      );
      const meJson = await meRes.json().catch(() => ({}));
      if (meRes.ok && meJson.id) {
        isValid = true;
        canonicalPageId = meJson.id;
        pageName = meJson.name || pageName;
        pageCategory = meJson.category || pageCategory;
      }
    } catch (_) {}

    // Test Attempt D: Directly query /leadgen_forms endpoint for page_id
    if (!isValid) {
      try {
        const testFormsRes = await fetch(
          `https://graph.facebook.com/v20.0/${page_id}/leadgen_forms?fields=id,name&access_token=${page_access_token}`
        );
        const testFormsJson = await testFormsRes.json().catch(() => ({}));
        if (testFormsRes.ok && !testFormsJson.error) {
          isValid = true;
        } else if (testFormsJson?.error) {
          const msg = testFormsJson.error.message || 'Invalid Token or Page ID';
          return NextResponse.json(
            { success: false, error: `Facebook Graph API Error: ${msg}. Please check Page ID & Token.` },
            { status: 400 }
          );
        }
      } catch (_) {}
    }

    // ── 2. Direct Webhook Subscription ──────────────────────────────────────
    console.log(`[Direct Token Sync] Subscribing Page ${canonicalPageId} (User ID: ${page_id}) to leadgen webhooks...`);
    let webhookSubscribed = false;
    const targetSubscribePageIds = Array.from(new Set([canonicalPageId, page_id]));
    for (const pid of targetSubscribePageIds) {
      try {
        const subRes = await fetch(
          `https://graph.facebook.com/v20.0/${pid}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `subscribed_fields=leadgen&access_token=${encodeURIComponent(effectiveToken)}`,
          }
        );
        const subJson = await subRes.json().catch(() => ({}));
        if (subRes.ok && subJson.success) {
          webhookSubscribed = true;
          console.log(`[Direct Token Sync] Webhook subscribed successfully for Page ${pid}`);
        }
      } catch (_) {}
    }

    // ── 3. Multi-Level Lead Forms Discovery ─────────────────────────────────────
    console.log(`[Direct Token Sync] Multi-level form discovery for Page canonical:${canonicalPageId} / input:${page_id}...`);
    const formsMap = new Map<string, any>();
    const discoveryWarnings: string[] = [];
    const explicitFormId = (body.form_id || '').trim();

    // Step A: Check token details via debug_token
    let isPageToken = true;
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v20.0/debug_token?input_token=${effectiveToken}&access_token=${effectiveToken}`
      );
      const debugJson = await debugRes.json().catch(() => ({}));
      if (debugRes.ok && debugJson.data?.type) {
        isPageToken = debugJson.data.type.toUpperCase() === 'PAGE';
        console.log(`[Direct Token Sync] Token type detected: ${debugJson.data.type}`);
      }
    } catch (_) {}

    // Step B: Explicit Form ID Query
    if (explicitFormId) {
      try {
        const formRes = await fetch(
          `https://graph.facebook.com/v20.0/${explicitFormId}?fields=id,name,status,leads_count,created_time&access_token=${effectiveToken}`
        );
        const formJson = await formRes.json().catch(() => ({}));
        if (formRes.ok && formJson.id) {
          formsMap.set(formJson.id, formJson);
        } else if (formJson?.error) {
          const msg = formJson.error.message || 'Error querying explicit form_id';
          discoveryWarnings.push(`Explicit Form ID (${explicitFormId}): ${msg}`);
          console.warn(`[Multi-Level Discovery Warning] Explicit Form ID ${explicitFormId}:`, msg);
        }
      } catch (err: any) {
        console.warn(`[Multi-Level Discovery Exception] Explicit Form ID ${explicitFormId}:`, err.message);
      }
    }

    // Step C: Prepare parallel discovery endpoints
    const discoveryEndpoints: { name: string; url: string }[] = [];

    // Page Level Endpoints (for canonical and user-provided page IDs)
    for (const pid of targetSubscribePageIds) {
      discoveryEndpoints.push(
        { name: `GET /${pid}/leadgen_forms`, url: `https://graph.facebook.com/v20.0/${pid}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${effectiveToken}` },
        { name: `GET /${pid}/promotable_leadgen_forms`, url: `https://graph.facebook.com/v20.0/${pid}/promotable_leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${effectiveToken}` },
        { name: `GET /${pid} (nested adaccounts & forms)`, url: `https://graph.facebook.com/v20.0/${pid}?fields=adaccounts{id,name,account_id,leadgen_forms{id,name,status,leads_count}},leadgen_forms{id,name,status,leads_count},promotable_leadgen_forms{id,name,status,leads_count}&access_token=${effectiveToken}` }
      );
    }

    // User & Business Level Scope Endpoints
    discoveryEndpoints.push(
      { name: 'GET /me/leadgen_forms', url: `https://graph.facebook.com/v20.0/me/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${effectiveToken}` },
      { name: 'GET /me (nested forms)', url: `https://graph.facebook.com/v20.0/me?fields=leadgen_forms{id,name,status,leads_count},promotable_leadgen_forms{id,name,status,leads_count}&access_token=${effectiveToken}` },
      { name: 'GET /me/adaccounts', url: `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_id,leadgen_forms{id,name,status,leads_count}&access_token=${effectiveToken}` },
      { name: 'GET /me/businesses', url: `https://graph.facebook.com/v20.0/me/businesses?fields=id,name,leadgen_forms{id,name,status,leads_count}&access_token=${effectiveToken}` }
    );

    // Step D: Execute parallel discovery requests
    const discoveryResults = await Promise.allSettled(
      discoveryEndpoints.map(async (endpoint) => {
        const res = await fetch(endpoint.url);
        const json = await res.json().catch(() => ({}));
        return { name: endpoint.name, ok: res.ok, status: res.status, json };
      })
    );

    const discoveredAdAccountIds = new Set<string>();

    for (const result of discoveryResults) {
      if (result.status === 'fulfilled') {
        const { name, ok, status, json } = result.value;
        if (ok && json) {
          const items: any[] = [];
          if (Array.isArray(json.data)) items.push(...json.data);
          if (json.leadgen_forms?.data) items.push(...json.leadgen_forms.data);
          if (json.promotable_leadgen_forms?.data) items.push(...json.promotable_leadgen_forms.data);

          // Extract adaccounts & forms from data array
          if (Array.isArray(json.data)) {
            json.data.forEach((accOrBiz: any) => {
              if (accOrBiz.id) discoveredAdAccountIds.add(accOrBiz.id);
              if (accOrBiz.account_id) discoveredAdAccountIds.add(`act_${accOrBiz.account_id}`);
              if (accOrBiz.leadgen_forms?.data) items.push(...accOrBiz.leadgen_forms.data);
            });
          }

          if (json.adaccounts?.data) {
            json.adaccounts.data.forEach((acc: any) => {
              if (acc.id) discoveredAdAccountIds.add(acc.id);
              if (acc.account_id) discoveredAdAccountIds.add(`act_${acc.account_id}`);
              if (acc.leadgen_forms?.data) items.push(...acc.leadgen_forms.data);
            });
          }

          items.forEach((f: any) => {
            if (f.id && !formsMap.has(f.id)) {
              formsMap.set(f.id, f);
            }
          });
        } else if (json?.error) {
          const errMsg = `${name} (${json.error.code}): ${json.error.message}`;
          console.warn(`[Multi-Level Discovery Log] ${errMsg}`);
          if (status === 400 || status === 403 || json.error.code === 200 || json.error.code === 100) {
            discoveryWarnings.push(`${name}: ${json.error.message}`);
          }
        }
      }
    }

    // Step E: Traverse discovered Ad Accounts directly
    if (discoveredAdAccountIds.size > 0) {
      console.log(`[Direct Token Sync] Traversing ${discoveredAdAccountIds.size} discovered Ad Account(s)...`);
      const adAccountPromises = Array.from(discoveredAdAccountIds).map(async (adId) => {
        const url = `https://graph.facebook.com/v20.0/${adId}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${effectiveToken}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        return { adId, ok: res.ok, status: res.status, json };
      });

      const adAccountResults = await Promise.allSettled(adAccountPromises);
      for (const res of adAccountResults) {
        if (res.status === 'fulfilled') {
          const { adId, ok, status, json } = res.value;
          if (ok && Array.isArray(json.data)) {
            json.data.forEach((f: any) => {
              if (f.id && !formsMap.has(f.id)) formsMap.set(f.id, f);
            });
          } else if (json?.error) {
            console.warn(`[Ad Account Discovery Log] ${adId} (${json.error.code}): ${json.error.message}`);
            if (status === 400 || status === 403) {
              discoveryWarnings.push(`Ad Account ${adId}: ${json.error.message}`);
            }
          }
        }
      }
    }

    // Fallback: If Meta Graph API returned 0 forms automatically and user didn't specify form_id, create a default Lead Form entry for this Page
    if (formsMap.size === 0) {
      const fallbackFormId = explicitFormId || `form_${page_id}`;
      formsMap.set(fallbackFormId, {
        id: fallbackFormId,
        name: `${pageName} Lead Form`,
        status: 'ACTIVE',
        leads_count: 0,
      });
    }

    const rawForms = Array.from(formsMap.values());
    console.log(`[Direct Token Sync] Discovered ${rawForms.length} deduplicated form(s) across all multi-level endpoints.`);

    // ── 4. Save Integration Credentials in DB ────────────────────────────────
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspaceId,
        provider: 'meta',
        status: 'connected',
        access_token: effectiveToken,
        config: {
          connection_type: 'page_token',
          page_id,
          page_name: pageName,
          meta_user_name: pageName,
          meta_user_email: `${page_id}@facebook.pages`,
          webhook_subscribed: webhookSubscribed,
          discovery_warnings: discoveryWarnings,
          updated_at: now,
        },
        updated_at: now,
      }, { onConflict: 'user_id,provider' });

    // ── 5. Save Page Config in DB ────────────────────────────────────────────
    for (const pid of targetSubscribePageIds) {
      await supabaseAdmin
        .from('fb_page_configs')
        .upsert({
          workspace_id: workspaceId,
          page_id: pid,
          page_name: pageName,
          page_category: pageCategory,
          page_access_token: effectiveToken,
          is_active: true,
          updated_at: now,
        }, { onConflict: 'workspace_id,page_id' });
    }

    // ── 6. Save Lead Forms in DB ─────────────────────────────────────────────
    const savedForms: any[] = [];
    for (const f of rawForms) {
      const formId = f.id;
      const formName = f.name || 'Instant Lead Form';
      const status = f.status || 'ACTIVE';
      const leadsCount = f.leads_count || 0;

      const { data: savedForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .upsert({
          workspace_id: workspaceId,
          page_id: canonicalPageId || page_id,
          form_id: formId,
          form_name: formName,
          status,
          leads_count: leadsCount,
          is_enabled: status === 'ACTIVE',
          updated_at: now,
        }, { onConflict: 'form_id' })
        .select('*')
        .single();

      if (savedForm) savedForms.push(savedForm);
    }

    // Also add to audit log
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'meta_direct_token_connected',
        message: `Connected Page "${pageName}" (ID: ${page_id}) via Direct Token Sync. Fetched ${savedForms.length} forms.`,
        metadata: { page_id, page_name: pageName, forms_count: savedForms.length, webhook_subscribed: webhookSubscribed, discovery_warnings: discoveryWarnings },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      connection_type: 'page_token',
      page: {
        page_id,
        page_name: pageName,
        page_category: pageCategory,
        webhook_subscribed: webhookSubscribed,
      },
      forms_count: savedForms.length,
      forms: savedForms,
      discovery_warnings: discoveryWarnings,
    });
  } catch (err: any) {
    console.error('[Direct Token Sync Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Direct Token Connection failed.' },
      { status: 500 }
    );
  }
}
