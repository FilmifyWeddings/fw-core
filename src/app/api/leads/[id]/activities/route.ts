import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

    // 1. Fetch structured live_logs for this lead in parallel with lead info & quotation documents
    const [logsRes, leadRes, quoteDocsRes] = await Promise.all([
      supabaseAdmin
        .from('live_logs')
        .select('id, event_type, message, metadata, created_at')
        .or(`lead_id.eq.${leadId},metadata->>lead_id.eq.${leadId}`)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('leads')
        .select('id, name, source, created_at, comments, followup_timeline, status, raw_payload')
        .eq('id', leadId)
        .maybeSingle(),
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, version, lead_version, content_json, created_at, updated_at')
        .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%`)
        .order('created_at', { ascending: false })
    ]);

    const logs = logsRes.data;
    const lead = leadRes.data;
    const quoteDocs = quoteDocsRes.data;

    const activityList: any[] = [];

    // Add log events
    if (logs && logs.length > 0) {
      logs.forEach(l => {
        activityList.push({
          id: l.id,
          type: l.metadata?.action_type || l.event_type || 'activity',
          message: l.message,
          actor: l.metadata?.actor_name || 'Team',
          metadata: l.metadata || {},
          created_at: l.created_at,
        });
      });
    }

    // Add quotation documents history (synthesizes any historical versions not in live_logs)
    if (quoteDocs && quoteDocs.length > 0) {
      quoteDocs.forEach((qd: any) => {
        const v = qd.lead_version || qd.content_json?.lead_version || qd.version || 1;
        const qTitle = qd.content_json?.designName || qd.content_json?.title || `Quotation (V${v})`;
        const isFinal = Boolean(qd.content_json?.is_final);

        // Created / finalized event
        activityList.push({
          id: `quote_doc_${qd.id || qd.template_id}_created`,
          type: isFinal ? 'quotation_finalized' : 'quotation_created',
          message: isFinal 
            ? `Quotation finalized: "${qTitle}" (v${v})` 
            : `Quotation created: "${qTitle}" (v${v})`,
          actor: 'Studio Team',
          metadata: {
            action_type: isFinal ? 'quotation_finalized' : 'quotation_created',
            quotation_id: qd.template_id || qd.id,
            version: v,
            title: qTitle
          },
          created_at: qd.created_at || qd.updated_at || lead?.created_at,
        });

        // Updated event if modified noticeably later
        if (qd.updated_at && qd.created_at && new Date(qd.updated_at).getTime() - new Date(qd.created_at).getTime() > 120000) {
          activityList.push({
            id: `quote_doc_${qd.id || qd.template_id}_updated`,
            type: 'quotation_updated',
            message: `Quotation updated: "${qTitle}" (v${v})`,
            actor: 'Studio Team',
            metadata: {
              action_type: 'quotation_updated',
              quotation_id: qd.template_id || qd.id,
              version: v,
              title: qTitle
            },
            created_at: qd.updated_at,
          });
        }
      });
    }

    // Add comments from lead if not already logged
    if (lead?.comments && Array.isArray(lead.comments)) {
      lead.comments.forEach((c: any, idx: number) => {
        const text = typeof c === 'string' ? c : c.text || c.comment_text;
        const author = typeof c === 'object' ? (c.authorName || 'Team Member') : 'Team Member';
        const timestamp = typeof c === 'object' ? (c.createdAt || c.created_at || lead.created_at) : lead.created_at;
        activityList.push({
          id: (typeof c === 'object' && c.id) ? c.id : `comment_${idx}`,
          type: 'comment',
          message: `Added note: "${text ? text.slice(0, 120) : 'Note'}"`,
          actor: author,
          metadata: { text },
          created_at: timestamp,
        });
      });
    }

    // Add followup_timeline from lead if present
    if (lead?.followup_timeline && Array.isArray(lead.followup_timeline)) {
      lead.followup_timeline.forEach((ft: any, idx: number) => {
        activityList.push({
          id: ft.id || `ft_${idx}`,
          type: ft.type || 'timeline',
          message: ft.message || ft.text || 'Timeline updated',
          actor: ft.actor || 'System',
          metadata: ft,
          created_at: ft.timestamp || ft.created_at || lead.created_at,
        });
      });
    }

    // Add creation event
    if (lead?.created_at) {
      activityList.push({
        id: `created_${lead.id}`,
        type: 'lead_created',
        message: `Lead created from source: ${lead.source || lead.raw_payload?.source || 'Direct Inquiry'}`,
        actor: 'System',
        metadata: { source: lead.source || lead.raw_payload?.source },
        created_at: lead.created_at,
      });
    }

    // Deduplicate and sort newest first
    const seen = new Set<string>();
    const sorted = activityList
      .filter(a => {
        const key = `${a.type}_${a.message}_${(a.created_at || '').slice(0, 16)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({ success: true, activities: sorted });
  } catch (err: any) {
    console.error('[Get Lead Activities Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const body = await req.json().catch(() => ({}));
    const { message, action_type = 'general', actor_name = 'User', old_value, new_value } = body;

    if (!leadId || !message) {
      return NextResponse.json({ success: false, error: 'Lead ID and message are required' }, { status: 400 });
    }

    // Fetch lead workspace_id
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('workspace_id')
      .eq('id', leadId)
      .maybeSingle();

    let workspaceId = lead?.workspace_id || null;
    if (!isValidUUID(workspaceId)) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
      workspaceId = prof?.id || null;
    }

    const { data: newLog, error } = await supabaseAdmin
      .from('live_logs')
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        event_type: 'lead_activity',
        message: message.trim(),
        metadata: {
          lead_id: leadId,
          action_type,
          actor_name,
          old_value,
          new_value,
          logged_at: new Date().toISOString(),
        },
      })
      .select('*')
      .single();

    if (error) {
      console.warn('[Insert Lead Activity Warning]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activity: newLog });
  } catch (err: any) {
    console.error('[Post Lead Activity Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
