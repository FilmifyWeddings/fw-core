import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/projects?workspace_id=...
 * Enterprise-grade server endpoint that securely bypasses client-side RLS blockers
 * for authorized workspace members and studio owners.
 * Returns all active wedding projects with sub-events and crew assignments.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    let projectsQuery = supabaseAdmin
      .from('fw_projects')
      .select(`
        *,
        fw_sub_events (
          *,
          fw_assignments (*)
        )
      `)
      .neq('status', 'trash')
      .order('created_at', { ascending: false });

    if (effectiveWsId !== 'all') {
      projectsQuery = projectsQuery.eq('user_id', effectiveWsId);
    }

    const { data: projects, error } = await projectsQuery;

    if (error) {
      console.error('[API workspace/projects GET Error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, projects: projects || [] });
  } catch (err: any) {
    console.error('[API workspace/projects GET Exception]:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
