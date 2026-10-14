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

    // 3. Fetch workflows to know step counts and definitions
    const groupIds = Array.from(new Set((leads || []).map(l => l.whatsapp_group_id).filter(Boolean)));
    const groupWorkflowsMap = new Map<string, any[]>();
    let allStudioWorkflows: any[] = [];

    let wfQuery = supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('id, workflow_name, target_group_id, workflow_steps, status, tenant_id');

    if (groupIds.length > 0) {
      wfQuery = wfQuery.in('target_group_id', groupIds);
    } else if (workspaceId && workspaceId !== 'all') {
      wfQuery = wfQuery.eq('tenant_id', workspaceId);
    }

    const { data: wfs } = await wfQuery;
    allStudioWorkflows = wfs || [];

    allStudioWorkflows.forEach(w => {
      if (w.target_group_id) {
        const list = groupWorkflowsMap.get(w.target_group_id) || [];
        list.push(w);
        groupWorkflowsMap.set(w.target_group_id, list);
      }
    });

    const statuses: Record<string, any> = {};

    for (const leadId of leadIds) {
      const lead = leadsMap.get(leadId);

      // STRICT USER RULE: If lead has NO WhatsApp group assigned, Welcome and Follow-up MUST BE GRAY!
      if (!lead?.whatsapp_group_id) {
        statuses[leadId] = {
          welcome: {
            status: 'none',
            stepsCount: 0,
            lastSentAt: null,
            workflow_id: null,
            workflow: null,
          },
          followup: {
            status: 'not_started',
            totalSteps: 0,
            completedSteps: 0,
            pendingSteps: 0,
            failedSteps: 0,
            workflow_id: null,
            workflow: null,
          }
        };
        continue;
      }

      const leadLogs = allLogs.filter(l => l.lead_id === leadId);
      const wfsForGroup = groupWorkflowsMap.get(lead.whatsapp_group_id) || [];

      // Find dedicated Welcome & Follow-up workflows strictly configured for this group
      const welcomeWf = wfsForGroup.find(w => 
        (w.workflow_name || '').toLowerCase().includes('welcome') || 
        (w.workflow_name || '').toLowerCase().startsWith('wm')
      ) || (wfsForGroup.length > 0 ? wfsForGroup[0] : null);

      const followupWf = wfsForGroup.find(w => 
        (w.workflow_name || '').toLowerCase().includes('follow') || 
        (w.workflow_name || '').toLowerCase().startsWith('fu')
      ) || (wfsForGroup.length > 1 ? wfsForGroup.find(w => w.id !== welcomeWf?.id) : null);

      // --- Welcome Logs & Status ---
      let welcomeLogs = leadLogs.filter(l => {
        if (welcomeWf && l.workflow_id === welcomeWf.id) return true;
        if (!welcomeWf) {
          return l.step_index === 0 || (l.template_name && (l.template_name.toLowerCase().includes('welcome') || l.template_name.toLowerCase().startsWith('wm')));
        }
        return false;
      });

      const hasFailedWelcome = welcomeLogs.some(l => l.status === 'failed');
      const hasSentWelcome = welcomeLogs.some(l => ['sent', 'delivered', 'read', 'completed'].includes(l.status));
      const hasPendingWelcome = welcomeLogs.some(l => l.status === 'pending');

      let welcomeStatus: 'sent' | 'failed' | 'pending' | 'none' = 'none';
      let welcomeLastSent: string | null = null;

      if (hasFailedWelcome) {
        welcomeStatus = 'failed';
      } else if (hasSentWelcome && !hasPendingWelcome) {
        welcomeStatus = 'sent';
        const sentLog = welcomeLogs.find(l => ['sent', 'delivered', 'read', 'completed'].includes(l.status));
        welcomeLastSent = sentLog?.sent_at || null;
      } else if (hasPendingWelcome) {
        welcomeStatus = 'pending';
      } else if (hasSentWelcome) {
        welcomeStatus = 'sent';
      } else {
        welcomeStatus = 'none';
      }

      // --- Follow-up Logs & Status ---
      let followupLogs = leadLogs.filter(l => {
        if (followupWf && l.workflow_id === followupWf.id) return true;
        if (!followupWf && welcomeWf && l.workflow_id === welcomeWf.id) {
          return l.step_index > 0;
        }
        if (!followupWf && !welcomeWf) {
          return l.step_index > 0 || (l.template_name && !l.template_name.toLowerCase().includes('welcome'));
        }
        return false;
      });

      const completedFollowups = followupLogs.filter(l => ['sent', 'delivered', 'read', 'completed'].includes(l.status)).length;
      const failedFollowups = followupLogs.filter(l => l.status === 'failed').length;
      const pendingFollowups = followupLogs.filter(l => l.status === 'pending').length;

      let followupStatus: 'completed' | 'running' | 'failed' | 'not_started' = 'not_started';
      const expectedFollowupSteps = followupWf 
        ? (followupWf.workflow_steps?.length || 0)
        : Math.max(0, (welcomeWf?.workflow_steps?.length || 0) - 1);

      // STRICT USER RULE: If ANY follow-up step is pending, it MUST SHOW ORANGE!
      // Only when ALL follow-ups are completed (0 pending, 0 failed, completed > 0) does it show GREEN!
      if (failedFollowups > 0) {
        followupStatus = 'failed'; // RED
      } else if (pendingFollowups > 0) {
        followupStatus = 'running'; // ORANGE (Scheduled / In Progress)
      } else if (completedFollowups > 0 && pendingFollowups === 0) {
        followupStatus = 'completed'; // GREEN (All finished)
      } else {
        followupStatus = 'not_started'; // GRAY
      }

      statuses[leadId] = {
        welcome: {
          status: welcomeStatus,
          stepsCount: welcomeLogs.length,
          lastSentAt: welcomeLastSent,
          workflow_id: welcomeWf?.id || null,
          workflow: welcomeWf || null,
        },
        followup: {
          status: followupStatus,
          totalSteps: expectedFollowupSteps,
          completedSteps: completedFollowups,
          pendingSteps: pendingFollowups,
          failedSteps: failedFollowups,
          workflow_id: followupWf?.id || (wfsForGroup.length > 0 ? wfsForGroup[0].id : null),
          workflow: followupWf || (wfsForGroup.length > 0 ? wfsForGroup[0].id : null),
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
