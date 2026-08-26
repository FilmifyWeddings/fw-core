import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  getInstanceNameForWorkspace, 
  getEvolutionQrCode,
  createEvolutionInstance,
  getEvolutionConnectionState 
} from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/qr
 * Retrieves live base64/code QR for pairing
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const instanceName = getInstanceNameForWorkspace(workspaceId);

    // 1. Try fetching QR
    let qrRes = await getEvolutionQrCode(instanceName);

    // If instance does not exist yet (e.g. 404), auto-create and retry
    if (!qrRes.ok && (qrRes.status === 404 || qrRes.status === 400)) {
      await createEvolutionInstance(instanceName);
      qrRes = await getEvolutionQrCode(instanceName);
    }

    // Check if already connected
    const connState = await getEvolutionConnectionState(instanceName);

    if (connState.state === 'CONNECTED') {
      await supabaseAdmin
        .from('evolution_instances')
        .upsert({
          workspace_id: workspaceId,
          instance_name: instanceName,
          connection_status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });

      return NextResponse.json({
        success: true,
        is_connected: true,
        connection_status: 'CONNECTED',
        message: 'Instance is already connected and authenticated.',
      });
    }

    const qrcode = qrRes.data?.qrcode || qrRes.data?.base64 || qrRes.data?.code || null;
    const pairingCode = qrRes.data?.pairingCode || null;

    return NextResponse.json({
      success: qrRes.ok,
      instance_name: instanceName,
      qrcode,
      pairing_code: pairingCode,
      raw: qrRes.data,
      is_connected: false,
      connection_status: connState.state,
    });
  } catch (err: any) {
    console.error('[Evolution QR GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
