import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/facebook/pages?workspace_id=XXX
 *
 * Meta Graph API se user ke saare Facebook Pages fetch karta hai.
 * User Long-Lived Token se /me/accounts call hoti hai.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  try {
    // Profile se meta_access_token lo
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('meta_access_token')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!profile?.meta_access_token) {
      return NextResponse.json({
        success: false,
        error: 'Meta Access Token not configured.',
        pages: [],
      });
    }

    // Mock bypass check
    if (profile.meta_access_token.startsWith('mock_token_')) {
      const mockPages = [
        {
          page_id: 'mock_page_101',
          page_name: 'Studio Light Reflections',
          page_category: 'Photography Studio',
          page_access_token: 'mock_token_page_101',
        },
        {
          page_id: 'mock_page_102',
          page_name: 'Elite Wedding Shoots',
          page_category: 'Wedding Photographer',
          page_access_token: 'mock_token_page_102',
        }
      ];

      const { data: savedPages } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_id, is_active')
        .eq('workspace_id', workspaceId);

      const savedMap = new Map((savedPages || []).map((p: any) => [p.page_id, p.is_active]));

      const enrichedPages = mockPages.map((p: any) => ({
        ...p,
        is_saved: savedMap.has(p.page_id),
        is_active: savedMap.get(p.page_id) ?? false,
      }));

      return NextResponse.json({ success: true, pages: enrichedPages });
    }

    // Meta Graph API — /me/accounts fetches all pages user manages
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&access_token=${profile.meta_access_token}`
    );

    if (!metaRes.ok) {
      const errBody = await metaRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errBody?.error?.message || `Meta API error: ${metaRes.status}`,
        pages: [],
      });
    }

    const metaData = await metaRes.json();
    const pages = (metaData.data || []).map((page: any) => ({
      page_id: page.id,
      page_name: page.name,
      page_category: page.category || null,
      page_access_token: page.access_token,
    }));

    // Existing saved pages from DB to mark which are already connected
    const { data: savedPages } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_id, is_active')
      .eq('workspace_id', workspaceId);

    const savedMap = new Map((savedPages || []).map((p: any) => [p.page_id, p.is_active]));

    const enrichedPages = pages.map((p: any) => ({
      ...p,
      is_saved: savedMap.has(p.page_id),
      is_active: savedMap.get(p.page_id) ?? false,
    }));

    return NextResponse.json({ success: true, pages: enrichedPages });
  } catch (err: any) {
    console.error('[FB Pages API Error]', err);
    return NextResponse.json({ success: false, error: err.message, pages: [] }, { status: 500 });
  }
}

/**
 * POST /api/facebook/pages
 * Body: { workspace_id, page_id, page_name, page_category, page_access_token, is_active }
 *
 * Page ko Supabase fb_page_configs mein save ya update karta hai.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, page_id, page_name, page_category, page_access_token, is_active } = body;

    if (!workspace_id || !page_id || !page_access_token) {
      return NextResponse.json({ error: 'workspace_id, page_id, page_access_token required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('fb_page_configs')
      .upsert({
        workspace_id,
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
    console.error('[FB Save Page Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/facebook/pages?workspace_id=XXX&page_id=YYY
 * Page connection Supabase se remove karta hai.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const pageId = searchParams.get('page_id');

  if (!workspaceId || !pageId) {
    return NextResponse.json({ error: 'workspace_id and page_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('fb_page_configs')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('page_id', pageId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
