import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { findFinalQuotationForLead, extractFinancialsFromQuotation, extractCoupleNameFromQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    // 1. Fetch lead details
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, name, final_quotation_id, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    // 2. Find strictly final quotation for this lead using supabaseAdmin (bypasses RLS)
    const finalDoc = await findFinalQuotationForLead(supabaseAdmin, leadId);

    if (finalDoc) {
      const content = finalDoc.content_json || {};
      const coupleName = extractCoupleNameFromQuotation(content, lead?.name || 'Valued Client');
      const financials = extractFinancialsFromQuotation(content);
      const title = content.meta?.project_name || `${coupleName} - Final Quotation`;

      return NextResponse.json({
        success: true,
        hasFinal: true,
        quotation: {
          id: finalDoc.id,
          template_id: finalDoc.template_id,
          version: finalDoc.version || finalDoc.lead_version || 1,
          title,
          coupleName,
          totalAmount: financials.final_total_amount || 0,
          receivedAmount: financials.received_amount || 0,
          pendingAmount: financials.pending_amount || 0,
          eventDate: financials.event_date || null,
          eventType: financials.event_type || 'Wedding',
          content_json: content
        }
      });
    }

    return NextResponse.json({
      success: true,
      hasFinal: false,
      quotation: null
    });
  } catch (err: any) {
    console.error('[GET /api/leads/[id]/final-quotation error]:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
