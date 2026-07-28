import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * POST /api/meta/forms/mapping
 * Update mapped WhatsApp Contact Group (contact_group_id) for a Meta lead form.
 * Body: { form_id: string, contact_group_id: string | null, workspace_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { form_id, contact_group_id, workspace_id: requestedWorkspaceId } = body;

    if (!form_id) {
      return NextResponse.json(
        { success: false, error: 'form_id is required' },
        { status: 400 }
      );
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;
    const now = new Date().toISOString();

    // Fetch form details from fb_lead_forms to preserve form_name and page_id
    const { data: formRecord } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('form_name, page_id')
      .eq('workspace_id', workspaceId)
      .eq('form_id', form_id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from('fb_form_mappings')
      .upsert(
        {
          workspace_id: workspaceId,
          form_id,
          page_id: formRecord?.page_id || null,
          form_name: formRecord?.form_name || form_id,
          contact_group_id: contact_group_id || null,
          updated_at: now,
        },
        { onConflict: 'workspace_id,form_id' }
      )
      .select('form_id, contact_group_id')
      .single();

    if (error) {
      console.error('[Forms Mapping API] Error updating contact_group_id:', error.message, error.code);

      if (error.code === '42703') {
        return NextResponse.json({
          success: false,
          error: 'Missing column contact_group_id. Please run migration 20260729000003_fb_mappings_contact_group.sql in Supabase SQL Editor.',
          code: 'MIGRATION_REQUIRED'
        }, { status: 400 });
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      form_id: data?.form_id || form_id,
      contact_group_id: data?.contact_group_id || contact_group_id || null,
    });
  } catch (err: any) {
    console.error('[Forms Mapping API Exception]:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update form group mapping' },
      { status: 500 }
    );
  }
}
