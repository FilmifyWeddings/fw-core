import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let query = supabase
      .from('storage_physical_disks')
      .select(`
        *,
        storage_agent_machines (
          id, machine_name, is_online, last_heartbeat_at
        )
      `)
      .order('last_scanned_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[PhysicalList API] DB Error:', error.message);
      return NextResponse.json({ success: true, disks: [] });
    }

    return NextResponse.json({ success: true, disks: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
