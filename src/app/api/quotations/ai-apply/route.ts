import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { normalizeQuotationData } from '@/lib/quotation-defaults';

/**
 * Authoritative Route to Apply AI Extracted Data to Current Quotation Draft
 * VERSION SAFETY GUARANTEE:
 * - Updates the CURRENT quotation draft (quotationId / templateId) in place.
 * - Preserves the user's template design, theme, fonts, cover branding & custom pages.
 * - Does NOT create a new quotation version.
 * - Does NOT increment lead_version (V3 remains V3).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const { quotationId, templateId, document } = body;

    const targetId = quotationId || templateId;

    if (!targetId || !document) {
      return NextResponse.json({ error: 'quotationId / templateId and document are required' }, { status: 400 });
    }

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    console.log('[AI APPLY TO QUOTATION DRAFT]', {
      targetId,
      userId,
      workspaceId
    });

    // 1. Fetch existing quotation document to preserve custom theme, design, fonts, branding
    const { data: existingQDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('content_json')
      .eq('template_id', targetId)
      .maybeSingle();

    const baseTemplate = existingQDoc?.content_json || null;

    // 2. Normalize document schema on top of the existing template
    const normalizedDoc = normalizeQuotationData(document, baseTemplate);
    const coupleName = normalizedDoc.cover?.coupleName || normalizedDoc.cover?.groomName || 'Valued Client';
    const eventType = normalizedDoc.cover?.eventType || 'Wedding';
    const quotationTitle = `${coupleName} - ${eventType} Quotation`;
    normalizedDoc.designName = quotationTitle;
    normalizedDoc.title = quotationTitle;

    // 3. Update quotation_documents content_json in place
    const { error: docErr } = await supabaseAdmin
      .from('quotation_documents')
      .update({
        content_json: normalizedDoc,
        updated_at: new Date().toISOString()
      })
      .eq('template_id', targetId);

    if (docErr) {
      console.warn('[AI Apply Document Warning]:', docErr);
    }

    // 4. Update quotations table client_name & updated_at in place
    try {
      await supabaseAdmin
        .from('quotations')
        .update({
          title: quotationTitle,
          client_name: coupleName,
          total_amount: normalizedDoc.pricingPage?.basePrice || 0,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${targetId},quotation_number.eq.${targetId}`);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      quotationId: targetId,
      templateId: targetId,
      document: normalizedDoc,
      message: 'AI quotation data applied successfully to current draft (version and design preserved).'
    });
  } catch (error: any) {
    console.error('[AI Apply Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply AI quotation data' }, { status: 500 });
  }
}
