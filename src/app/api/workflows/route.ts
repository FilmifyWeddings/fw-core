import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;
export const runtime = 'nodejs';

// GET  /api/workflows       → list all workflows for user
// POST /api/workflows       → create new workflow
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await supabaseUser.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error: dbErr } = await supabaseAdmin
      .from('custom_workflows')
      .select('id, name, description, is_enabled, trigger_type, run_count, last_run_at, last_run_status, created_at, updated_at')
      .eq('workspace_id', user.id)
      .order('created_at', { ascending: false });

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ workflows: data || [] });
  } catch (err: any) {
    console.error('[GET /api/workflows]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await supabaseUser.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, description, trigger_type, trigger_config, steps, is_enabled } = body;

    if (!name) return NextResponse.json({ error: 'Missing: name' }, { status: 400 });

    const { data, error: dbErr } = await supabaseAdmin
      .from('custom_workflows')
      .insert({
        workspace_id: user.id,
        name,
        description: description || null,
        trigger_type: trigger_type || 'manual',
        trigger_config: trigger_config || {},
        steps: steps || [],
        is_enabled: is_enabled !== false,
      })
      .select()
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ workflow: data }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/workflows]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
