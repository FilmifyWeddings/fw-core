import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveUserDefaultQuotationTemplate, GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';
import { isPlaceholderCoupleName } from '@/lib/quotation-finance-sync';
import {
  fallbackHeuristicExtractor,
  mapAiOutputToQuotationDocument,
  syncShootPageInSequence,
  sanitizeExtractedCoupleName,
  isInvalidCoupleName
} from '@/lib/ai-quotation-extractor';
import { DEFAULT_EVENT_TYPES, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';
import { clearLeadSummaryCache } from '@/lib/quotation-summary-cache';

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
    const leadShortLower = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
    const leadShortUpper = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();

    // 1. Fetch Lead details, profile, existing versions & direct explicitTemplateId in parallel
    const [{ data: lead }, { data: profile }, { data: existingDocs }, { data: directTemplateRow }] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id, name, full_name, location, raw_payload, phone, email, workspace_id')
        .eq('id', leadId)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, workspace_id, workspace_name')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('quotation_documents')
        .select('id, template_id, version, lead_version')
        .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortLower}%,template_id.ilike.%${leadShortUpper}%`),
      explicitTemplateId && explicitTemplateId !== 'GLOBAL_DEFAULT'
        ? supabaseAdmin
            .from('quotation_documents')
            .select('template_id, content_json')
            .eq('template_id', explicitTemplateId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const clientNameInput = body.clientName || body.leadName || 'Valued Client';
    const effectiveLead = lead || {
      id: leadId,
      name: clientNameInput,
      full_name: clientNameInput,
      location: 'Mumbai',
      raw_payload: {}
    };

    if (profile?.workspace_id) {
      workspaceId = profile.workspace_id;
    } else if (profile?.id) {
      workspaceId = profile.id;
    } else if (lead?.workspace_id) {
      workspaceId = lead.workspace_id;
    }

    // 2. Strict Template Design Resolution: Use fast direct lookup first, else full resolver
    let sourceTemplateId = explicitTemplateId || GLOBAL_SYSTEM_TEMPLATE_ID;
    let templateDoc = DEFAULT_AIRY_PROPOSAL;

    if (directTemplateRow?.content_json && typeof directTemplateRow.content_json === 'object') {
      sourceTemplateId = directTemplateRow.template_id || sourceTemplateId;
      templateDoc = directTemplateRow.content_json;
    } else {
      try {
        const studioWorkspace = profile?.workspace_id || profile?.id || userId || workspaceId;
        const resolved = await resolveUserDefaultQuotationTemplate(studioWorkspace, userId || profile?.id, explicitTemplateId);
        if (resolved?.document) {
          sourceTemplateId = resolved.templateId;
          templateDoc = resolved.document;
        }
      } catch (tmplErr) {
        console.warn('[create-for-lead] Error resolving template:', tmplErr);
      }
    }

    // Calculate max version accurately across quotation_documents and lead.raw_payload.quotation_versions (without heavy content_json)
    let maxVersion = 0;
    (existingDocs || []).forEach((d: any) => {
      const explicitV = Number(d.lead_version) > 0 ? Number(d.lead_version) : 0;
      const tidMatch = typeof d.template_id === 'string' ? d.template_id.match(/-V(\d+)-/i) : null;
      const tidV = tidMatch ? parseInt(tidMatch[1], 10) : 0;
      const fallbackV = Number(d.version) > 1 ? Number(d.version) : 0;
      const v = explicitV || tidV || fallbackV;
      if (v > maxVersion) maxVersion = v;
    });
    const prevVersForMax = Array.isArray(effectiveLead.raw_payload?.quotation_versions)
      ? effectiveLead.raw_payload.quotation_versions
      : [];
    prevVersForMax.forEach((rv: any) => {
      const rvV = Number(rv?.version) || 0;
      if (rvV > maxVersion) maxVersion = rvV;
    });
    const nextVersion = body.version ? Math.max(Number(body.version), maxVersion + 1) : (maxVersion + 1);

    // 2. Extract initial document from body or additionalNotes if provided
    let initialDoc = body.initialDocument;
    if (!initialDoc && body.additionalNotes) {
      try {
        const candidateWsIds = Array.from(new Set([
          workspaceId,
          profile?.workspace_id,
          profile?.id,
          userId,
          lead?.workspace_id
        ].filter(Boolean)));

        let studioSettings: any = body.studioSettings || null;
        let studioEventTypes: any[] = Array.isArray(body.studioEventTypes) ? body.studioEventTypes : [];
        let studioCrewRoles: any[] = Array.isArray(body.studioCrewRoles) ? body.studioCrewRoles : [];

        if (candidateWsIds.length > 0 && (!studioSettings || studioEventTypes.length === 0 || studioCrewRoles.length === 0)) {
          const [settingsRes, eventsRes, rolesRes] = await Promise.all([
            !studioSettings
              ? supabaseAdmin
                  .from('workspace_quotation_settings')
                  .select('workspace_id, settings')
                  .in('workspace_id', candidateWsIds)
              : Promise.resolve({ data: null } as any),
            studioEventTypes.length === 0
              ? supabaseAdmin
                  .from('workspace_event_types')
                  .select('workspace_id, id, name, category, display_order')
                  .in('workspace_id', candidateWsIds)
                  .order('display_order', { ascending: true })
              : Promise.resolve({ data: null } as any),
            studioCrewRoles.length === 0
              ? supabaseAdmin
                  .from('master_crew_roles')
                  .select('workspace_id, id, name, short_code, category, display_order')
                  .in('workspace_id', candidateWsIds)
                  .order('display_order', { ascending: true })
              : Promise.resolve({ data: null } as any),
          ]);

          if (!studioSettings && Array.isArray(settingsRes?.data)) {
            for (const cWsId of candidateWsIds) {
              const hit = settingsRes.data.find((r: any) => r.workspace_id === cWsId && r.settings && typeof r.settings === 'object');
              if (hit) {
                studioSettings = hit.settings;
                break;
              }
            }
          }
          if (studioEventTypes.length === 0 && Array.isArray(eventsRes?.data)) {
            for (const cWsId of candidateWsIds) {
              const matched = eventsRes.data.filter((e: any) => e.workspace_id === cWsId && String(e?.category || '').toLowerCase() !== 'ritual');
              if (matched.length > 0) {
                studioEventTypes = matched;
                break;
              }
            }
          }
          if (studioCrewRoles.length === 0 && Array.isArray(rolesRes?.data)) {
            for (const cWsId of candidateWsIds) {
              const matched = rolesRes.data.filter((r: any) => r.workspace_id === cWsId);
              if (matched.length > 0) {
                studioCrewRoles = matched;
                break;
              }
            }
          }
        }

        if (studioEventTypes.length === 0) studioEventTypes = DEFAULT_EVENT_TYPES;
        if (studioCrewRoles.length === 0) studioCrewRoles = DEFAULT_CREW_ROLES;

        const contextData = {
          lead_info: {
            lead_id: effectiveLead.id,
            name: effectiveLead.name || '',
            phone: (effectiveLead as any).phone || '',
            email: (effectiveLead as any).email || ''
          },
          raw_form_fields: effectiveLead.raw_payload || {},
          meta_fields: {},
          notes_and_comments: '',
          additional_user_notes: body.additionalNotes,
          studioSettings,
          studioEventTypes,
          studioCrewRoles
        };
        const extracted = fallbackHeuristicExtractor(contextData);
        const mapped = mapAiOutputToQuotationDocument(extracted, templateDoc, contextData);
        initialDoc = mapped.document || extracted;
      } catch (err) {
        console.warn('[create-for-lead] Error extracting additionalNotes:', err);
      }
    }

    const rawDocCouple = (
      initialDoc?.cover?.coupleName || 
      (initialDoc as any)?.coupleName || 
      body.initialDocument?.cover?.coupleName || 
      (body.initialDocument as any)?.coupleName || 
      ''
    ).trim();
    const hasValidDocCouple = Boolean(rawDocCouple && !isInvalidCoupleName(rawDocCouple));

    const rawGroomBride = [
      effectiveLead.raw_payload?.groom_name,
      effectiveLead.raw_payload?.bride_name
    ].filter(Boolean).map((s: string) => s.trim()).filter(Boolean).join(' & ');

    const rawLeadCouple = 
      (hasValidDocCouple ? rawDocCouple : null) ||
      (!isInvalidCoupleName(effectiveLead.raw_payload?.couple_name) ? effectiveLead.raw_payload.couple_name : null) ||
      (!isInvalidCoupleName(effectiveLead.raw_payload?.couple_names) ? effectiveLead.raw_payload.couple_names : null) ||
      (!isInvalidCoupleName((effectiveLead as any).couple_names) ? (effectiveLead as any).couple_names : null) ||
      (rawGroomBride && !isInvalidCoupleName(rawGroomBride) ? rawGroomBride : null) ||
      ((effectiveLead as any).full_name && !isInvalidCoupleName((effectiveLead as any).full_name) ? (effectiveLead as any).full_name : '') ||
      (effectiveLead.name && !isInvalidCoupleName(effectiveLead.name) ? effectiveLead.name : '') ||
      (!isInvalidCoupleName(clientNameInput) ? clientNameInput : '') ||
      'Valued Client';

    const effectiveCoupleName = sanitizeExtractedCoupleName(
      hasValidDocCouple ? rawDocCouple : rawLeadCouple,
      rawLeadCouple
    );
    const leadName = effectiveCoupleName;

    const groomName = (initialDoc?.cover?.groomName && !isInvalidCoupleName(initialDoc.cover.groomName))
      ? sanitizeExtractedCoupleName(initialDoc.cover.groomName, effectiveCoupleName)
      : (body.initialDocument?.cover?.groomName && !isInvalidCoupleName(body.initialDocument.cover.groomName))
      ? sanitizeExtractedCoupleName(body.initialDocument.cover.groomName, effectiveCoupleName)
      : (effectiveCoupleName.includes('&') ? effectiveCoupleName.split('&')[0].trim() : effectiveCoupleName);

    const brideName = (initialDoc?.cover?.brideName && !isInvalidCoupleName(initialDoc.cover.brideName))
      ? sanitizeExtractedCoupleName(initialDoc.cover.brideName, 'Partner')
      : (body.initialDocument?.cover?.brideName && !isInvalidCoupleName(body.initialDocument.cover.brideName))
      ? sanitizeExtractedCoupleName(body.initialDocument.cover.brideName, 'Partner')
      : (effectiveCoupleName.includes('&') ? effectiveCoupleName.split('&')[1].trim() : 'Partner');

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const rawRequestedQId = typeof body.quotationId === 'string' && body.quotationId.trim() ? body.quotationId.trim() : '';
    const requestedIdTaken = Boolean(
      rawRequestedQId &&
      (existingDocs || []).some((d: any) => String(d.template_id || '').toUpperCase() === rawRequestedQId.toUpperCase())
    );
    // Preserve optimistic client URL quotationId verbatim whenever unique & unused so Builder URL === DB template_id 100%!
    const quotationId = rawRequestedQId && !requestedIdTaken
      ? rawRequestedQId
      : `FW-Q-${leadShortUpper}-V${nextVersion}-${randomSuffix}`;

    const rawInputDoc = body.initialDocument?.document || body.initialDocument || initialDoc?.document || initialDoc;
    const baseSourceDoc = rawInputDoc ? normalizeQuotationData(rawInputDoc, templateDoc) : templateDoc;
    const clonedDoc = JSON.parse(JSON.stringify(baseSourceDoc || DEFAULT_AIRY_PROPOSAL));
    clonedDoc.id = quotationId;
    clonedDoc.lead_id = leadId;
    clonedDoc.lead_version = nextVersion;

    // Explicitly guarantee chosen template design tokens are preserved 100% from templateDoc
    clonedDoc.look = templateDoc.look || clonedDoc.look || 'cyprus-sand-dune';
    clonedDoc.theme = templateDoc.theme || templateDoc.look || clonedDoc.theme || clonedDoc.look;
    clonedDoc.primaryFont = templateDoc.primaryFont || clonedDoc.primaryFont || 'Cormorant Garamond';
    clonedDoc.secondaryFont = templateDoc.secondaryFont || clonedDoc.secondaryFont || 'Plus Jakarta Sans';
    if ((templateDoc as any).colorPalette) {
      (clonedDoc as any).colorPalette = (templateDoc as any).colorPalette;
    }
    if (Array.isArray((templateDoc as any).pageSequence) && (templateDoc as any).pageSequence.length > 0) {
      clonedDoc.pageSequence = JSON.parse(JSON.stringify((templateDoc as any).pageSequence));
    }

    if (!clonedDoc.cover) clonedDoc.cover = {};
    clonedDoc.cover.coupleName = effectiveCoupleName;
    clonedDoc.cover.groomName = groomName;
    clonedDoc.cover.brideName = brideName;

    // Strict preservation of AI-extracted or custom initial document data
    if (rawInputDoc) {
      if (rawInputDoc.shootDetails !== undefined) {
        const shootVisible = Boolean(rawInputDoc.shootDetails.visible);
        clonedDoc.shootDetails = {
          ...(clonedDoc.shootDetails || {}),
          ...rawInputDoc.shootDetails,
          visible: shootVisible,
          daysText: shootVisible ? (rawInputDoc.shootDetails.daysText || '') : '',
          crewText: shootVisible ? (rawInputDoc.shootDetails.crewText || '') : '',
          deliverablesText: shootVisible ? (rawInputDoc.shootDetails.deliverablesText || '') : '',
        };
        clonedDoc.pageSequence = syncShootPageInSequence(clonedDoc.pageSequence, shootVisible);
      } else if (Array.isArray(rawInputDoc.pageSequence)) {
        const hasShoot = rawInputDoc.pageSequence.some((p: any) => (typeof p === 'string' ? p : p?.type || p?.id) === 'shootDetails');
        clonedDoc.pageSequence = syncShootPageInSequence(clonedDoc.pageSequence, hasShoot);
      }
      if (rawInputDoc.cover?.locationName) {
        clonedDoc.cover.locationName = rawInputDoc.cover.locationName;
      }
      if (rawInputDoc.cover?.weddingDate && rawInputDoc.cover.weddingDate !== 'Date Not Fixed') {
        clonedDoc.cover.weddingDate = rawInputDoc.cover.weddingDate;
      }
      if (Array.isArray(rawInputDoc.functionsPage?.items) && rawInputDoc.functionsPage.items.length > 0) {
        clonedDoc.functionsPage = {
          ...(clonedDoc.functionsPage || {}),
          items: rawInputDoc.functionsPage.items
        };
      }
      if (Array.isArray(rawInputDoc.deliverablesPage?.selectedItems) && rawInputDoc.deliverablesPage.selectedItems.length > 0) {
        clonedDoc.deliverablesPage = {
          ...(clonedDoc.deliverablesPage || {}),
          selectedItems: rawInputDoc.deliverablesPage.selectedItems,
          availableOptions: Array.from(new Set([
            ...(clonedDoc.deliverablesPage?.availableOptions || []),
            ...(rawInputDoc.deliverablesPage?.availableOptions || []),
            ...rawInputDoc.deliverablesPage.selectedItems
          ]))
        };
      }
      if (rawInputDoc.pricingPage?.basePrice) {
        clonedDoc.pricingPage = {
          ...(clonedDoc.pricingPage || {}),
          basePrice: rawInputDoc.pricingPage.basePrice,
          discountAmount: rawInputDoc.pricingPage.discountAmount || 0,
          gstPct: rawInputDoc.pricingPage.gstPct || 0,
          travelCharges: rawInputDoc.pricingPage.travelCharges || 0,
          accommodationCharges: rawInputDoc.pricingPage.accommodationCharges || 0,
          additionalCharges: rawInputDoc.pricingPage.additionalCharges || 0,
          note: rawInputDoc.pricingPage.note || clonedDoc.pricingPage?.note || ''
        };
      }
      if (Array.isArray(rawInputDoc.paymentTermsPage?.steps) && rawInputDoc.paymentTermsPage.steps.length > 0) {
        clonedDoc.paymentTermsPage = {
          ...(clonedDoc.paymentTermsPage || {}),
          steps: rawInputDoc.paymentTermsPage.steps
        };
      }
    }

    if (!clonedDoc.cover.locationName && (effectiveLead.raw_payload?.venue || effectiveLead.raw_payload?.location || effectiveLead.location)) {
      clonedDoc.cover.locationName = effectiveLead.raw_payload?.venue || effectiveLead.raw_payload?.location || effectiveLead.location;
    }

    // STRICT GUARANTEE: Never overwrite template branding, photos, or custom headings with dummy placeholders
    if (templateDoc.cover?.brandName) clonedDoc.cover.brandName = templateDoc.cover.brandName;
    if (templateDoc.cover?.brandLogoUrl) clonedDoc.cover.brandLogoUrl = templateDoc.cover.brandLogoUrl;
    if (templateDoc.cover?.photoUrl && !clonedDoc.cover.photoUrl) clonedDoc.cover.photoUrl = templateDoc.cover.photoUrl;

    if (!clonedDoc.aboutUs) clonedDoc.aboutUs = {};
    if (templateDoc.aboutUs?.photo && !clonedDoc.aboutUs.photo) clonedDoc.aboutUs.photo = templateDoc.aboutUs.photo;
    if (templateDoc.aboutUs?.signature) clonedDoc.aboutUs.signature = templateDoc.aboutUs.signature;
    if (templateDoc.aboutUs?.kicker) clonedDoc.aboutUs.kicker = templateDoc.aboutUs.kicker;
    if (templateDoc.aboutUs?.heading) clonedDoc.aboutUs.heading = templateDoc.aboutUs.heading;
    if (templateDoc.aboutUs?.text && (!clonedDoc.aboutUs.text || clonedDoc.aboutUs.text.length < 15)) {
      clonedDoc.aboutUs.text = templateDoc.aboutUs.text;
    }

    if (!clonedDoc.shootDetails) clonedDoc.shootDetails = {};
    if (templateDoc.shootDetails?.photo && !clonedDoc.shootDetails.photo) clonedDoc.shootDetails.photo = templateDoc.shootDetails.photo;
    if (templateDoc.shootDetails?.kicker) clonedDoc.shootDetails.kicker = templateDoc.shootDetails.kicker;
    if (templateDoc.shootDetails?.heading) clonedDoc.shootDetails.heading = templateDoc.shootDetails.heading;

    if (!clonedDoc.deliverablesPage) (clonedDoc as any).deliverablesPage = {};
    if ((templateDoc as any).deliverablesPage?.kicker) clonedDoc.deliverablesPage.kicker = (templateDoc as any).deliverablesPage.kicker;
    if ((templateDoc as any).deliverablesPage?.heading) clonedDoc.deliverablesPage.heading = (templateDoc as any).deliverablesPage.heading;
    if ((templateDoc as any).deliverablesPage?.photo && !(clonedDoc.deliverablesPage as any).photo) (clonedDoc.deliverablesPage as any).photo = (templateDoc as any).deliverablesPage.photo;

    if (!clonedDoc.thankYouPage) (clonedDoc as any).thankYouPage = {};
    const tThank: any = templateDoc.thankYouPage || {};
    const cThank: any = clonedDoc.thankYouPage;
    if (tThank.brandName) cThank.brandName = tThank.brandName;
    if (tThank.photo && !cThank.photo) cThank.photo = tThank.photo;
    if (tThank.phone) cThank.phone = tThank.phone;
    if (tThank.contactNumber) cThank.contactNumber = tThank.contactNumber;
    if (tThank.email) cThank.email = tThank.email;
    if (tThank.website) cThank.website = tThank.website;
    if (tThank.signature) cThank.signature = tThank.signature;
    if (tThank.kicker) cThank.kicker = tThank.kicker;
    if (tThank.heading) cThank.heading = tThank.heading;
    if (tThank.subHeading) cThank.subHeading = tThank.subHeading;

    // Preserve layout framing & photo dimensions strictly from template
    ['cover', 'aboutUs', 'shootDetails', 'deliverablesPage', 'thankYouPage'].forEach((pageKey) => {
      const tPage = (templateDoc as any)?.[pageKey];
      const cPage = (clonedDoc as any)?.[pageKey];
      if (tPage && cPage) {
        if (tPage.frameShape) cPage.frameShape = tPage.frameShape;
        if (tPage.photoHeight !== undefined) cPage.photoHeight = tPage.photoHeight;
        if (tPage.photoWidth !== undefined) cPage.photoWidth = tPage.photoWidth;
        if (tPage.photoFocalY !== undefined) cPage.photoFocalY = tPage.photoFocalY;
        if (tPage.bgOpacity !== undefined) cPage.bgOpacity = tPage.bgOpacity;
        if (tPage.imagePosition) cPage.imagePosition = tPage.imagePosition;
      }
    });

    const eventType = (clonedDoc.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
    const quotationTitle = `${effectiveCoupleName} - ${eventType}`;
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

    const nowIso = new Date().toISOString();

    // 3. Fast Single Insert into quotation_documents
    const docPayload: any = {
      template_id: quotationId,
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: leadId,
      lead_version: nextVersion,
      version: nextVersion,
      content_json: clonedDoc,
      created_at: nowIso,
      updated_at: nowIso
    };

    const { error: docInsErr } = await supabaseAdmin
      .from('quotation_documents')
      .insert(docPayload);

    if (docInsErr) {
      console.error('Error inserting quotation document:', docInsErr);
    }

    // 4. Synchronously persist quotations summary + leads.raw_payload.quotation_versions BEFORE returning
    // so lead-summary & /api/leads/[id]/quotations see every new version immediately!
    const prevVersions = Array.isArray(effectiveLead.raw_payload?.quotation_versions)
      ? effectiveLead.raw_payload.quotation_versions
      : [];
    const newVerItem = {
      id: quotationId,
      template_id: quotationId,
      version: nextVersion,
      version_label: `V${nextVersion}`,
      title: quotationTitle,
      couple_name: leadName,
      is_final: false,
      created_at: nowIso,
      updated_at: nowIso
    };
    const updatedVersions = [newVerItem, ...prevVersions.filter((v: any) => v.template_id !== quotationId && v.id !== quotationId)];

    await Promise.allSettled([
      supabaseAdmin.from('quotations').upsert({
        quotation_number: quotationId,
        workspace_id: workspaceId,
        user_id: userId,
        client_id: leadId,
        title: quotationTitle,
        client_name: leadName,
        couple_names: leadName,
        total_amount: clonedDoc.pricingPage?.finalAmount || clonedDoc.pricingPage?.basePrice || 0,
        status: 'draft',
        is_final: false,
        canvas_data: clonedDoc,
        created_at: nowIso,
        updated_at: nowIso
      }, { onConflict: 'workspace_id,quotation_number' }),
      supabaseAdmin.from('leads').update({
        quotation_id: quotationId,
        raw_payload: {
          ...(effectiveLead.raw_payload || {}),
          quotation_id: quotationId,
          couple_name: leadName,
          quotation_versions: updatedVersions
        },
        updated_at: nowIso
      }).eq('id', leadId)
    ]);

    clearLeadSummaryCache();

    // Non-blocking audit log into live_logs
    (async () => {
      try {
        const isValidUUID = (val?: string | null) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
        let logWsId = workspaceId;
        if (!isValidUUID(logWsId)) {
          const { data: prof } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
          logWsId = prof?.id;
        }
        if (isValidUUID(logWsId)) {
          const actor = body.actor_name || profile?.workspace_name || 'Studio Admin';
          const qTitle = clonedDoc.designName || `${leadName} - Quotation V${nextVersion}`;
          await supabaseAdmin.from('live_logs').insert({
            workspace_id: logWsId,
            lead_id: leadId,
            event_type: 'lead_activity',
            message: `${actor} created Quotation V${nextVersion} ("${qTitle}")`,
            metadata: {
              action_type: 'quotation_created',
              actor_name: actor,
              quotation_id: quotationId,
              version: nextVersion,
              title: qTitle,
              logged_at: nowIso
            }
          });
        }
      } catch (_) {}
    })();

    return NextResponse.json({
      success: true,
      quotationId,
      templateId: quotationId,
      version: nextVersion,
      leadVersion: nextVersion,
      document: clonedDoc
    });
  } catch (error: any) {
    console.error('Error in create-for-lead API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
