import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper: Resolve a valid Profile / Workspace ID from Supabase DB
async function getValidWorkspaceId(requestedId?: string | null): Promise<string> {
  if (requestedId && requestedId !== '00000000-0000-0000-0000-000000000000') {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', requestedId).maybeSingle();
    if (data?.id) return data.id;
  }
  
  const { data: filmifyProf } = await supabaseAdmin.from('profiles').select('id').ilike('workspace_name', '%Filmify%').maybeSingle();
  if (filmifyProf?.id) return filmifyProf.id;

  const { data: firstProfile } = await supabaseAdmin.from('profiles').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (firstProfile?.id) return firstProfile.id;

  return 'f0635313-586c-406c-bda7-03c81a1343d3';
}

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

// ── Step 1: Code -> 60-Day Long-Lived Token Exchange ─────────────────────
async function exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  console.log(`[Meta Graph API Query] Exchanging code for token with redirectUri: ${redirectUri}`);

  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_secret=${appSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    console.error('[Meta Graph API Error] Code exchange response:', err);
    throw new Error(`OAuth Code Exchange Failed: ${err?.error?.message || tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const shortToken: string = tokenData.access_token;
  console.log('[Meta Graph API Response] Short-lived token received successfully.');

  // Short Lived -> Long Lived Token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${appId}&` +
    `client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );

  if (!longRes.ok) {
    console.warn('[Meta Callback] Long-lived token exchange warning, using short token');
    return shortToken;
  }

  const longData = await longRes.json();
  console.log('[Meta Graph API Response] Long-lived 60-day token received successfully.');
  return longData.access_token || shortToken;
}

async function fetchUserProfile(token: string) {
  console.log('[Meta Graph API Query] Fetching /me identity...');
  const res = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${token}`);
  if (!res.ok) throw new Error('Failed to fetch Meta User profile');
  const profile = await res.json();
  console.log('[Meta Graph API Response] Profile:', profile);
  return profile;
}

async function fetchUserPermissions(token: string) {
  console.log('[Meta Graph API Query] Fetching /me/permissions...');
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${token}`);
    if (!res.ok) return [];
    const data = await res.json();
    const perms = (data.data || []).map((p: any) => ({
      permission: p.permission,
      status: p.status,
    }));
    console.log('[Meta Graph API Response] /me/permissions list:', JSON.stringify(perms, null, 2));
    return perms;
  } catch (err) {
    console.warn('[Meta Callback] Failed to fetch permissions:', err);
    return [];
  }
}

// ── Step 3: Fetch Managed Pages ──────────────────────────────────────────
async function fetchUserPages(token: string) {
  console.log('[Meta Graph API Query] Fetching /me/accounts pages...');
  const res = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Meta Graph API Error] /me/accounts:', err);
    throw new Error(`Failed to fetch Facebook Pages: ${err?.error?.message || res.status}`);
  }
  const data = await res.json();
  console.log(`[Meta Graph API Response] Fetched ${(data.data || []).length} Facebook Page(s).`);
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
  console.log(`[Meta Graph API Query] Fetching leadgen_forms for Page ID: ${pageId}...`);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${pageAccessToken}`);
    if (!res.ok) {
      console.warn(`[Meta Callback] Forms fetch error for page ${pageId}: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const formsList = (data.data || []).map((f: any) => ({
      form_id: f.id,
      form_name: f.name || 'Instant Lead Form',
      status: f.status || 'ACTIVE',
      sync_count: f.leads_count || 0,
      questions_count: f.questions ? f.questions.length : 0,
      created_time: f.created_time || new Date().toISOString(),
    }));
    console.log(`[Meta Graph API Response] Page ${pageId} has ${formsList.length} Lead Form(s).`);
    return formsList;
  } catch (err) {
    console.error(`[Meta Callback] Exception fetching forms for page ${pageId}:`, err);
    return [];
  }
}

// ── Step 5: Subscribe Leadgen Webhook to Page ───────────────────────────
async function subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  console.log(`[Meta Webhook Subscribe Query] Subscribing leadgen for Page ID: ${pageId}...`);
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
    const isSuccess = res.ok && !data.error;
    console.log(`[Meta Webhook Subscribe Response] Page ${pageId} result: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    return isSuccess;
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

  const baseUrl = getBaseUrl(req);
  const targetRedirect = `${baseUrl}/workspace/integrations/meta`;

  if (error) {
    console.error('[Meta OAuth Callback] User denied or error:', errorReason);
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

  const workspaceId = await getValidWorkspaceId(requestedWorkspaceId);
  console.log(`[Meta OAuth Callback] Resolved workspace_id for database storage: ${workspaceId}`);

  try {
    const redirectUri = `${baseUrl}/api/meta/callback`;
    const userToken = await exchangeCodeForLongLivedToken(code, redirectUri);
    const userPermissions = await fetchUserPermissions(userToken);
    const userProfile = await fetchUserProfile(userToken);

    const grantedScopes = userPermissions
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);

    console.log('[Meta OAuth Permissions Audit] Granted Scopes:', grantedScopes.join(', '));
    console.log('[Meta OAuth Scope Check] pages_manage_metadata status:', grantedScopes.includes('pages_manage_metadata') ? 'GRANTED ✅' : 'NOT GRANTED ❌');

    // 1. Save Connection Token in `integration_credentials` (Valid Foreign Key in Supabase)
    console.log(`[Supabase DB Write] Saving token to integration_credentials for workspace: ${workspaceId}`);
    const { error: credErr } = await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspaceId,
        provider: 'meta',
        status: 'connected',
        access_token: userToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (credErr) {
      console.error('[Supabase DB Error] integration_credentials upsert:', credErr.message);
    }

    // 2. Save Token in `profiles`
    console.log(`[Supabase DB Write] Updating meta_access_token in profiles for workspace: ${workspaceId}`);
    await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: userToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // 3. Fetch Managed Facebook Pages
    const pages = await fetchUserPages(userToken);
    if (pages.length === 0) {
      console.warn('[Meta Callback] No Facebook Pages found under this Meta user.');
      return NextResponse.redirect(`${targetRedirect}?meta_warning=${encodeURIComponent('No Facebook Pages Found under your account')}`);
    }

    // Option A Multi-Tenant Security Check: Enforce Exclusive Page Ownership
    for (const page of pages) {
      const { data: existingOwnership } = await supabaseAdmin
        .from('fb_page_configs')
        .select('workspace_id, page_name')
        .eq('page_id', page.page_id)
        .eq('is_active', true)
        .neq('workspace_id', workspaceId)
        .maybeSingle();

      if (existingOwnership) {
        console.warn(`[Multi-Tenant Violation] Page "${page.page_name}" (${page.page_id}) is already connected to workspace ${existingOwnership.workspace_id}.`);
        return NextResponse.redirect(
          `${targetRedirect}?meta_error=${encodeURIComponent(
            `This Facebook Page (${page.page_name}) is already connected to another StudioCore workspace.`
          )}`
        );
      }
    }

    let totalFormsCount = 0;

    for (const page of pages) {
      // Subscribe Page Webhook
      const isSubbed = await subscribePageWebhook(page.page_id, page.page_access_token);

      // Save Page in `fb_page_configs` (Valid Table in Supabase with tenant_id)
      console.log(`[Supabase DB Write] Upserting page "${page.page_name}" to fb_page_configs...`);
      const { error: pageErr } = await supabaseAdmin
        .from('fb_page_configs')
        .upsert({
          workspace_id: workspaceId,
          tenant_id: workspaceId,
          page_id: page.page_id,
          page_name: page.page_name,
          page_category: page.page_category,
          page_access_token: page.page_access_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'page_id' });

      if (pageErr) {
        console.error(`[Supabase DB Error] fb_page_configs upsert for ${page.page_id}:`, pageErr.message);
      }

      // Fetch Lead Forms for this Page
      const forms = await fetchLeadFormsForPage(page.page_id, page.page_access_token);
      totalFormsCount += forms.length;

      for (const form of forms) {
        console.log(`[Supabase DB Write] Upserting form "${form.form_name}" (${form.form_id}) to fb_form_mappings...`);
        const { error: formErr } = await supabaseAdmin
          .from('fb_form_mappings')
          .upsert({
            workspace_id: workspaceId,
            tenant_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            is_active: true,
            is_tagging_enabled: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'form_id' });

        if (formErr) {
          console.error(`[Supabase DB Error] fb_form_mappings upsert for ${form.form_id}:`, formErr.message);
        }
      }
    }

    // Save Audit Event in live_logs
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'meta_oauth_connected',
      message: `✅ Facebook Connected as "${userProfile.name}". ${pages.length} Page(s) & ${totalFormsCount} Lead Form(s) synced to database.`,
    });

    console.log(`[Meta OAuth Callback SUCCESS] Redirecting to dashboard with ${pages.length} Pages & ${totalFormsCount} Forms.`);

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
