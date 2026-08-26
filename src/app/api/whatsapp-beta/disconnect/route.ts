import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getInstanceNameForWorkspace, logoutEvolutionInstance } from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * POST /api/whatsapp-beta/disconnect
 * Logs out session and resets connection status
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspace_id } = body;

    if (!workspace_id) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const instanceName = getInstanceNameForWorkspace(workspace_id);

    // 1. Tell Evolution API to logout
    const logoutRes = await logoutEvolutionInstance(instanceName);

    // 2. Update DB instance state
    await supabaseAdmin
      .from('evolution_instances')
      .update({
        connection_status: 'DISCONNECTED',
        phone_number: null,
        profile_name: null,
        profile_pic_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspace_id);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Web (Beta) disconnected successfully.',
      evolution_response: logoutRes,
    });
  } catch (err: any) {
    console.error('[Evolution Disconnect Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
