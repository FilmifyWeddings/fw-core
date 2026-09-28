/**
 * GET /api/integrations/baileys/qr-status
 * Pure DB read — returns current QR string and conn_state from baileys_sessions.
 * UI polls this every 2.5s as fallback alongside SSE stream.
 *
 * POST /api/integrations/baileys/qr-status
 * Direct serverless QR initialization — no worker needed.
 * Inserts a DB row to kick off the session process.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    let targetWsId = req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('workspaceId') || userId;
    if (targetWsId === 'all' || !targetWsId.trim()) {
      targetWsId = userId;
    }

    // STRICT MULTI-USER ISOLATION: Validate that requesting user has access to targetWsId
    if (targetWsId !== userId) {
      const { data: wsOwner } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('id', targetWsId)
        .eq('owner_id', userId)
        .maybeSingle();

      if (!wsOwner) {
        const { data: wsMember } = await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', targetWsId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!wsMember) {
          // Fallback strictly to user's own userId so they never see another tenant's session!
          targetWsId = userId;
        }
      }
    }

    // Read session strictly scoped to targetWsId
    const { data } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*')
      .or(`user_id.eq.${targetWsId},workspace_id.eq.${targetWsId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    let workerChecked = false;
    let workerConnected = false;
    let workerPhone: string | null = null;

    try {
      const healthRes = await fetch(
        `http://127.0.0.1:${WORKER_PORT}/health?workspace_id=${encodeURIComponent(targetWsId)}`,
        { signal: AbortSignal.timeout(1500) }
      );
      if (healthRes.ok) {
        const health = await healthRes.json();
        workerChecked = true;
        if ((health.socket_authenticated || health.socket_conn_state === 'open') && health.phone_number) {
          workerConnected = true;
          workerPhone = health.phone_number;
        }
      }
    } catch {
      workerChecked = false;
    }

    let isConnected = false;
    let phoneNumber: string | null = null;
    let lastConnected: string | null = null;
    let qrString: string | null = (data?.qr_string as string) ?? null;

    if (workerChecked && workerConnected && workerPhone) {
      isConnected = true;
      phoneNumber = workerPhone;
      lastConnected = data?.last_connected ?? new Date().toISOString();
      qrString = null;

      // Ensure DB reflects connected state so page refresh and DB views stay 100% in sync
      if (data?.conn_state !== 'open' || !data?.phone_number) {
        await supabaseAdmin
          .from('baileys_sessions')
          .update({
            conn_state: 'open',
            status: 'open',
            phone_number: workerPhone,
            qr_string: null,
            last_connected: lastConnected,
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.eq.${targetWsId},workspace_id.eq.${targetWsId}`);
      }
    } else {
      // Validate database row: If DB has conn_state === 'open' and a valid phone_number,
      // session is considered connected and must NEVER be wiped out by passive status polling!
      const dbHasPhone = !!(data?.phone_number && String(data.phone_number).trim().length > 5);
      const dbIsOpen = data?.conn_state === 'open' && dbHasPhone;

      if (dbIsOpen) {
        isConnected = true;
        phoneNumber = String(data.phone_number);
        lastConnected = data?.last_connected ?? null;
        qrString = null;
      } else {
        isConnected = false;
        phoneNumber = null;
      }
    }

    return NextResponse.json({
      workspace_id: targetWsId,
      isConnected,
      connected: isConnected,
      conn_state: isConnected ? 'open' : (qrString ? 'connecting' : 'disconnected'),
      status: isConnected ? 'open' : (qrString ? 'connecting' : 'disconnected'),
      statusUpper: isConnected ? 'CONNECTED' : 'DISCONNECTED',
      qr: qrString,
      qr_string: qrString,
      qr_expired: false,
      phone_number: phoneNumber,
      last_connected: lastConnected,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (err) {
    console.error('[qr-status GET Exception]:', err);
    return NextResponse.json({
      isConnected: false,
      connected: false,
      conn_state: 'disconnected',
      status: 'disconnected',
      statusUpper: 'DISCONNECTED',
      qr: null,
      qr_string: null,
      phone_number: null,
      last_connected: null,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const targetWsId = req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('workspaceId') || userId;

    // Reset session in DB cleanly
    await supabaseAdmin
      .from('baileys_sessions')
      .update({
        conn_state: 'connecting',
        status: 'disconnected',
        phone_number: null,
        qr_string: null,
        qr_expires_at: null,
        creds_json: null,
        keys_json: null,
        updated_at: new Date().toISOString(),
      })
      .or(`user_id.eq.${targetWsId},workspace_id.eq.${targetWsId}`);

    // Trigger fresh QR in worker
    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(targetWsId)}&force=true`, {
      method: 'POST',
      signal: AbortSignal.timeout(1500),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Session reset. Connect via SSE at /api/integrations/baileys/qr-init',
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (err) {
    console.error('[qr-status POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
