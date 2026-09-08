import { supabase } from '@/lib/supabase';

export interface AssignmentAdvancePayoutParams {
  workspaceId?: string;
  assignmentId: string;
  projectId?: string;
  subEventId?: string;
  member: {
    id: string;
    name: string;
    phone?: string;
  };
  clientName?: string;
  eventName?: string;
  agreedAmount: number;
  advancePaid: number;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}

export interface RecordCrewPayoutTrancheParams {
  workspaceId?: string;
  assignmentId: string;
  memberId: string;
  memberName: string;
  projectId?: string;
  subEventId?: string;
  clientName?: string;
  eventName?: string;
  installmentAmount: number;
  paymentDate?: string;
  paymentMode?: string;
  referenceNo?: string;
  notes?: string;
  currentAgreedAmount?: number;
  currentPaidAmount?: number;
}

/**
 * Resolves current authenticated user id with fallback to workspaceId.
 */
async function resolveCurrentUserId(fallbackWorkspaceId?: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (_) {}

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch (_) {}

  if (fallbackWorkspaceId && !fallbackWorkspaceId.startsWith('ws_')) {
    return fallbackWorkspaceId;
  }
  return null;
}

/**
 * 1. Assignment Advance Payout Sync:
 * When assigning a crew member with an advance (> 0), records the tranche
 * and inserts an isolated studio expense row for the studio owner.
 */
export async function syncAssignmentAdvancePayout(params: AssignmentAdvancePayoutParams) {
  const advance = Number(params.advancePaid) || 0;
  const agreed = Number(params.agreedAmount) || 0;
  if (advance <= 0 || !params.assignmentId || !params.member?.id) {
    return { success: false, reason: 'No advance amount or missing assignment/member' };
  }

  const currentUserId = await resolveCurrentUserId(params.workspaceId);
  if (!currentUserId) {
    console.warn('[payoutExpensesSyncService] Unable to resolve currentUserId for advance payout sync');
    return { success: false, reason: 'Unauthenticated' };
  }

  const balanceDue = Math.max(0, agreed - advance);
  const paymentStatus = balanceDue === 0 && agreed > 0 ? 'PAID' : 'PARTIALLY_PAID';
  const paymentDate = params.paymentDate || new Date().toISOString().split('T')[0];
  const paymentMethod = params.paymentMethod || 'UPI';
  const cleanMemberName = params.member.name.trim();
  const eventTitle = params.eventName || 'Shoot Event';
  const clientTitle = params.clientName || 'Wedding Client';

  // 1. Idempotency check: check if an advance tranche already exists for this assignment
  let existingTrancheId: string | null = null;
  try {
    const { data: existingTranches } = await supabase
      .from('fw_crew_payment_tranches')
      .select('id, amount')
      .eq('assignment_id', params.assignmentId)
      .ilike('notes', '%advance%')
      .limit(1);

    if (existingTranches && existingTranches.length > 0) {
      existingTrancheId = existingTranches[0].id;
    }
  } catch (_) {}

  // 2. Insert or update fw_crew_payment_tranches
  let trancheId = existingTrancheId;
  if (!existingTrancheId) {
    try {
      const { data: insertedTranche, error: trancheErr } = await supabase
        .from('fw_crew_payment_tranches')
        .insert({
          user_id: currentUserId,
          assignment_id: params.assignmentId,
          member_id: params.member.id,
          project_id: params.projectId || null,
          sub_event_id: params.subEventId || null,
          amount: advance,
          payment_date: paymentDate,
          payment_mode: paymentMethod,
          reference_no: params.referenceNo || null,
          notes: params.notes ? `Advance: ${params.notes}` : `Advance paid for ${clientTitle} (${eventTitle})`
        })
        .select('id')
        .maybeSingle();

      if (trancheErr) {
        console.warn('[payoutExpensesSyncService] fw_crew_payment_tranches insert notice:', trancheErr.message);
      } else if (insertedTranche) {
        trancheId = insertedTranche.id;
      }
    } catch (e) {
      console.warn('[payoutExpensesSyncService] Tranche insert exception:', e);
    }
  } else {
    // Update existing advance tranche if amount changed
    try {
      await supabase
        .from('fw_crew_payment_tranches')
        .update({
          amount: advance,
          payment_date: paymentDate,
          payment_mode: paymentMethod,
          reference_no: params.referenceNo || null,
          notes: params.notes ? `Advance: ${params.notes}` : `Advance paid for ${clientTitle} (${eventTitle})`
        })
        .eq('id', existingTrancheId);
    } catch (_) {}
  }

  // 3. Insert or update studio_expenses row
  try {
    const { data: existingExpenses } = await supabase
      .from('studio_expenses')
      .select('id')
      .eq('assignment_id', params.assignmentId)
      .ilike('title', '%advance%')
      .limit(1);

    const expensePayload = {
      user_id: currentUserId,
      project_id: params.projectId || null,
      member_id: params.member.id,
      assignment_id: params.assignmentId,
      category: 'Crew Payout',
      title: `${cleanMemberName} - Shoot Advance (${eventTitle})`,
      amount: advance,
      expense_date: paymentDate,
      payment_mode: paymentMethod,
      reference_no: params.referenceNo || null,
      notes: params.notes ? `Advance: ${params.notes}` : `Advance paid for ${clientTitle} (${eventTitle})`,
      is_synced_payout: true,
      updated_at: new Date().toISOString()
    };

    if (existingExpenses && existingExpenses.length > 0) {
      await supabase
        .from('studio_expenses')
        .update(expensePayload)
        .eq('id', existingExpenses[0].id);
    } else {
      await supabase
        .from('studio_expenses')
        .insert({
          ...expensePayload,
          created_at: new Date().toISOString()
        });
    }
  } catch (expErr) {
    console.warn('[payoutExpensesSyncService] studio_expenses sync notice:', expErr);
  }

  // 4. Update fw_assignments to ensure consistent commercial numbers
  try {
    await supabase
      .from('fw_assignments')
      .update({
        agreed_amount: agreed,
        paid_amount: advance,
        advance_amount: advance,
        balance_amount: balanceDue,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.assignmentId);
  } catch (assignErr) {
    console.warn('[payoutExpensesSyncService] fw_assignments advance update error:', assignErr);
  }

  // 5. Dispatch real-time events for client components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('team_finance_updated', {
      detail: {
        memberId: params.member.id,
        assignmentId: params.assignmentId,
        advancePaid: advance,
        balanceDue
      }
    }));
    window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
  }

  return {
    success: true,
    trancheId,
    advancePaid: advance,
    balanceDue,
    paymentStatus
  };
}

/**
 * 2. Multi-Tranche "Record Payment" in Team Member Finance Drawer:
 * Cumulative installment calculation and real-time expense insertion into studio_expenses.
 */
export async function recordCrewPayoutTranche(params: RecordCrewPayoutTrancheParams) {
  const installmentAmount = Number(params.installmentAmount) || 0;
  if (installmentAmount < 0 || !params.assignmentId || !params.memberId) {
    throw new Error('Invalid payment parameters: amount must be non-negative and assignmentId is required.');
  }

  const currentUserId = await resolveCurrentUserId(params.workspaceId);
  if (!currentUserId) {
    throw new Error('User must be authenticated to record crew payout.');
  }

  const paymentDate = params.paymentDate || new Date().toISOString().split('T')[0];
  const paymentMode = params.paymentMode || 'UPI';
  const cleanMemberName = params.memberName.trim();

  // 1. Fetch current assignment to ensure exact cumulative calculation
  let agreed = Number(params.currentAgreedAmount) || 0;
  let prevPaid = Number(params.currentPaidAmount) || 0;
  let resolvedProjectId = params.projectId || null;
  let resolvedSubEventId = params.subEventId || null;
  let resolvedClientName = params.clientName || 'Client';
  let resolvedEventName = params.eventName || 'Shoot';

  try {
    const { data: currentAssign } = await supabase
      .from('fw_assignments')
      .select('id, project_id, sub_event_id, agreed_amount, paid_amount, advance_amount, balance_amount, sub_event_name, client_name')
      .eq('id', params.assignmentId)
      .maybeSingle();

    if (currentAssign) {
      if (currentAssign.agreed_amount !== undefined && currentAssign.agreed_amount !== null) {
        agreed = Number(currentAssign.agreed_amount) || 0;
      }
      const existingPaid = Number(currentAssign.paid_amount ?? currentAssign.advance_amount ?? 0);
      if (!isNaN(existingPaid)) {
        prevPaid = existingPaid;
      }
      if (currentAssign.project_id) resolvedProjectId = currentAssign.project_id;
      if (currentAssign.sub_event_id) resolvedSubEventId = currentAssign.sub_event_id;
      if (currentAssign.client_name) resolvedClientName = currentAssign.client_name;
      if (currentAssign.sub_event_name) resolvedEventName = currentAssign.sub_event_name;
    }
  } catch (err) {
    console.warn('[payoutExpensesSyncService] Current assignment fetch warning:', err);
  }

  // 2. Compute cumulative figures
  const isZeroSettle = installmentAmount === 0;
  const newPaid = isZeroSettle ? agreed : prevPaid + installmentAmount;
  const newBalance = isZeroSettle ? 0 : Math.max(0, agreed - newPaid);
  const newStatus = (newBalance === 0 && (agreed > 0 || isZeroSettle)) ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING');

  // 3. Insert tranche record into fw_crew_payment_tranches (if amount > 0)
  let trancheId: string | null = null;
  if (installmentAmount > 0) {
    const tranchePayload = {
      user_id: currentUserId,
      assignment_id: params.assignmentId,
      member_id: params.memberId,
      project_id: resolvedProjectId,
      sub_event_id: resolvedSubEventId,
      amount: installmentAmount,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      reference_no: params.referenceNo || null,
      notes: params.notes || `Tranche payment for ${resolvedClientName} (${resolvedEventName})`
    };

    const { data: insertedTranche, error: trancheErr } = await supabase
      .from('fw_crew_payment_tranches')
      .insert(tranchePayload)
      .select('id')
      .maybeSingle();

    if (trancheErr) {
      console.warn('[payoutExpensesSyncService] fw_crew_payment_tranches insert error:', trancheErr.message);
    } else if (insertedTranche) {
      trancheId = insertedTranche.id;
    }
  }

  // 4. Update fw_assignments atomically
  const { error: assignUpdateErr } = await supabase
    .from('fw_assignments')
    .update({
      paid_amount: newPaid,
      advance_amount: newPaid,
      balance_amount: newBalance,
      payment_status: newStatus,
      status: newBalance === 0 ? 'COMPLETED' : undefined,
      payment_method: paymentMode,
      payment_date: paymentDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.assignmentId);

  if (assignUpdateErr) {
    console.warn('[payoutExpensesSyncService] fw_assignments update notice:', assignUpdateErr.message);
  }

  // 5. Strict Studio Expense Insertion into studio_expenses
  if (installmentAmount > 0) {
    try {
      const expensePayload = {
        user_id: currentUserId,
        project_id: resolvedProjectId,
        member_id: params.memberId,
        assignment_id: params.assignmentId,
        category: 'Crew Payout',
        title: `${cleanMemberName} - Shoot Remuneration (${resolvedEventName})`,
        amount: installmentAmount,
        expense_date: paymentDate,
        payment_mode: paymentMode,
        reference_no: params.referenceNo || null,
        notes: params.notes || `Tranche payment for ${resolvedClientName} (${resolvedEventName})`,
        is_synced_payout: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: expErr } = await supabase
        .from('studio_expenses')
        .insert(expensePayload);

      if (expErr) {
        console.warn('[payoutExpensesSyncService] studio_expenses insert notice:', expErr.message);
      }
    } catch (e) {
      console.warn('[payoutExpensesSyncService] studio_expenses insertion exception:', e);
    }
  }

  // 6. Update legacy team_event_payouts if row exists
  try {
    await supabase
      .from('team_event_payouts')
      .update({
        paid_amount: newPaid,
        balance_amount: newBalance,
        status: newStatus === 'PAID' ? 'PAID' : 'PARTIAL',
        payment_date: paymentDate,
        payment_method: paymentMode,
        updated_at: new Date().toISOString()
      })
      .or(`assignment_id.eq.${params.assignmentId},and(member_id.eq.${params.memberId},sub_event_id.eq.${resolvedSubEventId})`);
  } catch (_) {}

  // 7. Dispatch real-time events across windows & tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('team_finance_updated', {
      detail: {
        memberId: params.memberId,
        assignmentId: params.assignmentId,
        installmentAmount,
        newPaid,
        newBalance,
        newStatus
      }
    }));
    window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
  }

  return {
    success: true,
    trancheId,
    newPaid,
    newBalance,
    newStatus,
    installmentAmount
  };
}

/**
 * 3. Fetch all crew payment tranches for an assignment or member.
 */
export async function fetchCrewPaymentTranches(filters: {
  assignmentId?: string;
  memberId?: string;
}) {
  try {
    let query = supabase
      .from('fw_crew_payment_tranches')
      .select('*')
      .order('payment_date', { ascending: false });

    if (filters.assignmentId) {
      query = query.eq('assignment_id', filters.assignmentId);
    }
    if (filters.memberId) {
      query = query.eq('member_id', filters.memberId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  } catch (err: any) {
    return { data: [], error: err };
  }
}
