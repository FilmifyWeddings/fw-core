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
    const { data: workflows, error } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to empty if table doesn't exist yet
      return NextResponse.json({ success: true, results: [] });
    }

    return NextResponse.json({
      success: true,
      results: workflows || []
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

    const { data: workflow, error } = await supabaseAdmin
      .from('whatsapp_custom_workflows')
      .insert({
        tenant_id: tenantId,
        workflow_name,
        target_group_id: target_group_id || null,
        workflow_steps: workflow_steps || [],
        status: status || 'Active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      workflow
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

    const updates: any = {};
    if (workflow_name !== undefined) updates.workflow_name = workflow_name;
    if (target_group_id !== undefined) updates.target_group_id = target_group_id;
    if (workflow_steps !== undefined) updates.workflow_steps = workflow_steps;
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
