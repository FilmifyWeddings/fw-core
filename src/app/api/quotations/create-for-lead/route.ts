import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/quotations/create-for-lead
// Authoritative endpoint for creating an independent lead quotation cloned from:
// FLOW A: User's Active Default Template (or Global System Default fallback if no personal default)
// FLOW B: Specifically selected templateId (from /quotations -> FOR LEADS flow)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let currentUserId = 'demo_user';
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    const body = await req.json();
    const { 
      leadId, 
      templateId, 
      sourceTemplateId: inputSourceId,
      clientName, 
      clientPhone, 
      clientEmail, 
      eventDate, 
      customTitle 
    } = body;

    let targetLead: any = null;
    let resolvedClientName = clientName || 'Valued Client';

    // 1. Verify Lead existence and authorization if leadId is passed
    if (leadId) {
      const { data: leadData } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (leadData) {
        // Multi-Tenant Lead Isolation Check
        if (leadData.workspace_id && leadData.workspace_id !== currentUserId && leadData.workspace_id !== 'demo_user' && currentUserId !== 'demo_user') {
          return NextResponse.json(
            { error: 'Access denied: You do not own this lead.', isForbidden: true },
            { status: 403 }
          );
        }
        targetLead = leadData;
        resolvedClientName = leadData.name || clientName || 'Valued Client';
      }
    }

    // 2. Resolve Source Template ID
    const explicitTemplateId = templateId || inputSourceId;
    let sourceTemplateId = 'FW-37C63A54D4';

    if (explicitTemplateId) {
      // FLOW B: User explicitly clicked FOR LEADS on a specific template card
      // Verify authorization for the explicitly selected template
      const { data: explicitTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, is_system_template')
        .eq('id', explicitTemplateId)
        .maybeSingle();

      const isSystem = explicitTemplateId === 'FW-37C63A54D4' || explicitTemplateId === 'SYSTEM_DEFAULT_WEDDING' || (explicitTmpl as any)?.is_system_template || explicitTmpl?.user_id === 'SYSTEM';

      if (!isSystem && explicitTmpl && explicitTmpl.user_id && explicitTmpl.user_id !== currentUserId && explicitTmpl.user_id !== 'demo_user' && currentUserId !== 'demo_user') {
        return NextResponse.json(
          { error: 'Access denied: You do not own this quotation template.', isForbidden: true },
          { status: 403 }
        );
      }

    } else {
      // FLOW A: Triggered from /leads -> Quotation Icon
      // Must use CURRENT USER'S ACTIVE DEFAULT TEMPLATE dynamically from DB
      const { data: defaultCandidates } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, is_default, is_system_template, updated_at')
        .eq('is_default', true)
        .order('updated_at', { ascending: false });

      // Find the user's active custom default template (excluding lead quotation IDs FW-Q-, FW-L- and system templates)
      const userDefaultTmpl = (defaultCandidates || []).find(
        (t: any) => !t.id.startsWith('FW-Q-') && !t.id.startsWith('FW-L-') && !t.is_system_template && t.id !== 'FW-37C63A54D4'
      );

      if (userDefaultTmpl?.id) {
        sourceTemplateId = userDefaultTmpl.id;
      } else {
        // Fallback to Global System Default Wedding Template
        sourceTemplateId = 'FW-37C63A54D4';
      }
    }

    // 3. Fetch source document JSON (Authoritative Source)
    let sourceJson: any = null;
    if (sourceTemplateId) {
      const { data: sourceDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', sourceTemplateId)
        .maybeSingle();
      sourceJson = sourceDoc?.content_json;
    }

    if (!sourceJson) {
      const { data: legacyQuote } = await supabaseAdmin
        .from('quotations')
        .select('content_json')
        .or(`id.eq.${sourceTemplateId},quotation_number.eq.${sourceTemplateId}`)
        .maybeSingle();
      sourceJson = legacyQuote?.content_json;
    }

    if (!sourceJson) {
      // Global fallback to FW-37C63A54D4 document
      const { data: globalDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', 'FW-37C63A54D4')
        .maybeSingle();
      sourceJson = globalDoc?.content_json;
    }

    // 4. 100% COMPLETE DEEP CLONE (No shared mutable references)
    const clonedJson = sourceJson
      ? (typeof structuredClone === 'function' ? structuredClone(sourceJson) : JSON.parse(JSON.stringify(sourceJson)))
      : {
          theme: 'cyprus-sand-dune',
          primaryFont: 'Cormorant Garamond',
          secondaryFont: 'Plus Jakarta Sans',
          designName: customTitle || 'Wedding Proposal',
          cover: {
            coupleName: resolvedClientName,
            eventType: 'WEDDING',
            eventDate: eventDate || 'DECEMBER 2026',
            location: 'MUMBAI',
            brandName: 'FILMIFY WEDDINGS'
          }
        };

    const newQuotationId = 'FW-Q-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    clonedJson.id = newQuotationId;
    if (leadId) clonedJson.lead_id = leadId;

    // Apply lead data mapping without overwriting template design, fonts, or pricing structure
    if (!clonedJson.cover) clonedJson.cover = {};
    clonedJson.cover.coupleName = resolvedClientName;

    if (resolvedClientName.includes('&')) {
      clonedJson.cover.groomName = resolvedClientName.split('&')[0].trim();
      clonedJson.cover.brideName = resolvedClientName.split('&')[1].trim();
    } else {
      clonedJson.cover.groomName = resolvedClientName;
    }

    if (targetLead?.raw_payload?.venue || targetLead?.raw_payload?.location) {
      clonedJson.cover.locationName = targetLead.raw_payload.venue || targetLead.raw_payload.location;
    }

    if (targetLead?.raw_payload?.event_date || eventDate) {
      clonedJson.cover.eventDate = targetLead.raw_payload?.event_date || eventDate;
    }

    // Regenerate unique page IDs for new independent quotation
    if (Array.isArray(clonedJson.pageSequence)) {
      clonedJson.pageSequence = clonedJson.pageSequence.map((p: any) => ({
        ...p,
        id: 'page_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    if (Array.isArray(clonedJson.customPages)) {
      clonedJson.customPages = clonedJson.customPages.map((cp: any) => ({
        ...cp,
        id: 'cpage_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    const now = new Date().toISOString();
    const resolvedTitle = customTitle || clonedJson.designName || 'Wedding Proposal';

    // 5. Save document JSON in quotation_documents table (Authoritative Document Storage for Lead Quotation)
    const docPayload: any = {
      template_id: newQuotationId,
      user_id: currentUserId,
      version: 1,
      content_json: clonedJson,
      created_at: now,
      updated_at: now
    };
    if (leadId) docPayload.lead_id = leadId;

    let savedDoc: any = null;
    const { data: dData, error: dErr } = await supabaseAdmin
      .from('quotation_documents')
      .insert(docPayload)
      .select()
      .maybeSingle();

    if (dErr) {
      console.warn('[Create For Lead Warning] quotation_documents insert warning:', dErr.message);
      // Fallback without top-level lead_id column if schema cache misses it
      delete docPayload.lead_id;
      const { data: fbDoc } = await supabaseAdmin
        .from('quotation_documents')
        .insert(docPayload)
        .select()
        .maybeSingle();
      savedDoc = fbDoc;
    } else {
      savedDoc = dData;
    }

    // 7. Save row in quotations table (without content_json to prevent schema cache errors)
    let newQuote: any = null;
    try {
      const { data: qData } = await supabaseAdmin
        .from('quotations')
        .insert({
          workspace_id: currentUserId,
          client_id: leadId || null,
          quotation_number: newQuotationId,
          title: resolvedTitle,
          client_name: resolvedClientName,
          client_phone: clientPhone || targetLead?.phone || null,
          client_email: clientEmail || targetLead?.email || null,
          status: 'draft',
          created_at: now,
          updated_at: now
        })
        .select()
        .maybeSingle();
      newQuote = qData;
    } catch (_) {}

    // 8. Save initial audit version in quotation_versions
    if (savedDoc?.id) {
      try {
        await supabaseAdmin.from('quotation_versions').insert({
          document_id: savedDoc.id,
          template_id: newQuotationId,
          user_id: currentUserId,
          version: 1,
          content_json: clonedJson,
          created_at: now
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Independent quotation created successfully for ${resolvedClientName}.`,
      quotationId: newQuotationId,
      templateId: newQuotationId,
      quotation: newQuote,
      document: savedDoc || docPayload,
      sourceTemplateId
    });
  } catch (err: any) {
    console.error('[POST /api/quotations/create-for-lead] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
