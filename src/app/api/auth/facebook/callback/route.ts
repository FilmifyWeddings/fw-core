import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── Helper: Exchange Code for Long-Lived User Access Token ──────────────
async function exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  // Step 1: Authorization Code → Short-Lived User Access Token
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

  // Step 2: Short-Lived Token → Long-Lived Token (60-day validity)
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

// ── Helper: Fetch User Managed Facebook Pages with tasks field ────────────
async function fetchUserManagedPages(userToken: string): Promise<{
  pages: Array<{
    page_id: string;
    page_name: string;
    page_category: string | null;
    page_access_token: string;
  }>;
  rawResponse: any;
}> {
  const pagesRes = await fetch(
    "https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=" + userToken
  );

  const pagesData = await pagesRes.json().catch(() => ({}));

  if (!pagesRes.ok) {
    throw new Error("Failed to fetch pages from Meta Graph API: " + (pagesData?.error?.message || pagesRes.status));
  }

  const pagesList = (pagesData.data || []).map((page: any) => ({
    page_id: page.id,
    page_name: page.name,
    page_category: page.category || null,
    page_access_token: page.access_token,
  }));

  return { pages: pagesList, rawResponse: pagesData };
}

// ── Helper: Automatically Subscribe Webhook to Page (leadgen) ─────────
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
    if (!subscribeRes.ok || subscribeData.error) {
      console.warn("[Meta Webhook Subscribe] Warning for page " + pageId + ":", subscribeData?.error?.message || subscribeRes.status);
      return false;
    }

    console.log("[Meta Webhook Subscribe] Successfully subscribed leadgen webhook for page ID: " + pageId);
    return true;
  } catch (err) {
    console.error("[Meta Webhook Subscribe] Error for page " + pageId + ":", err);
    return false;
  }
}

// ── Helper: Save Connected Pages & Forms to Supabase DB ─────────────────
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

// ── GET /api/auth/facebook/callback ───────────────────────────────────
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
    console.warn('[Meta OAuth Callback] Authorization denied by user:', reason);
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
    } catch (err: any) {
      console.warn('[Meta OAuth Callback] State decode skipped/failed:', err.message);
    }
  }

  try {
    console.log('[Meta OAuth] Exchanging code for token for workspace:', workspaceId);
    const userAccessToken = await exchangeCodeForLongLivedToken(code, redirectUri);

    console.log('[Meta OAuth] Fetching managed Facebook Pages with tasks field...');
    const { pages, rawResponse } = await fetchUserManagedPages(userAccessToken);
    console.log("[Meta OAuth] Successfully fetched " + pages.length + " Facebook Pages");

    let subscribedCount = 0;
    for (const page of pages) {
      const isSubscribed = await subscribePageWebhook(page.page_id, page.page_access_token);
      if (isSubscribed) subscribedCount++;
    }

    // Save User Token in profiles & integration_credentials
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

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'meta_oauth_connected',
      message: "Meta OAuth Connected! " + pages.length + " page(s) synced, " + subscribedCount + " webhook(s) auto-subscribed.",
    });

    const successUrl = new URL(baseUrl + "/workspace/integrations/meta");
    successUrl.searchParams.set('meta', 'connected');
    successUrl.searchParams.set('pages', String(pages.length));
    successUrl.searchParams.set('webhooks_subscribed', String(subscribedCount));

    return NextResponse.redirect(successUrl.toString());

  } catch (err: any) {
    console.error('[Meta OAuth Callback] Error processing OAuth:', err.message);

    return NextResponse.redirect(
      baseUrl + "/workspace/integrations/meta?meta=error&oauth_error=" + encodeURIComponent(err.message)
    );
  }
}
