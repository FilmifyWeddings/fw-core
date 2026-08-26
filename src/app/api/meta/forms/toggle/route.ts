import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * PATCH /api/meta/forms/toggle
 * Toggle is_enabled for a specific form in BOTH fb_lead_forms and fb_form_mappings.
 * Body: { form_id: string, is_enabled: boolean, workspace_id?: string }
 *
 * When is_enabled = false: webhook handler skips leads for this form only.
 * When is_enabled = true: webhook handler processes leads normally.
 * The entire Meta connection is NEVER disabled.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { form_id, is_enabled, workspace_id: requestedWorkspaceId } = body;

    if (!form_id || typeof is_enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'form_id and is_enabled are required' },
        { status: 400 }
      );
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;
    const now = new Date().toISOString();

    // ── Update fb_lead_forms.is_enabled (primary toggle source) ──────────────
    const { data, error } = await supabaseAdmin
      .from('fb_lead_forms')
      .update({ is_enabled, updated_at: now })
      .eq('workspace_id', workspaceId)
      .eq('form_id', form_id)
      .select('form_id, form_name, is_enabled')
      .single();

    if (error && error.code !== '42703') {
      console.error('[Forms Toggle API] fb_lead_forms update error:', error.message);
    }

    // ── Update meta_lead_forms.is_enabled / is_sync_enabled ──────────────────
    try {
      await supabaseAdmin
        .from('meta_lead_forms')
        .update({ is_enabled, updated_at: now })
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id);
    } catch (_) {}

    // ── Mirror toggle to fb_form_mappings.is_active (legacy webhook check) ───
    try {
      await supabaseAdmin
        .from('fb_form_mappings')
        .upsert(
          {
            workspace_id: workspaceId,
            form_id,
            form_name: data?.form_name || form_id,
            is_active: is_enabled,
            updated_at: now,
          },
          { onConflict: 'workspace_id,form_id', ignoreDuplicates: false }
        );
    } catch (_) {}

    // ── Fetch & save questions from Graph API when form is enabled ─────────
    if (is_enabled) {
      try {
        const { data: formRow } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('page_id')
          .eq('workspace_id', workspaceId)
          .eq('form_id', form_id)
          .maybeSingle();

        if (formRow?.page_id) {
          const { data: pageRow } = await supabaseAdmin
            .from('fb_page_configs')
            .select('page_access_token')
            .eq('workspace_id', workspaceId)
            .eq('page_id', formRow.page_id)
            .maybeSingle();

          if (pageRow?.page_access_token) {
            const graphUrl = `https://graph.facebook.com/v20.0/${form_id}?fields=id,name,status,questions&access_token=${pageRow.page_access_token}`;
            const res = await fetch(graphUrl);
            const gData = await res.json();
            if (gData?.questions && Array.isArray(gData.questions)) {
              await supabaseAdmin
                .from('fb_form_mappings')
                .upsert({
                  workspace_id: workspaceId,
                  form_id,
                  page_id: formRow.page_id,
                  form_name: data?.form_name || form_id,
                  is_active: true,
                  is_tagging_enabled: true,
                  mapping_config: { questions: gData.questions },
                  updated_at: now,
                }, { onConflict: 'workspace_id,form_id' });
            }
          }
        }
      } catch (err) {
        console.error('[Forms Toggle API] Error fetching form questions from Graph API:', err);
      }
    }

    return NextResponse.json({
      success: true,
      form_id: data?.form_id || form_id,
      form_name: data?.form_name || '',
      is_enabled: data?.is_enabled ?? is_enabled,
    });
  } catch (err: any) {
    console.error('[Forms Toggle API Exception]:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to toggle form' },
      { status: 500 }
    );
  }
}
