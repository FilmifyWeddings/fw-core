import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, responseType, budgetAmount, clientName, clientNotes } = body;

    if (!token) {
      return NextResponse.json({ error: 'Public token is required' }, { status: 400 });
    }

    if (!['accepted', 'budget_discussion'].includes(responseType)) {
      return NextResponse.json({ error: 'Invalid responseType. Must be accepted or budget_discussion' }, { status: 400 });
    }

    // 1. Resolve quotation record via public_token
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from('quotations')
      .select('*')
      .eq('public_token', token)
      .maybeSingle();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Invalid or expired quotation token' }, { status: 404 });
    }

    const canvasData = quote.canvas_data || {};
    const workspaceId = quote.workspace_id || quote.user_id;
    const leadId = quote.client_id || canvasData.lead_id || 'UNKNOWN_LEAD';
    const quotationId = quote.quotation_number || quote.id;
    const leadVersion = canvasData.lead_version || quote.lead_version || 1;

    // 2. Attempt insert into quotation_responses
    const responsePayload = {
      workspace_id: workspaceId,
      lead_id: leadId,
      quotation_id: quotationId,
      lead_version: leadVersion,
      public_token: token,
      response_type: responseType,
      budget_amount: responseType === 'budget_discussion' ? (Number(budgetAmount) || null) : null,
      client_name: clientName || quote.client_name || null,
      client_notes: clientNotes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: respErr } = await supabaseAdmin
      .from('quotation_responses')
      .insert(responsePayload);

    if (respErr) {
      // If error is unique constraint violation on 'accepted', treat as idempotent success
      if (respErr.code === '23505' || respErr.message?.includes('unique')) {
        console.log('[POST /api/quotations/response] Idempotent acceptance request acknowledged.');
      } else {
        console.warn('[POST /api/quotations/response] quotation_responses insert note:', respErr.message);
      }
    }

    // 3. Update main quotation status & notes for full backward compatibility
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (responseType === 'accepted') {
      updatePayload.status = 'accepted';
    }

    if (clientNotes) {
      updatePayload.client_notes = clientNotes;
    }

    if (responseType === 'budget_discussion' && budgetAmount) {
      updatePayload.client_notes = `Budget Discussion Request: ₹${Number(budgetAmount).toLocaleString('en-IN')}${clientNotes ? ` - ${clientNotes}` : ''}`;
    }

    await supabaseAdmin
      .from('quotations')
      .update(updatePayload)
      .eq('id', quote.id);

    return NextResponse.json({
      success: true,
      message: responseType === 'accepted' ? 'Proposal accepted successfully' : 'Budget discussion request submitted',
      responseType,
      quotationId,
      leadVersion
    });
  } catch (error: any) {
    console.error('[POST /api/quotations/response] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
