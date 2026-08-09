import { supabase } from '@/lib/supabase';

export const GLOBAL_SYSTEM_TEMPLATE_ID = 'FW-2WT85Y0';

export interface ResolvedTemplateResult {
  templateId: string;
  template: any;
  document: any;
  isSystemTemplate: boolean;
}

/**
 * Authoritative resolver for workspace default quotation template from Supabase.
 * Rule:
 * 1. Checks if workspace has a user-owned template marked `is_default = true`.
 * 2. If found, returns that user default template & document.
 * 3. If not found, falls back to the Global System Template `FW-2WT85Y0`.
 * 4. NEVER returns an arbitrary or hardcoded old ID.
 */
export async function resolveUserDefaultQuotationTemplate(
  workspaceId: string,
  userId?: string
): Promise<ResolvedTemplateResult> {
  try {
    // 1. Query user-owned default template from Supabase
    let query = supabase
      .from('quotation_templates')
      .select('*')
      .eq('is_default', true)
      .not('is_system_template', 'eq', true);

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.eq('workspace_id', workspaceId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: userDefaultTmpls } = await query.limit(1);

    const userDefaultTmpl = userDefaultTmpls && userDefaultTmpls.length > 0 ? userDefaultTmpls[0] : null;

    if (userDefaultTmpl) {
      // Fetch associated document
      const { data: doc } = await supabase
        .from('quotation_documents')
        .select('*')
        .eq('template_id', userDefaultTmpl.id)
        .maybeSingle();

      if (doc?.document_json) {
        return {
          templateId: userDefaultTmpl.id,
          template: userDefaultTmpl,
          document: doc.document_json,
          isSystemTemplate: false,
        };
      }
    }

    // 2. Fallback to Global System Template FW-2WT85Y0
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

    if (sysDoc?.document_json) {
      return {
        templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
        template: sysTmpl || { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true },
        document: sysDoc.document_json,
        isSystemTemplate: true,
      };
    }

    // 3. Fallback to any system template in DB
    const { data: anySysTmpls } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('is_system_template', true)
      .limit(1);

    if (anySysTmpls && anySysTmpls.length > 0) {
      const anySysTmpl = anySysTmpls[0];
      const { data: anySysDoc } = await supabase
        .from('quotation_documents')
        .select('*')
        .eq('template_id', anySysTmpl.id)
        .maybeSingle();

      if (anySysDoc?.document_json) {
        return {
          templateId: anySysTmpl.id,
          template: anySysTmpl,
          document: anySysDoc.document_json,
          isSystemTemplate: true,
        };
      }
    }

    // 4. Default Seed Fallback Document Structure
    return {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: {
        id: GLOBAL_SYSTEM_TEMPLATE_ID,
        title: 'System Default Wedding Template',
        is_system_template: true,
      },
      document: {
        meta: { title: 'System Default Wedding Template', currency: 'INR' },
        pages: [],
      },
      isSystemTemplate: true,
    };
  } catch (error) {
    console.error('Error resolving user default quotation template:', error);
    return {
      templateId: GLOBAL_SYSTEM_TEMPLATE_ID,
      template: { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true },
      document: { meta: { title: 'System Default Wedding Template', currency: 'INR' }, pages: [] },
      isSystemTemplate: true,
    };
  }
}
