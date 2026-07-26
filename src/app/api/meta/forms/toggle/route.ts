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

    if (error) {
      console.error('[Forms Toggle API] fb_lead_forms update error:', error.message, error.code);

      // Column pending migration – track client-side only
      if (error.code === '42703') {
        return NextResponse.json({
          success: true,
          form_id,
          is_enabled,
          warning: 'is_enabled column pending migration. Run SQL: ALTER TABLE fb_lead_forms ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;',
        });
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // ── Mirror toggle to fb_form_mappings.is_active (legacy webhook check) ───
    // Use upsert so it works even if the mapping doesn't exist yet.
    const { error: mappingError } = await supabaseAdmin
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

    if (mappingError && mappingError.code !== '42P10') {
      // Log but don't fail — the primary toggle in fb_lead_forms is the authoritative source
      console.warn('[Forms Toggle API] fb_form_mappings mirror error (non-fatal):', mappingError.message, mappingError.code);
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
