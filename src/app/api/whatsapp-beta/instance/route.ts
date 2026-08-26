import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  getInstanceNameForWorkspace, 
  getEvolutionConnectionState, 
  createEvolutionInstance,
  setEvolutionWebhook 
} from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/instance
 * Checks current connection state & metadata from Evolution API & DB
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const instanceName = getInstanceNameForWorkspace(workspaceId);

    // 1. Check local evolution_instances DB record
    const { data: dbInstance } = await supabaseAdmin
      .from('evolution_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // 2. Check baileys_sessions table for active WhatsApp session
    const { data: bSession } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*')
      .eq('user_id', workspaceId)
      .maybeSingle();

    const isBaileysConnected = (bSession?.conn_state === 'open' || bSession?.status === 'CONNECTED' || bSession?.status === 'open') && !!bSession?.phone_number;

    // 3. Query live state from Evolution API
    const liveState = await getEvolutionConnectionState(instanceName);

    let finalStatus = isBaileysConnected ? 'CONNECTED' : (liveState.state || dbInstance?.connection_status || 'DISCONNECTED');
    let phoneNumber = isBaileysConnected ? bSession?.phone_number : (dbInstance?.phone_number || (liveState as any)?.phone_number || null);
    let profileName = bSession?.profile_name || dbInstance?.profile_name || 'My WhatsApp';

    // If connected in baileys_sessions or evolution, sync to evolution_instances
    if (finalStatus === 'CONNECTED') {
      await supabaseAdmin
        .from('evolution_instances')
        .upsert({
          workspace_id: workspaceId,
          instance_name: instanceName,
          phone_number: phoneNumber,
          profile_name: profileName,
          connection_status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });

      await supabaseAdmin
        .from('integration_credentials')
        .upsert({
          user_id: workspaceId,
          provider: 'evolution_whatsapp',
          status: 'connected',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, provider' });
    } else if (dbInstance && dbInstance.connection_status !== finalStatus) {
      await supabaseAdmin
        .from('evolution_instances')
        .update({ connection_status: finalStatus, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
    }

    return NextResponse.json({
      success: true,
      instance_name: instanceName,
      connection_status: finalStatus,
      is_connected: finalStatus === 'CONNECTED',
      phone_number: phoneNumber,
      profile_name: profileName,
      instance: {
        workspace_id: workspaceId,
        instance_name: instanceName,
        connection_status: finalStatus,
        phone_number: phoneNumber,
        profile_name: profileName,
      },
      live_state: liveState,
    });
  } catch (err: any) {
    console.error('[Evolution Instance GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp-beta/instance
 * Auto-creates or provisions Evolution instance for workspace
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspace_id } = body;

    if (!workspace_id) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const instanceName = getInstanceNameForWorkspace(workspace_id);

    // 1. Provision on Evolution API
    const createRes = await createEvolutionInstance(instanceName);
    
    // 2. Auto-subscribe webhook
    await setEvolutionWebhook(instanceName);

    // 3. Upsert to Supabase
    const { data: saved, error: dbErr } = await supabaseAdmin
      .from('evolution_instances')
      .upsert({
        workspace_id,
        instance_name: instanceName,
        connection_status: 'CONNECTING',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' })
      .select('*')
      .single();

    if (dbErr) {
      console.warn('[Evolution Instance DB Save Error]:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      instance_name: instanceName,
      instance: saved,
      evolution_response: createRes,
    });
  } catch (err: any) {
    console.error('[Evolution Instance POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
