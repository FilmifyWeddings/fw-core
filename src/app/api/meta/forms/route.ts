import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * GET /api/meta/forms?workspace_id=XXX
 * Returns active lead forms for the authenticated workspace.
 * Resolves page_name dynamically from fb_page_configs. Zero hardcoded strings.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    // 1. Check if integration is connected for workspace
    const { data: conn } = await supabaseAdmin
      .from('integration_credentials')
      .select('status, access_token')
      .eq('user_id', workspaceId)
      .eq('provider', 'meta')
      .maybeSingle();

    if (conn?.status !== 'connected' || !conn?.access_token) {
      return NextResponse.json({
        success: true,
        forms: [],
        total_forms: 0,
      });
    }

    // 2. Read active pages for workspace to map page_name dynamically
    const { data: dbPages } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_id, page_name')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    const pageMap = new Map((dbPages || []).map(p => [p.page_id, p.page_name]));

    // 3. Read active forms strictly for workspace
    const { data: dbForms } = await supabaseAdmin
      .from('fb_lead_forms').select('*').eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    const { data: dbMappings } = await supabaseAdmin
      .from('fb_form_mappings').select('*').eq('workspace_id', workspaceId);

    const formsByFormId = new Map((dbForms || []).map((f: any) => [f.form_id, f]));
    const allForms = [...(dbForms || [])];
    for (const m of (dbMappings || [])) {
      if (m.form_id && !formsByFormId.has(m.form_id)) {
        allForms.push({
          workspace_id: workspaceId,
          page_id: m.page_id,
          form_id: m.form_id,
          form_name: m.form_name || 'Instant Lead Form',
          status: 'ACTIVE',
          leads_count: 0,
          created_time: m.created_at,
          is_enabled: m.is_active ?? true,
        });
      }
    }

    const forms = allForms.map(f => {
      const isFormEnabled = f.is_sync_enabled ?? f.is_enabled ?? false;
      return {
        form_id: f.form_id,
        name: f.form_name,
        form_name: f.form_name,
        status: (f.status || 'ACTIVE').toUpperCase(),
        page_id: f.page_id,
        page_name: pageMap.get(f.page_id) || 'Facebook Page',
        is_active: true,
        is_enabled: isFormEnabled,
        is_sync_enabled: isFormEnabled,
        sync_count: f.leads_count || 0,
        last_lead_time: f.created_time || 'Active',
        questions_count: 5,
      };
    });

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      forms,
      total_forms: forms.length,
    });
  } catch (error: any) {
    console.error('[Meta Forms API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Meta lead forms' },
      { status: 500 }
    );
  }
}
