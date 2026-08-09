import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveUserDefaultQuotationTemplate, GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Backend Route for Lead Quotation Creation
 * Handles both:
 * 1. Default template resolution (when no explicitTemplateId passed, e.g. from Leads page action).
 * 2. Explicit template creation (when explicitTemplateId passed, e.g. from "Use for Lead" on a card).
 */
export async function POST(req: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id || 'demo_user';
    let userEmail = session?.user?.email;

    const body = await req.json().catch(() => ({}));
    const { leadId, explicitTemplateId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // Admin impersonation override
    if (userEmail === 'sushantnawale700@gmail.com') {
      const impId = req.headers.get('x-impersonated-tenant-id');
      if (impId) userId = impId;
    }

    let workspaceId = userId;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, workspace_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.id) {
      workspaceId = profile.id;
    }

    console.log('[LEAD QUOTATION] requested', {
      leadId,
      workspaceId,
      explicitTemplateId: explicitTemplateId || 'NONE'
    });

    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    let sourceTemplateId = GLOBAL_SYSTEM_TEMPLATE_ID;
    let templateDoc: any = null;
    let isSystemTemplate = false;

    if (explicitTemplateId) {
      // User explicitly clicked "Use for Lead" on a specific card
      const { data: explicitTmpl } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('id', explicitTemplateId)
        .maybeSingle();

      if (explicitTmpl) {
        sourceTemplateId = explicitTmpl.id;
        isSystemTemplate = !!explicitTmpl.is_system_template;

        const { data: doc } = await supabase
          .from('quotation_documents')
          .select('*')
          .eq('template_id', explicitTemplateId)
          .maybeSingle();

        if (doc?.document_json) {
          templateDoc = doc.document_json;
        }
      }
    }

    // If no explicit document found or no explicitTemplateId provided, resolve user default from Supabase
    if (!templateDoc) {
      const resolved = await resolveUserDefaultQuotationTemplate(workspaceId, userId, explicitTemplateId);
      sourceTemplateId = resolved.templateId;
      templateDoc = resolved.document;
      isSystemTemplate = resolved.isSystemTemplate;
    }

    console.log('[LEAD QUOTATION] resolved template', {
      sourceTemplateId,
      isSystemTemplate,
      workspaceId
    });

    // Deep clone document JSON and regenerate unique page IDs
    const clonedDoc = JSON.parse(JSON.stringify(templateDoc || { meta: {}, pages: [] }));
    if (Array.isArray(clonedDoc.pages)) {
      clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
        ...page,
        id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`,
      }));
    }

    // Inject Lead Metadata into Document Meta
    clonedDoc.meta = {
      ...(clonedDoc.meta || {}),
      client_name: lead.name || lead.contact_name || clonedDoc.meta?.client_name || 'Client',
      client_phone: lead.phone || lead.mobile || clonedDoc.meta?.client_phone || '',
      client_email: lead.email || clonedDoc.meta?.client_email || '',
      event_location: lead.raw_payload?.venue || lead.raw_payload?.location || clonedDoc.meta?.event_location || '',
      event_date: lead.raw_payload?.event_date || clonedDoc.meta?.event_date || '',
    };

    // Generate fresh Quotation ID
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const quotationId = `Q-${randomSuffix}`;

    console.log('[LEAD QUOTATION] created quotation', {
      quotationId,
      sourceTemplateId,
      leadId
    });

    // Insert new Quotation Record
    const { error: quoteInsErr } = await supabase
      .from('quotations')
      .insert({
        id: quotationId,
        quotation_number: quotationId,
        lead_id: leadId,
        workspace_id: workspaceId,
        user_id: userId,
        status: 'draft',
        source_template_id: sourceTemplateId,
        content_json: clonedDoc,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (quoteInsErr) {
      console.error('Error inserting quotation record:', quoteInsErr);
    }

    // Insert Quotation Document Snapshot (with both document_json and content_json populated)
    const { error: docInsErr } = await supabase
      .from('quotation_documents')
      .insert({
        template_id: quotationId,
        workspace_id: workspaceId,
        user_id: userId,
        document_json: clonedDoc,
        content_json: clonedDoc,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (docInsErr) {
      console.error('Error inserting quotation document snapshot:', docInsErr);
    }

    console.log('[LEAD QUOTATION] redirect', {
      redirectRoute: `/workspace/quotations/builder/templet/${quotationId}`
    });

    return NextResponse.json({
      success: true,
      quotationId,
      sourceTemplateId,
      isSystemTemplate,
    });
  } catch (error: any) {
    console.error('Error in create-for-lead API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
