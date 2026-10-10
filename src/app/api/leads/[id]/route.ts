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

    // 1. Fetch current lead state to preserve all existing payload attributes non-destructively
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    // Auto-detect if booking action was explicitly requested
    const isBookedNow = Boolean(
      body.stage === 'booked' ||
      body.status === 'booked' ||
      (body.stage && String(body.stage).toLowerCase() === 'booked') ||
      (body.stage_name && String(body.stage_name).toLowerCase().includes('book'))
    );

    // Merge existing raw_payload non-destructively
    const mergedRaw = {
      ...(existingLead?.raw_payload || {}),
      ...(body.raw_payload || {}),
    };

    if (body.budget !== undefined) mergedRaw.budget = body.budget;
    if (body.source) mergedRaw.source = body.source;
    if (body.name) {
      mergedRaw.name = body.name;
      mergedRaw.full_name = body.name;
    }
    if (body.email !== undefined) mergedRaw.email = body.email;
    if (body.phone !== undefined) {
      mergedRaw.phone = body.phone;
      mergedRaw.phone_number = body.phone;
    }

    const payload: any = { 
      ...body, 
      raw_payload: mergedRaw,
      updated_at: new Date().toISOString() 
    };

    // Strip client-side transient fields
    delete payload.stage;
    delete payload.stage_name;
    delete payload.client_name;
    delete payload.actor_name;
    delete payload.previous_status;
    delete payload.previous_source;
    delete payload.previous_budget;
    delete payload.previous_stage_id;

    // Resolve stage name and sanitize stage_id if provided
    let resolvedStageName = body.status || null;
    const wsId = existingLead?.workspace_id || body.workspace_id;

    if (wsId) {
      try {
        const { data: wsStages } = await supabaseAdmin.from('crm_stages').select('id, name').eq('workspace_id', wsId);
        
        if ('stage_id' in payload && payload.stage_id) {
          const matched = wsStages?.find(s => 
            s.id === payload.stage_id || 
            s.name.toLowerCase() === String(payload.stage_id).toLowerCase() || 
            (String(payload.stage_id).toLowerCase() === 'booked' && s.name.toLowerCase().includes('book'))
          );
          if (matched?.id && isValidUUID(matched.id)) {
            payload.stage_id = matched.id;
            if (!resolvedStageName) resolvedStageName = matched.name;
          } else if (!isValidUUID(payload.stage_id)) {
            delete payload.stage_id;
          }
        } else if (body.status) {
          // If status string was passed without stage_id, sync stage_id to matching stage UUID!
          const matched = wsStages?.find(s => 
            s.name.toLowerCase() === String(body.status).toLowerCase() ||
            (String(body.status).toLowerCase().includes('new') && s.name.toLowerCase().includes('new')) ||
            (String(body.status).toLowerCase().includes('book') && s.name.toLowerCase().includes('book'))
          );
          if (matched?.id && isValidUUID(matched.id)) {
            payload.stage_id = matched.id;
            resolvedStageName = matched.name;
          }
        }
      } catch (_) {
        if (!isValidUUID(payload.stage_id)) delete payload.stage_id;
      }
    } else if (!isValidUUID(payload.stage_id)) {
      delete payload.stage_id;
    }

    if (isBookedNow) resolvedStageName = 'Booked';
    if (resolvedStageName && !payload.status) {
      payload.status = resolvedStageName;
    }

    // Attempt direct database update
    let { data, error } = await supabaseAdmin
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .select('*')
      .single();

    // Defensive fallback: if budget column doesn't exist on leads table, update with budget in raw_payload only
    if (error && error.message?.toLowerCase().includes('budget') && 'budget' in payload) {
      delete payload.budget;
      const retry = await supabaseAdmin
        .from('leads')
        .update(payload)
        .eq('id', leadId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[API Lead Update Error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (isBookedNow) {
      try {
        await syncBookedLeadOrFinalQuotation({
          leadId,
          workspaceId: data?.workspace_id || wsId,
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
      let logWsId = data?.workspace_id || wsId;
      if (!isValidUUID(logWsId)) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
        logWsId = prof?.id || null;
      }

      const activities: any[] = [];
      if (body.name && body.name !== existingLead?.name) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated lead name to "${body.name}"`,
          metadata: { action_type: 'name_change', actor_name: actor, old_value: existingLead?.name || 'None', new_value: body.name }
        });
      }
      if (body.email !== undefined && body.email !== existingLead?.email) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated email to "${body.email || 'None'}"`,
          metadata: { action_type: 'contact_change', actor_name: actor, old_value: existingLead?.email || 'None', new_value: body.email || 'None' }
        });
      }
      if (body.phone !== undefined && body.phone !== existingLead?.phone) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated phone number to "${body.phone}"`,
          metadata: { action_type: 'contact_change', actor_name: actor, old_value: existingLead?.phone || 'None', new_value: body.phone }
        });
      }
      
      const newSource = body.source || body.raw_payload?.source;
      const oldSource = body.previous_source !== undefined ? body.previous_source : (existingLead?.source || existingLead?.raw_payload?.source);
      if (newSource && newSource !== oldSource) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated lead source from "${oldSource || 'None'}" to "${newSource}"`,
          metadata: { action_type: 'source_change', actor_name: actor, old_value: oldSource || 'None', new_value: newSource }
        });
      }

      const newBudget = body.budget !== undefined ? body.budget : body.raw_payload?.budget;
      const oldBudget = body.previous_budget !== undefined ? body.previous_budget : (existingLead?.budget !== undefined ? existingLead.budget : existingLead?.raw_payload?.budget);
      if (newBudget !== undefined && String(newBudget).trim() !== String(oldBudget || '').trim()) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} updated max budget to "${newBudget || '₹0'}"`,
          metadata: { action_type: 'budget_change', actor_name: actor, old_value: oldBudget || 'None', new_value: newBudget || '₹0' }
        });
      }

      if (body.raw_payload?.lead_owner && body.raw_payload.lead_owner !== existingLead?.raw_payload?.lead_owner) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} assigned Lead Owner to "${body.raw_payload.lead_owner}"`,
          metadata: { action_type: 'owner_change', actor_name: actor, old_value: existingLead?.raw_payload?.lead_owner || 'Unassigned', new_value: body.raw_payload.lead_owner }
        });
      }

      const finalStageName = resolvedStageName || (isBookedNow ? 'Booked' : body.status);
      const oldStage = body.previous_status !== undefined ? body.previous_status : (existingLead?.status || 'Unknown');
      if (finalStageName && finalStageName !== oldStage) {
        activities.push({
          workspace_id: logWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `${actor} moved stage from "${oldStage}" to "${finalStageName}"`,
          metadata: { action_type: 'stage_change', actor_name: actor, old_value: oldStage, new_value: finalStageName }
        });
      }

      if (activities.length > 0 && logWsId) {
        await supabaseAdmin.from('live_logs').insert(activities).catch(() => {});
      }
    } catch (logErr) {
      console.warn('[PATCH /api/leads/[id]] live_logs insertion warning:', logErr);
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (err: any) {
    console.error('[API Lead Update Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
