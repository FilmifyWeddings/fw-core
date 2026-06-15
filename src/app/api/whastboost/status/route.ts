import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('whastboost_status, whastboost_device_id')
      .eq('id', workspaceId)
      .single();

    const currentStatus = profile?.whastboost_status || 'disconnected';
    const deviceId = profile?.whastboost_device_id;

    const api_url = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';
    const app_key = process.env.WHASTBOOST_APP_KEY;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY;

    const isLive = !!(app_key && auth_key);

    if (!isLive) {
      return NextResponse.json({
        success: true,
        status: currentStatus,
      });
    }

    if (!deviceId) {
      // No device created yet
      return NextResponse.json({
        success: true,
        status: 'disconnected',
      });
    }

    // Call WhatsBoost API to fetch status of this specific device
    const devicesUrl = `${api_url}/devices?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
    const response = await fetch(devicesUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': auth_key,
        'appkey': app_key
      }
    });

    if (!response.ok) {
      throw new Error(`WhatsBoost status check returned status: ${response.status}`);
    }

    const data = await response.json();
    const userDevice = data.results?.find((d: any) => d._id === deviceId || d.id === deviceId);
    const newStatus = userDevice?.status === 'connected' ? 'connected' : 'disconnected';

    // Update database status if changed
    if (newStatus !== currentStatus) {
      await supabaseAdmin
        .from('profiles')
        .update({ whastboost_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'whatsapp_gateway_status',
        message: `WhatsApp Gateway status changed to: ${newStatus}.`,
        metadata: { status: newStatus, phone: userDevice?.phone || '' },
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      phone: userDevice?.phone || '',
      name: userDevice?.display_name || '',
    });
  } catch (err: any) {
    console.error('WhatsBoost status check error:', err);
    return NextResponse.json({
      success: false,
      status: 'disconnected',
      message: err.message || 'Status check failed.',
    });
  }
}

/**
 * POST handler allows disconnecting session / logging out device session
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const action = searchParams.get('action'); // 'connect' or 'disconnect' (logout)

  if (!workspaceId || !action) {
    return NextResponse.json({ error: 'Missing workspace_id or action parameter' }, { status: 400 });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('whastboost_device_id, workspace_name')
      .eq('id', workspaceId)
      .single();

    const deviceId = profile?.whastboost_device_id;

    const api_url = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';
    const app_key = process.env.WHASTBOOST_APP_KEY;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY;

    const isLive = !!(app_key && auth_key);

    if (!isLive) {
      const newStatus = action === 'connect' ? 'connected' : 'disconnected';
      await supabaseAdmin
        .from('profiles')
        .update({ whastboost_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);

      return NextResponse.json({ success: true, status: newStatus });
    }

    if (action === 'disconnect') {
      // List all existing devices on WhatsBoost first to make sure we delete by name if ID is missing in DB
      const listUrl = `${api_url}/devices?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
      const listRes = await fetch(listUrl, {
        headers: {
          'accept': 'application/json',
          'x-api-key': auth_key,
          'appkey': app_key
        }
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const existingDevices = listData.results || [];
        const cleanWorkspaceName = (profile?.workspace_name || 'Studio').trim().replace(/[^a-zA-Z0-9]/g, '_');
        
        // Find ALL matching devices on WhatsBoost case-insensitively
        const matchedDevices = existingDevices.filter((d: any) => 
          (deviceId && (d._id === deviceId || d.id === deviceId)) ||
          (d.name && (
            d.name.toLowerCase() === cleanWorkspaceName.toLowerCase() ||
            d.name.toLowerCase().startsWith(`fw_${cleanWorkspaceName.toLowerCase()}`)
          ))
        );

        console.log(`Found ${matchedDevices.length} matching devices to delete for workspace "${cleanWorkspaceName}".`);

        for (const device of matchedDevices) {
          const targetDeviceId = device._id || device.id;
          if (targetDeviceId) {
            console.log(`Deleting device ${targetDeviceId} (${device.name}) from WhatsBoost...`);
            const deleteUrl = `${api_url}/devices/${targetDeviceId}?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
            const deleteRes = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'accept': 'application/json',
                'x-api-key': auth_key,
                'appkey': app_key
              }
            });

            if (!deleteRes.ok) {
              console.error(`Failed to delete WhatsBoost device ${targetDeviceId}: ${deleteRes.status}`);
            } else {
              console.log(`Successfully deleted device ${targetDeviceId} on WhatsBoost.`);
            }
          }
        }
      }
    }

    // Update DB status to disconnected and device ID to null
    await supabaseAdmin
      .from('profiles')
      .update({ 
        whastboost_status: 'disconnected', 
        whastboost_device_id: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', workspaceId);

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'whatsapp_gateway_status',
      message: 'WhatsApp Gateway session logged out and device deleted successfully.',
      metadata: { status: 'disconnected', deviceId },
    });

    return NextResponse.json({
      success: true,
      status: 'disconnected',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
