import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  getInstanceNameForWorkspace, 
  getEvolutionConfig,
  getEvolutionConnectionState 
} from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/qr
 * Retrieves live base64/code QR for pairing with robust Evolution v2 parser
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const { baseUrl, apiKey, webhookUrl } = getEvolutionConfig();
    const instanceName = getInstanceNameForWorkspace(workspaceId);

    // 1. Check if already connected on Evolution
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
        state: 'open',
        connection_status: 'CONNECTED',
        message: 'Instance is already connected and authenticated.',
      });
    }

    // 2. Fetch live QR from Evolution API
    let qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    // If instance not found or error, auto-create instance first
    if (!qrRes.ok || qrRes.status === 404) {
      console.log(`[Evolution QR] Instance ${instanceName} not found, auto-creating...`);
      await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: apiKey,
          qrcode: true,
          integration: 'WHATSAPP_BAILEYS',
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CHATS_UPSERT',
              'CHATS_SET',
              'CONTACTS_SET',
              'CONTACTS_UPSERT',
              'CONNECTION_UPDATE',
            ],
          },
        }),
      });

      // Retry connect
      qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey },
      });
    }

    const data = await qrRes.json().catch(() => ({}));

    // 3. Robust base64 QR extraction across all Evolution v2 payload formats
    const base64 = 
      data?.base64 || 
      data?.qrcode?.base64 || 
      data?.qrcode || 
      data?.code || 
      null;

    const qrImage = typeof base64 === 'string'
      ? (base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`)
      : null;

    const pairingCode = data?.pairingCode || data?.pairing_code || null;
    const liveState = data?.state || data?.instance?.state || connState.state;
    const isConnected = liveState === 'open' || liveState === 'CONNECTED';

    if (isConnected) {
      await supabaseAdmin
        .from('evolution_instances')
        .upsert({
          workspace_id: workspaceId,
          instance_name: instanceName,
          connection_status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
    }

    return NextResponse.json({
      success: true,
      instance_name: instanceName,
      qrcode: qrImage,
      pairingCode: pairingCode,
      pairing_code: pairingCode,
      state: liveState,
      is_connected: isConnected,
      connection_status: isConnected ? 'CONNECTED' : liveState === 'connecting' ? 'CONNECTING' : 'DISCONNECTED',
      raw: data,
    });
  } catch (err: any) {
    console.error('[Evolution QR GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
