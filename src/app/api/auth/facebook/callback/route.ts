import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// Helper: Short-lived code → Long-lived User Access Token exchange
// ─────────────────────────────────────────────────────────────
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const appId     = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  // Step 1: Code → Short-lived User Token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_secret=${appSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${err?.error?.message || tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const shortLivedToken: string = tokenData.access_token;

  // Step 2: Short-lived → Long-lived Token (60 din valid)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${appId}&` +
    `client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  );

  if (!longLivedRes.ok) {
    // Long-lived exchange fail ho toh short-lived use karo (fallback)
    console.warn('[FB OAuth] Long-lived token exchange failed, using short-lived token');
    return shortLivedToken;
  }

  const longLivedData = await longLivedRes.json();
  return longLivedData.access_token || shortLivedToken;
}

// ─────────────────────────────────────────────────────────────
// Helper: User ki saari Facebook Pages fetch karo
// ─────────────────────────────────────────────────────────────
async function fetchUserPages(userToken: string): Promise<Array<{
  page_id: string;
  page_name: string;
  page_category: string | null;
  page_access_token: string;
}>> {
  // Debug: Log active permissions of the token
  try {
    const permRes = await fetch(
      `https://graph.facebook.com/v20.0/me/permissions?access_token=${userToken}`
    );
    if (permRes.ok) {
      const permData = await permRes.json();
      console.log('[FB Callback] /me/permissions response:', JSON.stringify(permData, null, 2));
    }
  } catch (err: any) {
    console.warn('[FB Callback] Failed to fetch permissions log:', err.message);
  }

  // /me/accounts → User ke managed pages + unke Page Access Tokens
  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&access_token=${userToken}`
  );

  if (!pagesRes.ok) {
    const err = await pagesRes.json().catch(() => ({}));
    throw new Error(`Failed to fetch pages: ${err?.error?.message || pagesRes.status}`);
  }

  const pagesData = await pagesRes.json();
  console.log('[FB Callback] /me/accounts raw response:', JSON.stringify(pagesData, null, 2));
  return (pagesData.data || []).map((page: any) => ({
    page_id:           page.id,
    page_name:         page.name,
    page_category:     page.category || null,
    page_access_token: page.access_token,  // Yeh Page-specific token hai, User token nahi
  }));
}

// ─────────────────────────────────────────────────────────────
// Helper: Pages ko Supabase mein save karo
// ─────────────────────────────────────────────────────────────
async function savePagesToDb(
  workspaceId: string,
  pages: Array<{ page_id: string; page_name: string; page_category: string | null; page_access_token: string }>
): Promise<void> {
  if (pages.length === 0) return;

  const upsertData = pages.map(page => ({
    workspace_id:      workspaceId,
    page_id:           page.page_id,
    page_name:         page.page_name,
    page_category:     page.page_category,
    page_access_token: page.page_access_token,
    is_active:         true,             // Default: connected pages active hoti hain
    updated_at:        new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('fb_page_configs')
    .upsert(upsertData, { onConflict: 'workspace_id,page_id' });

  if (error) {
    throw new Error(`Failed to save pages to DB: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/auth/facebook/callback
//
// Meta OAuth 2.0 callback handler.
// Yeh route tab trigger hota hai jab user Facebook pe login karke
// permissions de deta hai.
//
// Flow:
//   1. State se workspace_id nikalo
//   2. Authorization code → Long-lived User Access Token
//   3. User Token → /me/accounts → All Page Access Tokens
//   4. User Token + Page configs → Supabase save
//   5. User ko /integrations?integration=facebook&tab=pages pe redirect karo
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // ── User ne "Cancel" kiya ──────────────────────────────────
  if (error) {
    const reason = searchParams.get('error_description') || error;
    console.warn('[FB OAuth Callback] User cancelled or error:', reason);
    return NextResponse.redirect(
      `${appUrl}/integrations?integration=facebook&oauth_error=${encodeURIComponent(reason)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/integrations?integration=facebook&oauth_error=missing_code`
    );
  }

  // ── State decode karo → workspace_id nikalo ────────────────
  let workspaceId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
    workspaceId = decoded.workspace_id;
    if (!workspaceId) throw new Error('workspace_id missing in state');
  } catch (err: any) {
    console.error('[FB OAuth Callback] State decode error:', err.message);
    return NextResponse.redirect(
      `${appUrl}/integrations?integration=facebook&oauth_error=invalid_state`
    );
  }

  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  try {
    // ── Step 1 & 2: Code → Long-lived User Token ───────────────
    console.log('[FB OAuth] Exchanging code for token. workspace_id:', workspaceId);
    const userAccessToken = await exchangeCodeForToken(code, redirectUri);

    // ── Step 3: User Token → Page Access Tokens ───────────────
    console.log('[FB OAuth] Fetching pages for workspace:', workspaceId);
    const pages = await fetchUserPages(userAccessToken);
    console.log(`[FB OAuth] Found ${pages.length} pages`);

    // ── Step 4a: Profile mein User Token save karo ────────────
    await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: userAccessToken,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // ── Step 4b: Pages ko fb_page_configs mein save karo ──────
    if (pages.length > 0) {
      await savePagesToDb(workspaceId, pages);
    }

    // ── Step 5: Log the event ──────────────────────────────────
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type:   'fb_oauth_connected',
      message:      `Meta Facebook OAuth connected. ${pages.length} page(s) synced automatically.`,
      metadata:     {
        pages_synced: pages.map(p => ({ id: p.page_id, name: p.page_name })),
      },
    });

    // ── Step 6: Success → Redirect to Pages & Forms tab ───────
    const successUrl = new URL(`${appUrl}/integrations`);
    successUrl.searchParams.set('integration', 'facebook');
    successUrl.searchParams.set('tab', 'pages');
    successUrl.searchParams.set('oauth_success', 'true');
    successUrl.searchParams.set('pages_count', String(pages.length));

    return NextResponse.redirect(successUrl.toString());

  } catch (err: any) {
    console.error('[FB OAuth Callback] Error:', err.message);

    // Log error to Supabase
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type:   'fb_oauth_error',
        message:      `Meta OAuth error: ${err.message}`,
        metadata:     { error: String(err) },
      });
    } catch (_) {}

    return NextResponse.redirect(
      `${appUrl}/integrations?integration=facebook&oauth_error=${encodeURIComponent(err.message)}`
    );
  }
}
