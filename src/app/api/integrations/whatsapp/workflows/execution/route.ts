import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
  const workflowId = searchParams.get('workflow_id');

  if (!tenantId || !workflowId) {
    return NextResponse.json({ error: 'Missing tenant_id or workflow_id parameters' }, { status: 400 });
  }

  try {
    // 1. Fetch Workflow details
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('tenant_id', tenantId)
      .single();

    if (wfError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
    }

    // 2. Fetch Leads in Target Group
    let leads: any[] = [];
    if (workflow.target_group_id) {
      const { data: leadsData, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, name, phone, whatsapp_group_id, created_at, updated_at')
        .eq('workspace_id', tenantId)
        .eq('whatsapp_group_id', workflow.target_group_id);

      if (!leadsError && leadsData) {
        leads = leadsData;
      }
    }

    // 3. Fetch Workflow Logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('tenant_id', tenantId)
      .order('step_index', { ascending: true });

    const allLogs = logs || [];

    // 4. Assemble Telemetry and calculations
    const totalStepsCount = workflow.workflow_steps?.length || 0;

    const executions = leads.map(lead => {
      const leadLogs = allLogs.filter(log => log.lead_id === lead.id);
      const completedCount = leadLogs.filter(l => ['sent', 'delivered', 'read'].includes(l.status)).length;
      const failedCount    = leadLogs.filter(l => l.status === 'failed').length;
      const pendingCount   = leadLogs.filter(l => l.status === 'pending').length;
      const leftCount      = Math.max(0, totalStepsCount - completedCount - failedCount - pendingCount);

      // Determine Execution Status
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

      // Group Join Ingest Timestamp: earliest log sent_at timestamp, falling back to lead.created_at
      let groupJoinDate = new Date(lead.created_at);
      if (leadLogs.length > 0) {
        // Find minimum sent_at of SENT/COMPLETED logs to determine original trigger/join time
        const processedLogs = leadLogs.filter(l => !['pending', 'failed'].includes(l.status));
        const logTimes = processedLogs.map(l => new Date(l.sent_at).getTime()).filter(t => !isNaN(t));
        if (logTimes.length > 0) {
          const minTime = Math.min(...logTimes);
          groupJoinDate = new Date(minTime);
        }
      }
      const groupJoinTimeFormatted = formatIST(groupJoinDate);

      // Build Step-by-Step logs list with calculated future/past execution dates
      const stepsLogs = (workflow.workflow_steps || []).map((step: any, idx: number) => {
        const matchedLog = leadLogs.find(l => l.step_index === step.sort_index);
        
        let stepStatus = 'unsent';
        let errorMsg = null;
        let sentAtDate = new Date(groupJoinDate.getTime());
        
        // Calculate dynamic delivery date based on step delay
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
          
          if (stepStatus === 'pending') {
            sentAtFormatted = `Scheduled to send on: ${formatIST(matchedLog.sent_at)}`;
          } else {
            sentAtFormatted = `Sent at: ${formatIST(matchedLog.sent_at)}`;
          }
          
          if (matchedLog.updated_at) {
            updatedAtFormatted = formatIST(matchedLog.updated_at);
          }
        }

        return {
          id: matchedLog?.id || null,
          step_index: step.sort_index,
          template_name: step.template_name,
          status: stepStatus,
          error_message: errorMsg,
          sent_at: sentAtIso,
          sent_at_formatted: sentAtFormatted,
          updated_at: matchedLog?.updated_at || null,
          updated_at_formatted: updatedAtFormatted
        };
      });

      // Calculate last update time
      const lastLog = leadLogs.length > 0 ? leadLogs[leadLogs.length - 1] : null;
      const lastUpdateFormatted = lastLog ? formatIST(lastLog.updated_at) : formatIST(lead.updated_at);

      return {
        leadId: lead.id,
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
      };
    });

    return NextResponse.json({
      success: true,
      workflow,
      executions
    });

  } catch (err: any) {
    console.error('Fetch workflow execution telemetry error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
