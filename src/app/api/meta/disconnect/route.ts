import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/meta/disconnect
 * Hard Disconnect Engine: Deletes access tokens, page configs, lead forms, and profile tokens for workspace.
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

    // 1. Delete integration_credentials
    await supabaseAdmin
      .from('integration_credentials')
      .delete()
      .eq('user_id', workspaceId)
      .eq('provider', 'meta');

    // 2. Delete fb_page_configs
    await supabaseAdmin
      .from('fb_page_configs')
      .delete()
      .eq('workspace_id', workspaceId);

    // 3. Delete fb_lead_forms
    await supabaseAdmin
      .from('fb_lead_forms')
      .delete()
      .eq('workspace_id', workspaceId);

    try {
      await supabaseAdmin
        .from('fb_form_mappings')
        .delete()
        .eq('workspace_id', workspaceId);
    } catch (err) {}

    // 4. Wipe profile access token
    await supabaseAdmin
      .from('profiles')
      .update({ meta_access_token: null, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    return NextResponse.json({
      success: true,
      isConnected: false,
      pages: [],
      forms: [],
      message: 'Meta Facebook integration completely deleted and reset for workspace.',
    });

  } catch (err: any) {
    console.error('[Meta Disconnect Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
