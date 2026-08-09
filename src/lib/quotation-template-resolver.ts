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
 * B. If user has active default_template_id in user_metadata, fetch THAT EXACT template & document.
 * C. Query Supabase for ANY template where is_default = true (matching workspace/user or active system default).
 * D. If no default marked, fallback to Global System Default Template (FW-2WT85Y0).
 */
export async function resolveUserDefaultQuotationTemplate(
  workspaceId: string,
  userId?: string,
  requestedTemplateId?: string
): Promise<ResolvedTemplateResult> {
  const targetWorkspace = workspaceId || userId || 'demo_user';
  const targetUser = userId || workspaceId || 'demo_user';

  // 1. Rule A: If explicit requestedTemplateId is provided
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

  // 2. Rule B: Check active default_template_id stored in user_metadata
  if (targetUser && targetUser !== 'demo_user') {
    try {
      const { data: userRec } = await supabaseAdmin.auth.admin.getUserById(targetUser);
      const activeDefaultId = userRec?.user?.user_metadata?.default_template_id;

      if (activeDefaultId) {
        const { data: tmpl } = await supabaseAdmin
          .from('quotation_templates')
          .select('*')
          .eq('id', activeDefaultId)
          .maybeSingle();

        const { data: doc } = await supabaseAdmin
          .from('quotation_documents')
          .select('*')
          .eq('template_id', activeDefaultId)
          .maybeSingle();

        const docJson = doc?.content_json || doc?.document_json || DEFAULT_AIRY_PROPOSAL;

        console.log('[Template Resolver] Resolved Active User Metadata Default Template:', {
          targetUser,
          templateId: activeDefaultId,
          title: tmpl?.title
        });

        return {
          templateId: activeDefaultId,
          template: tmpl || { id: activeDefaultId, title: 'Default Quotation Template', is_system_template: false, is_default: true },
          document: docJson,
          isSystemTemplate: !!tmpl?.is_system_template,
          isDefault: true,
          resolutionReason: 'USER_METADATA_DEFAULT',
        };
      }
    } catch (err) {
      console.warn('[Template Resolver Warning] user_metadata lookup failed:', err);
    }
  }

  // 3. Rule C: Query Supabase directly for templates where is_default = true
  try {
    const { data: defaultCandidates } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('is_default', true)
      .order('updated_at', { ascending: false });

    if (defaultCandidates && defaultCandidates.length > 0) {
      // Find template matching target workspace or user
      let matchedTmpl = defaultCandidates.find((t: any) =>
        t.workspace_id === targetWorkspace || t.user_id === targetWorkspace || t.user_id === targetUser
      );

      // If no workspace-specific default found, fallback to any active system default template
      if (!matchedTmpl) {
        matchedTmpl = defaultCandidates.find((t: any) => t.is_system_template || t.user_id === 'SYSTEM');
      }

      if (!matchedTmpl) {
        matchedTmpl = defaultCandidates[0];
      }

      if (matchedTmpl) {
        const { data: doc } = await supabaseAdmin
          .from('quotation_documents')
          .select('*')
          .eq('template_id', matchedTmpl.id)
          .maybeSingle();

        const docJson = doc?.content_json || doc?.document_json || DEFAULT_AIRY_PROPOSAL;

        console.log('[Template Resolver] Resolved Default Template from DB Candidates:', {
          templateId: matchedTmpl.id,
          title: matchedTmpl.title,
          isSystem: matchedTmpl.is_system_template
        });

        return {
          templateId: matchedTmpl.id,
          template: matchedTmpl,
          document: docJson,
          isSystemTemplate: !!matchedTmpl.is_system_template,
          isDefault: true,
          resolutionReason: 'DB_CANDIDATE_DEFAULT',
        };
      }
    }
  } catch (err) {
    console.error('[Template Resolver Error]: Failed to query default candidates:', err);
  }

  // 4. Rule D: Fallback to System Default Template (FW-2WT85Y0)
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
