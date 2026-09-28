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
    const targetWsId = req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('workspaceId') || userId;

    // Use select('*') with precise workspace_id OR user_id matching
    const { data, error } = await supabaseAdmin
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
        { signal: AbortSignal.timeout(1200) }
      );
      if (healthRes.ok) {
        const health = await healthRes.json();
        workerChecked = true;
        if (health.socket_authenticated && health.socket_conn_state === 'open' && health.phone_number) {
          workerConnected = true;
          workerPhone = health.phone_number;
        }
      }
    } catch {
      workerChecked = false;
    }

    if (error || !data) {
      // AUTO-TRIGGER QR GENERATION FOR UNCONNECTED WORKSPACE
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(targetWsId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});

      return NextResponse.json({
        workspace_id: targetWsId,
        isConnected: false,
        conn_state: 'disconnected',
        status: 'DISCONNECTED',
        qr_string: null,
        phone_number: null,
        last_connected: null,
      }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
      });
    }

    let isConnected = false;
    let phoneNumber: string | null = null;
    let lastConnected: string | null = null;
    let qrString: string | null = (data.qr_string as string) ?? null;

    if (workerChecked) {
      if (workerConnected && workerPhone) {
        isConnected = true;
        phoneNumber = workerPhone;
        lastConnected = data.last_connected ?? new Date().toISOString();
        qrString = null;
      } else {
        // Worker is online, but NO open authenticated socket exists for this workspace!
        isConnected = false;
        phoneNumber = null;

        // Auto-heal DB: if DB still falsely says open or retains a stale phone number, wipe it cleanly
        if (data.conn_state === 'open' || data.phone_number || data.status !== 'disconnected') {
          await supabaseAdmin
            .from('baileys_sessions')
            .update({
              conn_state: qrString ? 'connecting' : 'disconnected',
              status: 'disconnected',
              phone_number: null,
              updated_at: new Date().toISOString(),
            })
            .or(`user_id.eq.${targetWsId},workspace_id.eq.${targetWsId}`);
        }
      }
    } else {
      // Worker unreachable: strictly validate database row
      const rawState = (data.conn_state as string) ?? 'disconnected';
      const rawStatus = ((data.status as string) ?? '').toLowerCase();
      const hasQr = !!data.qr_string;
      isConnected = rawState === 'open' && rawStatus !== 'disconnected' && !hasQr && !!(data.phone_number && data.phone_number.trim().length > 5);
      if (isConnected) {
        phoneNumber = (data.phone_number as string) || null;
        lastConnected = data.last_connected ?? null;
        qrString = null;
      } else {
        phoneNumber = null;
      }
    }

    // AUTO-TRIGGER QR GENERATION IF UNCONNECTED AND QR IS NULL
    if (!isConnected && !qrString) {
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(targetWsId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
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
