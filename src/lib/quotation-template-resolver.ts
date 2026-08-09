import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

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
 * A. If requestedTemplateId is provided, fetch that exact template & document.
 * B. Otherwise, query Supabase for user's active DEFAULT template (is_default = true).
 * C. If no user default set, fallback to published System Default Template (FW-2WT85Y0).
 */
export async function resolveUserDefaultQuotationTemplate(
  workspaceId: string,
  userId?: string,
  requestedTemplateId?: string
): Promise<ResolvedTemplateResult> {
  const targetWorkspace = workspaceId || userId || 'demo_user';
  const targetUser = userId || workspaceId || 'demo_user';

  // 1. If requestedTemplateId is explicitly passed
  if (requestedTemplateId) {
    try {
      const { data: tmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', requestedTemplateId)
        .maybeSingle();

      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', requestedTemplateId)
        .maybeSingle();

      const docJson = doc?.content_json || doc?.document_json || DEFAULT_AIRY_PROPOSAL;

      if (tmpl || docJson) {
        return {
          templateId: requestedTemplateId,
          template: tmpl || { id: requestedTemplateId, title: 'Quotation Template', is_system_template: false, is_default: false },
          document: docJson,
          isSystemTemplate: !!tmpl?.is_system_template,
          isDefault: !!tmpl?.is_default,
          resolutionReason: 'EXPLICIT_REQUESTED',
        };
      }
    } catch (err) {
      console.warn('[Template Resolver Warning] Explicit template fetch failed:', err);
    }
  }

  // 2. Query user's active DEFAULT template from Supabase (is_default = true)
  try {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(targetWorkspace);
    let userTmpls: any[] = [];

    if (isUuid) {
      const [resWs, resUser] = await Promise.all([
        supabaseAdmin.from('quotation_templates').select('*').eq('workspace_id', targetWorkspace).order('updated_at', { ascending: false }),
        supabaseAdmin.from('quotation_templates').select('*').eq('user_id', targetUser).order('updated_at', { ascending: false })
      ]);
      userTmpls = [...(resWs.data || []), ...(resUser.data || [])];
    } else {
      const { data } = await supabaseAdmin.from('quotation_templates').select('*').eq('user_id', targetUser).order('updated_at', { ascending: false });
      userTmpls = data || [];
    }

    let userDefaultTmpl = userTmpls.find((t: any) => t.is_default === true);

    if (!userDefaultTmpl && targetUser && targetUser !== targetWorkspace) {
      const { data: fallbackUserTmpls } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('user_id', targetUser)
        .order('updated_at', { ascending: false });

      userDefaultTmpl = (fallbackUserTmpls || []).find((t: any) => t.is_default === true);
    }

    if (userDefaultTmpl) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', userDefaultTmpl.id)
        .maybeSingle();

      const docJson = doc?.content_json || doc?.document_json || DEFAULT_AIRY_PROPOSAL;

      console.log('[Template Resolver] Resolved Workspace Default Template:', {
        workspaceId: targetWorkspace,
        templateId: userDefaultTmpl.id,
        title: userDefaultTmpl.title
      });

      return {
        templateId: userDefaultTmpl.id,
        template: userDefaultTmpl,
        document: docJson,
        isSystemTemplate: !!userDefaultTmpl.is_system_template,
        isDefault: true,
        resolutionReason: 'WORKSPACE_DEFAULT',
      };
    }
  } catch (err) {
    console.error('[Template Resolver Error]: Failed to query user default template:', err);
  }

  // 3. Fallback to System Default Template (FW-2WT85Y0 or published system default)
  try {
    const { data: sysTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', GLOBAL_SYSTEM_TEMPLATE_ID)
      .maybeSingle();

    const { data: sysDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', GLOBAL_SYSTEM_TEMPLATE_ID)
      .maybeSingle();

    const docJson = sysDoc?.content_json || sysDoc?.document_json || DEFAULT_AIRY_PROPOSAL;

    console.log('[Template Resolver] Fallback to Global System Template:', GLOBAL_SYSTEM_TEMPLATE_ID);

    return {
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
  } catch (err) {
    console.error('[Template Resolver Error]: Failed to query system template:', err);
    return {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
      document: DEFAULT_AIRY_PROPOSAL,
      isSystemTemplate: true,
      isDefault: false,
      resolutionReason: 'SYSTEM_FALLBACK',
    };
  }
}
