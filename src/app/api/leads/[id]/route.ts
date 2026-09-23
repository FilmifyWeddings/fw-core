import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncBookedLeadOrFinalQuotation } from '@/lib/quotation-finance-sync';

export const runtime = 'nodejs';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const body = await req.json().catch(() => ({}));
    
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const payload: any = { ...body, updated_at: new Date().toISOString() };
    
    // Auto-detect if booking action was requested
    const isBookedNow = Boolean(
      payload.stage === 'booked' ||
      payload.status === 'booked' ||
      payload.status === 'closed' ||
      (payload.stage && String(payload.stage).toLowerCase().includes('book')) ||
      (payload.status && String(payload.status).toLowerCase().includes('book')) ||
      (body.stage_name && String(body.stage_name).toLowerCase().includes('book')) ||
      (payload.stage_id && String(payload.stage_id).toLowerCase().includes('book')) ||
      payload.final_quotation_id
    );

    // Strip non-existent columns from leads table payload
    delete payload.stage;
    delete payload.stage_name;
    delete payload.client_name;

    // Sanitize and resolve stage_id if not valid UUID
    if ('stage_id' in payload && payload.stage_id) {
      if (!isValidUUID(payload.stage_id)) {
        try {
          const { data: leadRow } = await supabaseAdmin.from('leads').select('workspace_id').eq('id', leadId).maybeSingle();
          const wsId = leadRow?.workspace_id;
          if (wsId) {
            const { data: wsStages } = await supabaseAdmin.from('crm_stages').select('id, name').eq('workspace_id', wsId);
            const matched = wsStages?.find(s => 
              s.id === payload.stage_id || 
              s.name.toLowerCase() === payload.stage_id.toLowerCase() || 
              (payload.stage_id === 'booked' && s.name.toLowerCase().includes('book'))
            );
            if (matched?.id && isValidUUID(matched.id)) {
              payload.stage_id = matched.id;
            } else {
              delete payload.stage_id;
            }
          } else {
            delete payload.stage_id;
          }
        } catch (_) {
          delete payload.stage_id;
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .select('*')
      .single();

    if (error) {
      console.error('[API Lead Update Error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (isBookedNow) {
      try {
        await syncBookedLeadOrFinalQuotation({
          leadId,
          workspaceId: data?.workspace_id,
          forceBookedStatus: true,
          supabaseClient: supabaseAdmin
        });
      } catch (syncErr) {
        console.error('[API Lead Update Sync Error]:', syncErr);
      }
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (err: any) {
    console.error('[API Lead Update Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
