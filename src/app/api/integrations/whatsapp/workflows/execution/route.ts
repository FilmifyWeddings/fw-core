import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseShortcodes } from '@/lib/baileys-serverless';

// Helper to format date in Indian Standard Time (IST)
function formatIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '00';
    const month = parts.find(p => p.type === 'month')?.value || '00';
    const year = parts.find(p => p.type === 'year')?.value || '0000';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    let dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
    dayPeriod = dayPeriod.toUpperCase();

    return `${day}/${month}/${year}, ${hour}:${minute} ${dayPeriod}`;
  } catch (e) {
    return '—';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');
  const workflowId = searchParams.get('workflow_id') || 'all';

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const isAll = !workflowId || workflowId === 'all';

    // 1. Fetch Workflow(s)
    let workflowsList: any[] = [];
    if (isAll) {
      const { data: allWfs } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('tenant_id', tenantId);
      workflowsList = allWfs || [];
    } else {
      const { data: singleWf, error: wfError } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (wfError || !singleWf) {
        return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
      }
      workflowsList = [singleWf];
    }

    if (workflowsList.length === 0) {
      return NextResponse.json({
        success: true,
        workflow: { id: 'all', workflow_name: 'All Workflows', workflow_steps: [] },
        executions: []
      });
    }

    // 2. Fetch Leads for targeted groups
    const targetGroupIds = Array.from(new Set(workflowsList.map(w => w.target_group_id).filter(Boolean)));
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('id, name, email, phone, source, status, score, raw_payload, whatsapp_group_id, created_at, updated_at')
      .eq('workspace_id', tenantId);

    if (!isAll && targetGroupIds.length > 0) {
      leadsQuery = leadsQuery.in('whatsapp_group_id', targetGroupIds);
    }

    const { data: leadsData } = await leadsQuery;
    const leads = leadsData || [];

    // 3. Fetch Workflow Logs
    let logsQuery = supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('tenant_id', tenantId);

    if (!isAll) {
      logsQuery = logsQuery.eq('workflow_id', workflowId);
    }

    const { data: logs } = await logsQuery.order('step_index', { ascending: true });
    const allLogs = logs || [];

    // 4. Load template details for shortcode preview parsing
    const allSteps = workflowsList.flatMap(w => w.workflow_steps || []);
    const templateIds = Array.from(new Set(allSteps.map((s: any) => s.template_id).filter(Boolean))) as string[];

    const templatesMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      try {
        const { data: tenantTpls } = await supabaseAdmin
          .from('tenant_whatsapp_templates')
          .select('id, body_text, media_url_payload')
          .in('id', templateIds)
          .eq('tenant_id', tenantId);

        if (tenantTpls) {
          tenantTpls.forEach(t => {
            templatesMap[t.id] = {
              body: t.body_text || '',
              type: t.media_url_payload ? 'media' : 'text'
            };
          });
        }

        const missingIds = templateIds.filter(id => !templatesMap[id]);
        if (missingIds.length > 0) {
          const { data: legacyTpls } = await supabaseAdmin
            .from('whatsapp_templates')
            .select('id, type, payload')
            .in('id', missingIds)
            .eq('workspace_id', tenantId);

          if (legacyTpls) {
            legacyTpls.forEach(t => {
              const pl = t.payload || {};
              templatesMap[t.id] = {
                body: pl.body || pl.question || '',
                type: t.type
              };
            });
          }
        }
      } catch (err) {
        console.error('Error prefetching templates for shortcode parsing:', err);
      }
    }

    // 5. Assemble Telemetry for all matching workflows and leads
    const executions: any[] = [];

    for (const workflow of workflowsList) {
      const totalStepsCount = workflow.workflow_steps?.length || 0;
      const wfLeads = workflow.target_group_id
        ? leads.filter(l => l.whatsapp_group_id === workflow.target_group_id)
        : leads;

      for (const lead of wfLeads) {
        const leadLogs = allLogs.filter(log => log.workflow_id === workflow.id && log.lead_id === lead.id);
        const completedCount = leadLogs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
        const failedCount    = leadLogs.filter(l => l.status === 'failed').length;
        const pendingCount   = leadLogs.filter(l => l.status === 'pending').length;
        const leftCount      = Math.max(0, totalStepsCount - completedCount - failedCount - pendingCount);

        let status: 'completed' | 'running' | 'failed' | 'not_started' = 'not_started';
        if (leadLogs.length === 0) {
          status = 'not_started';
        } else if (failedCount > 0) {
          status = 'failed';
        } else if (completedCount === totalStepsCount && totalStepsCount > 0) {
          status = 'completed';
        } else {
          status = 'running';
        }

        let groupJoinDate = new Date(lead.created_at);
        if (leadLogs.length > 0) {
          const processedLogs = leadLogs.filter(l => !['pending', 'failed'].includes(l.status));
          const logTimes = processedLogs.map(l => new Date(l.sent_at).getTime()).filter(t => !isNaN(t));
          if (logTimes.length > 0) {
            groupJoinDate = new Date(Math.min(...logTimes));
          }
        }
        const groupJoinTimeFormatted = formatIST(groupJoinDate);

        const stepsLogs = (workflow.workflow_steps || []).map((step: any) => {
          const matchedLog = leadLogs.find(l => l.step_index === step.sort_index);
          let stepStatus = 'unsent';
          let errorMsg = null;
          let sentAtDate = new Date(groupJoinDate.getTime());

          if (step.delay_unit === 'seconds') {
            sentAtDate.setSeconds(sentAtDate.getSeconds() + step.delay_value);
          } else if (step.delay_unit === 'hours') {
            sentAtDate.setHours(sentAtDate.getHours() + step.delay_value);
          }

          let sentAtIso = sentAtDate.toISOString();
          let sentAtFormatted = `Scheduled to send on: ${formatIST(sentAtDate)}`;
          let updatedAtFormatted = '—';

          if (matchedLog) {
            stepStatus = matchedLog.status;
            errorMsg = matchedLog.error_message;
            sentAtIso = matchedLog.sent_at;
            sentAtFormatted = stepStatus === 'pending'
              ? `Scheduled to send on: ${formatIST(matchedLog.sent_at)}`
              : `Sent at: ${formatIST(matchedLog.sent_at)}`;
            if (matchedLog.updated_at) updatedAtFormatted = formatIST(matchedLog.updated_at);
          }

          const tpl = templatesMap[step.template_id];
          const rawBody = tpl?.body || '';
          const parsedBody = parseShortcodes(rawBody, lead);

          return {
            id: matchedLog?.id || null,
            step_index: step.sort_index,
            template_name: step.template_name,
            status: stepStatus,
            error_message: errorMsg,
            sent_at: sentAtIso,
            sent_at_formatted: sentAtFormatted,
            updated_at: matchedLog?.updated_at || null,
            updated_at_formatted: updatedAtFormatted,
            parsed_body: parsedBody
          };
        });

        const lastLog = leadLogs.length > 0 ? leadLogs[leadLogs.length - 1] : null;
        const lastUpdateFormatted = lastLog ? formatIST(lastLog.updated_at) : formatIST(lead.updated_at);

        executions.push({
          leadId: lead.id,
          workflowId: workflow.id,
          workflowName: workflow.workflow_name,
          name: lead.name || 'Unknown Contact',
          phone: lead.phone,
          status,
          totalSteps: totalStepsCount,
          completedSteps: completedCount,
          leftSteps: leftCount,
          failedSteps: failedCount,
          pendingSteps: pendingCount,
          runsCount: leadLogs.length > 0 ? 1 : 0,
          updatedAt: lastUpdateFormatted,
          groupJoinTime: groupJoinTimeFormatted,
          stepsLogs
        });
      }
    }

    return NextResponse.json({
      success: true,
      workflow: isAll ? { id: 'all', workflow_name: 'All Workflows' } : workflowsList[0],
      executions
    });
  } catch (err: any) {
    console.error('Fetch workflow execution telemetry error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
