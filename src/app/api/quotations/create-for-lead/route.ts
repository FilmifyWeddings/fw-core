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

    let sourceTemplateId = GLOBAL_SYSTEM_TEMPLATE_ID;
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

    // If no explicit document found or no explicitTemplateId provided, resolve user default template
    if (!templateDoc) {
      const resolved = await resolveUserDefaultQuotationTemplate(workspaceId, userId, explicitTemplateId);
      sourceTemplateId = resolved.templateId;
      templateDoc = resolved.document || DEFAULT_AIRY_PROPOSAL;
      isSystemTemplate = resolved.isSystemTemplate;
    }

    console.log('[LEAD QUOTATION] Resolved Source Template:', {
      sourceTemplateId,
      isSystemTemplate,
      workspaceId
    });

    // Deep clone document JSON and regenerate unique page IDs
    const clonedDoc = JSON.parse(JSON.stringify(templateDoc || DEFAULT_AIRY_PROPOSAL));

    const leadName = lead.name || lead.client_name || 'Valued Client';
    const groomName = leadName.includes('&') ? leadName.split('&')[0].trim() : leadName;
    const brideName = leadName.includes('&') ? leadName.split('&')[1].trim() : 'Partner';

    clonedDoc.lead_id = leadId;

    if (!clonedDoc.cover) clonedDoc.cover = {};
    clonedDoc.cover.coupleName = leadName;
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
    const quotationId = `FW-Q-${leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-${randomSuffix}`;

    const title = `${leadName} — Wedding Quotation`;

    // 2. Insert Quotation Record into quotations table using supabaseAdmin
    const { error: quoteInsErr } = await supabaseAdmin
      .from('quotations')
      .insert({
        id: quotationId,
        quotation_number: quotationId,
        lead_id: leadId,
        workspace_id: workspaceId,
        user_id: userId,
        title,
        client_name: leadName,
        status: 'draft',
        content_json: clonedDoc,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (quoteInsErr) {
      console.error('Error inserting quotation record:', quoteInsErr);
    }

    // 3. Insert Quotation Document Snapshot into quotation_documents using supabaseAdmin
    const { error: docInsErr } = await supabaseAdmin
      .from('quotation_documents')
      .insert({
        template_id: quotationId,
        workspace_id: workspaceId,
        user_id: userId,
        content_json: clonedDoc,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (docInsErr) {
      console.error('Error inserting quotation document:', docInsErr);
    }

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
