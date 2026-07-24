import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  const tokenRes = await fetch(
    "https://graph.facebook.com/v19.0/oauth/access_token?" +
    "client_id=" + appId + "&redirect_uri=" + encodeURIComponent(redirectUri) + "&" +
    "client_secret=" + appSecret + "&code=" + code
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error("Token exchange failed: " + (err?.error?.message || tokenRes.status));
  }

  const tokenData = await tokenRes.json();
  const shortLivedToken: string = tokenData.access_token;

  const longLivedRes = await fetch(
    "https://graph.facebook.com/v19.0/oauth/access_token?" +
    "grant_type=fb_exchange_token&client_id=" + appId + "&" +
    "client_secret=" + appSecret + "&fb_exchange_token=" + shortLivedToken
  );

  if (!longLivedRes.ok) {
    console.warn('[Meta OAuth] Long-lived token exchange failed, falling back to short-lived token');
    return shortLivedToken;
  }

  const longLivedData = await longLivedRes.json();
  return longLivedData.access_token || shortLivedToken;
}

// ── 3-Step Pabbly Auto-Discovery Helper ─────────────────────────────────
async function fetchUserManagedPages(userToken: string): Promise<Array<{
  page_id: string;
  page_name: string;
  page_category: string | null;
  page_access_token: string;
}>> {
  const pagesMap = new Map<string, {
    page_id: string;
    page_name: string;
    page_category: string | null;
    page_access_token: string;
  }>();

  // Step A: Standard /me/accounts Query
  try {
    const pagesRes = await fetch(
      "https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=" + userToken
    );
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      if (pagesData.data && Array.isArray(pagesData.data)) {
        pagesData.data.forEach((p: any) => {
          pagesMap.set(p.id, {
            page_id: p.id,
            page_name: p.name,
            page_category: p.category || null,
            page_access_token: p.access_token || userToken,
          });
        });
      }
    }
  } catch (err: any) {
    console.warn('[Meta OAuth Callback] Step A /me/accounts warning:', err.message);
  }

  // Step B: Business Manager client & owned pages
  if (pagesMap.size === 0) {
    try {
      const bizRes = await fetch(
        "https://graph.facebook.com/v19.0/me/businesses?fields=id,name,client_pages{id,name,access_token,category},owned_pages{id,name,access_token,category}&access_token=" + userToken
      );
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        if (bizData.data && Array.isArray(bizData.data)) {
          bizData.data.forEach((biz: any) => {
            if (biz.owned_pages?.data) {
              biz.owned_pages.data.forEach((op: any) => {
                pagesMap.set(op.id, {
                  page_id: op.id,
                  page_name: op.name,
                  page_category: op.category || null,
                  page_access_token: op.access_token || userToken,
                });
              });
            }
            if (biz.client_pages?.data) {
              biz.client_pages.data.forEach((cp: any) => {
                pagesMap.set(cp.id, {
                  page_id: cp.id,
                  page_name: cp.name,
                  page_category: cp.category || null,
                  page_access_token: cp.access_token || userToken,
                });
              });
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[Meta OAuth Callback] Step B /me/businesses warning:', err.message);
    }
  }

  // Step C: Direct Query Target Page 110156851793416 (Filmify Weddings)
  const targetPageId = '110156851793416';
  if (!pagesMap.has(targetPageId)) {
    try {
      const directRes = await fetch(
        "https://graph.facebook.com/v19.0/" + targetPageId + "?fields=id,name,access_token,category&access_token=" + userToken
      );
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData.id) {
          pagesMap.set(directData.id, {
            page_id: directData.id,
            page_name: directData.name || 'Filmify Weddings',
            page_category: directData.category || null,
            page_access_token: directData.access_token || userToken,
          });
        }
      }
    } catch (err: any) {
      console.warn('[Meta OAuth Callback] Step C direct query warning:', err.message);
    }
  }

  return Array.from(pagesMap.values());
}

async function subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  try {
    const subscribeRes = await fetch(
      "https://graph.facebook.com/v19.0/" + pageId + "/subscribed_apps",
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'leadgen',
          access_token: pageAccessToken,
        }).toString(),
      }
    );

    const subscribeData = await subscribeRes.json();
    return subscribeRes.ok && !subscribeData.error;
  } catch (err) {
    return false;
  }
}

async function savePagesToDatabase(
  workspaceId: string,
  pages: Array<{ page_id: string; page_name: string; page_category: string | null; page_access_token: string }>
): Promise<void> {
  if (pages.length === 0) return;

  const upsertData = pages.map(page => ({
    workspace_id: workspaceId,
    page_id: page.page_id,
    page_name: page.page_name,
    page_category: page.page_category,
    page_access_token: page.page_access_token,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('fb_page_configs')
    .upsert(upsertData, { onConflict: 'workspace_id,page_id' });

  if (error) {
    console.error('[Meta OAuth DB Error] Failed to save pages to DB:', error.message);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = 
    process.env.NEXT_PUBLIC_BASE_URL || 
    process.env.NEXT_PUBLIC_APP_URL || 
    'http://localhost:3000';

  const redirectUri = baseUrl + "/api/auth/facebook/callback";

  if (error) {
    const reason = searchParams.get('error_description') || error;
    return NextResponse.redirect(
      baseUrl + "/workspace/integrations/meta?meta=cancelled&oauth_error=" + encodeURIComponent(reason)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      baseUrl + "/workspace/integrations/meta?meta=error&oauth_error=missing_code"
    );
  }

  let workspaceId = '00000000-0000-0000-0000-000000000000';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      if (decoded.workspace_id) workspaceId = decoded.workspace_id;
    } catch (err: any) {}
  }

  try {
    const userAccessToken = await exchangeCodeForLongLivedToken(code, redirectUri);
    const pages = await fetchUserManagedPages(userAccessToken);

    let subscribedCount = 0;
    for (const page of pages) {
      const isSubscribed = await subscribePageWebhook(page.page_id, page.page_access_token);
      if (isSubscribed) subscribedCount++;
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: userAccessToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspaceId,
        provider: 'meta',
        status: 'connected',
        access_token: userAccessToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (pages.length > 0) {
      await savePagesToDatabase(workspaceId, pages);
    }

    const successUrl = new URL(baseUrl + "/workspace/integrations/meta");
    successUrl.searchParams.set('meta', 'connected');
    successUrl.searchParams.set('pages', String(pages.length));
    successUrl.searchParams.set('webhooks_subscribed', String(subscribedCount));

    return NextResponse.redirect(successUrl.toString());

  } catch (err: any) {
    return NextResponse.redirect(
      baseUrl + "/workspace/integrations/meta?meta=error&oauth_error=" + encodeURIComponent(err.message)
    );
  }
}
