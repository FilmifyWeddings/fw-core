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

    // 1. Check local DB record
    const { data: dbInstance } = await supabaseAdmin
      .from('evolution_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // 2. Query live state from Evolution API
    const liveState = await getEvolutionConnectionState(instanceName);

    let finalStatus = liveState.state || dbInstance?.connection_status || 'DISCONNECTED';

    // If status changed, update DB
    if (dbInstance && dbInstance.connection_status !== finalStatus) {
      await supabaseAdmin
        .from('evolution_instances')
        .update({ connection_status: finalStatus, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
    }

    return NextResponse.json({
      success: true,
      instance_name: instanceName,
      connection_status: finalStatus,
      instance: dbInstance || {
        workspace_id: workspaceId,
        instance_name: instanceName,
        connection_status: finalStatus,
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
