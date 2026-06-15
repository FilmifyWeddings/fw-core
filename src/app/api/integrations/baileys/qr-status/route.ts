/**
 * GET /api/integrations/baileys/qr-status
 * Pure DB read — returns current QR string and conn_state from baileys_sessions.
 * UI polls this every 3s as fallback alongside SSE stream.
 *
 * POST /api/integrations/baileys/qr-status
 * Direct serverless QR initialization — no worker needed.
 * Inserts a DB row to kick off the session process.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('baileys_sessions')
      .select('conn_state, qr_string, qr_expires_at, phone_number, last_connected')
      .eq('workspace_id', user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      return NextResponse.json({
        conn_state: 'disconnected',
        qr_string: null,
        phone_number: null,
        last_connected: null,
      });
    }

    const qrExpired = data.qr_expires_at
      ? new Date(data.qr_expires_at) < new Date()
      : true;

    return NextResponse.json({
      conn_state: data.conn_state,
      qr_string: qrExpired ? null : data.qr_string,
      qr_expired: qrExpired,
      phone_number: data.phone_number,
      last_connected: data.last_connected,
    });
  } catch (err) {
    console.error('[qr-status GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset session to connecting state (QR init SSE will handle the rest)
    await supabaseAdmin
      .from('baileys_sessions')
      .upsert({
        workspace_id: user.id,
        conn_state: 'connecting',
        qr_string: null,
        creds_json: null,
        keys_json: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    return NextResponse.json({
      success: true,
      message: 'Session reset. Connect via SSE at /api/integrations/baileys/qr-init',
    });
  } catch (err) {
    console.error('[qr-status POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
