import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;
export const runtime = 'nodejs';

// GET /api/workflows/[id]/runs — paginated run history
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    const { data: runs, error: runsError, count } = await supabaseAdmin
      .from('workflow_runs')
      .select('*', { count: 'exact' })
      .eq('workflow_id', id)
      .eq('workspace_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

    return NextResponse.json({
      runs: runs || [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[GET /api/workflows/[id]/runs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
