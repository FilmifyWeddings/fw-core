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

    const instanceName = `ws_${workspaceId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 1. Ensure Instance Exists (Auto-provision)
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
          integration: 'WHATSAPP-BAILEYS',
        }),
        cache: 'no-store',
      });
    } catch (createErr: any) {
      console.warn('[Evolution Create Warning]:', createErr.message);
    }

    // 2. Fetch Active Connection / QR State
    let connectRes: Response | null = null;
    try {
      connectRes = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': EVO_KEY },
        cache: 'no-store',
      });
    } catch (connectErr: any) {
      console.warn('[Evolution Connect Warning]:', connectErr.message);
    }

    const data: any = connectRes ? await connectRes.json().catch(() => ({})) : {};
    console.log(`[Evo QR Engine Response for ${instanceName}]:`, JSON.stringify(data));

    // Deep search for base64 or raw code across all response structures
    let base64 = data?.base64 || 
                 data?.qrcode?.base64 || 
                 data?.code || 
                 data?.qrcode?.code || 
                 data?.qrcode || 
                 null;

    let finalQrImage: string | null = null;
    let rawCodeString: string | null = null;

    if (base64 && typeof base64 === 'string') {
      if (base64.startsWith('data:image')) {
        finalQrImage = base64;
      } else if (base64.length > 500) {
        // Raw base64 PNG data
        finalQrImage = `data:image/png;base64,${base64}`;
      } else {
        // Raw QR text string (e.g. 2@xyz...)
        rawCodeString = base64;
        finalQrImage = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(base64)}&bgcolor=ffffff&color=111b21&qzone=2&format=png`;
      }
    }

    const connectionState = data?.state || data?.status || (data?.instance?.state) || 'CONNECTING';
    const isConnected = connectionState === 'open' || connectionState === 'CONNECTED';

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
      instanceName,
      instance_name: instanceName,
      qrcode: finalQrImage,
      pairingCode: data?.pairingCode || data?.pairing_code || null,
      pairing_code: data?.pairingCode || data?.pairing_code || null,
      rawCode: rawCodeString || (typeof base64 === 'string' && !base64.startsWith('data:') ? base64 : null),
      state: isConnected ? 'CONNECTED' : connectionState,
      is_connected: isConnected,
      connection_status: isConnected ? 'CONNECTED' : connectionState,
    });

  } catch (err: any) {
    console.error('QR Route Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Failed to generate QR code', 
      state: 'ERROR' 
    }, { status: 200 });
  }
}
