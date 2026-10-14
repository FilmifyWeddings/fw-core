import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('form_id');
    const requestedWorkspaceId = searchParams.get('workspace_id');

    if (!formId) {
      return NextResponse.json({ success: false, error: 'form_id is required' }, { status: 400 });
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    const workspaceId = authResult.workspaceId || requestedWorkspaceId;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing workspace_id' }, { status: 401 });
    }

    // Query leads matching form_id
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, phone, email, source, status, score, city, budget, event_date, created_at, updated_at, raw_payload, form_id, source_form_id')
      .eq('workspace_id', workspaceId)
      .or(`form_id.eq.${formId},source_form_id.eq.${formId},raw_payload->>form_id.eq.${formId}`)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      console.error('[GET /api/meta/forms/leads] DB Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      form_id: formId,
      count: leads?.length || 0,
      leads: leads || [],
    });
  } catch (err: any) {
    console.error('[GET /api/meta/forms/leads] Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
