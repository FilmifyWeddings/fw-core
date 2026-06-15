import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function fetchUserPages(userToken: string): Promise<Array<{
  page_id: string;
  page_name: string;
  page_category: string | null;
  page_access_token: string;
}>> {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,category,access_token&access_token=${userToken}`
  );

  if (!pagesRes.ok) {
    const err = await pagesRes.json().catch(() => ({}));
    throw new Error(`Failed to fetch pages from Meta: ${err?.error?.message || pagesRes.status}`);
  }

  const pagesData = await pagesRes.json();
  return (pagesData.data || []).map((page: any) => ({
    page_id:           page.id,
    page_name:         page.name,
    page_category:     page.category || null,
    page_access_token: page.access_token,
  }));
}

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
    is_active:         true,
    updated_at:        new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('fb_page_configs')
    .upsert(upsertData, { onConflict: 'workspace_id,page_id' });

  if (error) {
    throw new Error(`Failed to save pages to DB: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspace_id, user_access_token } = body;

    if (!workspace_id) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    if (action === 'tester_token') {
      if (!user_access_token) {
        return NextResponse.json({ success: false, error: 'user_access_token is required' }, { status: 400 });
      }

      console.log(`[FB Tester Bypass] Fetching real pages using tester token for workspace: ${workspace_id}`);
      const pages = await fetchUserPages(user_access_token);

      // Save User Token to profile
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          meta_access_token: user_access_token,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', workspace_id);

      if (profileErr) {
        throw new Error(`Failed to update profile: ${profileErr.message}`);
      }

      // Save pages to fb_page_configs
      if (pages.length > 0) {
        await savePagesToDb(workspace_id, pages);
      }

      await supabaseAdmin.from('live_logs').insert({
        workspace_id,
        event_type:   'fb_oauth_connected',
        message:      `Connected via Meta Tester Token. Sync completed for ${pages.length} page(s).`,
        metadata:     { tester_bypass: true, pages_synced: pages.length },
      });

      return NextResponse.json({
        success: true,
        message: `Tester Token connected successfully! ${pages.length} page(s) synchronized.`,
        pages_count: pages.length,
      });

    } else if (action === 'mock_sync') {
      console.log(`[FB Mock Bypass] Seeding mock pages for workspace: ${workspace_id}`);

      // Seed mock user access token in profiles
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          meta_access_token: 'mock_token_tester_bypass',
          updated_at:        new Date().toISOString(),
        })
        .eq('id', workspace_id);

      if (profileErr) {
        throw new Error(`Failed to update profile: ${profileErr.message}`);
      }

      // Seed mock pages in fb_page_configs
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

      await savePagesToDb(workspace_id, mockPages);

      await supabaseAdmin.from('live_logs').insert({
        workspace_id,
        event_type:   'fb_oauth_connected',
        message:      `Connected via Mock Simulator. Loaded 2 simulated pages.`,
        metadata:     { mock_bypass: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Mock simulator initialized! 2 simulated pages loaded.',
        pages_count: 2,
      });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action. Must be tester_token or mock_sync' }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[FB Bypass Endpoint Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
