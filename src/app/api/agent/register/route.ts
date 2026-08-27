import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, machine_name, machine_os } = body;

    if (!workspace_id || !machine_name) {
      return NextResponse.json({ success: false, error: 'workspace_id and machine_name required' }, { status: 400 });
    }

    const agentToken = `agt_${crypto.randomBytes(18).toString('hex')}`;

    const { data, error } = await supabase
      .from('storage_agent_machines')
      .insert([{
        workspace_id,
        machine_name,
        machine_os: machine_os || 'Windows',
        agent_token: agentToken,
        is_online: true,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      machine: data,
      agent_token: agentToken,
      install_command: `irm https://studiocore.in/agents/install.ps1 | iex -args "${agentToken}"`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
