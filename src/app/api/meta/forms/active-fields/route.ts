import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meta/forms/active-fields?workspace_id=XXX
 * Returns ONLY currently active Meta Lead Forms with their custom questions & dynamic field tags.
 * Deactivated/disabled forms are strictly excluded.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    const workspaceId = authResult.authorized ? authResult.workspaceId : (requestedWorkspaceId || '');
    if (!workspaceId) {
      if (authResult.errorResponse) return authResult.errorResponse;
      return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
    }

    // 1. Fetch form mappings that are explicitly ACTIVE
    const { data: mappings, error: mapErr } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('id, form_id, form_name, page_id, is_active, mapping_config')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (mapErr) {
      console.error('[Active Fields API] Error fetching mappings:', mapErr.message);
    }

    // 2. Fetch lead forms that are ENABLED
    const { data: leadForms, error: formsErr } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('form_id, form_name, page_id, is_enabled')
      .eq('workspace_id', workspaceId)
      .eq('is_enabled', true);

    if (formsErr) {
      console.error('[Active Fields API] Error fetching lead forms:', formsErr.message);
    }

    // 3. Merge active forms ensuring only ACTIVE forms are included
    const activeFormsMap = new Map<string, {
      form_id: string;
      form_name: string;
      page_id: string | null;
      questions: Array<{ key: string; label: string; tag: string }>;
    }>();

    // Process mappings first (they contain mapping_config.questions)
    for (const m of (mappings || [])) {
      if (!m.form_id) continue;
      // If corresponding fb_lead_forms is explicitly disabled, skip it
      const lf = (leadForms || []).find(f => f.form_id === m.form_id);
      if (lf && lf.is_enabled === false) continue;

      const rawQuestions: any[] = (m.mapping_config as any)?.questions || [];
      const questions = rawQuestions.map((q: any) => {
        const rawKey = String(q.key || q.name || '').trim();
        const rawLabel = String(q.label || q.question || rawKey).trim();
        return {
          key: rawKey,
          label: rawLabel,
          tag: `{{${rawKey}}}`,
        };
      }).filter(q => q.key.length > 0);

      activeFormsMap.set(m.form_id, {
        form_id: m.form_id,
        form_name: m.form_name || lf?.form_name || `Lead Form ${m.form_id}`,
        page_id: m.page_id || lf?.page_id || null,
        questions,
      });
    }

    // Also include enabled forms from fb_lead_forms if not already present
    for (const lf of (leadForms || [])) {
      if (!lf.form_id) continue;
      if (!activeFormsMap.has(lf.form_id)) {
        // If it was explicitly disabled in mappings, skip
        const m = (mappings || []).find(map => map.form_id === lf.form_id);
        if (m && m.is_active === false) continue;

        activeFormsMap.set(lf.form_id, {
          form_id: lf.form_id,
          form_name: lf.form_name || `Lead Form ${lf.form_id}`,
          page_id: lf.page_id || null,
          questions: [],
        });
      }
    }

    const activeForms = Array.from(activeFormsMap.values());

    return NextResponse.json({
      success: true,
      forms: activeForms,
      total_active_forms: activeForms.length,
    });
  } catch (err: any) {
    console.error('[Active Fields API] Unexpected error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
