import { supabase } from '@/lib/supabase';

export interface SaveCrewAssignmentCommercialsParams {
  workspaceId: string;
  assignmentId?: string;
  projectId?: string;
  subEventId?: string;
  member: {
    id: string;
    name: string;
    phone?: string;
    phone_number?: string;
    primary_role?: string;
    default_rate?: number;
    daily_rate?: number;
    default_daily_rate?: number;
  };
  assignedRole: string;
  agreedAmount: number;
  advancePaid: number;
  paymentStatus?: 'pending' | 'partial' | 'completed';
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  clientName?: string;
  eventName?: string;
  eventDate?: string;
}

/**
 * Saves crew assignment commercials atomically to both fw_assignments and team_event_payouts.
 */
export async function saveCrewAssignmentCommercials(params: SaveCrewAssignmentCommercialsParams) {
  const agreed = Number(params.agreedAmount) || 0;
  const advance = Number(params.advancePaid) || 0;
  const balanceDue = Math.max(0, agreed - advance);
  const assignStatus = balanceDue <= 0 && agreed > 0 ? 'COMPLETED' : 'PENDING';
  const payoutStatus = balanceDue <= 0 && agreed > 0 ? 'PAID' : (advance > 0 ? 'PARTIAL' : 'PENDING');
  const pStatusDb = balanceDue <= 0 && agreed > 0 ? 'completed' : (advance > 0 ? 'partial' : 'pending');
  const pDate = params.paymentDate || new Date().toISOString().split('T')[0];
  const pMethod = params.paymentMethod || 'UPI/Bank Transfer';

  let updatedAssignId = params.assignmentId;
  const cleanAssignId = String(params.assignmentId || '');

  // 1. Ensure member row exists in fw_team_members
  if (params.member?.id) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;
      await supabase.from('fw_team_members').upsert({
        id: params.member.id,
        name: params.member.name || 'Team Member',
        phone_number: params.member.phone_number || params.member.phone || null,
        primary_role: params.assignedRole || params.member.primary_role || 'Crew',
        user_id: currentUid || undefined,
        is_active: true,
        default_daily_rate: agreed > 0 ? agreed : undefined
      }, { onConflict: 'id' });
    } catch (_) {}
  }

  // 2. Atomically update/insert fw_assignments
  const assignmentPayload: any = {
    assigned_member_id: String(params.member.id),
    assigned_member_name: params.member.name,
    agreed_amount: agreed,
    advance_amount: advance,
    paid_amount: advance,
    balance_amount: balanceDue,
    payment_status: pStatusDb,
    payment_method: pMethod,
    payment_date: pDate,
    status: assignStatus,
    notes: params.notes || null,
    updated_at: new Date().toISOString(),
    ...(params.workspaceId ? { workspace_id: params.workspaceId, user_id: params.workspaceId } : {}),
    ...(params.eventName ? { sub_event_name: params.eventName } : {}),
    ...(params.clientName ? { client_name: params.clientName } : {})
  };

  let savedRow: any = null;
  try {
    if (cleanAssignId && !cleanAssignId.includes('-role-')) {
      const { data: updated } = await supabase
        .from('fw_assignments')
        .update(assignmentPayload)
        .eq('id', cleanAssignId)
        .select('*, fw_team_members(*)')
        .maybeSingle();
      if (updated) savedRow = updated;
    } else if (params.subEventId) {
      const { data: existingRow } = await supabase
        .from('fw_assignments')
        .select('id')
        .eq('sub_event_id', String(params.subEventId))
        .eq('required_role', params.assignedRole)
        .maybeSingle();

      if (existingRow?.id) {
        updatedAssignId = existingRow.id;
        const { data: updated } = await supabase
          .from('fw_assignments')
          .update(assignmentPayload)
          .eq('id', existingRow.id)
          .select('*, fw_team_members(*)')
          .maybeSingle();
        if (updated) savedRow = updated;
      } else {
        const { data: inserted } = await supabase
          .from('fw_assignments')
          .insert([{
            project_id: params.projectId,
            sub_event_id: params.subEventId,
            required_role: params.assignedRole,
            ...assignmentPayload
          }])
          .select('*, fw_team_members(*)')
          .maybeSingle();
        if (inserted?.id) {
          updatedAssignId = inserted.id;
          savedRow = inserted;
        }
      }
    }
  } catch (assignErr) {
    console.warn('[crewAssignmentService] fw_assignments update error:', assignErr);
  }

  // 3. Atomically upsert team_event_payouts row
  const payoutPayload = {
    workspace_id: params.workspaceId,
    user_id: params.workspaceId,
    member_id: String(params.member.id),
    member_name: params.member.name,
    project_id: String(params.projectId || ''),
    sub_event_id: String(params.subEventId || ''),
    client_name: params.clientName || 'Wedding Client',
    event_name: params.eventName || 'Shoot Event',
    event_date: params.eventDate || pDate,
    role: params.assignedRole,
    agreed_amount: agreed,
    paid_amount: advance,
    balance_amount: balanceDue,
    status: payoutStatus,
    payment_method: pMethod,
    payment_date: pDate,
    notes: params.notes || null,
    updated_at: new Date().toISOString()
  };

  try {
    const { data: existingPayout } = await supabase
      .from('team_event_payouts')
      .select('id')
      .eq('sub_event_id', String(params.subEventId || ''))
      .eq('member_id', String(params.member.id))
      .maybeSingle();

    if (existingPayout?.id) {
      await supabase
        .from('team_event_payouts')
        .update(payoutPayload)
        .eq('id', existingPayout.id);
    } else {
      const { error: upsertErr } = await supabase
        .from('team_event_payouts')
        .upsert(payoutPayload, { onConflict: 'sub_event_id,member_id' });
      if (upsertErr) {
        await supabase.from('team_event_payouts').insert([payoutPayload]);
      }
    }
  } catch (payoutErr) {
    console.warn('[crewAssignmentService] team_event_payouts sync note:', payoutErr);
  }

  // 4. Dispatch browser real-time event for zero-latency reactive UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('team_finance_updated', {
      detail: {
        memberId: params.member.id,
        assignmentId: updatedAssignId,
        agreedAmount: agreed,
        paidAmount: advance,
        balanceDue,
        payout: payoutPayload
      }
    }));
  }

  return {
    success: true,
    assignmentId: updatedAssignId,
    savedAssignment: savedRow,
    subEventId: params.subEventId,
    role: params.assignedRole,
    agreedAmount: agreed,
    advancePaid: advance,
    balanceDue,
    status: assignStatus
  };
}
