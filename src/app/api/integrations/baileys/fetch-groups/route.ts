import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/integrations/baileys/fetch-groups
 * Proxies the request to the standalone baileys-worker /fetch-groups endpoint.
 * The worker must be running on the same VPS as this Next.js instance.
 *
 * This replaces the legacy pattern of the browser calling localhost:3002 directly,
 * which fails in production because the frontend is on Vercel (different origin).
 */
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

    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';

    const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/fetch-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || `Worker returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[baileys/fetch-groups] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Could not reach Baileys worker' },
      { status: 502 }
    );
  }
}
