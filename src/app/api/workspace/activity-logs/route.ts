import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { logWorkspaceActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const wsId = req.nextUrl.searchParams.get('workspace_id');
    const moduleFilter = req.nextUrl.searchParams.get('module');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

    if (!token || !wsId) {
      return NextResponse.json({ error: 'Missing token or workspace_id' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Try fetching from workspace_activity_logs table
    try {
      let query = supabaseAdmin
        .from('workspace_activity_logs')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (moduleFilter && moduleFilter !== 'ALL') {
        query = query.eq('module', moduleFilter);
      }

      const { data: logs, error: logErr } = await query;
      if (!logErr && logs && logs.length > 0) {
        return NextResponse.json({ success: true, logs });
      }
    } catch (_) {}

    // 2. Fallback to workspace_settings config
    try {
      const { data: wsSetting } = await supabaseAdmin
        .from('workspace_settings')
        .select('config')
        .eq('workspace_id', wsId)
        .maybeSingle();

      let logs = Array.isArray(wsSetting?.config?.recent_activity_logs)
        ? wsSetting.config.recent_activity_logs
        : [];

      if (moduleFilter && moduleFilter !== 'ALL') {
        logs = logs.filter((l: any) => l.module === moduleFilter);
      }

      return NextResponse.json({ success: true, logs: logs.slice(0, limit) });
    } catch (_) {}

    return NextResponse.json({ success: true, logs: [] });
  } catch (err: any) {
    console.error('[ActivityLogs GET Error]:', err);
    return NextResponse.json({ success: true, logs: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const body = await req.json().catch(() => ({}));

    const {
      workspace_id,
      module,
      action,
      description,
      details,
      user_name,
      user_role,
    } = body;

    if (!token || !workspace_id || !module || !action || !description) {
      return NextResponse.json({ error: 'Missing required activity log parameters' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await logWorkspaceActivity({
      workspace_id,
      user_id: user.id,
      user_name: user_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Studio Member',
      user_email: user.email || '',
      user_role: user_role || 'MEMBER',
      module,
      action,
      description,
      details,
    });

    return NextResponse.json({ success: true, message: 'Activity logged successfully.' });
  } catch (err: any) {
    console.error('[ActivityLogs POST Error]:', err);
    return NextResponse.json({ success: true });
  }
}
