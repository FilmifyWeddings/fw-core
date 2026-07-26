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
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '1488107768502570';
  const appSecret = process.env.FACEBOOK_APP_SECRET || '4da60a4bc30f64db3570ffde1508b2b6';

  console.log(`[Meta Graph API] Exchanging OAuth code for access token. Redirect URI: ${redirectUri}`);

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

async function fetchUserProfile(token: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${token}`);
  if (!res.ok) throw new Error('Failed to fetch Meta User profile');
  return await res.json();
}

// Fetch Managed Facebook Pages
async function fetchUserPages(token: string) {
  console.log('[Meta Graph API] Querying /me/accounts for managed Facebook pages...');
  const res = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Meta Graph API Error] /me/accounts:', err);
    throw new Error(`Failed to fetch Facebook Pages: ${err?.error?.message || res.status}`);
  }
  const data = await res.json();
  console.log(`[Meta Graph API] Successfully fetched ${(data.data || []).length} Facebook Page(s).`);
  return (data.data || []).map((p: any) => ({
    page_id: p.id,
    page_name: p.name,
    page_category: p.category || 'Business Page',
    page_access_token: p.access_token,
    picture_url: p.picture?.data?.url || null,
  }));
}

// Fetch Lead Forms for a Page
async function fetchLeadFormsForPage(pageId: string, pageAccessToken: string) {
  console.log(`[Meta Graph API] Querying leadgen_forms for Page ID: ${pageId}...`);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${pageAccessToken}`);
    if (!res.ok) {
      console.warn(`[Meta Callback] Forms fetch warning for page ${pageId}: ${res.status}`);
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
    console.log(`[Meta Graph API] Page ${pageId} returned ${formsList.length} Lead Form(s).`);
    return formsList;
  } catch (err) {
    console.error(`[Meta Callback] Exception fetching forms for page ${pageId}:`, err);
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
    const data = await res.json();
    return res.ok && !data.error;
  } catch (_) {
    return false;
  }
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

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized) {
    console.error('[Meta Callback Security Failure] Could not resolve authenticated workspace_id.');
    return NextResponse.redirect(`${targetRedirect}?meta_error=${encodeURIComponent('Authentication failure: workspace could not be verified')}`);
  }

  const workspaceId = authResult.workspaceId;
  console.log(`[Meta OAuth Callback] Storing connection for Workspace ID: ${workspaceId}`);

  try {
    const redirectUri = `${baseUrl}/api/meta/callback`;
    const userToken = await exchangeCodeForLongLivedToken(code, redirectUri);
    const userProfile = await fetchUserProfile(userToken);

    // 1. Save Connection Token in integration_credentials
    await supabaseAdmin
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
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    // 2. Save Token in profiles
    await supabaseAdmin
      .from('profiles')
      .update({
        meta_access_token: userToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId);

    // 3. Fetch Managed Facebook Pages
    const pages = await fetchUserPages(userToken);

    let totalFormsCount = 0;

    for (const page of pages) {
      // Subscribe Webhook
      await subscribePageWebhook(page.page_id, page.page_access_token);

      // Save Page into fb_page_configs (Strict Workspace Composite Key)
      console.log(`[Supabase DB Write] Saving page "${page.page_name}" (${page.page_id}) for workspace ${workspaceId}...`);
      await supabaseAdmin
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
        }, { onConflict: 'workspace_id,page_id' });

      // Fetch Lead Forms for this Page
      const forms = await fetchLeadFormsForPage(page.page_id, page.page_access_token);
      totalFormsCount += forms.length;

      for (const form of forms) {
        console.log(`[Supabase DB Write] Saving lead form "${form.form_name}" (${form.form_id}) into fb_lead_forms & fb_form_mappings...`);

        // SAVE FORM INTO fb_lead_forms (Read by GET /api/meta/status & GET /api/meta/forms)
        await supabaseAdmin
          .from('fb_lead_forms')
          .upsert({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: form.form_id,
            form_name: form.form_name,
            status: form.status,
            leads_count: form.sync_count || 0,
            created_time: form.created_time,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });

        // ALSO SAVE FORM INTO fb_form_mappings
        await supabaseAdmin
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
          }, { onConflict: 'workspace_id,form_id' });
      }
    }

    console.log(`[Meta OAuth Callback SUCCESS] Saved ${pages.length} Pages & ${totalFormsCount} Forms for workspace ${workspaceId}.`);

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
