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
  if (requestedTemplateId && requestedTemplateId !== 'GLOBAL_DEFAULT') {
    try {
      const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTemplateId);
      const { data: tmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .or(`id.eq.${requestedTemplateId},title.eq.${requestedTemplateId}`)
        .limit(1)
        .maybeSingle();

      const lookupId = tmpl?.id || requestedTemplateId;
      const isLookupUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupId);

      // 2. Fetch document from quotation_documents by template_id or id
      const { data: doc } = isLookupUuid
        ? await supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .or(`template_id.eq.${lookupId},id.eq.${lookupId}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .eq('template_id', lookupId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

      let docJson = doc?.content_json || doc?.document_json || null;

      // Parse stringified JSON if stored as string
      if (typeof docJson === 'string') {
        try {
          docJson = JSON.parse(docJson);
        } catch (_) {}
      }

      // Unwrap if wrapped under { quotation: ... } or { document: ... }
      if (docJson && typeof docJson === 'object') {
        if (docJson.quotation && typeof docJson.quotation === 'object') {
          docJson = docJson.quotation;
        } else if (docJson.document && typeof docJson.document === 'object' && !docJson.cover && !docJson.pages) {
          docJson = docJson.document;
        }
      }

      // 3. Fallback to quotations table
      if (!docJson) {
        const { data: qRec } = isLookupUuid
          ? await supabaseAdmin
              .from('quotations')
              .select('content_json, canvas_data')
              .or(`id.eq.${lookupId},quotation_number.eq.${lookupId}`)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : await supabaseAdmin
              .from('quotations')
              .select('content_json, canvas_data')
              .eq('quotation_number', lookupId)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

        let qJson = qRec?.content_json || qRec?.canvas_data || null;
        if (typeof qJson === 'string') {
          try { qJson = JSON.parse(qJson); } catch (_) {}
        }
        if (qJson && typeof qJson === 'object') {
          docJson = qJson;
        }
      }

      if (tmpl || docJson) {
        return {
          templateId: lookupId,
          template: tmpl || { id: lookupId, title: 'Quotation Template', is_system_template: false, is_default: false },
          document: docJson || DEFAULT_AIRY_PROPOSAL,
          isSystemTemplate: !!tmpl?.is_system_template,
          isDefault: !!tmpl?.is_default,
          resolutionReason: 'EXPLICIT_REQUESTED',
        };
      }
    } catch (err) {
      console.warn('[Template Resolver Warning] Explicit template fetch failed:', err);
    }
  }

  // REQUIREMENT 5 & 6: STEP 1 — Find current user's personal default directly using identity.
  try {
    let personalDefaultId: string | null = null;
    let personalDefault: any = null;

    // 1A. Check quotation_templates marked is_default = true
    const { data: markedDefault } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .or(`workspace_id.eq.${targetWorkspace},user_id.eq.${targetUser}`)
      .eq('is_default', true)
      .eq('is_system_template', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (markedDefault?.id) {
      personalDefault = markedDefault;
      personalDefaultId = markedDefault.id;
    }

    // 1B. Check user_metadata or profiles table for default_template_id
    if (!personalDefaultId && targetUser && targetUser !== 'demo_user') {
      try {
        const { data: userRec } = await supabaseAdmin.auth.admin.getUserById(targetUser);
        if (userRec?.user?.user_metadata?.default_template_id) {
          personalDefaultId = userRec.user.user_metadata.default_template_id;
        }
      } catch (_) {}

      if (!personalDefaultId) {
        try {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('default_template_id')
            .eq('id', targetUser)
            .maybeSingle();
          if (profile?.default_template_id) {
            personalDefaultId = profile.default_template_id;
          }
        } catch (_) {}
      }

      if (personalDefaultId) {
        const { data: tmpl } = await supabaseAdmin
          .from('quotation_templates')
          .select('*')
          .eq('id', personalDefaultId)
          .maybeSingle();
        if (tmpl) personalDefault = tmpl;
      }
    }

    // 1C. If no default marked yet, fallback to user's latest customized studio template!
    if (!personalDefaultId) {
      const { data: latestUserTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .or(`workspace_id.eq.${targetWorkspace},user_id.eq.${targetUser}`)
        .eq('is_system_template', false)
        .not('id', 'ilike', 'FW-Q-%')
        .not('id', 'ilike', 'FW-L-%')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestUserTmpl?.id) {
        personalDefault = latestUserTmpl;
        personalDefaultId = latestUserTmpl.id;
      }
    }

    if (personalDefaultId) {
      const isDefUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personalDefaultId);
      const { data: doc } = isDefUuid
        ? await supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .or(`template_id.eq.${personalDefaultId},id.eq.${personalDefaultId}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .eq('template_id', personalDefaultId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

      let docJson = doc?.content_json || doc?.document_json;
      if (typeof docJson === 'string') {
        try { docJson = JSON.parse(docJson); } catch (_) {}
      }

      if (!docJson) {
        const { data: qRec } = isDefUuid
          ? await supabaseAdmin
              .from('quotations')
              .select('content_json, canvas_data')
              .or(`id.eq.${personalDefaultId},quotation_number.eq.${personalDefaultId}`)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : await supabaseAdmin
              .from('quotations')
              .select('content_json, canvas_data')
              .eq('quotation_number', personalDefaultId)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
        docJson = qRec?.content_json || qRec?.canvas_data;
        if (typeof docJson === 'string') {
          try { docJson = JSON.parse(docJson); } catch (_) {}
        }
      }

      const finalDoc = docJson || DEFAULT_AIRY_PROPOSAL;

      console.log('[LEAD DEFAULT RESOLUTION]', {
        userId: targetUser,
        workspaceId: targetWorkspace,
        personalDefaultTemplateId: personalDefaultId,
        isSystemTemplate: false,
        resolutionReason: 'PERSONAL_WORKSPACE_DEFAULT'
      });

      return {
        templateId: personalDefaultId,
        template: personalDefault || { id: personalDefaultId, title: 'Default Template', is_system_template: false, is_default: true },
        document: finalDoc,
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
    const { data: sysCandidates } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('is_system_template', true)
      .not('id', 'ilike', 'FW-Q-%')
      .not('id', 'ilike', 'FW-L-%')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    const sysTmpl = (sysCandidates && sysCandidates.length > 0) ? sysCandidates[0] : null;
    const sysId = sysTmpl?.id || GLOBAL_SYSTEM_TEMPLATE_ID;

    const { data: sysDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .or(`template_id.eq.${sysId},id.eq.${sysId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let docJson = sysDoc?.content_json || sysDoc?.document_json;
    if (typeof docJson === 'string') {
      try { docJson = JSON.parse(docJson); } catch (_) {}
    }

    const finalSysDoc = docJson || DEFAULT_AIRY_PROPOSAL;

    console.log('[LEAD DEFAULT RESOLUTION]', {
      userId: targetUser,
      workspaceId: targetWorkspace,
      systemTemplateId: sysId,
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
      document: finalSysDoc,
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
