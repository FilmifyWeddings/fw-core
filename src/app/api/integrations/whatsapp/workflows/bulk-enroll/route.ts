import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateSmartAntiBanSchedule } from '@/lib/whatsapp-antiban';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadIds,
      groupId,
      workflowIds = [],
      delayValue = 5,
      delayUnit = 'minutes',
      workspaceId,
    } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No leads provided' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    // 1. If groupId is null/empty -> Unassign leads
    if (!groupId) {
      await supabaseAdmin
        .from('leads')
        .update({
          whatsapp_group_id: null,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds)
        .eq('workspace_id', workspaceId);

      return NextResponse.json({
        success: true,
        message: 'Leads unassigned from group successfully.',
        enrolledCount: 0,
        duplicateCount: 0,
      });
    }

    // 2. Fetch full lead details
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from('leads')
      .select('id, name, phone, email, raw_payload, whatsapp_group_id, workspace_id')
      .in('id', leadIds)
      .eq('workspace_id', workspaceId);

    if (leadsErr || !leads || leads.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching leads found' }, { status: 404 });
    }

    // 3. Duplicate phone detection
    // A: Check duplicates within the batch
    const seenPhonesInBatch = new Set<string>();
    const batchDuplicateIds = new Set<string>();

    leads.forEach(lead => {
      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        batchDuplicateIds.add(lead.id);
        return;
      }
      if (seenPhonesInBatch.has(cleanPhone)) {
        batchDuplicateIds.add(lead.id);
      } else {
        seenPhonesInBatch.add(cleanPhone);
      }
    });

    // B: Check if phone numbers are already enrolled in the target workflows / group
    const cleanPhonesList = Array.from(seenPhonesInBatch);
    const existingLogsQuery = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('phone_number, lead_id, workflow_id')
      .eq('tenant_id', workspaceId)
      .in('phone_number', cleanPhonesList);

    const existingEnrolledPhones = new Set<string>();
    if (existingLogsQuery.data && workflowIds.length > 0) {
      existingLogsQuery.data.forEach(log => {
        if (workflowIds.includes(log.workflow_id)) {
          existingEnrolledPhones.add(log.phone_number);
        }
      });
    }

    // Classify leads
    const duplicateLeadIds: string[] = [];
    const uniqueLeads: typeof leads = [];

    leads.forEach(lead => {
      const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
      if (batchDuplicateIds.has(lead.id) || existingEnrolledPhones.has(cleanPhone)) {
        duplicateLeadIds.push(lead.id);
      } else {
        uniqueLeads.push(lead);
      }
    });

    // 4. Temporarily pause all active workflows for this group so Postgres trigger does NOT auto-enroll unselected workflows
    const { data: allGroupWorkflows } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('id, status')
      .eq('target_group_id', groupId)
      .eq('tenant_id', workspaceId)
      .eq('status', 'Active');

    const activeWorkflowIdsToPause = (allGroupWorkflows || []).map(w => w.id);

    if (activeWorkflowIdsToPause.length > 0) {
      await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .update({ status: '__BULK_TEMP_PAUSED__' })
        .in('id', activeWorkflowIdsToPause);
    }

    try {
      // 5. Update duplicate leads with duplicate_tag: true (assign group, but DO NOT dispatch workflows)
      if (duplicateLeadIds.length > 0) {
        for (const dupId of duplicateLeadIds) {
          const lead = leads.find(l => l.id === dupId);
          const existingRaw = lead?.raw_payload || {};
          await supabaseAdmin
            .from('leads')
            .update({
              whatsapp_group_id: groupId,
              raw_payload: {
                ...existingRaw,
                duplicate_tag: true,
                duplicate_detected_at: new Date().toISOString(),
                skip_auto_trigger: true,
                enrolled_workflow_ids: []
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', dupId);
        }
      }

      // 6. Update unique leads with skip_auto_trigger: true and enrolled_workflow_ids
      if (uniqueLeads.length > 0) {
        for (const uLead of uniqueLeads) {
          const existingRaw = uLead.raw_payload || {};
          await supabaseAdmin
            .from('leads')
            .update({
              whatsapp_group_id: groupId,
              raw_payload: {
                ...existingRaw,
                duplicate_tag: false,
                skip_auto_trigger: true,
                enrolled_workflow_ids: workflowIds,
                enrolled_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', uLead.id);
        }
      }
    } finally {
      // 7. Guaranteed restoration of workflow status back to 'Active'
      if (activeWorkflowIdsToPause.length > 0) {
        await supabaseAdmin
          .from('whatsapp_custom_workflows')
          .update({ status: 'Active' })
          .in('id', activeWorkflowIdsToPause);
      }
    }

    // 8. Prune any stale pending workflow logs for unselected workflows of this group
    const unselectedWorkflowIds = activeWorkflowIdsToPause.filter(id => !workflowIds.includes(id));
    if (unselectedWorkflowIds.length > 0) {
      try {
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .delete()
          .in('lead_id', leadIds)
          .in('workflow_id', unselectedWorkflowIds)
          .eq('status', 'pending');
      } catch (_) {}
    }

    // 6. If workflowIds are provided and there are unique leads, enroll them with pacing
    if (workflowIds.length > 0 && uniqueLeads.length > 0) {
      const { data: workflows } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('*')
        .in('id', workflowIds)
        .eq('tenant_id', workspaceId);

      const activeWorkflows = workflows || [];

      // Inter-lead pacing delay in ms
      const pVal = Math.max(0, Number(delayValue) || 0);
      const pUnit = (delayUnit || 'minutes').toLowerCase();
      let interLeadDelayMs = 0;
      if (pUnit === 'seconds') interLeadDelayMs = pVal * 1000;
      else if (pUnit === 'minutes') interLeadDelayMs = pVal * 60 * 1000;
      else if (pUnit === 'hours') interLeadDelayMs = pVal * 60 * 60 * 1000;
      else if (pUnit === 'days') interLeadDelayMs = pVal * 24 * 60 * 60 * 1000;

      const now = Date.now();

      for (let i = 0; i < uniqueLeads.length; i++) {
        const lead = uniqueLeads[i];
        const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
        if (!cleanPhone) continue;

        // Lead baseline time: Lead 0 is now + 2s, Lead 1 is now + delay + jitter, etc.
        const leadBaseMs = i * interLeadDelayMs;
        const leadStartTime = new Date(now + leadBaseMs);

        // Build template variables
        const v_variables: Record<string, any> = {
          Name: lead.name || 'Guest',
          Name_1: lead.name || 'Guest',
          lead_name: lead.name || 'Guest',
          first_name: (lead.name || 'Guest').split(' ')[0],
          last_name: (lead.name || '').replace(/^[^ ]+ */, ''),
          full_name: lead.name || 'Guest',
          phone: lead.phone || '',
          phone_number: lead.phone || '',
          email: lead.email || '',
          timestamp: new Date().toISOString(),
          current_date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          ...(lead.raw_payload || {}),
        };

        for (const wf of activeWorkflows) {
          // Increment execution count
          await supabaseAdmin
            .from('whatsapp_custom_workflows')
            .update({ execution_count: (wf.execution_count || 0) + 1 })
            .eq('id', wf.id);

          let cumulativeStepMs = 0;
          const steps = (wf.workflow_steps || []).sort((a: any, b: any) => (a.sort_index || 0) - (b.sort_index || 0));

          for (const step of steps) {
            const stepVal = Math.max(0, Number(step.delay_value) || 0);
            const stepUnit = (step.delay_unit || 'minutes').toLowerCase();

            let stepMs = 0;
            if (stepUnit === 'seconds') stepMs = stepVal * 1000;
            else if (stepUnit === 'minutes') stepMs = stepVal * 60 * 1000;
            else if (stepUnit === 'hours') stepMs = stepVal * 60 * 60 * 1000;
            else if (stepUnit === 'days') stepMs = stepVal * 24 * 60 * 60 * 1000;

            cumulativeStepMs += stepMs;
            const targetStepBase = new Date(leadStartTime.getTime() + cumulativeStepMs);

            const stepSeed = `${lead.id}_${wf.id}_${step.sort_index}`;
            const stepScheduledAt = calculateSmartAntiBanSchedule(
              targetStepBase,
              0,
              stepUnit,
              step.sort_index,
              false,
              stepSeed
            );

            const logId = crypto.randomUUID();

            const isGroup = step.target_type === 'group' || (step.target_group_jid && step.target_group_jid !== '');
            const targetRecipient = isGroup ? step.target_group_jid : cleanPhone;

            // 1. Insert into workflow logs
            await supabaseAdmin.from('whatsapp_workflow_logs').insert({
              id: logId,
              tenant_id: workspaceId,
              lead_id: lead.id,
              workflow_id: wf.id,
              step_index: step.sort_index,
              phone_number: targetRecipient,
              template_name: step.template_name,
              status: 'pending',
              sent_at: stepScheduledAt.toISOString(),
            });

            // 2. Insert into Baileys action queue
            if (isGroup) {
              await supabaseAdmin.from('baileys_action_queue').insert({
                workspace_id: workspaceId,
                action_type: 'group_dispatch',
                payload: {
                  to: step.target_group_jid,
                  groupJid: step.target_group_jid,
                  groupId: step.target_group_jid,
                  targetGroupName: step.target_group_name,
                  leadData: v_variables,
                  variables: v_variables,
                  template_name: step.template_name,
                  templateId: step.template_id,
                  workflowLogId: logId,
                },
                status: 'pending',
                next_retry_at: stepScheduledAt.toISOString(),
                priority: 5,
              });
            } else {
              await supabaseAdmin.from('baileys_action_queue').insert({
                workspace_id: workspaceId,
                action_type: 'send_template',
                payload: {
                  to: `${cleanPhone}@s.whatsapp.net`,
                  templateId: step.template_id,
                  template_name: step.template_name,
                  variables: v_variables,
                  workflowLogId: logId,
                },
                status: 'pending',
                next_retry_at: stepScheduledAt.toISOString(),
                priority: 5,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      enrolledCount: uniqueLeads.length,
      duplicateCount: duplicateLeadIds.length,
      duplicateLeadIds,
      message: `Enrolled ${uniqueLeads.length} leads with anti-ban pacing.${duplicateLeadIds.length > 0 ? ` Tagged ${duplicateLeadIds.length} duplicate leads without sending.` : ''}`
    });

  } catch (err: any) {
    console.error('[Bulk Workflow Enrollment Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
