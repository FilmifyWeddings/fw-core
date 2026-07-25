import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/meta/disconnect
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authResult = await verifyMetaAuth(req, body.workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    console.log(`[Supabase DB Write] Disconnecting Meta for verified workspace: ${workspaceId}...`);

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
