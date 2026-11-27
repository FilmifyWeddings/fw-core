import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Retrieve all custom workflows for a tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const [workflowsRes, logsRes, monthlyCountRes, todayCountRes] = await Promise.all([
      supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('whatsapp_workflow_logs')
        .select('workflow_id, lead_id')
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('whatsapp_workflow_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'delivered', 'read'])
        .gte('sent_at', startOfMonth),
      supabaseAdmin
        .from('whatsapp_workflow_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'delivered', 'read'])
        .gte('sent_at', startOfToday),
    ]);

    const { data: workflows, error } = workflowsRes;
    const { data: logs, error: logsError } = logsRes;

    if (error) {
      // Fallback to empty if table doesn't exist yet
      return NextResponse.json({ success: true, results: [], quota: { total: 5000, monthlySent: 0, todaySent: 0, remaining: 5000 } });
    }

    const countsMap: Record<string, Set<string>> = {};
    if (!logsError && logs) {
      logs.forEach(log => {
        if (!countsMap[log.workflow_id]) {
          countsMap[log.workflow_id] = new Set();
        }
        countsMap[log.workflow_id].add(log.lead_id);
      });
    }

    const results = (workflows || []).map(wf => {
      let mappedTargetGroup = wf.target_group_id;
      if (!mappedTargetGroup) {
        const steps = Array.isArray(wf.workflow_steps) ? wf.workflow_steps : [];
        const isSelection = steps.some((s: any) => 
          s.trigger_event === 'client_selection_submitted' || 
          s.trigger === 'client_selection_submitted' ||
          s.target_group_name === 'Album Selection'
        ) || wf.workflow_name?.toLowerCase().includes('selection');
        if (isSelection) {
          mappedTargetGroup = 'client_selection_submitted';
        }
      }
      return {
        ...wf,
        target_group_id: mappedTargetGroup,
        execution_count: countsMap[wf.id] ? countsMap[wf.id].size : 0
      };
    });

    const TOTAL_MONTHLY_QUOTA = 5000;
    const monthlySent = monthlyCountRes.count ?? 0;
    const todaySent = todayCountRes.count ?? 0;
    const remainingQuota = Math.max(0, TOTAL_MONTHLY_QUOTA - monthlySent);

    return NextResponse.json({
      success: true,
      results,
      quota: {
        total: TOTAL_MONTHLY_QUOTA,
        monthlySent,
        todaySent,
        remaining: remainingQuota,
      }
    });
  } catch (err: any) {
    console.error('Fetch custom workflows error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new custom workflow
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { workflow_name, target_group_id, workflow_steps, status } = await req.json();

    if (!workflow_name) {
      return NextResponse.json({ error: 'Missing workflow_name parameter' }, { status: 400 });
    }

    const isSelectionTrigger = target_group_id === 'client_selection_submitted';
    const sanitizedTargetGroupId = isSelectionTrigger ? null : (target_group_id || null);

    const stepsToSave = Array.isArray(workflow_steps) ? workflow_steps.map((s: any) => {
      if (isSelectionTrigger) {
        return { ...s, trigger_event: 'client_selection_submitted' };
      }
      return s;
    }) : [];

    const { data: workflow, error } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .insert({
        tenant_id: tenantId,
        workflow_name,
        target_group_id: sanitizedTargetGroupId,
        workflow_steps: stepsToSave,
        status: status || 'Active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      workflow: {
        ...workflow,
        target_group_id: isSelectionTrigger ? 'client_selection_submitted' : workflow.target_group_id
      }
    });
  } catch (err: any) {
    console.error('Create custom workflow error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update an existing custom workflow or increment execution count
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');
  const workflowId = searchParams.get('workflow_id');

  if (!tenantId || !workflowId) {
    return NextResponse.json({ error: 'Missing tenant_id or workflow_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { workflow_name, target_group_id, workflow_steps, execution_count, status } = body;
    const isSelectionTrigger = target_group_id === 'client_selection_submitted';
    const isLocalId = workflowId.startsWith('local-workflow-');

    if (isLocalId) {
      // Self-healing: If frontend is trying to update a local fallback ID, insert it cleanly into PostgreSQL!
      const sanitizedTargetGroupId = isSelectionTrigger ? null : (target_group_id || null);
      const stepsToSave = Array.isArray(workflow_steps) ? workflow_steps.map((s: any) => {
        if (isSelectionTrigger) return { ...s, trigger_event: 'client_selection_submitted' };
        return s;
      }) : [];

      const { data: createdWf, error: createErr } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .insert({
          tenant_id: tenantId,
          workflow_name: workflow_name || 'Album Selection Alert',
          target_group_id: sanitizedTargetGroupId,
          workflow_steps: stepsToSave,
          status: status || 'Active'
        })
        .select()
        .single();

      if (createErr) throw createErr;
      return NextResponse.json({
        success: true,
        workflow: {
          ...createdWf,
          target_group_id: isSelectionTrigger ? 'client_selection_submitted' : createdWf.target_group_id
        }
      });
    }

    const updates: any = {};
    if (workflow_name !== undefined) updates.workflow_name = workflow_name;
    if (target_group_id !== undefined) {
      updates.target_group_id = isSelectionTrigger ? null : target_group_id;
    }
    if (workflow_steps !== undefined) {
      updates.workflow_steps = Array.isArray(workflow_steps) && isSelectionTrigger
        ? workflow_steps.map((s: any) => ({ ...s, trigger_event: 'client_selection_submitted' }))
        : workflow_steps;
    }
    if (execution_count !== undefined) updates.execution_count = execution_count;
    if (status !== undefined) updates.status = status;

    updates.updated_at = new Date().toISOString();

    const { data: workflow, error } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .update(updates)
      .eq('id', workflowId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      workflow: {
        ...workflow,
        target_group_id: (isSelectionTrigger || (!workflow.target_group_id && workflow.workflow_steps?.some?.((s: any) => s.trigger_event === 'client_selection_submitted')))
          ? 'client_selection_submitted'
          : workflow.target_group_id
      }
    });

    // If workflow was set to Inactive, cancel all pending queue tasks and logs immediately!
    if (status === 'Inactive') {
      try {
        const now = new Date().toISOString();
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({ status: 'stopped', error_message: 'STOPPED', updated_at: now })
          .eq('workflow_id', workflowId)
          .eq('status', 'pending');

        const qItems: any[] = [];
        for (let from = 0; ; from += 1000) {
          const { data: page } = await supabaseAdmin
            .from('baileys_action_queue')
            .select('id, payload')
            .eq('workspace_id', tenantId)
            .in('status', ['pending', 'processing'])
            .range(from, from + 999);
          if (!page || page.length === 0) break;
          qItems.push(...page);
          if (page.length < 1000) break;
        }

        const cancelIds = qItems
          .filter((item: any) => item.payload?.workflowId === workflowId || item.payload?.workflow_id === workflowId)
          .map((item: any) => item.id);

        if (cancelIds.length > 0) {
          const { error: cancelErr } = await supabaseAdmin
            .from('baileys_action_queue')
            .update({ status: 'cancelled', error_message: 'Cancelled: workflow paused/inactive', processed_at: now })
            .in('id', cancelIds);

          if (cancelErr) {
            await supabaseAdmin
              .from('baileys_action_queue')
              .delete()
              .in('id', cancelIds);
          }
        }
      } catch (cancelErr) {
        console.warn('[PATCH workflows] Cancel pending tasks notice:', cancelErr);
      }
    }

    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (err: any) {
    console.error('Update custom workflow error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a custom workflow
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');
  const workflowId = searchParams.get('workflow_id');

  if (!tenantId || !workflowId) {
    return NextResponse.json({ error: 'Missing tenant_id or workflow_id parameter' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();

    // Cancel pending queue actions and logs for this deleted workflow
    try {
      await supabaseAdmin
        .from('whatsapp_workflow_logs')
        .update({ status: 'stopped', error_message: 'STOPPED: workflow deleted', updated_at: now })
        .eq('workflow_id', workflowId)
        .eq('status', 'pending');

      const qItems: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: page } = await supabaseAdmin
          .from('baileys_action_queue')
          .select('id, payload')
          .eq('workspace_id', tenantId)
          .in('status', ['pending', 'processing'])
          .range(from, from + 999);
        if (!page || page.length === 0) break;
        qItems.push(...page);
        if (page.length < 1000) break;
      }

      const cancelIds = qItems
        .filter((item: any) => item.payload?.workflowId === workflowId || item.payload?.workflow_id === workflowId)
        .map((item: any) => item.id);

      if (cancelIds.length > 0) {
        const { error: cancelErr } = await supabaseAdmin
          .from('baileys_action_queue')
          .update({ status: 'cancelled', error_message: 'Cancelled: workflow deleted', processed_at: now })
          .in('id', cancelIds);

        if (cancelErr) {
          await supabaseAdmin
            .from('baileys_action_queue')
            .delete()
            .in('id', cancelIds);
        }
      }
    } catch (_) {}

    const { error } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete custom workflow error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
