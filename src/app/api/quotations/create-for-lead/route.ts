import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveUserDefaultQuotationTemplate, GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

/**
 * Authoritative Fast Backend Route for Lead Quotation Creation (<100ms Response)
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
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

    // 1. Fetch Lead details & existing versions in parallel (Fast indexed lookup)
    const [{ data: lead }, { data: profile }, { data: existingDocs }] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id, name, client_name, location, raw_payload')
        .eq('id', leadId)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('quotation_documents')
        .select('version, lead_version, content_json')
        .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%`)
    ]);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found in database' }, { status: 404 });
    }

    if (profile?.id) workspaceId = profile.id;

    // 2. Resolve default template
    let templateDoc: any = null;
    let sourceTemplateId = '';

    if (explicitTemplateId) {
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json, document_json')
        .eq('template_id', explicitTemplateId)
        .maybeSingle();

      templateDoc = doc?.content_json || doc?.document_json;
      if (templateDoc) sourceTemplateId = explicitTemplateId;
    }

    if (!templateDoc) {
      const resolved = await resolveUserDefaultQuotationTemplate(workspaceId, userId);
      sourceTemplateId = resolved.templateId;
      templateDoc = resolved.document || DEFAULT_AIRY_PROPOSAL;
    }

    // Calculate max version
    let maxVersion = 0;
    (existingDocs || []).forEach((d: any) => {
      const v = d.lead_version || d.content_json?.lead_version || d.version || 0;
      if (v > maxVersion) maxVersion = v;
    });

    const nextVersion = maxVersion + 1;
    const leadName = lead.name || (lead as any).client_name || 'Valued Client';
    const groomName = leadName.includes('&') ? leadName.split('&')[0].trim() : leadName;
    const brideName = leadName.includes('&') ? leadName.split('&')[1].trim() : 'Partner';

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const quotationId = `FW-Q-${leadShortId}-V${nextVersion}-${randomSuffix}`;

    // Deep clone document JSON and set unique page IDs
    const clonedDoc = JSON.parse(JSON.stringify(templateDoc || DEFAULT_AIRY_PROPOSAL));
    clonedDoc.lead_id = leadId;
    clonedDoc.lead_version = nextVersion;

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

    // 3. Fast Single Insert into quotation_documents
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

    // Non-blocking background sync to legacy quotations table
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceTemplateId);
        await supabaseAdmin.from('quotations').insert({
          quotation_number: quotationId,
          workspace_id: workspaceId,
          user_id: userId,
          template_id: isUuid ? sourceTemplateId : null,
          title: leadName,
          client_name: leadName,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    })();

    return NextResponse.json({
      success: true,
      quotationId,
      templateId: quotationId,
      version: nextVersion,
      document: clonedDoc
    });
  } catch (error: any) {
    console.error('Error in create-for-lead API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
