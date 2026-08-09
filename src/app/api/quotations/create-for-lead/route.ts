import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveUserDefaultQuotationTemplate, GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

/**
 * Authoritative Backend Route for Lead Quotation Creation
 * Handles both:
 * 1. Default template resolution (when no templateId passed).
 * 2. Explicit template creation (when templateId/explicitTemplateId passed, e.g. from "Use for Lead" card button).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    const body = await req.json().catch(() => ({}));
    const { leadId } = body;
    const explicitTemplateId = body.explicitTemplateId || body.templateId;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, workspace_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.id) {
      workspaceId = profile.id;
    }

    console.log('[LEAD QUOTATION CREATION]', {
      leadId,
      workspaceId,
      explicitTemplateId: explicitTemplateId || 'NONE',
      isSuperAdmin
    });

    // 1. Fetch Lead using supabaseAdmin (Bypasses RLS locks)
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      console.error('[LEAD QUOTATION ERROR] Lead not found:', { leadId, leadErr });
      return NextResponse.json({ error: 'Lead not found in database' }, { status: 404 });
    }

    let sourceTemplateId = '';
    let templateDoc: any = null;
    let isSystemTemplate = false;

    if (explicitTemplateId) {
      // User explicitly clicked "Use for Lead" on a specific template card
      const { data: explicitTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', explicitTemplateId)
        .maybeSingle();

      if (explicitTmpl) {
        sourceTemplateId = explicitTmpl.id;
        isSystemTemplate = !!explicitTmpl.is_system_template;

        const { data: doc } = await supabaseAdmin
          .from('quotation_documents')
          .select('*')
          .eq('template_id', explicitTemplateId)
          .maybeSingle();

        templateDoc = doc?.content_json || doc?.document_json;
      }
    }

    // REQUIREMENT 8: If no explicit document found or no explicitTemplateId provided, resolve user default template
    if (!templateDoc) {
      const resolved = await resolveUserDefaultQuotationTemplate(workspaceId, userId);
      sourceTemplateId = resolved.templateId;
      templateDoc = resolved.document || DEFAULT_AIRY_PROPOSAL;
      isSystemTemplate = resolved.isSystemTemplate;
    }

    // REQUIREMENT 10: Temporary Runtime Debug Logging
    console.log('[LEAD QUOTATION SOURCE]', {
      sourceTemplateId,
      leadId,
      workspaceId,
      isSystemTemplate
    });

    // 1. Fetch existing quotation documents for this lead & workspace to calculate version & title inheritance
    const { data: allDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('*');

    const { data: allQuotes } = await supabaseAdmin
      .from('quotations')
      .select('*');

    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

    const existingDocs = (allDocs || []).filter((d: any) =>
      (d.workspace_id === workspaceId || d.user_id === userId || !d.workspace_id) &&
      (
        d.lead_id === leadId ||
        d.content_json?.lead_id === leadId ||
        (d.template_id && (d.template_id.includes(leadId) || d.template_id.includes(leadShortId)))
      )
    );

    const existingQuotes = (allQuotes || []).filter((q: any) =>
      (q.workspace_id === workspaceId || q.user_id === userId || !q.workspace_id) &&
      (
        q.client_id === leadId ||
        q.canvas_data?.lead_id === leadId ||
        (q.quotation_number && (q.quotation_number.includes(leadId) || q.quotation_number.includes(leadShortId)))
      )
    );

    let maxVersion = 0;
    let latestQuotationDoc: any = null;

    (existingDocs || []).forEach((d: any) => {
      const v = d.lead_version || d.content_json?.lead_version || d.version || 0;
      if (v > maxVersion) {
        maxVersion = v;
        latestQuotationDoc = d;
      }
    });

    (existingQuotes || []).forEach((q: any) => {
      const v = q.canvas_data?.lead_version || 0;
      if (v > maxVersion) {
        maxVersion = v;
        latestQuotationDoc = { template_id: q.quotation_number, content_json: q.canvas_data };
      }
    });

    const nextVersion = maxVersion + 1;
    const leadName = lead.name || lead.client_name || 'Valued Client';
    let inheritedTitle = leadName;

    if (latestQuotationDoc) {
      const latestContent = latestQuotationDoc.content_json || {};
      let latestTitle = latestContent.designName;

      if (!latestTitle) {
        const { data: qRec } = await supabaseAdmin
          .from('quotations')
          .select('title')
          .or(`id.eq.${latestQuotationDoc.template_id},quotation_number.eq.${latestQuotationDoc.template_id}`)
          .maybeSingle();

        if (qRec?.title) {
          latestTitle = qRec.title;
        }
      }

      if (latestTitle && latestTitle !== 'Wedding - Design 1') {
        inheritedTitle = latestTitle;
      }
    }

    console.log('[LEAD QUOTATION VERSION]', {
      leadId,
      workspaceId,
      latestVersion: maxVersion,
      nextVersion,
      latestQuotationId: latestQuotationDoc?.template_id || 'NONE',
      inheritedTitle
    });

    // Deep clone document JSON and regenerate unique page IDs
    const clonedDoc = JSON.parse(JSON.stringify(templateDoc || DEFAULT_AIRY_PROPOSAL));

    const groomName = leadName.includes('&') ? leadName.split('&')[0].trim() : leadName;
    const brideName = leadName.includes('&') ? leadName.split('&')[1].trim() : 'Partner';

    clonedDoc.lead_id = leadId;
    clonedDoc.lead_version = nextVersion;
    clonedDoc.designName = inheritedTitle;

    if (!clonedDoc.cover) clonedDoc.cover = {};
    clonedDoc.cover.coupleName = inheritedTitle;
    clonedDoc.cover.groomName = groomName || clonedDoc.cover.groomName || 'Rahul';
    clonedDoc.cover.brideName = brideName || clonedDoc.cover.brideName || 'Neha';

    if (lead.raw_payload?.venue || lead.raw_payload?.location || lead.location) {
      clonedDoc.cover.locationName = lead.raw_payload?.venue || lead.raw_payload?.location || lead.location;
    }

    if (Array.isArray(clonedDoc.pages)) {
      clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
        ...page,
        id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`
      }));
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const quotationId = `FW-Q-${leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-V${nextVersion}-${randomSuffix}`;

    // 2. Insert Quotation Record into quotations table using supabaseAdmin
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceTemplateId);

    const quotePayload: any = {
      quotation_number: quotationId,
      workspace_id: workspaceId,
      user_id: userId,
      template_id: isUuid ? sourceTemplateId : null,
      title: inheritedTitle,
      client_name: leadName,
      canvas_data: clonedDoc,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: quoteInsErr } = await supabaseAdmin
      .from('quotations')
      .insert(quotePayload);

    if (quoteInsErr) {
      console.error('Error inserting quotation record:', quoteInsErr);
    }

    // 3. Insert Quotation Document Snapshot into quotation_documents using supabaseAdmin
    const docPayload: any = {
      template_id: quotationId,
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: leadId,
      lead_version: nextVersion,
      version: nextVersion,
      content_json: clonedDoc,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: docInsErr } = await supabaseAdmin
      .from('quotation_documents')
      .insert(docPayload);

    if (docInsErr) {
      console.error('Error inserting quotation document:', docInsErr);
    }

    console.log('[LEAD QUOTATION CREATED]', {
      quotationId,
      leadId,
      leadVersion: nextVersion,
      title: inheritedTitle,
      sourceTemplateId
    });

    return NextResponse.json({
      success: true,
      quotationId,
      templateId: quotationId,
      document: clonedDoc
    });
  } catch (error: any) {
    console.error('Error in create-for-lead API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
