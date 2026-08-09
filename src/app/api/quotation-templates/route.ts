import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative Quotation Templates List API (GET)
 * Bypasses RLS using supabaseAdmin to ensure quotation_documents content_json is never blocked.
 * Filters strictly for normal users so inactive/unpublished system templates are 100% hidden.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail, isSuperAdmin } = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get('workspace_id') || userId;

    let query = supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at');

    if (isSuperAdmin) {
      // Super Admin sees all templates created by SYSTEM / Super Admin AND user workspace templates
      query = query.or(`workspace_id.eq.${workspaceIdParam},user_id.eq.${userId},is_system_template.eq.true,user_id.eq.SYSTEM`);
    } else {
      // Normal Users ONLY see PUBLISHED system templates (is_system_template = true AND status = 'published') OR their own workspace templates!
      query = query.or(`and(is_system_template.eq.true,status.eq.published),workspace_id.eq.${workspaceIdParam},user_id.eq.${userId}`);
    }

    const { data: templates, error: tmplErr } = await query.order('updated_at', { ascending: false });

    if (tmplErr) {
      console.error('[Quotation Templates API Error]:', tmplErr);
      return NextResponse.json({ error: tmplErr.message }, { status: 500 });
    }

    const validTemplates = (templates || []).filter(t => t.id && !t.id.startsWith('FW-Q-') && !t.id.startsWith('FW-L-'));
    const templateIds = validTemplates.map(t => t.id);

    // Fetch document content_json using supabaseAdmin (bypasses RLS)
    const docsMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: docsData } = await supabaseAdmin
        .from('quotation_documents')
        .select('template_id, content_json, document_json')
        .in('template_id', templateIds);

      if (docsData) {
        docsData.forEach(d => {
          if (d.template_id) {
            docsMap[d.template_id] = d.content_json || d.document_json || null;
          }
        });
      }
    }

    const results = validTemplates.map(t => ({
      ...t,
      content_json: docsMap[t.id] || null
    }));

    return NextResponse.json({
      success: true,
      templates: results
    });
  } catch (error: any) {
    console.error('Error fetching quotation templates:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
