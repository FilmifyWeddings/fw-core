import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveUserDefaultQuotationTemplate, GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';

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

    const clientNameInput = body.clientName || body.leadName || 'Valued Client';
    const effectiveLead = lead || {
      id: leadId,
      name: clientNameInput,
      client_name: clientNameInput,
      location: 'Mumbai',
      raw_payload: {}
    };

    if (profile?.id) workspaceId = profile.id;

    // 2. Resolve template (explicitly chosen template or user default fallback)
    const resolved = await resolveUserDefaultQuotationTemplate(workspaceId, userId, explicitTemplateId);
    const sourceTemplateId = resolved.templateId;
    const templateDoc = resolved.document || DEFAULT_AIRY_PROPOSAL;

    // Calculate max version
    let maxVersion = 0;
    (existingDocs || []).forEach((d: any) => {
      const v = d.lead_version || d.content_json?.lead_version || d.version || 0;
      if (v > maxVersion) maxVersion = v;
    });

    const nextVersion = maxVersion + 1;
    const leadName = effectiveLead.name || (effectiveLead as any).client_name || 'Valued Client';
    const groomName = leadName.includes('&') ? leadName.split('&')[0].trim() : leadName;
    const brideName = leadName.includes('&') ? leadName.split('&')[1].trim() : 'Partner';

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const quotationId = `FW-Q-${leadShortId}-V${nextVersion}-${randomSuffix}`;

    // Deep clone document JSON (using initialDocument if passed from AI generator, else templateDoc)
    const baseSourceDoc = body.initialDocument || templateDoc || DEFAULT_AIRY_PROPOSAL;
    const clonedDoc = JSON.parse(JSON.stringify(baseSourceDoc));
    clonedDoc.lead_id = leadId;
    clonedDoc.lead_version = nextVersion;

    if (!clonedDoc.cover) clonedDoc.cover = {};
    if (!clonedDoc.cover.coupleName) clonedDoc.cover.coupleName = leadName;
    if (!clonedDoc.cover.groomName) clonedDoc.cover.groomName = groomName || 'Rahul';
    if (!clonedDoc.cover.brideName) clonedDoc.cover.brideName = brideName || 'Neha';

    if (effectiveLead.raw_payload?.venue || effectiveLead.raw_payload?.location || effectiveLead.location) {
      if (!clonedDoc.cover.locationName) {
        clonedDoc.cover.locationName = effectiveLead.raw_payload?.venue || effectiveLead.raw_payload?.location || effectiveLead.location;
      }
    }

    const eventType = clonedDoc.cover?.eventType || 'Wedding';
    const coupleTitle = clonedDoc.cover?.coupleName || leadName;
    const quotationTitle = `${coupleTitle} - ${eventType} Quotation`;
    clonedDoc.designName = quotationTitle;
    clonedDoc.title = quotationTitle;

    // Ensure all payment term steps start clean
    if (clonedDoc.paymentTermsPage?.steps && Array.isArray(clonedDoc.paymentTermsPage.steps)) {
      const totalPricing = clonedDoc.pricingPage?.basePrice || 0;
      clonedDoc.paymentTermsPage.steps = clonedDoc.paymentTermsPage.steps.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `pt_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`,
        stepName: s.stepName || s.name || `Installment #${idx + 1}`,
        name: s.name || s.stepName || `Installment #${idx + 1}`,
        status: s.status || 'Pending',
        paid_date: s.status === 'Completed' || s.status === 'paid' ? (s.paid_date || new Date().toISOString().split('T')[0]) : null
      }));
      if (clonedDoc.paymentTermsPage.receivedAmount === undefined) {
        clonedDoc.paymentTermsPage.receivedAmount = 0;
      }
      if (clonedDoc.paymentTermsPage.pendingAmount === undefined) {
        clonedDoc.paymentTermsPage.pendingAmount = clonedDoc.paymentTermsPage.fixedAmount || totalPricing;
      }
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

    // Non-blocking background sync to legacy quotations table with "{coupleName} - {eventType} Quotation"
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceTemplateId);
        await supabaseAdmin.from('quotations').insert({
          quotation_number: quotationId,
          workspace_id: workspaceId,
          user_id: userId,
          client_id: leadId,
          template_id: isUuid ? sourceTemplateId : null,
          title: quotationTitle,
          client_name: leadName,
          couple_names: leadName,
          total_amount: clonedDoc.pricingPage?.basePrice || 0,
          status: 'draft',
          is_final: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Also update lead's quotation_id and raw_payload so lead-summary reflects this immediately
        await supabaseAdmin.from('leads').update({
          quotation_id: quotationId,
          raw_payload: {
            ...(effectiveLead.raw_payload || {}),
            quotation_id: quotationId,
            couple_name: leadName
          },
          updated_at: new Date().toISOString()
        }).eq('id', leadId);
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
