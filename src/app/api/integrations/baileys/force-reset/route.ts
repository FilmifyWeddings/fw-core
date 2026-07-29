import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

    // 1. Always wipe database session state directly in Supabase Postgres
    await supabaseAdmin
      .from('baileys_sessions')
      .upsert({
        workspace_id: workspaceId,
        conn_state: 'connecting',
        qr_string: null,
        qr_expires_at: null,
        phone_number: null,
        creds_json: null,
        keys_json: null,
        error_info: 'Force reset — fresh session initialized',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    // 2. Best-effort notification to external worker if running
    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    try {
      await fetch(`http://127.0.0.1:${WORKER_PORT}/force-reset?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    } catch {
      /* worker optional */
    }

    return NextResponse.json({
      success: true,
      message: 'Hard reset complete. Session wiped cleanly.',
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (err: any) {
    console.error('[force-reset POST error]', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
