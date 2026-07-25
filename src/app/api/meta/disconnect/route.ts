import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/meta/disconnect
 * Body: { workspace_id }
 * Completely disconnects Meta integration, invalidates connection record & removes tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceId = body.workspace_id || '00000000-0000-0000-0000-000000000000';

    // Delete or invalidate meta_connections
    await supabaseAdmin
      .from('meta_connections')
      .delete()
      .eq('workspace_id', workspaceId);

    // Set pages & forms inactive
    await supabaseAdmin
      .from('meta_pages')
      .update({ is_active: false, is_webhook_subscribed: false })
      .eq('workspace_id', workspaceId);

    await supabaseAdmin
      .from('meta_lead_forms')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId);

    // Clear meta_access_token in profiles
    await supabaseAdmin
      .from('profiles')
      .update({ meta_access_token: null, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);

    // Legacy fallback cleanup
    await supabaseAdmin
      .from('integration_credentials')
      .update({ status: 'disconnected', access_token: null })
      .eq('user_id', workspaceId)
      .eq('provider', 'meta');

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
    console.error('[Meta Disconnect Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
