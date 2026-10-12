import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

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
    let dayPeriod = (parts.find(p => p.type === 'dayPeriod')?.value || 'AM').toUpperCase();
    return `${day}/${month}/${year}, ${hour}:${minute} ${dayPeriod}`;
  } catch (_) {
    return '—';
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id');
  const workspaceId = searchParams.get('workspace_id') || searchParams.get('tenant_id');

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'lead_id is required' }, { status: 400 });
  }

  try {
    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id, name, phone, email, whatsapp_group_id, workspace_id, wa_welcome_sent, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const tenantId = workspaceId || lead.workspace_id;

    // 2. Fetch Contact Group Name if linked
    let groupName = 'Default Sequence';
    if (lead.whatsapp_group_id) {
      const { data: grp } = await supabaseAdmin
        .from('whatsapp_contact_groups')
        .select('name')
        .eq('id', lead.whatsapp_group_id)
        .maybeSingle();
      if (grp?.name) groupName = grp.name;
    }

    // 3. Fetch Welcome Steps from either whatsapp_automations or whatsapp_custom_workflows
    let steps: any[] = [];
    let workflowId: string | null = null;

    // A. Check for custom workflow linked to group
    if (lead.whatsapp_group_id) {
      const { data: customWf } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('id, workflow_name, workflow_steps')
        .eq('target_group_id', lead.whatsapp_group_id)
        .maybeSingle();

      if (customWf && Array.isArray(customWf.workflow_steps) && customWf.workflow_steps.length > 0) {
        workflowId = customWf.id;
        // Steps that are welcome (e.g. first 3 steps or delay === 0 or welcome in name)
        steps = customWf.workflow_steps.map((s: any, idx: number) => ({
          step_index: s.sort_index ?? idx,
          template_name: s.template_name || `Step ${idx + 1} Template`,
          template_id: s.template_id || `tpl_${idx + 1}`,
          delay_value: s.delay_value ?? 0,
          delay_unit: s.delay_unit || 'minutes',
        }));
      }
    }

    // B. Fallback to whatsapp_automations (welcome automation)
    if (steps.length === 0) {
      const { data: welcomeAuto } = await supabaseAdmin
        .from('whatsapp_automations')
        .select('*')
        .eq('workspace_id', tenantId)
        .eq('automation_type', 'welcome')
        .eq('is_active', true)
        .maybeSingle();

      if (welcomeAuto && Array.isArray(welcomeAuto.steps) && welcomeAuto.steps.length > 0) {
        steps = welcomeAuto.steps.map((s: any, idx: number) => ({
          step_index: idx,
          template_name: s.template_name || s.templateName || `Welcome Step ${idx + 1}`,
          template_id: s.template_id || s.templateId || `tpl_${idx + 1}`,
          delay_value: s.delay_seconds ? Math.round(s.delay_seconds / 60) : (s.delay_value || 0),
          delay_unit: s.delay_seconds ? 'seconds' : (s.delay_unit || 'minutes'),
        }));
      }
    }

    // C. Default 3-Step Sequence if no workflow steps found
    if (steps.length === 0) {
      steps = [
        { step_index: 0, template_name: 'welcome_intro', template_id: 'default_welcome_1', delay_value: 0, delay_unit: 'seconds' },
        { step_index: 1, template_name: 'portfolio_and_brochure', template_id: 'default_welcome_2', delay_value: 5, delay_unit: 'minutes' },
        { step_index: 2, template_name: 'packages_overview', template_id: 'default_welcome_3', delay_value: 15, delay_unit: 'minutes' },
      ];
    }

    // 4. Fetch logs for this lead
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('step_index', { ascending: true });

    const leadLogs = logs || [];

    // Also fetch pending queue items
    const { data: queueItems } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', tenantId)
      .eq('status', 'pending');

    const leadQueueItems = (queueItems || []).filter(
      q => q.payload?.leadId === leadId || (lead.phone && q.payload?.phone?.includes(lead.phone.replace(/[^0-9]/g, '')))
    );

    // Merge status into each step
    const resolvedSteps = steps.map((s, idx) => {
      const log = leadLogs.find(l => l.step_index === s.step_index || l.template_name === s.template_name);
      const queueItem = leadQueueItems.find(q => q.payload?.stepIndex === s.step_index || q.payload?.templateName === s.template_name);

      let status = 'unsent';
      let sentAt = null;
      let errorMsg = null;

      if (log) {
        status = log.status || 'unsent';
        sentAt = log.sent_at || log.updated_at || null;
        errorMsg = log.error_message || null;
      } else if (queueItem) {
        status = 'pending';
        sentAt = queueItem.next_retry_at || queueItem.created_at || null;
      } else if (idx === 0 && Boolean((lead as any).wa_welcome_sent)) {
        status = 'sent';
      }

      return {
        step_number: idx + 1,
        step_index: s.step_index,
        template_name: s.template_name,
        template_id: s.template_id,
        delay_value: s.delay_value,
        delay_unit: s.delay_unit,
        status,
        sent_at: sentAt,
        sent_at_formatted: formatIST(sentAt),
        error_message: errorMsg,
      };
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        group_name: groupName,
        whatsapp_group_id: lead.whatsapp_group_id,
      },
      workflow_id: workflowId,
      steps: resolvedSteps
    });
  } catch (err: any) {
    console.error('[welcome-sequence GET Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, leadId, stepIndex, templateName, templateId, gapValue, gapUnit, workspaceId: reqWsId } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id, name, phone, email, whatsapp_group_id, workspace_id, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const tenantId = reqWsId || lead.workspace_id;
    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    const cleanJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    const nowIso = new Date().toISOString();

    // ── ACTION A: SEND SINGLE STEP ───────────────────────────────────────────
    if (action === 'send_single_step') {
      const stepIdx = typeof stepIndex === 'number' ? stepIndex : 0;
      const tplName = templateName || 'Welcome Message';

      // Queue into baileys_action_queue
      const { data: queueItem, error: queueErr } = await supabaseAdmin
        .from('baileys_action_queue')
        .insert({
          workspace_id: tenantId,
          action_type: 'send_template',
          status: 'pending',
          attempt_count: 0,
          next_retry_at: nowIso,
          payload: {
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            recipientJid: cleanJid,
            templateName: tplName,
            templateId: templateId || null,
            stepIndex: stepIdx,
            lead_payload: lead.raw_payload || {},
            forceImmediate: true
          }
        })
        .select('*')
        .single();

      if (queueErr) {
        throw new Error(`Queue insert failed: ${queueErr.message}`);
      }

      // Upsert into whatsapp_workflow_logs
      await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .upsert({
          tenant_id: tenantId,
          lead_id: lead.id,
          step_index: stepIdx,
          phone_number: lead.phone,
          template_name: tplName,
          status: 'pending',
          sent_at: nowIso,
          updated_at: nowIso,
          error_message: null
        }, { onConflict: 'lead_id,step_index' })
        .catch(() => {});

      // Update lead flag
      await supabaseAdmin
        .from('leads')
        .update({ wa_welcome_sent: true, updated_at: nowIso })
        .eq('id', lead.id)
        .catch(() => {});

      // Wake queue poller
      forceWakeQueue(supabaseAdmin, tenantId).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Step ${stepIdx + 1} (${tplName}) queued for dispatch!`,
        queueId: queueItem?.id
      });
    }

    // ── ACTION B: RESEND SEQUENCE WITH CONFIGURABLE GAP ──────────────────────
    if (action === 'resend_sequence') {
      const gapVal = Math.max(1, parseInt(gapValue || '5', 10));
      const unit = (gapUnit || 'seconds').toLowerCase();

      // Resolve step list
      let stepsToDispatch: any[] = [];
      if (lead.whatsapp_group_id) {
        const { data: customWf } = await supabaseAdmin
          .from('whatsapp_custom_workflows')
          .select('id, workflow_steps')
          .eq('target_group_id', lead.whatsapp_group_id)
          .maybeSingle();

        if (customWf?.workflow_steps?.length) {
          stepsToDispatch = customWf.workflow_steps;
        }
      }

      if (stepsToDispatch.length === 0) {
        const { data: welcomeAuto } = await supabaseAdmin
          .from('whatsapp_automations')
          .select('steps')
          .eq('workspace_id', tenantId)
          .eq('automation_type', 'welcome')
          .eq('is_active', true)
          .maybeSingle();

        if (welcomeAuto?.steps?.length) {
          stepsToDispatch = welcomeAuto.steps;
        }
      }

      if (stepsToDispatch.length === 0) {
        stepsToDispatch = [
          { template_name: 'welcome_intro', sort_index: 0 },
          { template_name: 'portfolio_and_brochure', sort_index: 1 },
          { template_name: 'packages_overview', sort_index: 2 },
        ];
      }

      // Multiplier in ms
      const gapMs = unit === 'days'
        ? gapVal * 86400 * 1000
        : unit === 'minutes'
          ? gapVal * 60 * 1000
          : gapVal * 1000;

      const baseTime = Date.now();
      let queuedCount = 0;

      for (let i = 0; i < stepsToDispatch.length; i++) {
        const step = stepsToDispatch[i];
        const stepIdx = step.sort_index ?? i;
        const tplName = step.template_name || step.templateName || `Step ${i + 1}`;
        const scheduledTime = new Date(baseTime + (i * gapMs)).toISOString();

        await supabaseAdmin
          .from('baileys_action_queue')
          .insert({
            workspace_id: tenantId,
            action_type: 'send_template',
            status: 'pending',
            attempt_count: 0,
            next_retry_at: scheduledTime,
            payload: {
              leadId: lead.id,
              leadName: lead.name,
              phone: lead.phone,
              recipientJid: cleanJid,
              templateName: tplName,
              templateId: step.template_id || null,
              stepIndex: stepIdx,
              lead_payload: lead.raw_payload || {},
            }
          });

        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .upsert({
            tenant_id: tenantId,
            lead_id: lead.id,
            step_index: stepIdx,
            phone_number: lead.phone,
            template_name: tplName,
            status: 'pending',
            sent_at: scheduledTime,
            updated_at: nowIso,
            error_message: null
          }, { onConflict: 'lead_id,step_index' })
          .catch(() => {});

        queuedCount++;
      }

      await supabaseAdmin
        .from('leads')
        .update({ wa_welcome_sent: true, updated_at: nowIso })
        .eq('id', lead.id)
        .catch(() => {});

      forceWakeQueue(supabaseAdmin, tenantId).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Queued ${queuedCount} sequence steps spaced by ${gapVal} ${unit}!`,
        queuedCount
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[welcome-sequence POST Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
