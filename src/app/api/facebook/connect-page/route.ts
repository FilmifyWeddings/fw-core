import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/facebook/connect-page
 * Body: { page_id: string }
 * Directly fetches and connects a Facebook Page by Page ID / Username using the user's active Meta User Token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { page_id } = body;

    if (!page_id || typeof page_id !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid Facebook Page ID or Username is required.' }, { status: 400 });
    }

    const authResult = await verifyMetaAuth(req);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    // 1. Retrieve User Token for workspace
    const { data: conn } = await supabaseAdmin
      .from('integration_credentials')
      .select('access_token, status')
      .eq('user_id', workspaceId)
      .eq('provider', 'meta')
      .maybeSingle();

    if (conn?.status !== 'connected' || !conn?.access_token) {
      return NextResponse.json({ success: false, error: 'No active Facebook account connected for this workspace. Please click "Connect Facebook Account" first.' }, { status: 400 });
    }

    const userToken = conn.access_token;
    const cleanPageId = page_id.trim();

    console.log(`[Manual Page Connect] Querying Meta Graph API for Page: ${cleanPageId}...`);

    // 2. Query Meta Graph API for target page details
    const pageRes = await fetch(`https://graph.facebook.com/v20.0/${cleanPageId}?fields=id,name,category,access_token,picture{url}&access_token=${userToken}`);

    if (!pageRes.ok) {
      const errBody = await pageRes.json().catch(() => ({}));
      console.error('[Manual Page Connect Error]:', errBody);
      return NextResponse.json({
        success: false,
        error: errBody?.error?.message || `Meta Graph API HTTP Error ${pageRes.status}: Page not found or access denied.`,
      }, { status: 400 });
    }

    const pageData = await pageRes.json();
    const resolvedPageId = pageData.id;
    const resolvedPageName = pageData.name;
    const resolvedPageCategory = pageData.category || 'Business Page';
    const resolvedPageToken = pageData.access_token || userToken;

    // 3. Save Page into fb_page_configs (Strict Workspace Isolation)
    const { error: pageErr } = await supabaseAdmin
      .from('fb_page_configs')
      .upsert({
        workspace_id: workspaceId,
        tenant_id: workspaceId,
        page_id: resolvedPageId,
        page_name: resolvedPageName,
        page_category: resolvedPageCategory,
        page_access_token: resolvedPageToken,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,page_id' });

    if (pageErr) {
      console.error('[Supabase DB Error] fb_page_configs upsert:', pageErr.message);
      return NextResponse.json({ success: false, error: 'Database save failed: ' + pageErr.message }, { status: 500 });
    }

    // 4. Fetch Lead Forms for this Page
    console.log(`[Manual Page Connect] Fetching leadgen_forms for Page ID: ${resolvedPageId}...`);
    const formsRes = await fetch(`https://graph.facebook.com/v20.0/${resolvedPageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${resolvedPageToken}`);

    let formsCount = 0;
    if (formsRes.ok) {
      const formsData = await formsRes.json();
      const formsList = formsData.data || [];
      formsCount = formsList.length;

      for (const f of formsList) {
        // Save into fb_lead_forms
        await supabaseAdmin
          .from('fb_lead_forms')
          .upsert({
            workspace_id: workspaceId,
            page_id: resolvedPageId,
            form_id: f.id,
            form_name: f.name || 'Instant Lead Form',
            status: f.status || 'ACTIVE',
            leads_count: f.leads_count || 0,
            created_time: f.created_time || new Date().toISOString(),
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });

        // Save into fb_form_mappings
        await supabaseAdmin
          .from('fb_form_mappings')
          .upsert({
            workspace_id: workspaceId,
            tenant_id: workspaceId,
            page_id: resolvedPageId,
            form_id: f.id,
            form_name: f.name || 'Instant Lead Form',
            is_active: true,
            is_tagging_enabled: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,form_id' });
      }
    }

    // 5. Subscribe Webhook
    try {
      await fetch(`https://graph.facebook.com/v20.0/${resolvedPageId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'leadgen',
          access_token: resolvedPageToken,
        }).toString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      page_id: resolvedPageId,
      page_name: resolvedPageName,
      forms_count: formsCount,
      message: `Successfully connected Facebook Page "${resolvedPageName}" (${resolvedPageId}) with ${formsCount} Lead Form(s)!`,
    });

  } catch (err: any) {
    console.error('[Manual Page Connect Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Page Connection Failed' }, { status: 500 });
  }
}
