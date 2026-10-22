import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/clients/[id]/history
 * Fetch chronological, date-wise audit logs across all sub-modules for a specific client.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clientId = resolvedParams?.id;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');
    const moduleFilter = searchParams.get('module'); // 'overview', 'quotations', 'events', 'moodboard', 'tasks', 'post_production', 'finance'
    const limit = Math.min(Number(searchParams.get('limit')) || 150, 300);

    const logs: any[] = [];
    const seenIds = new Set<string>();

    // 1. Try querying dedicated client_audit_logs table
    try {
      let query = supabaseAdmin
        .from('client_audit_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (moduleFilter && moduleFilter !== 'all') {
        query = query.eq('module', moduleFilter);
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

    // 2. Query post_production_audit_logs linked to this client
    try {
      let ppQuery = supabaseAdmin
        .from('post_production_audit_logs')
        .select('*')
        .or(`client_id.eq.${clientId},project_id.eq.${clientId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: ppData, error: ppError } = await ppQuery;
      if (!ppError && ppData && ppData.length > 0) {
        ppData.forEach(item => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            const rawCat = (item.category || '').toLowerCase();
            let resolvedModule = 'post_production';
            if (rawCat.includes('quote') || rawCat.includes('version')) resolvedModule = 'quotations';
            else if (rawCat.includes('event') || rawCat.includes('booking')) resolvedModule = 'events';
            else if (rawCat.includes('finance') || rawCat.includes('payment') || rawCat.includes('invoice')) resolvedModule = 'finance';
            else if (rawCat.includes('task')) resolvedModule = 'tasks';
            else if (rawCat.includes('mood')) resolvedModule = 'moodboard';
            else if (rawCat.includes('overview') || rawCat.includes('pm') || rawCat.includes('client')) resolvedModule = 'overview';
            else if (item.metadata?.module) resolvedModule = item.metadata.module;

            if (!moduleFilter || moduleFilter === 'all' || moduleFilter === resolvedModule) {
              logs.push({
                id: item.id,
                client_id: clientId,
                workspace_id: item.workspace_id,
                actor_id: item.actor_id,
                actor_name: item.actor_name || 'Studio Member',
                actor_email: item.metadata?.actor_email || null,
                actor_role: item.actor_role || 'Team Member',
                module: resolvedModule,
                action_type: item.action_type || 'UPDATE',
                title: item.title,
                description: item.details || item.metadata?.description || null,
                old_value: item.old_value,
                new_value: item.new_value,
                created_at: item.created_at,
              });
            }
          }
        });
      }
    } catch (_) {}

    // 3. Fallback to live_logs (event_type = 'client_history')
    try {
      let liveQuery = supabaseAdmin
        .from('live_logs')
        .select('*')
        .eq('event_type', 'client_history')
        .filter('metadata->>client_id', 'eq', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: liveData } = await liveQuery;
      if (liveData && liveData.length > 0) {
        liveData.forEach(ll => {
          if (!seenIds.has(ll.id)) {
            seenIds.add(ll.id);
            const meta = ll.metadata || {};
            const mod = meta.module || 'overview';
            if (!moduleFilter || moduleFilter === 'all' || moduleFilter === mod) {
              logs.push({
                id: ll.id,
                client_id: clientId,
                workspace_id: ll.workspace_id,
                actor_id: meta.actor_id,
                actor_name: meta.actor_name || 'Team Member',
                actor_email: meta.actor_email || null,
                actor_role: meta.actor_role || 'Studio Member',
                module: mod,
                action_type: meta.action_type || 'UPDATE',
                title: meta.title || ll.message || 'Client record updated',
                description: meta.description || meta.details || ll.message,
                old_value: meta.old_value,
                new_value: meta.new_value,
                created_at: ll.created_at,
              });
            }
          }
        });
      }
    } catch (_) {}

    // Sort all logs descending chronologically
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (err: any) {
    console.error('[GET /api/workspace/clients/[id]/history Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/workspace/clients/[id]/history
 * Record a new audit log event for a client sub-module change.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clientId = resolvedParams?.id;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      workspace_id,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      module, // 'overview', 'quotations', 'events', 'moodboard', 'tasks', 'post_production', 'finance'
      action_type, // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ASSIGN'
      title,
      description,
      old_value,
      new_value,
      metadata = {}
    } = body;

    const resolvedModule = module || 'overview';
    const resolvedTitle = title || `${actor_name || 'Team Member'} updated ${resolvedModule}`;
    const nowIso = new Date().toISOString();

    const auditEntry = {
      client_id: String(clientId),
      workspace_id: String(workspace_id || ''),
      actor_id: actor_id || null,
      actor_name: actor_name || 'Team Member',
      actor_email: actor_email || null,
      actor_role: actor_role || 'Studio Specialist',
      module: resolvedModule,
      action_type: action_type || 'UPDATE',
      title: resolvedTitle,
      description: description || null,
      old_value: old_value !== undefined ? (typeof old_value === 'object' ? JSON.stringify(old_value) : String(old_value)) : null,
      new_value: new_value !== undefined ? (typeof new_value === 'object' ? JSON.stringify(new_value) : String(new_value)) : null,
      created_at: nowIso,
    };

    // 1. Try insert into client_audit_logs
    try {
      await supabaseAdmin.from('client_audit_logs').insert([auditEntry]);
    } catch (_) {}

    // 2. Also insert into post_production_audit_logs for universal history retention
    try {
      await supabaseAdmin.from('post_production_audit_logs').insert([{
        workspace_id: auditEntry.workspace_id,
        project_id: String(clientId),
        client_id: String(clientId),
        actor_id: auditEntry.actor_id,
        actor_name: auditEntry.actor_name,
        actor_role: auditEntry.actor_role,
        action_type: auditEntry.action_type,
        category: auditEntry.module,
        title: auditEntry.title,
        old_value: auditEntry.old_value,
        new_value: auditEntry.new_value,
        details: auditEntry.description,
        metadata: {
          ...metadata,
          module: auditEntry.module,
          actor_email: auditEntry.actor_email
        },
        created_at: nowIso
      }]);
    } catch (_) {}

    // 3. Dual-redundancy into live_logs
    try {
      await supabaseAdmin.from('live_logs').insert([{
        workspace_id: auditEntry.workspace_id,
        event_type: 'client_history',
        message: auditEntry.title,
        metadata: {
          ...auditEntry,
          ...metadata
        },
        created_at: nowIso
      }]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Client audit log created successfully',
      log: auditEntry
    });
  } catch (err: any) {
    console.error('[POST /api/workspace/clients/[id]/history Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
