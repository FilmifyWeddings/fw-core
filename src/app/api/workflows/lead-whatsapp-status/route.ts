import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadIdsParam = searchParams.get('lead_ids');
  const workspaceId = searchParams.get('workspace_id') || searchParams.get('tenant_id');

  if (!leadIdsParam) {
    return NextResponse.json({ success: true, statuses: {} });
  }

  const leadIds = leadIdsParam.split(',').map(id => id.trim()).filter(Boolean);
  return processLeadStatuses(leadIds, workspaceId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leadIds: string[] = Array.isArray(body.lead_ids) ? body.lead_ids : [];
    const workspaceId: string | undefined = body.workspace_id || body.tenant_id;

    if (leadIds.length === 0) {
      return NextResponse.json({ success: true, statuses: {} });
    }

    return processLeadStatuses(leadIds, workspaceId);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function processLeadStatuses(leadIds: string[], workspaceId?: string) {
  try {
    // 1. Fetch leads info for group linkage & legacy flags
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('id, wa_welcome_sent, whatsapp_group_id, raw_payload')
      .in('id', leadIds);

    if (workspaceId && workspaceId !== 'all') {
      leadsQuery = leadsQuery.eq('workspace_id', workspaceId);
    }

    const { data: leads } = await leadsQuery;
    const leadsMap = new Map((leads || []).map(l => [l.id, l]));

    // 2. Fetch workflow logs for these leads
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, lead_id, workflow_id, step_index, status, template_name, sent_at, updated_at, error_message')
      .in('lead_id', leadIds);

    const allLogs = logs || [];

    // 3. Fetch workflows to know step counts
    const groupIds = Array.from(new Set((leads || []).map(l => l.whatsapp_group_id).filter(Boolean)));
    let workflowsMap = new Map<string, any>();
    if (groupIds.length > 0) {
      const { data: wfs } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('id, target_group_id, workflow_steps, status')
        .in('target_group_id', groupIds);

      (wfs || []).forEach(w => {
        if (w.target_group_id) workflowsMap.set(w.target_group_id, w);
      });
    }

    const statuses: Record<string, any> = {};

    for (const leadId of leadIds) {
      const lead = leadsMap.get(leadId);
      const leadLogs = allLogs.filter(l => l.lead_id === leadId);
      const workflow = lead?.whatsapp_group_id ? workflowsMap.get(lead.whatsapp_group_id) : null;
      const totalWorkflowSteps = workflow?.workflow_steps?.length || 0;

      // --- Welcome Status Calculation ---
      // Welcome is step_index === 0, or any template containing 'welcome' / 'wm', or lead.wa_welcome_sent
      const welcomeLogs = leadLogs.filter(l => 
        l.step_index === 0 || 
        (l.template_name && (l.template_name.toLowerCase().includes('welcome') || l.template_name.toLowerCase().startsWith('wm')))
      );

      let welcomeStatus: 'sent' | 'failed' | 'pending' | 'none' = 'none';
      let welcomeLastSent: string | null = null;
      const hasFailedWelcome = welcomeLogs.some(l => l.status === 'failed');
      const hasSentWelcome = welcomeLogs.some(l => ['sent', 'delivered', 'read'].includes(l.status)) || Boolean((lead as any)?.wa_welcome_sent);
      const hasPendingWelcome = welcomeLogs.some(l => l.status === 'pending');

      if (hasFailedWelcome) {
        welcomeStatus = 'failed';
      } else if (hasSentWelcome) {
        welcomeStatus = 'sent';
        const sentLog = welcomeLogs.find(l => ['sent', 'delivered', 'read'].includes(l.status));
        welcomeLastSent = sentLog?.sent_at || null;
      } else if (hasPendingWelcome) {
        welcomeStatus = 'pending';
      } else {
        welcomeStatus = 'none';
      }

      // --- Follow-up Status Calculation ---
      // Follow-up are steps with step_index > 0 or all steps beyond initial welcome
      const followupLogs = leadLogs.filter(l => l.step_index > 0 || (totalWorkflowSteps > 1 && l.step_index !== 0));
      const completedFollowups = followupLogs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
      const failedFollowups = followupLogs.filter(l => l.status === 'failed').length;
      const pendingFollowups = followupLogs.filter(l => l.status === 'pending').length;

      let followupStatus: 'completed' | 'running' | 'failed' | 'not_started' = 'not_started';
      const expectedFollowupSteps = Math.max(0, totalWorkflowSteps - 1);

      if (failedFollowups > 0) {
        followupStatus = 'failed';
      } else if (completedFollowups > 0 && expectedFollowupSteps > 0 && completedFollowups >= expectedFollowupSteps) {
        followupStatus = 'completed';
      } else if (completedFollowups > 0 || pendingFollowups > 0) {
        followupStatus = 'running';
      } else {
        followupStatus = 'not_started';
      }

      statuses[leadId] = {
        welcome: {
          status: welcomeStatus,
          stepsCount: welcomeLogs.length,
          lastSentAt: welcomeLastSent,
        },
        followup: {
          status: followupStatus,
          totalSteps: expectedFollowupSteps,
          completedSteps: completedFollowups,
          pendingSteps: pendingFollowups,
          failedSteps: failedFollowups,
        }
      };
    }

    return NextResponse.json({
      success: true,
      statuses
    });
  } catch (err: any) {
    console.error('[lead-whatsapp-status API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
