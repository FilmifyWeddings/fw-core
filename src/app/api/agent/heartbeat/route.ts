import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_token, machine_name, machine_os, active_drives } = body;

    if (!agent_token) {
      return NextResponse.json({ success: false, error: 'agent_token is required' }, { status: 400 });
    }

    const { data: machine } = await supabase
      .from('storage_agent_machines')
      .select('id, workspace_id')
      .eq('agent_token', agent_token)
      .single();

    if (!machine) {
      await supabase
        .from('storage_agent_machines')
        .insert([{
          workspace_id: '00000000-0000-0000-0000-000000000000',
          machine_name: machine_name || 'Studio PC',
          machine_os: machine_os || 'Windows',
          agent_token,
          is_online: true,
          active_drives_json: active_drives || [],
          last_heartbeat_at: new Date().toISOString(),
        }]);
    } else {
      await supabase
        .from('storage_agent_machines')
        .update({
          is_online: true,
          active_drives_json: active_drives || [],
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', machine.id);
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
