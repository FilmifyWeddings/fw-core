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
    
    // Auto-detect if booking action was explicitly requested (never on 'closed' or quotation selection)
    const isBookedNow = Boolean(
      payload.stage === 'booked' ||
      payload.status === 'booked' ||
      (payload.stage && String(payload.stage).toLowerCase() === 'booked') ||
      (body.stage_name && String(body.stage_name).toLowerCase().includes('book'))
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

    // Structured audit logging into live_logs
    try {
      const actor = body.actor_name || 'Studio Admin';
      const activities: any[] = [];
      if (body.name) {
        activities.push({
          workspace_id: data?.workspace_id,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated lead name to "${body.name}"`,
          metadata: { action_type: 'name_change', actor_name: actor, new_value: body.name }
        });
      }
      if (body.email) {
        activities.push({
          workspace_id: data?.workspace_id,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated email to ${body.email}`,
          metadata: { action_type: 'contact_change', actor_name: actor, new_value: body.email }
        });
      }
      if (body.phone) {
        activities.push({
          workspace_id: data?.workspace_id,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated phone number to ${body.phone}`,
          metadata: { action_type: 'contact_change', actor_name: actor, new_value: body.phone }
        });
      }
      if (body.raw_payload?.lead_owner) {
        activities.push({
          workspace_id: data?.workspace_id,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} assigned Lead Owner to "${body.raw_payload.lead_owner}"`,
          metadata: { action_type: 'owner_change', actor_name: actor, new_value: body.raw_payload.lead_owner }
        });
      }
      if (body.status || isBookedNow) {
        activities.push({
          workspace_id: data?.workspace_id,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} moved stage to "${isBookedNow ? 'Booked' : body.status}"`,
          metadata: { action_type: 'stage_change', actor_name: actor, new_value: isBookedNow ? 'Booked' : body.status }
        });
      }
      if (activities.length > 0) {
        supabaseAdmin.from('live_logs').insert(activities).catch(() => {});
      }
    } catch (_) {}

    return NextResponse.json({ success: true, lead: data });
  } catch (err: any) {
    console.error('[API Lead Update Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
