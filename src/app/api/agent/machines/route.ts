import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let query = supabase
      .from('storage_agent_machines')
      .select('*')
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[AgentMachines API] DB Error:', error.message);
      return NextResponse.json({ success: true, machines: [] });
    }

    const now = Date.now();
    const machinesWithStatus = (data || []).map((m: any) => {
      const lastHb = m.last_heartbeat_at ? new Date(m.last_heartbeat_at).getTime() : 0;
      const isOnline = now - lastHb < 3 * 60 * 1000;
      return {
        ...m,
        is_online: isOnline,
      };
    });

    return NextResponse.json({ success: true, machines: machinesWithStatus });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
