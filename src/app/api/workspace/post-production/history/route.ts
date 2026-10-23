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
    const projectId = searchParams.get('project_id') || searchParams.get('projectId') || searchParams.get('card_id') || searchParams.get('client_id');
    const requestedWsId = searchParams.get('workspace_id') || searchParams.get('workspaceId');
    const month = searchParams.get('month'); // e.g. "10" or "October"
    const year = searchParams.get('year');   // e.g. "2026"
    const actionType = searchParams.get('action_type') || searchParams.get('actionType');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'project_id is required' }, { status: 400 });
    }

    // Verify session - allow graceful read if Bearer token or cookie is valid
    try {
      const auth = await verifyMetaAuth(req, requestedWsId);
      // If meta auth returns error but we have a direct project lookup, verify token exists
      if (!auth.authorized && !auth.userId) {
        // Still check bearer token directly
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
        }
      }
    } catch (_) {}

    const logs: any[] = [];
    const seenIds = new Set<string>();

    // 1. Try querying dedicated post_production_audit_logs table
    try {
      let query = supabaseAdmin
        .from('post_production_audit_logs')
        .select('*')
        .or(`project_id.eq.${projectId},client_id.eq.${projectId}`)
        .order('created_at', { ascending: false })
        .limit(300);

      if (actionType && actionType !== 'all') {
        query = query.eq('action_type', actionType);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        data.forEach(item => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            logs.push(item);
          }
        });
      }
    } catch (_) {}

    // 2. Query client_audit_logs fallback
    try {
      let clientAuditQuery = supabaseAdmin
        .from('client_audit_logs')
        .select('*')
        .eq('client_id', projectId)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: cData } = await clientAuditQuery;
      if (cData && cData.length > 0) {
        cData.forEach(item => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            logs.push({
              id: item.id,
              workspace_id: item.workspace_id,
              project_id: item.client_id,
              client_id: item.client_id,
              actor_id: item.actor_id,
              actor_name: item.actor_name || 'Team Member',
              actor_role: item.actor_role || 'Editor / Manager',
              action_type: item.action_type || 'update',
              deliverable_id: item.metadata?.deliverable_id,
              deliverable_title: item.metadata?.deliverable_title,
              category: item.metadata?.category,
              segment: item.metadata?.segment,
              title: item.title,
              old_value: item.old_value,
              new_value: item.new_value,
              details: item.description,
              metadata: item.metadata || {},
              created_at: item.created_at,
            });
          }
        });
      }
    } catch (_) {}

    // 3. Query live_logs fallback (event_type = 'post_production_history')
    try {
      let liveQuery = supabaseAdmin
        .from('live_logs')
        .select('*')
        .eq('event_type', 'post_production_history')
        .order('created_at', { ascending: false })
        .limit(300);

      const { data: liveData } = await liveQuery;
      if (liveData && liveData.length > 0) {
        liveData.forEach(ll => {
          const meta = ll.metadata || {};
          const metaProjId = String(meta.project_id || meta.projectId || meta.client_id || meta.clientId || '');
          if (metaProjId === String(projectId) && !seenIds.has(ll.id)) {
            seenIds.add(ll.id);
            logs.push({
              id: ll.id,
              workspace_id: ll.workspace_id,
              project_id: meta.project_id || projectId,
              client_id: meta.client_id || projectId,
              actor_id: meta.actor_id,
              actor_name: meta.actor_name || meta.actorName || 'Team Member',
              actor_role: meta.actor_role || meta.actorRole || 'Editor / Manager',
              actor_avatar: meta.actor_avatar,
              action_type: meta.action_type || meta.actionType || 'update',
              deliverable_id: meta.deliverable_id || meta.deliverableId,
              deliverable_title: meta.deliverable_title || meta.deliverableTitle,
              category: meta.category,
              segment: meta.segment,
              title: ll.message || meta.title || 'Project Updated',
              old_value: meta.old_value !== undefined ? meta.old_value : meta.oldValue,
              new_value: meta.new_value !== undefined ? meta.new_value : meta.newValue,
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
 * Accepts both snake_case and camelCase parameters for 100% interoperability.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Support both snake_case and camelCase
    const projectId = body.project_id || body.projectId || body.card_id || body.cardId;
    const workspaceId = body.workspace_id || body.workspaceId;
    const clientId = body.client_id || body.clientId;
    const actorId = body.actor_id || body.actorId;
    const actorName = body.actor_name || body.actorName;
    const actorRole = body.actor_role || body.actorRole;
    const actorAvatar = body.actor_avatar || body.actorAvatar;
    const actionType = body.action_type || body.actionType || 'update';
    const deliverableId = body.deliverable_id || body.deliverableId;
    const deliverableTitle = body.deliverable_title || body.deliverableTitle;
    const category = body.category;
    const segment = body.segment;
    const title = body.title;
    const rawOldVal = body.old_value !== undefined ? body.old_value : body.oldValue;
    const rawNewVal = body.new_value !== undefined ? body.new_value : body.newValue;
    const details = body.details;
    const metadata = body.metadata || {};

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'project_id is required' }, { status: 400 });
    }

    let authUserId = actorId;
    let authWsId = workspaceId;
    try {
      const auth = await verifyMetaAuth(req, workspaceId);
      if (auth.userId) authUserId = auth.userId;
      if (auth.workspaceId) authWsId = auth.workspaceId;
    } catch (_) {}

    const resolvedWorkspaceId = workspaceId || authWsId || authUserId || 'default';
    const resolvedActorName = actorName || 'Team Member';
    const nowIso = new Date().toISOString();

    const recordPayload = {
      workspace_id: resolvedWorkspaceId,
      project_id: String(projectId),
      client_id: clientId ? String(clientId) : String(projectId),
      actor_id: authUserId || null,
      actor_name: resolvedActorName,
      actor_role: actorRole || 'Studio Member',
      actor_avatar: actorAvatar || null,
      action_type: actionType,
      deliverable_id: deliverableId ? String(deliverableId) : null,
      deliverable_title: deliverableTitle || null,
      category: category || null,
      segment: segment || null,
      title: title || `${resolvedActorName} updated post-production`,
      old_value: rawOldVal !== undefined && rawOldVal !== null ? (typeof rawOldVal === 'object' ? JSON.stringify(rawOldVal) : String(rawOldVal)) : null,
      new_value: rawNewVal !== undefined && rawNewVal !== null ? (typeof rawNewVal === 'object' ? JSON.stringify(rawNewVal) : String(rawNewVal)) : null,
      details: details || null,
      metadata: {
        ...metadata,
        project_id: String(projectId),
        client_id: clientId ? String(clientId) : String(projectId),
        deliverable_id: deliverableId,
        deliverable_title: deliverableTitle,
        category,
        segment
      },
      created_at: nowIso,
    };

    // 1. Try inserting into post_production_audit_logs
    try {
      await supabaseAdmin
        .from('post_production_audit_logs')
        .insert(recordPayload);
    } catch (e) {
      console.warn('[post_production_audit_logs] Insert warning:', e);
    }

    // 2. Also insert into client_audit_logs for universal cross-module history
    try {
      await supabaseAdmin
        .from('client_audit_logs')
        .insert({
          client_id: clientId ? String(clientId) : String(projectId),
          workspace_id: resolvedWorkspaceId,
          actor_id: authUserId || null,
          actor_name: resolvedActorName,
          actor_role: actorRole || 'Studio Member',
          module: 'post_production',
          action_type: actionType,
          title: title || `${resolvedActorName} updated post-production`,
          description: details || `${title || 'Updated item'} (${deliverableTitle || category || 'Item'})`,
          old_value: recordPayload.old_value,
          new_value: recordPayload.new_value,
          metadata: recordPayload.metadata,
          created_at: nowIso,
        });
    } catch (_) {}

    // 3. Also insert into live_logs for instant fallback
    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: resolvedWorkspaceId,
        event_type: 'post_production_history',
        message: title || `${resolvedActorName} updated card details`,
        metadata: recordPayload,
        created_at: nowIso
      });
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
