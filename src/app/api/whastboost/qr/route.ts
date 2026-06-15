import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch workspace credentials
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('whastboost_api_url, whastboost_token, whastboost_status, whastboost_device_id, workspace_name')
      .eq('id', workspaceId)
      .single();

    if (profileErr || !profile) {
      // Create user profile row dynamically if missing (Self-healing database profiles)
      await supabaseAdmin.from('profiles').insert({
        id: workspaceId,
        workspace_name: 'My Studio Workspace',
        whastboost_status: 'disconnected',
      });
    }

    const api_url = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';
    const app_key = process.env.WHASTBOOST_APP_KEY;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY;

    const isLive = !!(app_key && auth_key);

    if (!isLive) {
      // Mock fallback if no environment keys exist
      const mockQrBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAADIEAMAAAB9yNa2AAAAMFBMVEUAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD79f7gAAAAD3RSTlMAECEiM0RVZnd8j5+vv8/f78/x3wAAAS9JREFUeNrtl1EKwjAMho+tF/AEegI9gd5/C5egG8ig4hC8gZ5AT6An0Hs6yBDKqDNuK/uS/xPykR+SpGmaLFiwYMGCTcQ+6lWf+97262n4lWl/rP1Z6vj9dKj2h3N/Nvdn+eG1eC1ai9aCBQsWLFiwYMGCDRHr1d5q49m969V799p49l7to9q/1eH9RGs51ZpPNV7lW/FvWqjWcb1asGDBggULFixYsCBircY+6+h9NfbVGL2vxj7rr41+f6K11FpeaznVWk41XuVbsUetQ7VgwYIFCxYsWLBggbWqPWrH51GvWse/Nl91qFYLFixYsGDBggULFixYsOB/WLXoH5qvOmSrBQsWLFiwYMGCOyIWLFix4D/i5uI/71Y8K/ZkixYsWLBgwYL/gVixWLBgwX/EbFosWLBgwa7sB9o4G9bT+mU5AAAAAElFTkSuQmCC';
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({
        success: true,
        qr: `data:image/png;base64,${mockQrBase64}`,
        status: 'disconnected',
        message: 'Mock QR loaded (WhatsBoost keys missing in .env.local).',
      });
    }

    let deviceId = profile?.whastboost_device_id;

    // Fetch list of devices from WhatsBoost to verify if the stored deviceId exists, or if we need to resolve it
    const devicesUrl = `${api_url}/devices?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
    const devicesRes = await fetch(devicesUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': auth_key,
        'appkey': app_key
      }
    });

    if (!devicesRes.ok) {
      throw new Error(`WhatsBoost Devices API returned status: ${devicesRes.status}`);
    }

    const devicesData = await devicesRes.json();
    const existingDevices = devicesData.results || [];

    let userDevice = null;
    if (deviceId) {
      userDevice = existingDevices.find((d: any) => d._id === deviceId || d.id === deviceId);
    }

    if (!deviceId || !userDevice) {
      const cleanWorkspaceName = (profile?.workspace_name || 'Studio').trim().replace(/[^a-zA-Z0-9]/g, '_');

      // Check if device with expected name or legacy prefix exists on WhatsBoost
      const matchedDevice = existingDevices.find((d: any) => 
        d.name && (
          d.name.toLowerCase() === cleanWorkspaceName.toLowerCase() || 
          d.name.toLowerCase().startsWith(`fw_${cleanWorkspaceName.toLowerCase()}`)
        )
      );

      if (matchedDevice) {
        deviceId = matchedDevice._id || matchedDevice.id;
        userDevice = matchedDevice;
        console.log(`Found existing device matching expected name or legacy prefix (ID: ${deviceId})`);
      } else {
        // Create the new device with clean workspace name
        console.log(`Creating new WhatsBoost device: ${cleanWorkspaceName}`);
        const createDeviceUrl = `${api_url}/devices?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
        const createRes = await fetch(createDeviceUrl, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'x-api-key': auth_key,
            'appkey': app_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cleanWorkspaceName,
            device_type: 'whatsapp-baileys',
          }),
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          let userFriendlyMsg = `Failed to link WhatsApp device: ${createRes.status}`;
          try {
            const errObj = JSON.parse(errText);
            if (errObj.message && (errObj.message.includes('plan allows') || errObj.message.includes('limit') || errObj.message.includes('Upgrade'))) {
              userFriendlyMsg = 'WhatsApp connection slots are currently full. Please contact support to upgrade your limits, or logout from an existing device.';
            } else {
              userFriendlyMsg = errObj.message || userFriendlyMsg;
            }
          } catch (e) {
            if (errText.includes('plan allows') || errText.includes('quota') || errText.includes('limit')) {
              userFriendlyMsg = 'WhatsApp connection slots are currently full. Please contact support to upgrade your limits, or logout from an existing device.';
            }
          }
          throw new Error(userFriendlyMsg);
        }

        const newDeviceData = await createRes.json();
        // Support nested device object, results object, or root level properties
        deviceId = newDeviceData.device?.id || newDeviceData.device?._id || newDeviceData.results?.id || newDeviceData.results?._id || newDeviceData.id || newDeviceData._id;

        if (!deviceId) {
          throw new Error('WhatsBoost device ID not resolved from create response.');
        }

        userDevice = newDeviceData.device || newDeviceData.results || newDeviceData;
      }

      // Save resolved device ID back to profile table
      await supabaseAdmin
        .from('profiles')
        .update({ whastboost_device_id: deviceId, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'whatsapp_gateway_status',
        message: `Linked WhatsBoost WhatsApp instance: "${cleanWorkspaceName}"`,
        metadata: { deviceId },
      });
    }

    // Now we have both deviceId and userDevice resolved and verified
    // 4. If already connected, return success without QR
    if (userDevice.status === 'connected') {
      await supabaseAdmin
        .from('profiles')
        .update({ whastboost_status: 'connected', updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

      return NextResponse.json({
        success: true,
        qr: '',
        status: 'connected',
        phone: userDevice.phone,
        name: userDevice.display_name,
      });
    }

    // 5. If disconnected/connecting, stream QR code for this specific device
    const qrUrl = `${api_url}/devices/${deviceId}/whatsboost/qr?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
    const qrRes = await fetch(qrUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': auth_key,
        'appkey': app_key
      }
    });

    if (!qrRes.ok) {
      throw new Error(`WhatsBoost QR API returned status: ${qrRes.status}`);
    }

    const qrData = await qrRes.json();
    return NextResponse.json({
      success: true,
      qr: qrData.qr || '',
      status: qrData.connected ? 'connected' : 'disconnected',
    });

  } catch (err: any) {
    console.error('WhatsBoost QR Ingestion error:', err);
    return NextResponse.json({
      success: false,
      message: err.message || 'Failed to sync live QR code from WhatsBoost.',
    }, { status: 500 });
  }
}
