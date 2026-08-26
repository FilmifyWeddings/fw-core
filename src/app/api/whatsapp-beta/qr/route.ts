import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const EVO_URL = (
  process.env.EVOLUTION_API_URL ||
  process.env.EVOLUTION_BASE_URL ||
  'http://127.0.0.1:8085'
).replace(/\/+$/, '');

const EVO_KEY = (
  process.env.EVOLUTION_API_KEY ||
  process.env.EVOLUTION_GLOBAL_API_KEY ||
  'studiocore_evo_secret_2026'
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const instanceName = `ws_${workspaceId.replace(/-/g, '_')}`;

    // 1. Check/Fetch QR from Evolution API
    let qrResponse: Response | null = null;
    try {
      qrResponse = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVO_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
    } catch (fetchErr: any) {
      console.warn('[Evolution Connect Fetch Warning]:', fetchErr.message);
    }

    // 2. If instance doesn't exist yet (404/400 or fetch failed), automatically create it
    if (!qrResponse || !qrResponse.ok) {
      try {
        await fetch(`${EVO_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': EVO_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName: instanceName,
            token: EVO_KEY,
            qrcode: true,
            integration: 'WHATSAPP_BAILEYS',
          }),
          cache: 'no-store',
        });
      } catch (createErr: any) {
        console.warn('[Evolution Create Instance Warning]:', createErr.message);
      }

      // Wait a moment and retry connect
      await new Promise(r => setTimeout(r, 1200));

      try {
        qrResponse = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVO_KEY,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
      } catch (retryErr: any) {
        console.warn('[Evolution Connect Retry Warning]:', retryErr.message);
      }
    }

    const data: any = qrResponse ? await qrResponse.json().catch(() => ({})) : {};

    // 3. Extract Base64 QR Image across all Evolution response variations
    let qrRaw = data?.base64 || data?.qrcode?.base64 || data?.qrcode || data?.code || data?.pairingCode || null;
    let qrImage: string | null = null;

    if (qrRaw && typeof qrRaw === 'string') {
      qrImage = qrRaw.startsWith('data:image') ? qrRaw : `data:image/png;base64,${qrRaw}`;
    }

    const liveState = data?.state || data?.instance?.state || (data?.status === 200 ? 'CONNECTING' : 'CONNECTING');
    const isConnected = liveState === 'open' || liveState === 'CONNECTED';

    // Update DB record if connected
    if (isConnected) {
      supabaseAdmin
        .from('evolution_instances')
        .upsert({
          workspace_id: workspaceId,
          instance_name: instanceName,
          connection_status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' })
        .then(() => {});
    }

    return NextResponse.json({
      success: true,
      instance_name: instanceName,
      qrcode: qrImage,
      pairingCode: data?.pairingCode || null,
      pairing_code: data?.pairingCode || null,
      state: isConnected ? 'CONNECTED' : liveState,
      is_connected: isConnected,
      raw: data,
    });

  } catch (error: any) {
    console.error('QR Generation Catch Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to generate QR code',
      state: 'ERROR',
    }, { status: 200 }); // Return 200 with error payload to prevent frontend crash
  }
}
