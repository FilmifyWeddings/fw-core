import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

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

    const isAdmin = isSuperAdmin || (userEmail?.toLowerCase() === 'sushantnawale700@gmail.com');

    let validTemplates: any[] = [];

    if (isAdmin) {
      // Super Admin sees all system/global templates AND their workspace templates
      const { data: adminTemplates, error: tmplErr } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
        .not('status', 'in', '("archived","deleted")')
        .not('id', 'ilike', 'FW-Q-%')
        .not('id', 'ilike', 'FW-L-%')
        .or(`user_id.eq.SYSTEM,workspace_id.is.null,is_system_template.eq.true,workspace_id.eq.37c63a54-d4f1-4b99-b546-3d965cd23a37,user_id.eq.37c63a54-d4f1-4b99-b546-3d965cd23a37${effectiveUserId ? `,workspace_id.eq.${effectiveUserId},user_id.eq.${effectiveUserId}` : ''}`)
        .order('updated_at', { ascending: false });

      if (tmplErr) {
        console.error('[Admin Templates Error]:', tmplErr);
      }
      validTemplates = adminTemplates || [];
    } else {
      // Regular Studio Owners see:
      // 1. Their own workspace templates
      const { data: userTemplates } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
        .not('status', 'in', '("archived","deleted")')
        .not('id', 'ilike', 'FW-Q-%')
        .not('id', 'ilike', 'FW-L-%')
        .eq('is_system_template', false)
        .or(`workspace_id.eq.${effectiveUserId},user_id.eq.${effectiveUserId}`)
        .order('updated_at', { ascending: false });

      // 2. Studio Owners see ONLY their custom templates if they exist; NEVER demo templates!
      const seen = new Set<string>();
      if (userTemplates && userTemplates.length > 0) {
        userTemplates.forEach(t => {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            validTemplates.push(t);
          }
        });
      } else {
        // ONLY fallback to published system templates if studio has zero custom templates
        const { data: activeSysTmpls } = await supabaseAdmin
          .from('quotation_templates')
          .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
          .eq('is_system_template', true)
          .eq('status', 'published')
          .not('status', 'in', '("archived","deleted")')
          .not('id', 'ilike', 'FW-Q-%')
          .not('id', 'ilike', 'FW-L-%')
          .order('is_default', { ascending: false })
          .order('updated_at', { ascending: false });

        (activeSysTmpls || []).forEach(t => {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            validTemplates.push(t);
          }
        });
      }
    }

    const templateIds = validTemplates.map(t => t.id);

    // Fetch document content_json using supabaseAdmin (bypasses RLS)
    const docsMap: Record<string, any> = {};
    const leadDocsSet = new Set<string>();
    if (templateIds.length > 0) {
      const { data: docsData, error: docsErr } = await supabaseAdmin
        .from('quotation_documents')
        .select('template_id, content_json, document_json, lead_id')
        .in('template_id', templateIds);

      if (docsErr) {
        console.error('[Quotation Documents Fetch Error]:', docsErr.code || docsErr.message?.slice(0, 200) || 'Query error');
      }

      if (docsData) {
        docsData.forEach(d => {
          const docContent = d.content_json || d.document_json;
          if (d.template_id && docContent) {
            docsMap[d.template_id] = docContent;
          }
          if (d.lead_id || (docContent && (docContent as any).lead_id)) {
            leadDocsSet.add(d.template_id);
          }
        });
      }

      // Fallback check in quotations table for any templates whose doc was saved there
      const missingIds = templateIds.filter(id => !docsMap[id]);
      if (missingIds.length > 0) {
        try {
          const { data: qRows } = await supabaseAdmin
            .from('quotations')
            .select('quotation_number, id, content_json, canvas_data')
            .or(`quotation_number.in.(${missingIds.join(',')}),id.in.(${missingIds.join(',')})`);
          if (qRows) {
            qRows.forEach(q => {
              const qContent = q.content_json || q.canvas_data;
              if (qContent) {
                if (q.quotation_number && !docsMap[q.quotation_number]) docsMap[q.quotation_number] = qContent;
                if (q.id && !docsMap[q.id]) docsMap[q.id] = qContent;
              }
            });
          }
        } catch (_) {}
      }
    }

    const hasAnyDefaultInDb = validTemplates.some(t => t.is_default);

    const results = validTemplates
      .filter(t => {
        // Exclude lead-specific quotation instances and records with lead_id
        if (t.id.startsWith('FW-Q-') || t.id.startsWith('FW-L-')) return false;
        if (leadDocsSet.has(t.id)) return false;
        if (docsMap[t.id]?.lead_id) return false;
        return true;
      })
      .map(t => {
        let isDefault = false;
        if (activeDefaultId) {
          isDefault = t.id === activeDefaultId;
        } else if (t.is_default) {
          isDefault = true;
        } else if (!hasAnyDefaultInDb && t.id === validTemplates[0]?.id) {
          isDefault = true;
        }

        const docContent = docsMap[t.id] || null;
        const title = docContent?.designName || t.title;

        return {
          ...t,
          title,
          is_default: isDefault,
          content_json: docContent
        };
      });

    // If no templates are resolved, supply the standard design template
    if (results.length === 0) {
      results.push({
        id: 'FW-AIRY-DEFAULT',
        title: 'Minimalist Airy Proposal',
        category: 'Wedding',
        is_default: true,
        is_system_template: true,
        content_json: DEFAULT_AIRY_PROPOSAL
      });
    }

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
