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
    const moduleFilter = searchParams.get('module'); // 'overview', 'quotations', 'events', 'moodboard', 'tasks', 'post_production', 'finance'
    const limit = Math.min(Number(searchParams.get('limit')) || 150, 300);

    // 0. Resolve linked entities (lead_id, client_name, fw_projects, fw_sub_events, post_production_projects)
    const { data: clientRow } = await supabaseAdmin
      .from('workspace_clients')
      .select('id, lead_id, name, workspace_id, notes')
      .or(`id.eq.${clientId},lead_id.eq.${clientId},notes.ilike.%${clientId}%`)
      .maybeSingle();

    const realClientId = clientRow?.id || clientId;
    const resolvedLeadId = clientRow?.lead_id || null;
    const clientName = (clientRow?.name || '').trim();

    const fwOrParts = [`client_id.eq.${realClientId}`];
    if (resolvedLeadId && resolvedLeadId !== realClientId) {
      fwOrParts.push(`lead_id.eq.${resolvedLeadId}`);
    }
    if (clientId !== realClientId) {
      fwOrParts.push(`client_id.eq.${clientId}`);
    }
    if (clientName) {
      const escapedName = clientName.replace(/[,%()]/g, ' ').trim();
      if (escapedName) fwOrParts.push(`client_name.ilike.%${escapedName}%`);
    }

    const ppOrParts = [`client_id.eq.${realClientId}`];
    if (resolvedLeadId && resolvedLeadId !== realClientId) {
      ppOrParts.push(`lead_id.eq.${resolvedLeadId}`);
    }
    if (clientId !== realClientId) {
      ppOrParts.push(`client_id.eq.${clientId}`);
    }

    const [fwProjectsRes, ppProjectsRes] = await Promise.all([
      supabaseAdmin
        .from('fw_projects')
        .select('id, client_id, lead_id, client_name')
        .or(fwOrParts.join(',')),
      supabaseAdmin
        .from('post_production_projects')
        .select('id, client_id, lead_id')
        .or(ppOrParts.join(',')),
    ]);

    const fwProjectIds = Array.from(
      new Set((fwProjectsRes.data || []).map((p: any) => String(p.id)).filter(Boolean))
    );
    const ppProjectIds = Array.from(
      new Set((ppProjectsRes.data || []).map((p: any) => String(p.id)).filter(Boolean))
    );

    // Build lookup map of sub_event dates for fw_project_activity_logs enrichment
    const subEventDateMap = new Map<string, { event_date: string | null; is_date_tbd: boolean; event_title: string }>();
    if (fwProjectIds.length > 0) {
      try {
        const { data: seRows } = await supabaseAdmin
          .from('fw_sub_events')
          .select('id, event_title, event_date, is_date_tbd')
          .in('project_id', fwProjectIds);
        (seRows || []).forEach((se: any) => {
          subEventDateMap.set(String(se.id), {
            event_date: se.event_date || null,
            is_date_tbd: Boolean(se.is_date_tbd),
            event_title: se.event_title || '',
          });
        });
      } catch (_) {}
    }

    const logs: any[] = [];
    const seenIds = new Set<string>();
    const seenCompositeMap = new Map<string, number>();

    const pushUnifiedLog = (entry: any) => {
      if (!entry || !entry.id) return;
      if (seenIds.has(entry.id)) return;

      const tsBucket = Math.floor(new Date(entry.created_at || Date.now()).getTime() / 5000);
      const normTitle = String(entry.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50);
      const meta = entry.metadata || {};
      const semanticKey = meta.event_title && meta.crew_name
        ? `${entry.module}|crew:${String(meta.crew_name).toLowerCase()}|ev:${String(meta.event_title).toLowerCase()}|${tsBucket}`
        : `${entry.module}|${normTitle}|${tsBucket}`;

      if (seenCompositeMap.has(semanticKey)) {
        const existingIdx = seenCompositeMap.get(semanticKey)!;
        const existing = logs[existingIdx];
        if (existing) {
          if (!existing.actor_avatar && entry.actor_avatar) existing.actor_avatar = entry.actor_avatar;
          existing.metadata = { ...(entry.metadata || {}), ...(existing.metadata || {}) };
        }
        seenIds.add(entry.id);
        return;
      }

      seenIds.add(entry.id);
      seenCompositeMap.set(semanticKey, logs.length);
      logs.push(entry);
    };

    // Query all 5 audit sources in parallel
    const ppAuditOrParts = [`client_id.eq.${clientId}`, `project_id.eq.${clientId}`];
    if (resolvedLeadId && resolvedLeadId !== clientId) {
      ppAuditOrParts.push(`client_id.eq.${resolvedLeadId}`);
      ppAuditOrParts.push(`project_id.eq.${resolvedLeadId}`);
    }
    ppProjectIds.forEach((pid) => ppAuditOrParts.push(`project_id.eq.${pid}`));

    const financeOrParts = [`client_id.eq.${clientId}`];
    if (clientName) {
      const escapedFinName = clientName.replace(/[,%()]/g, ' ').trim();
      if (escapedFinName) financeOrParts.push(`client_name.ilike.${escapedFinName}`);
    }

    const [clientAuditRes, fwActivityRes, ppAuditRes, financeAuditRes, liveLogsRes] = await Promise.all([
      // 1. Dedicated client_audit_logs (matching canonical UUID, lead_id & client_code)
      (async () => {
        try {
          const clientAuditOrParts = [`client_id.eq.${realClientId}`];
          if (resolvedLeadId && resolvedLeadId !== realClientId) clientAuditOrParts.push(`client_id.eq.${resolvedLeadId}`);
          if (clientId !== realClientId) clientAuditOrParts.push(`client_id.eq.${clientId}`);

          let q = supabaseAdmin
            .from('client_audit_logs')
            .select('*')
            .or(clientAuditOrParts.join(','))
            .order('created_at', { ascending: false })
            .limit(limit);
          if (moduleFilter && moduleFilter !== 'all') q = q.eq('module', moduleFilter);
          return await q;
        } catch {
          return { data: [] };
        }
      })(),

      // 2. Booking Events & Crew Assignments (fw_project_activity_logs)
      (async () => {
        const allTargetProjectIds = Array.from(
          new Set([...fwProjectIds, realClientId, resolvedLeadId, clientId].filter(Boolean))
        );
        if (allTargetProjectIds.length === 0) return { data: [] };
        try {
          return await supabaseAdmin
            .from('fw_project_activity_logs')
            .select('*')
            .in('project_id', allTargetProjectIds)
            .order('created_at', { ascending: false })
            .limit(limit);
        } catch {
          return { data: [] };
        }
      })(),

      // 3. Post-Production & mirrored legacy logs
      (async () => {
        try {
          return await supabaseAdmin
            .from('post_production_audit_logs')
            .select('*')
            .or(ppAuditOrParts.join(','))
            .order('created_at', { ascending: false })
            .limit(limit);
        } catch {
          return { data: [] };
        }
      })(),

      // 4. Finance Audit Logs
      (async () => {
        try {
          return await supabaseAdmin
            .from('finance_audit_logs')
            .select('*')
            .or(financeOrParts.join(','))
            .order('created_at', { ascending: false })
            .limit(limit);
        } catch {
          return { data: [] };
        }
      })(),

      // 5. Fallback / Redundancy live_logs
      (async () => {
        try {
          return await supabaseAdmin
            .from('live_logs')
            .select('*')
            .in('event_type', ['client_history', 'post_production_history'])
            .filter('metadata->>client_id', 'eq', clientId)
            .order('created_at', { ascending: false })
            .limit(limit);
        } catch {
          return { data: [] };
        }
      })(),
    ]);

    // Merge 1: client_audit_logs (highest fidelity metadata)
    (clientAuditRes?.data || []).forEach((item: any) => {
      pushUnifiedLog({
        ...item,
        metadata: item.metadata || {},
      });
    });

    // Merge 2: fw_project_activity_logs (Events & Bookings + PM)
    (fwActivityRes?.data || []).forEach((item: any) => {
      const actType = String(item.action_type || 'UPDATE').toUpperCase();
      const resolvedModule = actType === 'PM_CHANGED' ? 'overview' : 'events';
      if (moduleFilter && moduleFilter !== 'all' && moduleFilter !== resolvedModule) return;

      const seInfo = item.sub_event_id ? subEventDateMap.get(String(item.sub_event_id)) : undefined;
      const evTitle = item.event_title || item.metadata?.event_title || item.metadata?.eventTitle || seInfo?.event_title || null;
      const evDate = item.metadata?.event_date || item.metadata?.eventDate || seInfo?.event_date || null;
      const crewName = item.target_member_name || item.metadata?.target_member || item.metadata?.memberName || null;
      const crewAvatar = item.target_member_avatar || item.metadata?.target_member_avatar || null;
      const crewRole = item.target_role || item.metadata?.role || item.metadata?.target_role || null;

      let computedTitle = '';
      if (actType === 'CREW_ASSIGNED') computedTitle = `Assigned ${crewName || item.new_value || 'Crew'}${crewRole ? ` (${crewRole})` : ''}`;
      else if (actType === 'CREW_REMOVED') computedTitle = `Unassigned ${item.previous_value || crewName || 'Crew'}${crewRole ? ` (${crewRole})` : ''}`;
      else if (actType === 'CREW_REPLACED') computedTitle = `Replaced crew (${crewRole || 'Crew'})`;
      else if (actType === 'PM_CHANGED') computedTitle = item.new_value && item.new_value !== 'Unassigned' ? `Assigned Project Manager: ${item.new_value}` : 'Cleared Project Manager';
      else if (actType.includes('SUB_EVENT_ADDED') || actType === 'EVENT_ADDED') computedTitle = `Added Event: ${evTitle || 'New Event'}`;
      else if (actType.includes('SUB_EVENT_DELETED') || actType === 'EVENT_DELETED') computedTitle = `Removed Event: ${evTitle || 'Event'}`;
      else if (actType === 'DATE_UPDATED') computedTitle = `Updated Event Date${evTitle ? `: ${evTitle}` : ''}`;
      else if (actType === 'EVENT_RENAMED') computedTitle = `Renamed Event${evTitle ? `: ${evTitle}` : ''}`;
      else if (actType === 'RATE_CHANGED' || actType === 'COMMERCIALS_UPDATED') computedTitle = `Updated Crew Commercials${crewName ? `: ${crewName}` : ''}`;
      else computedTitle = evTitle ? `${actType.replace(/_/g, ' ')} — ${evTitle}` : actType.replace(/_/g, ' ');

      pushUnifiedLog({
        id: item.id,
        client_id: clientId,
        workspace_id: item.workspace_id,
        actor_id: item.actor_id,
        actor_name: item.actor_name || 'Studio Member',
        actor_avatar: item.actor_avatar || null,
        actor_role: item.actor_role || 'Team Member',
        module: resolvedModule,
        action_type: actType,
        title: computedTitle,
        description: item.description ? String(item.description).replace(/\*\*/g, '') : null,
        old_value: item.previous_value || null,
        new_value: item.new_value || null,
        metadata: {
          ...(item.metadata || {}),
          event_title: evTitle,
          event_date: evDate,
          is_date_tbd: seInfo?.is_date_tbd ?? item.metadata?.is_date_tbd,
          crew_name: crewName,
          crew_avatar: crewAvatar,
          crew_role: crewRole,
        },
        created_at: item.created_at,
      });
    });

    // Merge 3: post_production_audit_logs
    (ppAuditRes?.data || []).forEach((item: any) => {
      const rawCat = (item.category || '').toLowerCase();
      let resolvedModule = 'post_production';
      if (rawCat.includes('quote') || rawCat.includes('version')) resolvedModule = 'quotations';
      else if (rawCat.includes('event') || rawCat.includes('booking')) resolvedModule = 'events';
      else if (rawCat.includes('finance') || rawCat.includes('payment') || rawCat.includes('invoice')) resolvedModule = 'finance';
      else if (rawCat.includes('task')) resolvedModule = 'tasks';
      else if (rawCat.includes('mood')) resolvedModule = 'moodboard';
      else if (rawCat.includes('overview') || rawCat.includes('pm') || rawCat.includes('client')) resolvedModule = 'overview';
      else if (item.metadata?.module) resolvedModule = item.metadata.module;

      if (moduleFilter && moduleFilter !== 'all' && moduleFilter !== resolvedModule) return;

      pushUnifiedLog({
        id: item.id,
        client_id: clientId,
        workspace_id: item.workspace_id,
        actor_id: item.actor_id,
        actor_name: item.actor_name || 'Studio Member',
        actor_email: item.metadata?.actor_email || null,
        actor_avatar: item.metadata?.actor_avatar || null,
        actor_role: item.actor_role || 'Team Member',
        module: resolvedModule,
        action_type: item.action_type || 'UPDATE',
        title: item.title,
        description: item.details || item.metadata?.description || null,
        old_value: item.old_value,
        new_value: item.new_value,
        metadata: {
          ...(item.metadata || {}),
          deliverable_title: item.deliverable_title || item.metadata?.deliverable_title,
        },
        created_at: item.created_at,
      });
    });

    // Merge 4: finance_audit_logs
    (financeAuditRes?.data || []).forEach((item: any) => {
      if (moduleFilter && moduleFilter !== 'all' && moduleFilter !== 'finance') return;
      const amtStr = Number(item.amount || 0) > 0 ? `₹${Number(item.amount).toLocaleString('en-IN')}` : null;
      pushUnifiedLog({
        id: item.id,
        client_id: clientId,
        workspace_id: item.workspace_id,
        actor_name: item.actor_name || 'Finance Team',
        actor_role: 'Finance',
        module: 'finance',
        action_type: item.log_type || 'FINANCE',
        title: item.description || `Finance ${item.log_type || 'Update'}${amtStr ? ` (${amtStr})` : ''}`,
        description: [item.payment_mode ? `Mode: ${item.payment_mode}` : null, amtStr ? `Amount: ${amtStr}` : null].filter(Boolean).join(' • ') || null,
        old_value: null,
        new_value: amtStr,
        metadata: {
          amount: item.amount,
          payment_mode: item.payment_mode,
          log_type: item.log_type,
        },
        created_at: item.created_at,
      });
    });

    // Merge 5: live_logs fallback / cross-module history
    (liveLogsRes?.data || []).forEach((ll: any) => {
      const meta = ll.metadata || {};
      const mod = meta.module || (ll.event_type === 'post_production_history' ? 'post_production' : 'overview');
      if (moduleFilter && moduleFilter !== 'all' && moduleFilter !== mod) return;

      pushUnifiedLog({
        id: ll.id,
        client_id: clientId,
        workspace_id: ll.workspace_id,
        actor_id: meta.actor_id,
        actor_name: meta.actor_name || 'Team Member',
        actor_email: meta.actor_email || null,
        actor_avatar: meta.actor_avatar || null,
        actor_role: meta.actor_role || 'Studio Member',
        module: mod,
        action_type: meta.action_type || 'UPDATE',
        title: meta.title || ll.message || 'Client record updated',
        description: meta.description || meta.details || ll.message,
        old_value: meta.old_value,
        new_value: meta.new_value,
        metadata: meta,
        created_at: ll.created_at,
      });
    });

    // Sort all logs descending chronologically and apply limit
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const slicedLogs = logs.slice(0, limit);

    return NextResponse.json({
      success: true,
      logs: slicedLogs,
      total: slicedLogs.length
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

    const { data: clientRow } = await supabaseAdmin
      .from('workspace_clients')
      .select('id, workspace_id')
      .or(`id.eq.${clientId},lead_id.eq.${clientId},notes.ilike.%${clientId}%`)
      .maybeSingle();

    const canonicalClientId = clientRow?.id || String(clientId);
    const canonicalWsId = clientRow?.workspace_id || String(workspace_id || '');

    const resolvedModule = module || 'overview';
    const resolvedTitle = title || `${actor_name || 'Team Member'} updated ${resolvedModule}`;
    const nowIso = new Date().toISOString();

    const auditEntry = {
      client_id: canonicalClientId,
      workspace_id: canonicalWsId,
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

    // 1. Try insert into client_audit_logs (with metadata, falling back cleanly if column missing)
    try {
      const { error: caErr } = await supabaseAdmin
        .from('client_audit_logs')
        .insert([{ ...auditEntry, metadata: metadata || {} }]);
      if (caErr) {
        await supabaseAdmin.from('client_audit_logs').insert([auditEntry]);
      }
    } catch (_) {
      try {
        await supabaseAdmin.from('client_audit_logs').insert([auditEntry]);
      } catch (_) {}
    }

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
