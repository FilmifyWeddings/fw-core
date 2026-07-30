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

    // Use select('*') with strict eq('user_id', userId)
    const { data, error } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // AUTO-TRIGGER QR GENERATION FOR UNCONNECTED USER
      const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});

      return NextResponse.json({
        workspace_id: userId,
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

    // Normalize: treat open / CONNECTED / open status as connected
    const rawState = (data.conn_state as string) ?? 'disconnected';
    const rawStatus = (data.status as string) ?? '';
    const hasPhone = !!(data.phone_number && (data.phone_number as string).length > 5);
    const isConnected = (rawState === 'open' || rawStatus === 'CONNECTED' || rawStatus === 'open') && hasPhone;

    const qrString = isConnected ? null : ((data.qr_string as string) ?? null);

    // AUTO-TRIGGER QR GENERATION IF UNCONNECTED AND QR IS NULL
    if (!isConnected && !qrString) {
      const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    }

    return NextResponse.json({
      workspace_id: userId,
      isConnected,
      conn_state: isConnected ? 'open' : rawState,
      status: isConnected ? 'CONNECTED' : (rawStatus || 'DISCONNECTED'),
      qr_string: qrString,
      qr_expired: false,
      phone_number: (data.phone_number as string) || null,
      last_connected: data.last_connected ?? null,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (err) {
    console.error('[qr-status GET Exception]:', err);
    return NextResponse.json({
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

    // Reset session to connecting state (QR init SSE will handle the rest)
    await supabaseAdmin
      .from('baileys_sessions')
      .upsert({
        user_id: userId,
        workspace_id: userId,
        conn_state: 'connecting',
        qr_string: null,
        creds_json: null,
        keys_json: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

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
