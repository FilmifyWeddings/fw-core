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
  return processLeadStatuses(leadIds, workspaceId || undefined);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leadIds: string[] = Array.isArray(body.lead_ids) ? body.lead_ids : [];
    const workspaceId: string | undefined = body.workspace_id || body.tenant_id;

    if (leadIds.length === 0) {
      return NextResponse.json({ success: true, statuses: {} });
    }

    return processLeadStatuses(leadIds, workspaceId || undefined);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function fetchAllTenantLogs(leadIds: string[], workspaceId?: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  const allLogs: any[] = [];

  if (workspaceId && workspaceId !== 'all' && leadIds.length > 20) {
    const { data: firstPage, count } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, lead_id, workflow_id, step_index, status, template_name, sent_at', { count: 'exact' })
      .eq('tenant_id', workspaceId)
      .range(0, PAGE_SIZE - 1);

    if (firstPage) allLogs.push(...firstPage);
    const total = count ?? (firstPage?.length || 0);

    if (total > PAGE_SIZE) {
      const pagePromises: Promise<any>[] = [];
      for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
        pagePromises.push(
          Promise.resolve(
            supabaseAdmin
              .from('whatsapp_workflow_logs')
              .select('id, lead_id, workflow_id, step_index, status, template_name, sent_at')
              .eq('tenant_id', workspaceId)
              .range(from, from + PAGE_SIZE - 1)
          )
        );
      }
      const pages = await Promise.all(pagePromises);
      for (const p of pages) {
        if (p?.data) allLogs.push(...p.data);
      }
    }
    return allLogs;
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, lead_id, workflow_id, step_index, status, template_name, sent_at')
      .in('lead_id', leadIds)
      .range(from, from + PAGE_SIZE - 1);

    if (!page || page.length === 0) break;
    allLogs.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return allLogs;
}

async function processLeadStatuses(leadIds: string[], workspaceId?: string) {
  try {
    const hasWorkspace = Boolean(workspaceId && workspaceId !== 'all');

    // 1 & 2 & 3: Fetch leads, logs (untruncated), and workflows in parallel when workspaceId is known
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('id, whatsapp_group_id')
      .in('id', leadIds);

    if (hasWorkspace) {
      leadsQuery = leadsQuery.eq('workspace_id', workspaceId as string);
    }

    let leads: any[] = [];
    let allLogs: any[] = [];
    let allStudioWorkflows: any[] = [];

    if (hasWorkspace) {
      const [leadsRes, logsData, wfRes] = await Promise.all([
        leadsQuery,
        fetchAllTenantLogs(leadIds, workspaceId),
        supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('id, workflow_name, target_group_id, workflow_steps, status, tenant_id')
          .eq('tenant_id', workspaceId as string),
      ]);
      leads = leadsRes.data || [];
      allLogs = logsData || [];
      allStudioWorkflows = wfRes.data || [];
    } else {
      const [leadsRes, logsData] = await Promise.all([
        leadsQuery,
        fetchAllTenantLogs(leadIds, workspaceId),
      ]);
      leads = leadsRes.data || [];
      allLogs = logsData || [];

      const groupIds = Array.from(new Set(leads.map(l => l.whatsapp_group_id).filter(Boolean)));
      if (groupIds.length > 0) {
        const { data: wfs } = await supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('id, workflow_name, target_group_id, workflow_steps, status, tenant_id')
          .in('target_group_id', groupIds);
        allStudioWorkflows = wfs || [];
      }
    }

    const leadsMap = new Map(leads.map(l => [l.id, l]));
    const logsByLeadId = new Map<string, any[]>();
    for (const l of allLogs) {
      let arr = logsByLeadId.get(l.lead_id);
      if (!arr) {
        arr = [];
        logsByLeadId.set(l.lead_id, arr);
      }
      arr.push(l);
    }

    const groupWorkflowsMap = new Map<string, any[]>();
    const workflowsById: Record<string, any> = {};
    for (const w of allStudioWorkflows) {
      workflowsById[w.id] = w;
      if (w.target_group_id) {
        const list = groupWorkflowsMap.get(w.target_group_id) || [];
        list.push(w);
        groupWorkflowsMap.set(w.target_group_id, list);
      }
    }

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
          },
          followup: {
            status: 'not_started',
            totalSteps: 0,
            completedSteps: 0,
            pendingSteps: 0,
            failedSteps: 0,
            workflow_id: null,
          }
        };
        continue;
      }

      const leadLogs = logsByLeadId.get(leadId) || [];
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
      const welcomeLogs = leadLogs.filter(l => {
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
      const followupLogs = leadLogs.filter(l => {
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

      const resolvedFollowupWfId = followupWf?.id || (wfsForGroup.length > 0 ? wfsForGroup[0].id : null);

      statuses[leadId] = {
        welcome: {
          status: welcomeStatus,
          stepsCount: welcomeLogs.length,
          lastSentAt: welcomeLastSent,
          workflow_id: welcomeWf?.id || null,
        },
        followup: {
          status: followupStatus,
          totalSteps: expectedFollowupSteps,
          completedSteps: completedFollowups,
          pendingSteps: pendingFollowups,
          failedSteps: failedFollowups,
          workflow_id: resolvedFollowupWfId,
        }
      };
    }

    return NextResponse.json({
      success: true,
      statuses,
      workflows: workflowsById,
    });
  } catch (err: any) {
    console.error('[lead-whatsapp-status API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
