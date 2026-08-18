import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative Quotation Templates List API (GET)
 * Bypasses RLS using supabaseAdmin to ensure quotation_documents content_json is never blocked.
 * Guarantees exact user-selected default_template_id is marked as default in response.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail, isSuperAdmin } = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get('workspace_id');
    
    // Effective tenant/user ID
    const effectiveUserId = (userId && userId !== 'demo_user')
      ? userId
      : (workspaceIdParam && workspaceIdParam !== 'demo_user' ? workspaceIdParam : '');

    let activeDefaultId: string | null = null;
    if (effectiveUserId) {
      try {
        const { data: userRec } = await supabaseAdmin.auth.admin.getUserById(effectiveUserId);
        if (userRec?.user?.user_metadata?.default_template_id) {
          activeDefaultId = userRec.user.user_metadata.default_template_id;
        }
      } catch (err) {}
    }

    let query = supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
      .not('status', 'in', '("archived","deleted")')
      .not('id', 'ilike', 'FW-Q-%')
      .not('id', 'ilike', 'FW-L-%');

    if (effectiveUserId) {
      // Strictly only this user's templates
      query = query.or(`workspace_id.eq.${effectiveUserId},user_id.eq.${effectiveUserId}`);
    } else if (isSuperAdmin && searchParams.get('admin_all') === 'true') {
      // Super admin overview only when explicitly requested
    } else {
      // Unauthenticated fallback: only published system templates
      query = query.eq('is_system_template', true).eq('status', 'published');
    }

    const { data: templates, error: tmplErr } = await query.order('updated_at', { ascending: false });

    if (tmplErr) {
      console.error('[Quotation Templates API Error]:', tmplErr);
      return NextResponse.json({ error: tmplErr.message }, { status: 500 });
    }

    // Deduplicate by ID and clean list
    const seenIds = new Set<string>();
    let validTemplates = (templates || []).filter(t => {
      if (!t.id || seenIds.has(t.id)) return false;
      if (t.id.startsWith('FW-Q-') || t.id.startsWith('FW-L-')) return false;
      if (t.status === 'archived' || t.status === 'deleted') return false;
      seenIds.add(t.id);
      return true;
    });

    // If a user has NO custom templates yet, provide the system default template so they can fork it
    if (validTemplates.length === 0) {
      const { data: sysTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
        .eq('is_system_template', true)
        .eq('status', 'published')
        .limit(1);

      if (sysTmpl && sysTmpl.length > 0) {
        validTemplates = [{
          ...sysTmpl[0],
          is_default: true
        }];
      } else {
        validTemplates = [{
          id: 'FW-2WT85Y0',
          user_id: 'SYSTEM',
          workspace_id: null,
          title: 'Wedding - Design 1',
          category: 'Wedding',
          is_default: true,
          is_system_template: true,
          status: 'published',
          updated_at: new Date().toISOString()
        }];
      }
    }

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

    const hasAnyDefaultInDb = validTemplates.some(t => t.is_default);

    const results = validTemplates.map(t => {
      let isDefault = false;
      if (activeDefaultId) {
        isDefault = t.id === activeDefaultId;
      } else if (t.is_default) {
        isDefault = true;
      } else if (!hasAnyDefaultInDb && t.id === validTemplates[0]?.id) {
        isDefault = true;
      }

      return {
        ...t,
        is_default: isDefault,
        content_json: docsMap[t.id] || null
      };
    });

    // Ensure Default template is at the top of the array
    results.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

    return NextResponse.json({
      success: true,
      activeDefaultTemplateId: activeDefaultId,
      templates: results
    });
  } catch (error: any) {
    console.error('Error fetching quotation templates:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
