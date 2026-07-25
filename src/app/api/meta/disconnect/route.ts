import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getValidWorkspaceId(requestedId?: string | null): Promise<string> {
  if (requestedId && requestedId !== '00000000-0000-0000-0000-000000000000') {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', requestedId).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: firstProfile } = await supabaseAdmin.from('profiles').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (firstProfile?.id) return firstProfile.id;
  return '37c63a54-d4f1-4b99-b546-3d965cd23a37';
}

/**
 * POST /api/meta/disconnect
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceId = await getValidWorkspaceId(body.workspace_id);

    console.log(`[Supabase DB Write] Disconnecting Meta for workspace: ${workspaceId}...`);

    // Invalidate integration_credentials
    await supabaseAdmin
      .from('integration_credentials')
      .update({ status: 'disconnected', access_token: null, updated_at: new Date().toISOString() })
      .eq('user_id', workspaceId)
      .eq('provider', 'meta');

    // Inactivate pages
    await supabaseAdmin
      .from('fb_page_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    // Inactivate forms
    await supabaseAdmin
      .from('fb_form_mappings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    // Clear profiles token
    await supabaseAdmin
      .from('profiles')
      .update({ meta_access_token: null, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'meta_disconnected',
      message: 'Meta Business Account disconnected and access tokens cleared.',
    });

    return NextResponse.json({
      success: true,
      message: 'Meta Facebook account disconnected cleanly.',
    });

  } catch (err: any) {
    console.error('[Meta Disconnect Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
