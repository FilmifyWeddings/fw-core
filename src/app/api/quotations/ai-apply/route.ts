import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative Route to Apply AI Extracted Data to Current Quotation Draft
 * VERSION SAFETY GUARANTEE:
 * - Updates the CURRENT quotation draft (quotationId / templateId) in place.
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

    // 1. Update quotation_documents content_json in place
    const { error: docErr } = await supabaseAdmin
      .from('quotation_documents')
      .update({
        content_json: document,
        updated_at: new Date().toISOString()
      })
      .eq('template_id', targetId);

    if (docErr) {
      console.warn('[AI Apply Document Warning]:', docErr);
    }

    // 2. Update quotations table client_name & updated_at in place
    try {
      await supabaseAdmin
        .from('quotations')
        .update({
          client_name: document.cover?.coupleName || document.cover?.groomName || 'Valued Client',
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${targetId},quotation_number.eq.${targetId}`);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      quotationId: targetId,
      templateId: targetId,
      document,
      message: 'AI quotation data applied successfully to current draft (version preserved).'
    });
  } catch (error: any) {
    console.error('[AI Apply Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply AI quotation data' }, { status: 500 });
  }
}
