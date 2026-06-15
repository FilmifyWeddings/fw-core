import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/facebook/subscribe-webhook
 * Body: { workspace_id, page_id }
 *
 * Jab user koi page "activate" karta hai, yeh route:
 * 1. Supabase se Page Access Token fetch karta hai
 * 2. Meta Graph API pe POST /{page_id}/subscribed_apps call karta hai
 * 3. "leadgen" field subscribe karta hai
 * 4. Subscription status Supabase mein update karta hai
 *
 * Yeh ensure karta hai ki jab bhi koi us Facebook Page pe
 * Lead Ad submit kare, hamara webhook auto-trigger ho.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, page_id } = body;

    if (!workspace_id || !page_id) {
      return NextResponse.json({ error: 'workspace_id and page_id required' }, { status: 400 });
    }

    // ── Page Access Token fetch karo ──────────────────────────
    const { data: pageConfig, error: dbErr } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_access_token, page_name')
      .eq('workspace_id', workspace_id)
      .eq('page_id', page_id)
      .maybeSingle();

    if (dbErr || !pageConfig?.page_access_token) {
      return NextResponse.json({
        success: false,
        error: 'Page not found or access token missing. Reconnect via OAuth.',
      }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookCallbackUrl = `${appUrl}/api/webhooks/facebook-leads?workspace_id=${workspace_id}`;
    const verifyToken        = process.env.FACEBOOK_VERIFY_TOKEN || 'fw_verify_token';

    // Mock bypass check for webhook subscription
    if (pageConfig.page_access_token.startsWith('mock_token_') || page_id.startsWith('mock_page_')) {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id,
        event_type: 'webhook_subscribed',
        message:    `[MOCK] Leadgen webhook subscribed for mock page: "${pageConfig.page_name}".`,
      });
      return NextResponse.json({
        success:      true,
        page_id,
        page_name:    pageConfig.page_name,
        subscribed:   true,
        webhook_url:  webhookCallbackUrl,
        verify_token: verifyToken,
      });
    }

    // ── Meta Graph API: Subscribe Page to leadgen webhook ─────
    // POST /{page-id}/subscribed_apps
    // subscribed_fields: leadgen  → Har naye lead pe notification
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v20.0/${page_id}/subscribed_apps`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'leadgen',
          access_token:      pageConfig.page_access_token,
        }).toString(),
      }
    );

    const subscribeData = await subscribeRes.json();

    if (!subscribeRes.ok || subscribeData.error) {
      const errMsg = subscribeData?.error?.message || `Subscribe API error: ${subscribeRes.status}`;
      console.error('[Webhook Subscribe] Error:', errMsg);

      return NextResponse.json({
        success:          false,
        error:            errMsg,
        meta_response:    subscribeData,
        // Agar App-level subscription missing hai toh yeh error aata hai
        hint: subscribeData?.error?.code === 200
          ? 'App ko Facebook Page se connect karo: Page Settings → Advanced → Subscribe Your App'
          : undefined,
      }, { status: 200 }); // 200 return karo taaki UI properly handle kar sake
    }

    // ── Success: Log the subscription ─────────────────────────
    console.log(`[Webhook Subscribe] Page "${pageConfig.page_name}" (${page_id}) subscribed to leadgen.`);

    await supabaseAdmin.from('live_logs').insert({
      workspace_id,
      event_type: 'webhook_subscribed',
      message:    `Leadgen webhook subscribed for page: "${pageConfig.page_name}" (${page_id}).`,
      metadata:   {
        page_id,
        webhook_callback: webhookCallbackUrl,
        meta_response:    subscribeData,
      },
    });

    return NextResponse.json({
      success:      true,
      page_id,
      page_name:    pageConfig.page_name,
      subscribed:   subscribeData.success ?? true,
      webhook_url:  webhookCallbackUrl,
      verify_token: verifyToken,
    });

  } catch (err: any) {
    console.error('[Webhook Subscribe] Unhandled error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/facebook/subscribe-webhook?workspace_id=XXX&page_id=YYY
 *
 * Page se webhook unsubscribe karta hai.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const pageId      = searchParams.get('page_id');

  if (!workspaceId || !pageId) {
    return NextResponse.json({ error: 'workspace_id and page_id required' }, { status: 400 });
  }

  try {
    const { data: pageConfig } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_access_token')
      .eq('workspace_id', workspaceId)
      .eq('page_id', pageId)
      .maybeSingle();

    if (!pageConfig?.page_access_token) {
      return NextResponse.json({ success: true, message: 'Page not found, nothing to unsubscribe.' });
    }

    // DELETE /{page_id}/subscribed_apps
    const unsubRes = await fetch(
      `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`,
      {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'leadgen',
          access_token:      pageConfig.page_access_token,
        }).toString(),
      }
    );

    const unsubData = await unsubRes.json();
    return NextResponse.json({ success: unsubData.success ?? true, meta_response: unsubData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
