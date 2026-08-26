import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveEvolutionConfig, getInstanceNameForWorkspace } from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/config
 * Returns current Evolution Server URL and webhook status for workspace
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const config = await resolveEvolutionConfig(workspaceId);

    return NextResponse.json({
      success: true,
      server_url: config.baseUrl,
      api_key_masked: config.apiKey ? `${config.apiKey.slice(0, 4)}••••${config.apiKey.slice(-4)}` : '',
      webhook_url: config.webhookUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp-beta/config
 * Updates Evolution Server URL and API Key for workspace
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspace_id, server_url, api_key } = body;

    if (!workspace_id) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    const cleanUrl = (server_url || '').trim().replace(/\/+$/, '');
    const cleanKey = (api_key || '').trim();

    const instanceName = getInstanceNameForWorkspace(workspace_id);

    // 1. Save in evolution_instances
    await supabaseAdmin
      .from('evolution_instances')
      .upsert({
        workspace_id,
        instance_name: instanceName,
        api_key: cleanKey || null,
        raw_payload: { server_url: cleanUrl },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    // 2. Save in integration_credentials
    await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        user_id: workspace_id,
        provider: 'evolution_whatsapp',
        access_token: cleanKey || null,
        config: { server_url: cleanUrl },
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, provider' });

    return NextResponse.json({
      success: true,
      message: 'Evolution API server configuration saved successfully.',
      server_url: cleanUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
