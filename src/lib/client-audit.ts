/**
 * StudioCore Client Directory Audit Logging Helper
 * Dispatches audit events to /api/workspace/clients/[id]/history with zero UI latency.
 */
export async function logClientAudit(data: {
  clientId: string;
  workspaceId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  module: 'overview' | 'quotations' | 'events' | 'moodboard' | 'tasks' | 'post_production' | 'finance';
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN' | string;
  title: string;
  description?: string | null;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}) {
  if (!data.clientId) return;
  try {
    fetch(`/api/workspace/clients/${encodeURIComponent(data.clientId)}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: data.workspaceId || undefined,
        actor_id: data.actorId || undefined,
        actor_name: data.actorName || undefined,
        actor_email: data.actorEmail || undefined,
        actor_role: data.actorRole || undefined,
        module: data.module,
        action_type: data.actionType,
        title: data.title,
        description: data.description || undefined,
        old_value: data.oldValue,
        new_value: data.newValue,
        metadata: data.metadata || {},
      }),
    }).catch(err => console.warn('[logClientAudit] Notice:', err));
  } catch (err) {
    console.warn('[logClientAudit] Warning:', err);
  }
}
