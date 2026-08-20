import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

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

    let workspaceId = '';
    if (token) {
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) workspaceId = user.id;
    }

    // Fallback workspace resolution from body or query params
    const searchParams = req.nextUrl.searchParams;
    const qsWs = searchParams.get('workspace_id') || searchParams.get('tenant_id');
    if (qsWs) workspaceId = qsWs;

    try {
      const body = await req.json().catch(() => ({}));
      if (body?.workspace_id) workspaceId = body.workspace_id;
      if (body?.tenant_id) workspaceId = body.tenant_id;
    } catch {}

    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';

    const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/fetch-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      // Fallback: Check cached groups in DB
      const { data: dbGroups } = await supabaseAdmin
        .from('baileys_chats')
        .select('jid, display_name, participant_count, is_group')
        .eq('is_group', true)
        .order('display_name', { ascending: true });

      if (dbGroups && dbGroups.length > 0) {
        return NextResponse.json({ success: true, groups: dbGroups, cached: true });
      }

      return NextResponse.json(
        { success: false, error: data.error || `Worker returned HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[baileys/fetch-groups] Error:', err);

    // Fallback: Check cached groups in DB
    try {
      const { data: dbGroups } = await supabaseAdmin
        .from('baileys_chats')
        .select('jid, display_name, participant_count, is_group')
        .eq('is_group', true)
        .order('display_name', { ascending: true });

      if (dbGroups && dbGroups.length > 0) {
        return NextResponse.json({ success: true, groups: dbGroups, cached: true });
      }
    } catch (_) {}

    return NextResponse.json(
      { success: false, error: err.message || 'Could not reach Baileys worker' },
      { status: 502 }
    );
  }
}
