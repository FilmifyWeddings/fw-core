import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleFetchGroups(req);
}

export async function POST(req: NextRequest) {
  return handleFetchGroups(req);
}

async function handleFetchGroups(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let workspaceId = searchParams.get('workspace_id') || searchParams.get('tenant_id') || '';

    if (req.method === 'POST') {
      try {
        const body = await req.json().catch(() => ({}));
        if (body?.workspace_id) workspaceId = body.workspace_id;
        if (body?.tenant_id) workspaceId = body.tenant_id;
      } catch {}
    }

    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    let workerGroups: any[] = [];

    // 1. Fetch live groups directly from Baileys socket worker
    try {
      const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/fetch-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
        signal: AbortSignal.timeout(8_000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.groups)) {
          workerGroups = data.groups;
        }
      }
    } catch (sockErr: any) {
      console.warn('[baileys/fetch-groups] Live worker call warning:', sockErr?.message);
    }

    // 2. Query groups from PostgreSQL using supabaseAdmin (bypasses RLS)
    let dbGroupsQuery = supabaseAdmin
      .from('baileys_chats')
      .select('jid, display_name, participant_count, is_group, workspace_id')
      .eq('is_group', true);

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      dbGroupsQuery = dbGroupsQuery.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
    }

    const { data: dbGroups } = await dbGroupsQuery.order('display_name', { ascending: true });

    // 3. Merge groups without duplicates (keyed by jid)
    const groupsMap = new Map<string, any>();

    for (const g of (dbGroups || [])) {
      if (g.jid && (g.jid.endsWith('@g.us') || g.is_group)) {
        groupsMap.set(g.jid, {
          jid: g.jid,
          display_name: g.display_name || g.jid.split('@')[0],
          participant_count: g.participant_count ?? 0,
          is_group: true,
        });
      }
    }

    for (const g of workerGroups) {
      if (g.jid && (g.jid.endsWith('@g.us') || g.is_group)) {
        groupsMap.set(g.jid, {
          jid: g.jid,
          display_name: g.display_name || g.jid.split('@')[0],
          participant_count: g.participant_count ?? (groupsMap.get(g.jid)?.participant_count ?? 0),
          is_group: true,
        });
      }
    }

    const combinedGroups = Array.from(groupsMap.values()).sort((a, b) =>
      (a.display_name || '').localeCompare(b.display_name || '')
    );

    return NextResponse.json({
      success: true,
      groups: combinedGroups,
      count: combinedGroups.length,
    });
  } catch (err: any) {
    console.error('[baileys/fetch-groups] Route error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching WhatsApp groups' },
      { status: 500 }
    );
  }
}
