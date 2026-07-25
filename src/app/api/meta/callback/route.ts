import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper: Ensure Database Tables Exist
async function ensureTablesExist() {
  try {
    await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS meta_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id VARCHAR(255) NOT NULL UNIQUE,
          meta_user_id VARCHAR(255) NOT NULL,
          meta_user_name VARCHAR(255) NOT NULL,
          meta_user_email VARCHAR(255),
          access_token TEXT NOT NULL,
          token_type VARCHAR(50) DEFAULT 'USER_LONG_LIVED',
          expires_at TIMESTAMPTZ,
          is_valid BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS meta_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id VARCHAR(255) NOT NULL,
          page_id VARCHAR(255) NOT NULL,
          page_name VARCHAR(255) NOT NULL,
          page_category VARCHAR(255),
          page_access_token TEXT NOT NULL,
          picture_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          is_webhook_subscribed BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(workspace_id, page_id)
        );
        CREATE TABLE IF NOT EXISTS meta_lead_forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id VARCHAR(255) NOT NULL,
          page_id VARCHAR(255) NOT NULL,
          form_id VARCHAR(255) NOT NULL,
          form_name VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          questions_count INT DEFAULT 0,
          sync_count INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_time TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(workspace_id, form_id)
        );
        CREATE TABLE IF NOT EXISTS meta_error_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id VARCHAR(255) NOT NULL,
          error_type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          error_details JSONB,
          resolution_hint TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
  } catch (_) {}
}

// ── Step 1: Code -> 60-Day Long-Lived Token Exchange ─────────────────────
async function exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  // Code -> Short Lived Token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_secret=${appSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
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
    console.warn('[Meta Callback] Long-lived exchange failed, using short-lived token');
    return shortToken;
  }

  const longData = await longRes.json();
  return longData.access_token || shortToken;
}

// ── Step 2: Fetch User Profile ──────────────────────────────────────────
async function fetchUserProfile(token: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${token}`);
  if (!res.ok) throw new Error('Failed to fetch Meta User profile');
  return res.json();
}

// ── Step 3: Fetch Managed Pages ──────────────────────────────────────────
async function fetchUserPages(token: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch Facebook Pages: ${err?.error?.message || res.status}`);
  }
  const data = await res.json();
  return (data.data || []).map((p: any) => ({
    page_id: p.id,
    page_name: p.name,
    page_category: p.category || 'Business Page',
    page_access_token: p.access_token,
    picture_url: p.picture?.data?.url || null,
  }));
}

// ── Step 4: Fetch Lead Forms for a Page ──────────────────────────────────
async function fetchLeadFormsForPage(pageId: string, pageAccessToken: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${pageAccessToken}`);
    if (!res.ok) {
      console.warn(`[Meta Callback] Forms fetch error for page ${pageId}: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.data || []).map((f: any) => ({
      form_id: f.id,
      form_name: f.name || 'Untitled Instant Form',
      status: f.status || 'ACTIVE',
      sync_count: f.leads_count || 0,
      questions_count: f.questions ? f.questions.length : 0,
      created_time: f.created_time || new Date().toISOString(),
    }));
  } catch (err) {
    console.error(`[Meta Callback] Error fetching forms for page ${pageId}:`, err);
    return [];
  }
}

// ── Step 5: Subscribe Leadgen Webhook to Page ───────────────────────────
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
    const data = await res.json();
    return res.ok && !data.error;
  } catch (_) {
    return false;
  }
}

// ── GET /api/meta/callback ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_description') || error;

  const baseUrl = 
    process.env.NEXT_PUBLIC_BASE_URL || 
    process.env.NEXT_PUBLIC_APP_URL || 
    'https://studiocore.in';

  const targetRedirect = `${baseUrl}/workspace/integrations/meta`;

  if (error) {
    console.error('[Meta OAuth Callback] User denied or error:', errorReason);
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent(errorReason || 'User Cancelled Login')}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent('Invalid OAuth Code or State')}`);
  }

  let workspaceId = '00000000-0000-0000-0000-000000000000';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
    if (decoded.workspace_id) workspaceId = decoded.workspace_id;
  } catch (_) {}

  await ensureTablesExist();

  try {
    const redirectUri = `${baseUrl}/api/meta/callback`;
    const userToken = await exchangeCodeForLongLivedToken(code, redirectUri);
    const userProfile = await fetchUserProfile(userToken);

    // Save Meta Connection Identity & Token in DB
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('meta_connections')
      .upsert({
        workspace_id: workspaceId,
        meta_user_id: userProfile.id || 'meta_user_1',
        meta_user_name: userProfile.name || 'Filmify Meta Admin',
        meta_user_email: userProfile.email || null,
        access_token: userToken,
        token_type: 'USER_LONG_LIVED',
        expires_at: expiresAt,
        is_valid: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    // Legacy compatibility update
    await supabaseAdmin
      .from('profiles')
      .update({ meta_access_token: userToken, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    // Fetch Managed Facebook Pages
    const pages = await fetchUserPages(userToken);
    if (pages.length === 0) {
      await supabaseAdmin.from('meta_error_logs').insert({
        workspace_id: workspaceId,
        error_type: 'NO_PAGES_FOUND',
        message: '❌ No Facebook Pages Found under this Meta User Account.',
        resolution_hint: 'Ensure your Meta User has Admin access to at least 1 Facebook Page.',
      });
      return NextResponse.redirect(`${targetRedirect}?meta_warning=${encodeURIComponent('No Facebook Pages Found under your account')}`);
    }

    let totalFormsCount = 0;
    let webhooksSubscribedCount = 0;

    for (const page of pages) {
      // 1. Subscribe Page Webhook
      const isSubbed = await subscribePageWebhook(page.page_id, page.page_access_token);
      if (isSubbed) webhooksSubscribedCount++;

      // 2. Save Page in DB
      await supabaseAdmin
        .from('meta_pages')
        .upsert({
          workspace_id: workspaceId,
          page_id: page.page_id,
          page_name: page.page_name,
          page_category: page.page_category,
          page_access_token: page.page_access_token,
          picture_url: page.picture_url,
          is_active: true,
          is_webhook_subscribed: isSubbed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,page_id' });

      // Legacy fallback
      await supabaseAdmin
        .from('fb_page_configs')
        .upsert({
          workspace_id: workspaceId,
          page_id: page.page_id,
          page_name: page.page_name,
          page_category: page.page_category,
          page_access_token: page.page_access_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,page_id' });

      // 3. Fetch Lead Forms for this Page
      const forms = await fetchLeadFormsForPage(page.page_id, page.page_access_token);
      totalFormsCount += forms.length;

      for (const form of forms) {
        await supabaseAdmin
          .from('meta_lead_forms')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            status: form.status,
            questions_count: form.questions_count,
            sync_count: form.sync_count,
            is_active: true, // Default ON for auto-sync
            created_time: form.created_time,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });

        // Legacy fallback
        await supabaseAdmin
          .from('fb_form_mappings')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });
      }
    }

    // Success Audit Log
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'meta_oauth_connected',
      message: `✅ Facebook Connected as "${userProfile.name}". ${pages.length} Pages & ${totalFormsCount} Lead Forms discovered and ready for Instant Lead Sync.`,
    });

    const successParams = new URLSearchParams({
      meta_success: 'connected',
      pages_count: String(pages.length),
      forms_count: String(totalFormsCount),
      user_name: userProfile.name || 'Meta Account',
    });

    return NextResponse.redirect(`${targetRedirect}?${successParams.toString()}`);

  } catch (err: any) {
    console.error('[Meta Callback Error]:', err);
    await supabaseAdmin.from('meta_error_logs').insert({
      workspace_id: workspaceId,
      error_type: 'OAUTH_CALLBACK_FAILED',
      message: `❌ OAuth Callback Exception: ${err.message}`,
      error_details: { stack: err.stack },
      resolution_hint: 'Try clicking "Reconnect Meta" and re-granting all permissions.',
    });
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent(err.message || 'Meta OAuth Failed')}`);
  }
}
