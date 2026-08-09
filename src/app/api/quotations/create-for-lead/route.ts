import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/quotations/create-for-lead - Creates an independent lead quotation cloned from User's Default Template
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
    const { leadId, clientName, clientPhone, clientEmail, eventDate, customTitle } = body;

    // 1. Check if user has a designated custom default template
    const { data: userDefaultTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('is_default', true)
      .maybeSingle();

    let sourceTemplateId = userDefaultTmpl?.id || 'FW-37C63A54D4';

    // 2. Fetch source template document
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
      // Fallback to global system template FW-37C63A54D4
      const { data: globalDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', 'FW-37C63A54D4')
        .maybeSingle();
      sourceJson = globalDoc?.content_json;
    }

    // 3. Deep clone source document JSON so quotation is completely isolated from template
    const clonedJson = sourceJson
      ? (typeof structuredClone === 'function' ? structuredClone(sourceJson) : JSON.parse(JSON.stringify(sourceJson)))
      : {
          theme: 'cyprus-sand-dune',
          primaryFont: 'Cormorant Garamond',
          secondaryFont: 'Plus Jakarta Sans',
          designName: customTitle || 'Wedding Proposal',
          cover: {
            coupleName: clientName || 'Rahul & Neha',
            eventType: 'WEDDING',
            eventDate: eventDate || 'DECEMBER 2026',
            location: 'MUMBAI',
            brandName: 'FILMIFY WEDDINGS'
          }
        };

    const newQuotationId = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    clonedJson.id = newQuotationId;
    if (clientName) {
      if (!clonedJson.cover) clonedJson.cover = {};
      clonedJson.cover.coupleName = clientName;
    }

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
    const resolvedClient = clientName || `${clonedJson?.cover?.coupleName || 'Valued Client'}`;

    // 4. Save independent quotation row in quotations table
    const { data: newQuote, error: qErr } = await supabaseAdmin
      .from('quotations')
      .insert({
        workspace_id: currentUserId,
        client_id: leadId || null,
        quotation_number: newQuotationId,
        title: resolvedTitle,
        client_name: resolvedClient,
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        content_json: clonedJson,
        status: 'draft',
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (qErr) throw qErr;

    // 5. Save document copy in quotation_documents
    await supabaseAdmin
      .from('quotation_documents')
      .insert({
        template_id: newQuotationId,
        user_id: currentUserId,
        version: 1,
        content_json: clonedJson,
        created_at: now,
        updated_at: now
      });

    return NextResponse.json({
      success: true,
      message: 'Independent lead quotation created successfully.',
      quotationId: newQuotationId,
      quotation: newQuote,
      sourceTemplateId
    });
  } catch (err: any) {
    console.error('[POST /api/quotations/create-for-lead] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
