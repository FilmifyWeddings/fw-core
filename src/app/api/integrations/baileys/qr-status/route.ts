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

    let workspaceId: string | null = null;
    if (token) {
      // 1. Fast JWT payload decode
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
          workspaceId = payload.sub ?? payload.user_id ?? null;
        }
      } catch {
        /* ignore parse errors */
      }

      // 2. Fallback to Supabase auth check if fast decode didn't yield sub
      if (!workspaceId) {
        try {
          const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await supabaseClient.auth.getUser(token);
          if (user) workspaceId = user.id;
        } catch {
          /* ignore auth check errors */
        }
      }
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use select('*') to prevent schema mismatch errors if optional columns are missing
    const { data, error } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*')
      .or(`workspace_id.eq.${workspaceId},user_id.eq.${workspaceId}`)
      .maybeSingle();

    if (error || !data) {
      // AUTO-TRIGGER QR GENERATION FOR UNCONNECTED USER
      const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});

      return NextResponse.json({
        workspace_id: workspaceId,
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

    const qrExpired = data.qr_expires_at
      ? new Date(data.qr_expires_at as string) < new Date()
      : false;

    const qrString = isConnected ? null : (qrExpired ? null : ((data.qr_string as string) ?? null));

    // AUTO-TRIGGER QR GENERATION IF UNCONNECTED AND QR IS NULL
    if (!isConnected && !qrString) {
      const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
      fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    }

    return NextResponse.json({
      workspace_id: workspaceId,
      isConnected,
      conn_state: isConnected ? 'open' : rawState,
      status: isConnected ? 'CONNECTED' : (rawStatus || 'DISCONNECTED'),
      qr_string: isConnected ? null : (qrExpired ? null : ((data.qr_string as string) ?? null)),
      qr_expired: isConnected ? false : qrExpired,
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

    let workspaceId: string | null = null;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
          workspaceId = payload.sub ?? payload.user_id ?? null;
        }
      } catch {
        /* ignore */
      }

      if (!workspaceId) {
        try {
          const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await supabaseClient.auth.getUser(token);
          if (user) workspaceId = user.id;
        } catch {
          /* ignore */
        }
      }
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset session to connecting state (QR init SSE will handle the rest)
    await supabaseAdmin
      .from('baileys_sessions')
      .upsert({
        workspace_id: workspaceId,
        conn_state: 'connecting',
        qr_string: null,
        creds_json: null,
        keys_json: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

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
