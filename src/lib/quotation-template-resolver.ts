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
 * B. Check profiles table and user_metadata for explicit active default_template_id.
 * C. Query Supabase directly for ANY template where is_default = true.
 * D. If no default marked, fallback to Global System Default Template (FW-2WT85Y0).
 */
export async function resolveUserDefaultQuotationTemplate(
  workspaceId: string,
  userId?: string,
  requestedTemplateId?: string
): Promise<ResolvedTemplateResult> {
  const targetWorkspace = workspaceId || userId || 'demo_user';
  const targetUser = userId || workspaceId || 'demo_user';

  // Rule A: If explicit requestedTemplateId is provided
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

  // REQUIREMENT 5 & 6: STEP 1 — Find current user's personal default directly using identity without querying all defaults.
  try {
    const { data: personalDefault } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .or(`workspace_id.eq.${targetWorkspace},user_id.eq.${targetUser}`)
      .eq('is_default', true)
      .eq('is_system_template', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (personalDefault?.id) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', personalDefault.id)
        .maybeSingle();

      const docJson = doc?.content_json || doc?.document_json || DEFAULT_AIRY_PROPOSAL;

      // REQUIREMENT 10: Temporary Runtime Debug Logging
      console.log('[LEAD DEFAULT RESOLUTION]', {
        userId: targetUser,
        workspaceId: targetWorkspace,
        personalDefaultTemplateId: personalDefault.id,
        personalDefaultTemplateUserId: personalDefault.user_id,
        personalDefaultTemplateWorkspaceId: personalDefault.workspace_id,
        isSystemTemplate: false,
        resolutionReason: 'PERSONAL_WORKSPACE_DEFAULT'
      });

      return {
        templateId: personalDefault.id,
        template: personalDefault,
        document: docJson,
        isSystemTemplate: false,
        isDefault: true,
        resolutionReason: 'PERSONAL_WORKSPACE_DEFAULT',
      };
    }
  } catch (err) {
    console.error('[Template Resolver Error] Personal default lookup failed:', err);
  }

  // REQUIREMENT 7: STEP 2 — System Fallback ONLY when personal default does NOT exist.
  try {
    // Attempt 1: Fetch marked active global system default template
    const { data: sysCandidates } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('is_system_template', true)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    const sysTmpl = (sysCandidates && sysCandidates.length > 0) ? sysCandidates[0] : null;
    const sysId = sysTmpl?.id || GLOBAL_SYSTEM_TEMPLATE_ID;

    const { data: sysDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', sysId)
      .maybeSingle();

    const docJson = sysDoc?.content_json || sysDoc?.document_json || DEFAULT_AIRY_PROPOSAL;

    console.log('[LEAD DEFAULT RESOLUTION]', {
      userId: targetUser,
      workspaceId: targetWorkspace,
      personalDefaultTemplateId: null,
      personalDefaultTemplateUserId: null,
      personalDefaultTemplateWorkspaceId: null,
      isSystemTemplate: true,
      resolutionReason: 'GLOBAL_SYSTEM_FALLBACK'
    });

    return {
      templateId: sysId,
      template: sysTmpl || {
        id: sysId,
        title: 'System Default Wedding Template',
        is_system_template: true,
        is_default: false,
      },
      document: docJson,
      isSystemTemplate: true,
      isDefault: false,
      resolutionReason: 'GLOBAL_SYSTEM_FALLBACK',
    };
  } catch (err) {
    console.error('[Template Resolver Error] Global system fallback failed:', err);
    return {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
      document: DEFAULT_AIRY_PROPOSAL,
      isSystemTemplate: true,
      isDefault: false,
      resolutionReason: 'GLOBAL_SYSTEM_FALLBACK',
    };
  }
}
