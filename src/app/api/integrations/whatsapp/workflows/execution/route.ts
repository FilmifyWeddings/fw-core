import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseShortcodes } from '@/lib/baileys-serverless';
import { calculateSmartAntiBanSchedule } from '@/lib/whatsapp-antiban';

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
  const leadId = searchParams.get('lead_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const isAll = !workflowId || workflowId === 'all';

    // 1 & 2 & 3 & Quota (only for analytics overview when !leadId) — run ALL in parallel!
    const wfQuery = isAll
      ? supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('*')
          .eq('tenant_id', tenantId)
      : supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('*')
          .eq('id', workflowId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('id, name, email, phone, source, status, score, raw_payload, whatsapp_group_id, created_at, updated_at')
      .eq('workspace_id', tenantId);
    if (leadId) {
      leadsQuery = leadsQuery.eq('id', leadId);
    }

    const fetchLogs = async (): Promise<any[]> => {
      const PAGE_SIZE = 1000;
      const buildBase = () => {
        let q = supabaseAdmin
          .from('whatsapp_workflow_logs')
          .select('id, workflow_id, lead_id, step_index, status, error_message, sent_at, updated_at', { count: 'exact' })
          .eq('tenant_id', tenantId);
        if (leadId) q = q.eq('lead_id', leadId);
        if (!isAll) q = q.eq('workflow_id', workflowId);
        return q.order('step_index', { ascending: true });
      };

      const { data: firstPage, count } = await buildBase().range(0, PAGE_SIZE - 1);
      const rows = [...(firstPage || [])];
      const total = count ?? rows.length;
      if (total > PAGE_SIZE) {
        const restPromises: Promise<any>[] = [];
        for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
          restPromises.push(Promise.resolve(buildBase().range(from, from + PAGE_SIZE - 1)));
        }
        const pages = await Promise.all(restPromises);
        for (const p of pages) {
          if (p?.data) rows.push(...p.data);
        }
      }
      return rows;
    };

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const [wfRes, leadsRes, allLogs, monthlyCountRes, todayCountRes] = await Promise.all([
      wfQuery,
      leadsQuery,
      fetchLogs(),
      !leadId
        ? supabaseAdmin
            .from('whatsapp_workflow_logs')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .in('status', ['sent', 'delivered', 'read'])
            .gte('sent_at', startOfMonth)
        : Promise.resolve({ count: 0 }),
      !leadId
        ? supabaseAdmin
            .from('whatsapp_workflow_logs')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .in('status', ['sent', 'delivered', 'read'])
            .gte('sent_at', startOfToday)
        : Promise.resolve({ count: 0 }),
    ]);

    let workflowsList: any[] = [];
    if (isAll) {
      workflowsList = (wfRes.data as any[]) || [];
    } else {
      if (wfRes.error || !wfRes.data) {
        return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
      }
      workflowsList = [wfRes.data];
    }

    if (workflowsList.length === 0) {
      return NextResponse.json({
        success: true,
        workflow: { id: 'all', workflow_name: 'All Workflows', workflow_steps: [] },
        executions: []
      });
    }

    const leads = (leadsRes.data as any[]) || [];

    // 4. Load template details for shortcode preview parsing (text only, no heavy media payload blobs)
    const allSteps = workflowsList.flatMap(w => w.workflow_steps || []);
    const templateIds = Array.from(new Set(allSteps.map((s: any) => s.template_id).filter(Boolean))) as string[];

    const templatesMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      try {
        const { data: tenantTpls } = await supabaseAdmin
          .from('tenant_whatsapp_templates')
          .select('id, body_text')
          .in('id', templateIds)
          .eq('tenant_id', tenantId);

        if (tenantTpls) {
          tenantTpls.forEach(t => {
            templatesMap[t.id] = {
              body: t.body_text || '',
            };
          });
        }

        const missingIds = templateIds.filter(id => !templatesMap[id]);
        if (missingIds.length > 0) {
          const { data: legacyTpls } = await supabaseAdmin
            .from('whatsapp_templates')
            .select('id, payload')
            .in('id', missingIds)
            .eq('workspace_id', tenantId);

          if (legacyTpls) {
            legacyTpls.forEach(t => {
              const pl = t.payload || {};
              templatesMap[t.id] = {
                body: pl.body || pl.question || '',
              };
            });
          }
        }
      } catch (err) {
        console.error('Error prefetching templates for shortcode parsing:', err);
      }
    }

    // Index logs by `${workflow_id}:${lead_id}` for O(1) lookup per lead
    const logsByWfLead = new Map<string, any[]>();
    for (const log of allLogs) {
      const key = `${log.workflow_id}:${log.lead_id}`;
      let arr = logsByWfLead.get(key);
      if (!arr) {
        arr = [];
        logsByWfLead.set(key, arr);
      }
      arr.push(log);
    }

    // 5. Assemble Telemetry for all matching workflows and leads
    const executions: any[] = [];

    for (const workflow of workflowsList) {
      const totalStepsCount = workflow.workflow_steps?.length || 0;
      // Isolate leads strictly to workflows they were enrolled in
      const wfLeads = (workflow.target_group_id
        ? leads.filter(l => l.whatsapp_group_id === workflow.target_group_id)
        : leads
      ).filter(l => {
        const hasLogs = (logsByWfLead.get(`${workflow.id}:${l.id}`)?.length || 0) > 0;
        if (hasLogs) return true;
        const enrolledIds = l.raw_payload?.enrolled_workflow_ids;
        if (Array.isArray(enrolledIds)) {
          return enrolledIds.includes(workflow.id);
        }
        return true; // legacy fallback if enrolled_workflow_ids is not present
      });

      for (const lead of wfLeads) {
        const leadLogs = logsByWfLead.get(`${workflow.id}:${lead.id}`) || [];
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

        // Base time starts from workflow ENROLLMENT time, NOT old lead creation date
        let groupJoinDate = new Date();
        if (lead.raw_payload?.enrolled_at) {
          const d = new Date(lead.raw_payload.enrolled_at);
          if (!isNaN(d.getTime())) groupJoinDate = d;
        } else if (leadLogs.length > 0) {
          const allLogTimes = leadLogs
            .map(l => new Date(l.updated_at || l.sent_at).getTime())
            .filter(t => !isNaN(t));
          if (allLogTimes.length > 0) {
            groupJoinDate = new Date(Math.min(...allLogTimes));
          }
        } else if (lead.updated_at) {
          const d = new Date(lead.updated_at);
          if (!isNaN(d.getTime())) groupJoinDate = d;
        }
        const groupJoinTimeFormatted = formatIST(groupJoinDate);

        let cumulativeBaseMs = 0;

        const stepsLogs = (workflow.workflow_steps || []).map((step: any) => {
          const matchedLog = leadLogs.find(l => l.step_index === step.sort_index);
          let stepStatus = 'unsent';
          let errorMsg = null;

          const stepVal = Math.max(0, Number(step.delay_value) || 0);
          const stepUnit = (step.delay_unit || 'minutes').toLowerCase();
          let stepBaseMs = 0;
          if (stepUnit === 'seconds') stepBaseMs = stepVal * 1000;
          else if (stepUnit === 'minutes') stepBaseMs = stepVal * 60 * 1000;
          else if (stepUnit === 'hours') stepBaseMs = stepVal * 60 * 60 * 1000;
          else if (stepUnit === 'days') stepBaseMs = stepVal * 24 * 60 * 60 * 1000;

          cumulativeBaseMs += stepBaseMs;
          const stepBaseDate = new Date(groupJoinDate.getTime() + cumulativeBaseMs);

          // Deterministic seed for previewing and calculating anti-ban jitter
          const stepSeed = `${lead.id}_${step.sort_index}`;
          const calculatedDate = calculateSmartAntiBanSchedule(
            stepBaseDate,
            0,
            stepUnit,
            step.sort_index,
            false,
            stepSeed
          );

          let sentAtIso = calculatedDate.toISOString();
          let updatedAtFormatted = '—';

          if (matchedLog) {
            stepStatus = matchedLog.status;
            errorMsg = matchedLog.error_message;
            if (matchedLog.error_message === 'STOPPED') {
              stepStatus = 'stopped';
            }
            if (matchedLog.sent_at) {
              sentAtIso = matchedLog.sent_at;
            }
            if (matchedLog.updated_at && !isNaN(new Date(matchedLog.updated_at).getTime())) {
              updatedAtFormatted = formatIST(matchedLog.updated_at);
            }
          }

          // Format clean labels:
          // Pending or unsent: "Scheduled to send on: DD/MM/YYYY, hh:mm AM/PM"
          // Failed, completed, sent, stopped: "Scheduled for: DD/MM/YYYY, hh:mm AM/PM" (when it was supposed to send)
          const scheduledTimeFormatted = formatIST(sentAtIso);
          const sentAtFormatted = ['pending', 'unsent'].includes(stepStatus)
            ? `Scheduled to send on: ${scheduledTimeFormatted}`
            : `Scheduled for: ${scheduledTimeFormatted}`;

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
            parsed_body: parsedBody,
            target_type: step.target_type || 'client',
            target_group_jid: step.target_group_jid || null,
            target_group_name: step.target_group_name || null,
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

    const TOTAL_MONTHLY_QUOTA = 5000;
    const monthlySent = monthlyCountRes.count ?? 0;
    const todaySent = todayCountRes.count ?? 0;
    const remainingQuota = Math.max(0, TOTAL_MONTHLY_QUOTA - monthlySent);

    return NextResponse.json({
      success: true,
      workflow: isAll ? { id: 'all', workflow_name: 'All Workflows' } : workflowsList[0],
      executions,
      ...(leadId
        ? {}
        : {
            quota: {
              total: TOTAL_MONTHLY_QUOTA,
              monthlySent,
              todaySent,
              remaining: remainingQuota,
            },
          }),
    });
  } catch (err: any) {
    console.error('Fetch workflow execution telemetry error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
