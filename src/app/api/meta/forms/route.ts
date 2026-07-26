import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    // Check if integration is connected for workspace
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

    // Read active forms strictly for workspace
    const { data: dbForms } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const forms = (dbForms || []).map(f => ({
      form_id: f.form_id,
      name: f.form_name,
      form_name: f.form_name,
      status: (f.status || 'ACTIVE').toUpperCase(),
      page_id: f.page_id,
      page_name: 'Filmify Weddings',
      ad_account_name: 'Meta Ads Account',
      is_active: true,
      sync_count: f.leads_count || 0,
      last_lead_time: f.created_time || 'Active',
      questions_count: 5,
    }));

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
