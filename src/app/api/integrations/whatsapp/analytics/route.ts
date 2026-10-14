import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId') || '';
    const userId = searchParams.get('user_id') || searchParams.get('userId') || '';

    const tenantIds = Array.from(new Set([workspaceId, userId].filter(id => id && id.trim().length > 0 && id !== 'all')));

    if (tenantIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id or user_id' }, { status: 400 });
    }

    // Run parallel queries using supabaseAdmin to bypass RLS restrictions
    const [wfRes, queueRes, autoRes, tplRes, customWfRes, leadsRes] = await Promise.all([
      // 1. Workflow step execution logs
      supabaseAdmin
        .from('whatsapp_workflow_logs')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('sent_at', { ascending: false })
        .limit(1000),

      // 2. Action queue
      supabaseAdmin
        .from('baileys_action_queue')
        .select('*')
        .in('workspace_id', tenantIds)
        .order('created_at', { ascending: false })
        .limit(1000),

      // 3. Automation logs
      supabaseAdmin
        .from('whatsapp_automation_logs')
        .select('*')
        .or(`workspace_id.in.(${tenantIds.join(',')}),user_id.in.(${tenantIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(500),

      // 4. Template directory
      supabaseAdmin
        .from('tenant_whatsapp_templates')
        .select('id, template_name')
        .in('tenant_id', tenantIds),

      // 5. Custom workflows
      supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('id, workflow_name')
        .in('tenant_id', tenantIds),

      // 6. Leads directory for real-time contact name resolution
      supabaseAdmin
        .from('leads')
        .select('id, name, phone, raw_payload')
        .in('workspace_id', tenantIds)
        .limit(5000),
    ]);

    // Build Templates Map
    const templatesMap: Record<string, string> = {};
    if (tplRes.data) {
      tplRes.data.forEach((t: any) => {
        if (t.id && t.template_name) templatesMap[t.id] = t.template_name;
      });
    }

    // Build Workflows Map
    const workflowsMap: Record<string, string> = {};
    if (customWfRes.data) {
      customWfRes.data.forEach((w: any) => {
        if (w.id && w.workflow_name) workflowsMap[w.id] = w.workflow_name;
      });
    }

    // Build Lead Lookups (by ID and by clean phone)
    const leadIdToName: Record<string, string> = {};
    const phoneToName: Record<string, string> = {};

    if (leadsRes.data) {
      leadsRes.data.forEach((lead: any) => {
        const leadName = lead.name || lead.raw_payload?.Name || lead.raw_payload?.full_name || '';
        if (lead.id && leadName) {
          leadIdToName[lead.id] = leadName;
        }
        if (lead.phone && leadName) {
          const clean = String(lead.phone).replace(/[^0-9]/g, '');
          if (clean.length >= 10) {
            phoneToName[clean] = leadName;
            // Also map last 10 digits for Indian phone number variations (+91 vs 91 vs direct)
            if (clean.length > 10) {
              phoneToName[clean.slice(-10)] = leadName;
            }
          }
        }
      });
    }

    const resolveLeadName = (leadId?: string, rawPhone?: string, fallbackPayloadName?: string): string => {
      if (fallbackPayloadName && fallbackPayloadName.trim() && fallbackPayloadName !== 'Guest') {
        return fallbackPayloadName.trim();
      }
      if (leadId && leadIdToName[leadId]) {
        return leadIdToName[leadId];
      }
      if (rawPhone) {
        const clean = String(rawPhone).replace(/[^0-9]/g, '');
        if (phoneToName[clean]) return phoneToName[clean];
        if (clean.length > 10 && phoneToName[clean.slice(-10)]) return phoneToName[clean.slice(-10)];
      }
      return '';
    };

    // Enrich Workflow Logs with real contact names
    const enrichedWorkflowLogs = (wfRes.data || []).map((w: any) => {
      const cleanPhone = String(w.phone_number || '').replace(/[^0-9]/g, '');
      const leadName = resolveLeadName(w.lead_id, cleanPhone);
      return {
        ...w,
        lead_name: leadName || undefined,
        recipient_name: leadName || (cleanPhone ? `+${cleanPhone}` : 'Direct Contact'),
      };
    });

    // Enrich Action Queue with real contact names
    const enrichedQueueLogs = (queueRes.data || []).map((q: any) => {
      const payload = q.payload || {};
      const rawTo = String(payload.to || q.chat_jid || payload.phone || '');
      const cleanPhone = rawTo.replace(/@.*$/, '').replace(/[^0-9]/g, '');
      const payloadName = payload.leadName || payload.lead_name || payload.variables?.Name || payload.variables?.lead_name;
      const leadName = resolveLeadName(payload.leadId || payload.lead_id, cleanPhone, payloadName);

      return {
        ...q,
        lead_name: leadName || undefined,
        recipient_name: leadName || (cleanPhone ? `+${cleanPhone}` : 'Direct Contact'),
      };
    });

    // Enrich Automation Logs with real contact names
    const enrichedAutoLogs = (autoRes.data || []).map((a: any) => {
      const cleanPhone = String(a.phone_number || a.phone || '').replace(/[^0-9]/g, '');
      const leadName = resolveLeadName(a.lead_id, cleanPhone, a.recipient_name || a.lead_name);
      return {
        ...a,
        lead_name: leadName || undefined,
        recipient_name: leadName || (cleanPhone ? `+${cleanPhone}` : 'Direct Contact'),
      };
    });

    return NextResponse.json({
      success: true,
      workflowLogs: enrichedWorkflowLogs,
      queueLogs: enrichedQueueLogs,
      autoLogs: enrichedAutoLogs,
      templatesMap,
      workflowsMap,
    });
  } catch (err: any) {
    console.error('[WhatsApp Analytics API Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve WhatsApp analytics' },
      { status: 500 }
    );
  }
}
