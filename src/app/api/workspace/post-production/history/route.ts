import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/post-production/history?project_id=...&workspace_id=...&month=...&year=...
 * Fetch audit logs for a specific post-production card with monthly/timeline breakdown.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id') || searchParams.get('card_id');
    const requestedWsId = searchParams.get('workspace_id');
    const month = searchParams.get('month'); // e.g. "10" or "October"
    const year = searchParams.get('year');   // e.g. "2026"
    const actionType = searchParams.get('action_type');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'project_id is required' }, { status: 400 });
    }

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs: any[] = [];

    // 1. Try querying dedicated post_production_audit_logs table
    try {
      let query = supabaseAdmin
        .from('post_production_audit_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionType && actionType !== 'all') {
        query = query.eq('action_type', actionType);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        logs.push(...data);
      }
    } catch (_) {}

    // 2. Query live_logs fallback (event_type = 'post_production_history')
    try {
      let liveQuery = supabaseAdmin
        .from('live_logs')
        .select('*')
        .eq('event_type', 'post_production_history')
        .filter('metadata->>project_id', 'eq', projectId)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: liveData } = await liveQuery;
      if (liveData && liveData.length > 0) {
        liveData.forEach(ll => {
          // Avoid duplicates if already present from dedicated table
          if (!logs.some(existing => existing.id === ll.id)) {
            const meta = ll.metadata || {};
            logs.push({
              id: ll.id,
              workspace_id: ll.workspace_id,
              project_id: meta.project_id || projectId,
              client_id: meta.client_id,
              actor_id: meta.actor_id,
              actor_name: meta.actor_name || 'Team Member',
              actor_role: meta.actor_role || 'Editor / Manager',
              actor_avatar: meta.actor_avatar,
              action_type: meta.action_type || 'update',
              deliverable_id: meta.deliverable_id,
              deliverable_title: meta.deliverable_title,
              category: meta.category,
              segment: meta.segment,
              title: ll.message || meta.title || 'Project Updated',
              old_value: meta.old_value,
              new_value: meta.new_value,
              details: meta.details || ll.message,
              metadata: meta,
              created_at: ll.created_at,
            });
          }
        });
      }
    } catch (_) {}

    // Sort descending by created_at
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter by year / month if requested
    let filteredLogs = logs;
    if (year && year !== 'all') {
      filteredLogs = filteredLogs.filter(l => {
        const d = new Date(l.created_at);
        return d.getFullYear().toString() === year;
      });
    }

    if (month && month !== 'all') {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const mNum = parseInt(month, 10);
      filteredLogs = filteredLogs.filter(l => {
        const d = new Date(l.created_at);
        if (!isNaN(mNum)) {
          return d.getMonth() + 1 === mNum;
        }
        return monthNames[d.getMonth()] === month.toLowerCase().trim();
      });
    }

    return NextResponse.json({
      success: true,
      history: filteredLogs,
      total_count: filteredLogs.length
    });
  } catch (err: any) {
    console.error('[GET /api/workspace/post-production/history] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/workspace/post-production/history
 * Save a new audit log event for a post-production card.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      project_id,
      workspace_id,
      client_id,
      actor_id,
      actor_name,
      actor_role,
      actor_avatar,
      action_type,
      deliverable_id,
      deliverable_title,
      category,
      segment,
      title,
      old_value,
      new_value,
      details,
      metadata
    } = body;

    if (!project_id) {
      return NextResponse.json({ success: false, error: 'project_id is required' }, { status: 400 });
    }

    const auth = await verifyMetaAuth(req, workspace_id);
    const resolvedWorkspaceId = workspace_id || auth.workspaceId || auth.userId;
    const resolvedActorName = actor_name || auth.userId || 'Team Member';
    const nowIso = new Date().toISOString();

    const recordPayload = {
      workspace_id: resolvedWorkspaceId,
      project_id: String(project_id),
      client_id: client_id ? String(client_id) : null,
      actor_id: actor_id || auth.userId,
      actor_name: resolvedActorName,
      actor_role: actor_role || 'Studio Member',
      actor_avatar: actor_avatar || null,
      action_type: action_type || 'update',
      deliverable_id: deliverable_id ? String(deliverable_id) : null,
      deliverable_title: deliverable_title || null,
      category: category || null,
      segment: segment || null,
      title: title || `${resolvedActorName} updated card details`,
      old_value: old_value !== undefined ? (typeof old_value === 'object' ? JSON.stringify(old_value) : String(old_value)) : null,
      new_value: new_value !== undefined ? (typeof new_value === 'object' ? JSON.stringify(new_value) : String(new_value)) : null,
      details: details || null,
      metadata: metadata || {},
      created_at: nowIso,
    };

    // 1. Try inserting into post_production_audit_logs
    let inserted = false;
    try {
      const { data, error } = await supabaseAdmin
        .from('post_production_audit_logs')
        .insert(recordPayload)
        .select()
        .maybeSingle();

      if (!error && data) {
        inserted = true;
      }
    } catch (_) {}

    // 2. Also insert into live_logs for dual redundancy & instant availability
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: resolvedWorkspaceId,
        event_type: 'post_production_history',
        message: title || `${resolvedActorName} updated card details`,
        metadata: {
          ...recordPayload,
          project_id: String(project_id)
        },
        created_at: nowIso
      });
      inserted = true;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Audit history logged successfully',
      event: recordPayload
    });
  } catch (err: any) {
    console.error('[POST /api/workspace/post-production/history] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
