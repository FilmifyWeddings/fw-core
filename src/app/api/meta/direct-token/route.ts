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
    const pageRes = await fetch(
      `https://graph.facebook.com/v20.0/${page_id}?fields=id,name,category,access_token&access_token=${page_access_token}`
    );

    const pageJson = await pageRes.json().catch(() => ({}));

    if (!pageRes.ok || pageJson.error) {
      const msg = pageJson?.error?.message || `Graph API HTTP ${pageRes.status}`;
      return NextResponse.json(
        { success: false, error: `Facebook Graph API Error: ${msg}. Please check Page ID & Token.` },
        { status: 400 }
      );
    }

    const pageName = pageJson.name || `Facebook Page ${page_id}`;
    const pageCategory = pageJson.category || 'Business Page';
    const effectiveToken = pageJson.access_token || page_access_token;

    // ── 2. Direct Webhook Subscription ──────────────────────────────────────
    console.log(`[Direct Token Sync] Subscribing Page ${page_id} to leadgen webhooks...`);
    let webhookSubscribed = false;
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v20.0/${page_id}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `subscribed_fields=leadgen&access_token=${encodeURIComponent(effectiveToken)}`,
        }
      );
      const subJson = await subRes.json().catch(() => ({}));
      if (subRes.ok && subJson.success) {
        webhookSubscribed = true;
        console.log(`[Direct Token Sync] Webhook subscribed successfully for Page ${page_id}`);
      } else {
        console.warn(`[Direct Token Sync] Webhook subscription warning:`, subJson);
      }
    } catch (wErr: any) {
      console.warn(`[Direct Token Sync] Webhook subscription exception:`, wErr.message);
    }

    // ── 3. Fetch Lead Forms for Page ────────────────────────────────────────
    console.log(`[Direct Token Sync] Fetching leadgen_forms for Page ${page_id}...`);
    const formsRes = await fetch(
      `https://graph.facebook.com/v20.0/${page_id}/leadgen_forms?fields=id,name,status,leads_count,questions,created_time&access_token=${effectiveToken}`
    );
    const formsJson = await formsRes.json().catch(() => ({}));
    const rawForms = Array.isArray(formsJson.data) ? formsJson.data : [];

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
          updated_at: now,
        },
        updated_at: now,
      }, { onConflict: 'user_id,provider' });

    // ── 5. Save Page Config in DB ────────────────────────────────────────────
    const { data: savedPage } = await supabaseAdmin
      .from('fb_page_configs')
      .upsert({
        workspace_id: workspaceId,
        page_id,
        page_name: pageName,
        page_category: pageCategory,
        page_access_token: effectiveToken,
        is_active: true,
        updated_at: now,
      }, { onConflict: 'workspace_id,page_id' })
      .select('*')
      .single();

    // ── 6. Save Lead Forms in DB ─────────────────────────────────────────────
    const savedForms: any[] = [];
    for (const f of rawForms) {
      const formId = f.id;
      const formName = f.name || 'Instant Lead Form';
      const status = f.status || 'ACTIVE';
      const leadsCount = f.leads_count || 0;
      const questions = f.questions || [];

      const { data: savedForm } = await supabaseAdmin
        .from('fb_lead_forms')
        .upsert({
          workspace_id: workspaceId,
          page_id,
          form_id: formId,
          form_name: formName,
          status,
          leads_count: leadsCount,
          questions_count: questions.length,
          questions,
          is_enabled: status === 'ACTIVE',
          updated_at: now,
        }, { onConflict: 'workspace_id,form_id' })
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
        metadata: { page_id, page_name: pageName, forms_count: savedForms.length, webhook_subscribed: webhookSubscribed },
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
    });
  } catch (err: any) {
    console.error('[Direct Token Sync Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Direct Token Connection failed.' },
      { status: 500 }
    );
  }
}
