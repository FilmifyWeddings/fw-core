import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { autoSyncAllMetaForms } from '@/lib/meta-auto-sync';

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

    if (!page_access_token) {
      return NextResponse.json(
        { success: false, error: 'Facebook Access Token is required.' },
        { status: 400 }
      );
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: workspace_id required' }, { status: 401 });
    }

    // ── 1. Token Inspection & Page Auto-Discovery ─────────────────────────────
    console.log(`[Direct Token Sync] Inspecting token & running page auto-discovery...`);
    const discoveredPagesMap = new Map<string, { page_id: string; page_name: string; page_category: string; access_token: string }>();

    let workingToken = page_access_token;
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '1279608780825934';
    const appSecret = process.env.FACEBOOK_APP_SECRET || '4da60a4bc30f64db3570ffde1508b2b6';

    // Step A: Attempt exchange for 60-day Long-Lived Token if possible
    try {
      const longRes = await fetch(
        `https://graph.facebook.com/v20.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&client_id=${appId}&` +
        `client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(page_access_token)}`
      );
      if (longRes.ok) {
        const longJson = await longRes.json();
        if (longJson.access_token) {
          workingToken = longJson.access_token;
          console.log('[Direct Token Sync] Successfully upgraded to Long-Lived Token ✓');
        }
      }
    } catch (_) {}

    // Step B: Check token type via debug_token
    let tokenType = 'UNKNOWN';
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v20.0/debug_token?input_token=${workingToken}&access_token=${workingToken}`
      );
      const debugJson = await debugRes.json().catch(() => ({}));
      if (debugRes.ok && debugJson.data?.type) {
        tokenType = debugJson.data.type.toUpperCase();
        console.log(`[Direct Token Sync] Token type detected: ${tokenType}`);
      }
    } catch (_) {}

    // Step C: Query /me to discover primary page/user node
    let primaryName = 'Facebook Account';
    let primaryCategory = 'Business Page';
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${workingToken}`
      );
      const meJson = await meRes.json().catch(() => ({}));
      if (meRes.ok && meJson.id) {
        primaryName = meJson.name || primaryName;
        primaryCategory = meJson.category || primaryCategory;
        discoveredPagesMap.set(meJson.id, {
          page_id: meJson.id,
          page_name: meJson.name || `Page ${meJson.id}`,
          page_category: meJson.category || 'Business Page',
          access_token: workingToken,
        });
      }
    } catch (_) {}

    // Step D: Query /me/accounts to auto-discover ALL managed pages (returns Permanent Page Access Tokens)
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&limit=100&access_token=${workingToken}`
      );
      const accountsJson = await accountsRes.json().catch(() => ({}));
      if (accountsRes.ok && Array.isArray(accountsJson.data)) {
        console.log(`[Direct Token Sync] Auto-discovered ${accountsJson.data.length} page(s) via /me/accounts with Permanent Page Tokens`);
        accountsJson.data.forEach((p: any) => {
          if (p.id) {
            discoveredPagesMap.set(p.id, {
              page_id: p.id,
              page_name: p.name || `Page ${p.id}`,
              page_category: p.category || 'Business Page',
              access_token: p.access_token || workingToken,
            });
          }
        });
      } else if (accountsJson?.error) {
        console.warn(`[Direct Token Sync] /me/accounts warning:`, accountsJson.error.message);
      }
    } catch (_) {}

    // Step D: If user provided an explicit page_id, ensure it is included
    if (page_id && !discoveredPagesMap.has(page_id)) {
      try {
        const pRes = await fetch(
          `https://graph.facebook.com/v20.0/${page_id}?fields=id,name,category&access_token=${page_access_token}`
        );
        const pJson = await pRes.json().catch(() => ({}));
        discoveredPagesMap.set(page_id, {
          page_id,
          page_name: pJson.name || `Page ${page_id}`,
          page_category: pJson.category || 'Business Page',
          access_token: page_access_token,
        });
      } catch (_) {
        discoveredPagesMap.set(page_id, {
          page_id,
          page_name: `Page ${page_id}`,
          page_category: 'Business Page',
          access_token: page_access_token,
        });
      }
    }

    const allDiscoveredPages = Array.from(discoveredPagesMap.values());
    if (allDiscoveredPages.length === 0 && page_id) {
      allDiscoveredPages.push({
        page_id,
        page_name: `Page ${page_id}`,
        page_category: 'Business Page',
        access_token: page_access_token,
      });
    }

    console.log(`[Direct Token Sync] Total ${allDiscoveredPages.length} target Page(s) ready for form discovery.`);

    // ── 2. Direct Webhook Subscriptions ─────────────────────────────────────
    let webhookSubscribedCount = 0;
    for (const pageObj of allDiscoveredPages) {
      try {
        const subRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageObj.page_id}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `subscribed_fields=leadgen&access_token=${encodeURIComponent(pageObj.access_token)}`,
          }
        );
        const subJson = await subRes.json().catch(() => ({}));
        if (subRes.ok && subJson.success) {
          webhookSubscribedCount++;
          console.log(`[Direct Token Sync] Webhook subscribed for Page ${pageObj.page_id}`);
        }
      } catch (_) {}
    }

    // ── 3. Multi-Level Lead Forms & Ad Accounts Discovery ───────────────────
    const formsMap = new Map<string, any>();
    const discoveryWarnings: string[] = [];
    const explicitFormId = (body.form_id || '').trim();

    // Explicit Form ID Query
    if (explicitFormId) {
      try {
        const formRes = await fetch(
          `https://graph.facebook.com/v20.0/${explicitFormId}?fields=id,name,status,leads_count,created_time&access_token=${page_access_token}`
        );
        const formJson = await formRes.json().catch(() => ({}));
        if (formRes.ok && formJson.id) {
          formsMap.set(formJson.id, formJson);
        } else if (formJson?.error) {
          discoveryWarnings.push(`Explicit Form ID (${explicitFormId}): ${formJson.error.message}`);
        }
      } catch (err: any) {
        console.warn(`[Multi-Level Discovery Exception] Explicit Form ID ${explicitFormId}:`, err.message);
      }
    }

    // Build endpoints for every discovered page
    const discoveryEndpoints: { name: string; url: string }[] = [];
    for (const pageObj of allDiscoveredPages) {
      const pid = pageObj.page_id;
      const tok = pageObj.access_token;
      discoveryEndpoints.push(
        { name: `GET /${pid}/leadgen_forms`, url: `https://graph.facebook.com/v20.0/${pid}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${tok}` },
        { name: `GET /${pid}/promotable_leadgen_forms`, url: `https://graph.facebook.com/v20.0/${pid}/promotable_leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${tok}` },
        { name: `GET /${pid} (nested adaccounts)`, url: `https://graph.facebook.com/v20.0/${pid}?fields=adaccounts{id,name,account_id,leadgen_forms{id,name,status,leads_count}},leadgen_forms{id,name,status,leads_count},promotable_leadgen_forms{id,name,status,leads_count}&access_token=${tok}` }
      );
    }

    // User & Business Level Scope Endpoints
    discoveryEndpoints.push(
      { name: 'GET /me/leadgen_forms', url: `https://graph.facebook.com/v20.0/me/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${page_access_token}` },
      { name: 'GET /me (nested forms)', url: `https://graph.facebook.com/v20.0/me?fields=leadgen_forms{id,name,status,leads_count},promotable_leadgen_forms{id,name,status,leads_count}&access_token=${page_access_token}` },
      { name: 'GET /me/adaccounts', url: `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_id,leadgen_forms{id,name,status,leads_count}&access_token=${page_access_token}` },
      { name: 'GET /me/businesses', url: `https://graph.facebook.com/v20.0/me/businesses?fields=id,name,leadgen_forms{id,name,status,leads_count}&access_token=${page_access_token}` }
    );

    // Execute parallel discovery requests
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

    // Traverse Discovered Ad Accounts directly
    if (discoveredAdAccountIds.size > 0) {
      console.log(`[Direct Token Sync] Traversing ${discoveredAdAccountIds.size} discovered Ad Account(s)...`);
      const adAccountPromises = Array.from(discoveredAdAccountIds).map(async (adId) => {
        const url = `https://graph.facebook.com/v20.0/${adId}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${page_access_token}`;
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
            if (status === 400 || status === 403) {
              discoveryWarnings.push(`Ad Account ${adId}: ${json.error.message}`);
            }
          }
        }
      }
    }

    // Fallback form creation if 0 forms discovered
    if (formsMap.size === 0 && allDiscoveredPages.length > 0) {
      const p = allDiscoveredPages[0];
      const fallbackFormId = explicitFormId || `form_${p.page_id}`;
      formsMap.set(fallbackFormId, {
        id: fallbackFormId,
        name: `${p.page_name} Lead Form`,
        status: 'ACTIVE',
        leads_count: 0,
      });
    }

    const rawForms = Array.from(formsMap.values());
    console.log(`[Direct Token Sync] Total ${rawForms.length} deduplicated form(s) across all pages & ad accounts.`);

    // ── 4. Save Integration Credentials in DB ────────────────────────────────
    const primaryPage = allDiscoveredPages[0] || { page_id: 'auto_discovered', page_name: primaryName };
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspaceId,
        provider: 'meta',
        status: 'connected',
        access_token: page_access_token,
        config: {
          connection_type: 'page_token',
          page_id: primaryPage.page_id,
          page_name: primaryPage.page_name,
          meta_user_name: primaryName,
          meta_user_email: `${primaryPage.page_id}@facebook.pages`,
          webhook_subscribed: webhookSubscribedCount > 0,
          discovered_pages_count: allDiscoveredPages.length,
          discovery_warnings: discoveryWarnings,
          updated_at: now,
        },
        updated_at: now,
      }, { onConflict: 'user_id,provider' });

    // ── 5. Save ALL Discovered Pages in DB ────────────────────────────────────
    const savedPages: any[] = [];
    for (const pageObj of allDiscoveredPages) {
      const { data: savedP } = await supabaseAdmin
        .from('fb_page_configs')
        .upsert({
          workspace_id: workspaceId,
          page_id: pageObj.page_id,
          page_name: pageObj.page_name,
          page_category: pageObj.page_category,
          page_access_token: pageObj.access_token,
          is_active: true,
          updated_at: now,
        }, { onConflict: 'page_id' })
        .select('*')
        .single();
      if (savedP) savedPages.push(savedP);
    }

    // ── 6. Save ALL Discovered Lead Forms in DB ──────────────────────────────
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
          page_id: primaryPage.page_id,
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

    // ── 7. Auto-Sync ALL Historical Leads immediately from Meta Graph API ───
    try {
      console.log(`[Direct Token Sync] Auto-syncing all historical leads for workspace ${workspaceId}...`);
      await autoSyncAllMetaForms(workspaceId, page_access_token);
    } catch (syncErr: any) {
      console.warn('[Direct Token Auto-Sync Leads Warning]:', syncErr?.message);
    }

    // Audit log
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'meta_direct_token_connected',
        message: `Connected ${allDiscoveredPages.length} Facebook Page(s) via Token Auto-Discovery. Fetched ${savedForms.length} forms.`,
        metadata: { pages_count: allDiscoveredPages.length, forms_count: savedForms.length, discovery_warnings: discoveryWarnings },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      connection_type: 'page_token',
      pages_count: allDiscoveredPages.length,
      pages: allDiscoveredPages,
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
