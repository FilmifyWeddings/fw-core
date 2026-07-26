import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/meta/disconnect
 * Complete Fail-Safe Disconnect Handler.
 * Wipes out access tokens, pages, form mappings, and profiles for the verified workspace.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const authResult = await verifyMetaAuth(req, body.workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    console.log(`[Meta Disconnect Engine] Hard-disconnecting Meta for workspace: ${workspaceId}...`);

    // 1. Delete or invalidate integration_credentials
    await supabaseAdmin
      .from('integration_credentials')
      .delete()
      .eq('user_id', workspaceId)
      .eq('provider', 'meta');

    await supabaseAdmin
      .from('integration_credentials')
      .update({ status: 'disconnected', access_token: null, updated_at: new Date().toISOString() })
      .eq('user_id', workspaceId)
      .eq('provider', 'meta');

    // 2. Clear fb_page_configs (delete tokens & set inactive)
    await supabaseAdmin
      .from('fb_page_configs')
      .update({ is_active: false, page_access_token: '', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    // 3. Clear fb_lead_forms & fb_form_mappings
    await supabaseAdmin
      .from('fb_lead_forms')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    try {
      await supabaseAdmin
        .from('fb_form_mappings')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
    } catch (err) {}

    // 4. Clear profiles table meta_access_token
    await supabaseAdmin
      .from('profiles')
      .update({ meta_access_token: null, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    // 5. Insert audit log
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'meta_disconnected',
        message: 'Meta Business Account disconnected completely. All tokens and active page subscriptions removed.',
      });
    } catch (logErr) {}

    return NextResponse.json({
      success: true,
      isConnected: false,
      message: 'Meta Facebook integration completely removed for workspace.',
    });

  } catch (err: any) {
    console.error('[Meta Disconnect Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
