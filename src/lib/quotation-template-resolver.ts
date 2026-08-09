import { supabase } from '@/lib/supabase';

export const GLOBAL_SYSTEM_TEMPLATE_ID = 'FW-2WT85Y0';

export interface ResolvedTemplateResult {
  templateId: string;
  template: any;
  document: any;
  isSystemTemplate: boolean;
  isDefault: boolean;
  resolutionReason: string;
}

/**
 * Authoritative Centralized Resolver for User Default Quotation Template from Supabase.
 * Rules:
 * A. Query Supabase for existing USER-OWNED default template:
 *    workspace_id = currentWorkspaceId AND is_default = true AND is_system_template = false
 * B. If such template exists, return that template.
 * C. If no user-owned default exists, return SYSTEM TEMPLATE FW-2WT85Y0.
 *
 * NEVER return an arbitrary template, first template, or localStorage template.
 */
export async function resolveUserDefaultQuotationTemplate(
  workspaceId: string,
  userId?: string,
  requestedTemplateId?: string
): Promise<ResolvedTemplateResult> {
  const targetWorkspace = workspaceId || userId || 'demo_user';

  // 1. Query user-owned default template from Supabase
  try {
    let query = supabase
      .from('quotation_templates')
      .select('*')
      .eq('is_default', true)
      .not('is_system_template', 'eq', true);

    if (targetWorkspace && targetWorkspace !== '00000000-0000-0000-0000-000000000000') {
      query = query.or(`workspace_id.eq.${targetWorkspace},user_id.eq.${targetWorkspace}`);
    }

    const { data: userDefaultTmpls } = await query.limit(1);
    const userDefaultTmpl = userDefaultTmpls && userDefaultTmpls.length > 0 ? userDefaultTmpls[0] : null;

    if (userDefaultTmpl) {
      const { data: doc } = await supabase
        .from('quotation_documents')
        .select('*')
        .eq('template_id', userDefaultTmpl.id)
        .maybeSingle();

      if (doc?.document_json) {
        const result: ResolvedTemplateResult = {
          templateId: userDefaultTmpl.id,
          template: userDefaultTmpl,
          document: doc.document_json,
          isSystemTemplate: false,
          isDefault: true,
          resolutionReason: 'WORKSPACE_DEFAULT',
        };

        console.log('[Template Resolver Debug]:', {
          workspaceId: targetWorkspace,
          requestedTemplateId,
          resolvedTemplateId: result.templateId,
          resolvedIsSystemTemplate: result.isSystemTemplate,
          resolvedIsDefault: result.isDefault,
          resolutionReason: result.resolutionReason,
        });

        return result;
      }
    }
  } catch (err) {
    console.error('[Template Resolver Error]: Failed to query user default template:', err);
  }

  // 2. Fallback to Global System Template FW-2WT85Y0
  try {
    const { data: sysTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', GLOBAL_SYSTEM_TEMPLATE_ID)
      .maybeSingle();

    const { data: sysDoc } = await supabase
      .from('quotation_documents')
      .select('*')
      .eq('template_id', GLOBAL_SYSTEM_TEMPLATE_ID)
      .maybeSingle();

    const docJson = sysDoc?.document_json || {
      meta: { title: 'System Default Wedding Template', currency: 'INR' },
      pages: [],
    };

    const result: ResolvedTemplateResult = {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: sysTmpl || {
        id: GLOBAL_SYSTEM_TEMPLATE_ID,
        title: 'System Default Wedding Template',
        is_system_template: true,
        is_default: false,
      },
      document: docJson,
      isSystemTemplate: true,
      isDefault: false,
      resolutionReason: 'SYSTEM_FALLBACK',
    };

    console.log('[Template Resolver Debug]:', {
      workspaceId: targetWorkspace,
      requestedTemplateId,
      resolvedTemplateId: result.templateId,
      resolvedIsSystemTemplate: result.isSystemTemplate,
      resolvedIsDefault: result.isDefault,
      resolutionReason: result.resolutionReason,
    });

    return result;
  } catch (err) {
    console.error('[Template Resolver Error]: Failed to query system template:', err);
    return {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
      document: { meta: { title: 'System Default Wedding Template', currency: 'INR' }, pages: [] },
      isSystemTemplate: true,
      isDefault: false,
      resolutionReason: 'SYSTEM_FALLBACK',
    };
  }
}
