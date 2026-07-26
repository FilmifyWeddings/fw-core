import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * GET /api/facebook/pages?workspace_id=XXX
 * Fetches Facebook Pages managed by the authenticated workspace user via Meta Graph API.
 * Uses verifyMetaAuth for JWT-authenticated workspace resolution.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized && authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const workspaceId = authResult.workspaceId;

  try {
    // 1. Read User Access Token from integration_credentials or profiles strictly for workspace
    const { data: conn } = await supabaseAdmin
      .from('integration_credentials')
      .select('access_token, status')
      .eq('user_id', workspaceId)
      .eq('provider', 'meta')
      .maybeSingle();

    let metaToken = conn?.status === 'connected' ? conn?.access_token : null;

    if (!metaToken) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('meta_access_token')
        .eq('id', workspaceId)
        .maybeSingle();
      metaToken = profile?.meta_access_token || null;
    }

    if (!metaToken) {
      return NextResponse.json({
        success: false,
        error: 'No active Meta Access Token found for this workspace.',
        pages: [],
      });
    }

    // 2. Fetch Pages from Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&access_token=${metaToken}`
    );

    if (!metaRes.ok) {
      const errBody = await metaRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errBody?.error?.message || `Meta API HTTP Error ${metaRes.status}`,
        pages: [],
      });
    }

    const metaData = await metaRes.json();
    const fetchedPages = (metaData.data || []).map((page: any) => ({
      page_id: page.id,
      page_name: page.name,
      page_category: page.category || null,
      page_access_token: page.access_token,
    }));

    // 3. Query existing saved pages from db for workspace
    const { data: savedPages } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_id, page_name, is_active')
      .eq('workspace_id', workspaceId);

    const savedMap = new Map((savedPages || []).map((p: any) => [p.page_id, p.is_active]));

    const enrichedPages = fetchedPages.map((p: any) => ({
      ...p,
      is_saved: savedMap.has(p.page_id),
      is_active: savedMap.get(p.page_id) ?? false,
    }));

    return NextResponse.json({ success: true, workspace_id: workspaceId, pages: enrichedPages });
  } catch (err: any) {
    console.error('[FB Pages API Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message, pages: [] }, { status: 500 });
  }
}

/**
 * POST /api/facebook/pages
 * Saves / updates page configuration for authenticated workspace.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authResult = await verifyMetaAuth(req, body.workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;
    const { page_id, page_name, page_category, page_access_token, is_active } = body;

    if (!page_id || !page_access_token) {
      return NextResponse.json({ error: 'page_id and page_access_token required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('fb_page_configs')
      .upsert({
        workspace_id: workspaceId,
        tenant_id: workspaceId,
        page_id,
        page_name: page_name || null,
        page_category: page_category || null,
        page_access_token,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,page_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, page: data });
  } catch (err: any) {
    console.error('[FB Save Page Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/facebook/pages?workspace_id=XXX&page_id=YYY
 * Removes page connection for workspace.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');
  const pageId = searchParams.get('page_id');

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized && authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const workspaceId = authResult.workspaceId;

  if (!pageId) {
    return NextResponse.json({ error: 'page_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('fb_page_configs')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('page_id', pageId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
