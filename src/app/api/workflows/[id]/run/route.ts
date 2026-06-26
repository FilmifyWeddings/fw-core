import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { executeWorkflow } from '@/lib/workflow-engine';

export const maxDuration = 60;
export const runtime = 'nodejs';

// POST /api/workflows/[id]/run — manually trigger a workflow run (Test Run)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch workflow
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from('custom_workflows')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', user.id)
      .maybeSingle();

    if (wfError) return NextResponse.json({ error: wfError.message }, { status: 500 });
    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    if (!workflow.is_enabled) return NextResponse.json({ error: 'Workflow is disabled' }, { status: 400 });

    // Parse test payload from body (optional) — allows passing mock trigger data
    let triggerPayload: Record<string, unknown> = {};
    try {
      const body = await req.json();
      if (body.trigger_payload) triggerPayload = body.trigger_payload;
    } catch { /* no body */ }

    // Default test payload if none provided
    if (Object.keys(triggerPayload).length === 0) {
      triggerPayload = {
        name: 'Test User',
        phone: '919999999999',
        email: 'test@example.com',
        _test_run: true,
      };
    }

    const result = await executeWorkflow(workflow, triggerPayload, supabaseAdmin);

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      stepsCompleted: result.stepsCompleted,
      stepsFailed: result.stepsFailed,
    });
  } catch (err: any) {
    console.error('[POST /api/workflows/[id]/run]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
