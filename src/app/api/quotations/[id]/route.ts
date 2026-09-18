import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractFinancialsFromQuotation, syncQuotationToTeamManagerEvents } from '@/lib/quotation-finance-sync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create admin client for bypass/service operations if needed
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// GET /api/quotations/[id] - Fetch single quotation with User Access Lock
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Get authenticated user
    let userId: string | null = null;
    let userStudioName: string | null = null;

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        userStudioName = user.user_metadata?.studioName || user.user_metadata?.studio_name || null;
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }

    // Query quotation from Supabase: Match by ID/quotation_number or fallback to user's latest quotation
    let quotation: any = null;
    let error: any = null;

    if (id === '1' && userId) {
      // If default route '1' is called, fetch user's single active DB quotation
      const { data: userQuotes } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .eq('workspace_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (userQuotes && userQuotes.length > 0) {
        quotation = userQuotes[0];
      }
    }

    if (!quotation) {
      const { data: matchQuote, error: qErr } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .maybeSingle();
      quotation = matchQuote;
      error = qErr;
    }

    if (error) {
      console.warn('[API GET /api/quotations/[id]] DB error:', error.message);
    }

    if (quotation) {
      // User Isolation & Access Lock Check
      if (userId && quotation.workspace_id && quotation.workspace_id !== userId && quotation.workspace_id !== 'demo_user') {
        return NextResponse.json(
          { error: 'Access denied: You do not own this quotation.', isForbidden: true },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, quotation, userStudioName });
    }

    return NextResponse.json({
      success: true,
      quotation: null,
      message: 'Quotation not found in database, initialize preset.',
      userStudioName
    });
  } catch (err: any) {
    console.error('[API GET /api/quotations/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/quotations/[id] - Save / Auto-Save quotation with User Isolation
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content_json, title, client_name, financials, status, workspace_id } = body;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let currentUserId = workspace_id || 'demo_user';

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    // Verify existing quotation ownership if it exists
    const { data: existing } = await supabaseAdmin
      .from('quotations')
      .select('workspace_id')
      .or(`id.eq.${id},quotation_number.eq.${id}`)
      .maybeSingle();

    if (existing && existing.workspace_id && existing.workspace_id !== currentUserId && existing.workspace_id !== 'demo_user') {
      return NextResponse.json(
        { error: 'Access denied: You cannot modify another user\'s quotation.', isForbidden: true },
        { status: 403 }
      );
    }

    const payload: any = {
      workspace_id: currentUserId,
      quotation_number: id || 'FW-2026-001',
      title: title || content_json?.designName || 'Wedding - Design 1',
      client_name: client_name || `${content_json?.cover?.groomName || 'Rahul'} & ${content_json?.cover?.brideName || 'Neha'}`,
      financials: financials || { total_amount: 0 },
      status: status || 'draft',
      updated_at: new Date().toISOString(),
    };

    const { data: savedQuotation, error: saveErr } = await supabaseAdmin
      .from('quotations')
      .upsert(payload, { onConflict: 'workspace_id,quotation_number' })
      .select()
      .maybeSingle();

    if (content_json) {
      await supabaseAdmin
        .from('quotation_documents')
        .upsert({
          template_id: id,
          workspace_id: currentUserId,
          user_id: currentUserId,
          content_json: content_json,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });

      // Auto-sync with Finance & Team Manager if quotation is final
      try {
        const { data: currentDoc } = await supabaseAdmin
          .from('quotation_documents')
          .select('id, lead_id, client_id, is_final, content_json')
          .eq('template_id', id)
          .maybeSingle();

        const isFinal = Boolean(
          content_json?.is_final === true ||
          status === 'accepted' ||
          status === 'final' ||
          currentDoc?.is_final === true ||
          currentDoc?.content_json?.is_final === true
        );

        const targetLeadOrClientId = currentDoc?.lead_id || currentDoc?.client_id || content_json?.meta?.lead_id || content_json?.lead_id;

        let isLeadFinal = isFinal;
        if (!isLeadFinal && targetLeadOrClientId) {
          const { data: leadCheck } = await supabaseAdmin
            .from('leads')
            .select('id, final_quotation_id')
            .eq('id', targetLeadOrClientId)
            .maybeSingle();
          if (leadCheck?.final_quotation_id === id) {
            isLeadFinal = true;
          }
        }

        if (isLeadFinal && targetLeadOrClientId) {
          const finData = extractFinancialsFromQuotation(content_json);
          const cName = client_name || content_json?.cover?.coupleName || 'Valued Client';
          const evDate = finData.event_date || content_json?.meta?.event_date || null;
          const venue = content_json?.meta?.venue || content_json?.cover?.venue || null;

          const { data: linkedClients } = await supabaseAdmin
            .from('workspace_clients')
            .select('id')
            .or(`lead_id.eq.${targetLeadOrClientId},id.eq.${targetLeadOrClientId}`);

          const wsClientId = linkedClients?.[0]?.id;

          if (linkedClients && linkedClients.length > 0) {
            for (const lc of linkedClients) {
              await supabaseAdmin
                .from('workspace_clients')
                .update({
                  total_package_amount: finData.final_total_amount,
                  paid_amount: finData.received_amount,
                  event_type: finData.event_type || undefined,
                  event_date: evDate || undefined,
                  updated_at: new Date().toISOString()
                })
                .eq('id', lc.id);

              await supabaseAdmin
                .from('client_finance_records')
                .upsert({
                  user_id: currentUserId,
                  workspace_id: currentUserId,
                  client_id: lc.id,
                  base_package_price: finData.base_package_price,
                  discount_amount: finData.discount_amount,
                  accommodation_charges: finData.accommodation_charges,
                  travel_charges: finData.travel_charges,
                  additional_charges: finData.additional_charges,
                  subtotal_amount: finData.subtotal_amount,
                  gst_rate: finData.gst_rate,
                  gst_amount: finData.gst_amount,
                  final_total_amount: finData.final_total_amount,
                  received_amount: finData.received_amount,
                  pending_amount: finData.pending_amount,
                  payment_status: finData.payment_status,
                  milestones: finData.milestones,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'client_id' });
            }
          }

          await syncQuotationToTeamManagerEvents(
            supabaseAdmin,
            targetLeadOrClientId,
            content_json,
            cName,
            currentUserId,
            evDate,
            venue,
            wsClientId
          );
        }
      } catch (syncErr) {
        console.error('[API quotations/[id]] Error syncing to finance/team manager:', syncErr);
      }
    }

    if (saveErr) {
      console.warn('[API PUT /api/quotations/[id]] DB Upsert Warning:', saveErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Quotation saved successfully.',
      quotation: savedQuotation || payload
    });
  } catch (err: any) {
    console.error('[API PUT /api/quotations/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
