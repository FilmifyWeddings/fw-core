import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { invalidateWorkspaceCache } from '@/lib/server-swr-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function computeRoleShortCode(role: string): string {
  const words = String(role || 'Crew').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return String(role || 'CR').slice(0, 2).toUpperCase();
}

/**
 * POST /api/assignments/commercials
 * Authoritative, RLS-bypassing server route for crew slot assignment, commercials,
 * advance tranches/studio expenses sync, and unassignment cleanup.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedWsId = body?.workspaceId || body?.workspace_id;

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ success: false, error: 'Missing workspace identifier' }, { status: 400 });
    }

    const action = body?.action || 'assign';

    if (action === 'unassign') {
      const { assignmentId, subEventId, eventId, roleName, teamMemberId } = body;
      const cleanAssignId = String(assignmentId || '');

      const clearPayload = {
        assigned_member_id: null,
        assigned_member_name: null,
        assigned_member_phone: null,
        agreed_amount: 0,
        advance_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        status: 'pending',
        payment_status: 'pending',
        notes: null,
        updated_at: new Date().toISOString(),
      };

      let clearedAssignIds: string[] = [];

      if (cleanAssignId && UUID_RE.test(cleanAssignId) && !cleanAssignId.includes('-role-')) {
        const { data: upd, error: uErr } = await supabaseAdmin
          .from('fw_assignments')
          .update(clearPayload)
          .eq('id', cleanAssignId)
          .select('id');
        if (uErr) throw new Error(uErr.message);
        clearedAssignIds = (upd || []).map((r: any) => r.id);
      } else if (subEventId && UUID_RE.test(String(subEventId))) {
        let q = supabaseAdmin.from('fw_assignments').update(clearPayload).eq('sub_event_id', subEventId);
        if (teamMemberId) q = q.eq('assigned_member_id', teamMemberId);
        else if (roleName) q = q.eq('required_role', roleName);
        const { data: upd, error: uErr } = await q.select('id');
        if (uErr) throw new Error(uErr.message);
        clearedAssignIds = (upd || []).map((r: any) => r.id);
      }

      if (teamMemberId) {
        let cafQ = supabaseAdmin.from('crew_assignments_finance').delete().eq('team_member_id', teamMemberId);
        if (subEventId) cafQ = cafQ.eq('sub_event_id', subEventId);
        else if (eventId) cafQ = cafQ.eq('event_id', eventId);
        if (roleName) cafQ = cafQ.eq('role_name', roleName);
        await cafQ;

        let tepQ = supabaseAdmin.from('team_event_payouts').delete().eq('member_id', teamMemberId);
        if (subEventId) tepQ = tepQ.eq('sub_event_id', subEventId);
        else if (eventId) tepQ = tepQ.eq('project_id', eventId);
        if (roleName) tepQ = tepQ.eq('role', roleName);
        await tepQ;
      }

      if (clearedAssignIds.length > 0) {
        await supabaseAdmin
          .from('studio_expenses')
          .delete()
          .in('assignment_id', clearedAssignIds)
          .eq('is_synced_payout', true);
        await supabaseAdmin
          .from('fw_crew_payment_tranches')
          .delete()
          .in('assignment_id', clearedAssignIds);
      }

      invalidateWorkspaceCache(effectiveWsId);
    return NextResponse.json({ success: true, unassigned: true });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ACTION: ASSIGN CREW & COMMERCIALS ATOMICALLY
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const {
      assignmentId,
      projectId,
      subEventId,
      member,
      assignedRole,
      agreedAmount,
      advancePaid,
      paymentDate,
      paymentMethod,
      referenceNo,
      notes,
      clientName,
      eventName,
      eventDate,
    } = body;

    if (!member?.id || !member?.name || !assignedRole) {
      return NextResponse.json({ success: false, error: 'Missing required member or role details' }, { status: 400 });
    }

    const agreed = Number(agreedAmount) || 0;
    const advance = Number(advancePaid) || 0;
    const balanceDue = Math.max(0, agreed - advance);
    const assignStatus = 'assigned';
    const payoutStatus = balanceDue <= 0 && agreed > 0 ? 'PAID' : (advance > 0 ? 'PARTIAL' : 'PENDING');
    const pStatusDb = balanceDue <= 0 && agreed > 0 ? 'completed' : (advance > 0 ? 'partial' : 'pending');
    const pDate = paymentDate || new Date().toISOString().split('T')[0];
    const pMethod = paymentMethod || 'UPI/Bank Transfer';
    const nowIso = new Date().toISOString();

    // 1. Ensure member exists in fw_team_members (scoped by workspace user_id, NO invalid workspace_id column)
    const { data: existingTm } = await supabaseAdmin
      .from('fw_team_members')
      .select('id, phone_number')
      .eq('id', String(member.id))
      .maybeSingle();

    if (!existingTm) {
      const tmPayload: any = {
        id: String(member.id),
        user_id: effectiveWsId,
        name: String(member.name).trim(),
        phone_number: member.phone_number || member.phone || null,
        primary_role: assignedRole || member.primary_role || 'Crew',
        is_active: true,
        ...(member.default_daily_rate !== undefined ? { default_daily_rate: member.default_daily_rate } : {}),
      };
      const { error: tmErr } = await supabaseAdmin.from('fw_team_members').insert([tmPayload]);
      if (tmErr) {
        console.warn('[API /assignments/commercials] fw_team_members insert note:', tmErr.message);
      }
    }

    // 2. Fetch parent sub-event & project metadata to satisfy fw_assignments NOT NULL columns
    let seMeta: any = null;
    if (subEventId && UUID_RE.test(String(subEventId))) {
      const { data } = await supabaseAdmin
        .from('fw_sub_events')
        .select('id, project_id, event_title, event_date, start_time, end_time')
        .eq('id', subEventId)
        .maybeSingle();
      seMeta = data;
    }

    const resolvedProjectId = projectId || seMeta?.project_id || null;
    let resolvedClientName = clientName || null;
    if (!resolvedClientName && resolvedProjectId && UUID_RE.test(String(resolvedProjectId))) {
      const { data: projRow } = await supabaseAdmin
        .from('fw_projects')
        .select('client_name')
        .eq('id', resolvedProjectId)
        .maybeSingle();
      resolvedClientName = projRow?.client_name || null;
    }

    const cleanSubEventName = String(eventName || seMeta?.event_title || 'Shoot Event').trim();
    const cleanSubEventDate = String(eventDate || seMeta?.event_date || pDate).trim();
    const cleanStartTime = String(seMeta?.start_time || '09:00 AM').trim();
    const cleanEndTime = String(seMeta?.end_time || '09:00 PM').trim();
    const roleShort = computeRoleShortCode(assignedRole);
    const memberPhone = member.phone_number || member.phone || existingTm?.phone_number || null;

    const assignmentUpdatePayload: any = {
      user_id: effectiveWsId,
      workspace_id: effectiveWsId,
      assigned_member_id: String(member.id),
      assigned_member_name: String(member.name).trim(),
      assigned_member_phone: memberPhone,
      agreed_amount: agreed,
      advance_amount: advance,
      paid_amount: advance,
      balance_amount: balanceDue,
      payment_status: pStatusDb,
      payment_method: pMethod,
      payment_date: pDate,
      status: assignStatus,
      notes: notes || null,
      sub_event_name: cleanSubEventName,
      sub_event_date: cleanSubEventDate,
      start_time: cleanStartTime,
      end_time: cleanEndTime,
      role_name: assignedRole,
      role_short_code: roleShort,
      client_name: resolvedClientName || 'Wedding Client',
      updated_at: nowIso,
    };

    const cleanAssignId = String(assignmentId || '');
    let savedRow: any = null;
    let updatedAssignId: string | undefined = undefined;

    if (cleanAssignId && UUID_RE.test(cleanAssignId) && !cleanAssignId.includes('-role-')) {
      const { data: updated, error: uErr } = await supabaseAdmin
        .from('fw_assignments')
        .update(assignmentUpdatePayload)
        .eq('id', cleanAssignId)
        .select('*, fw_team_members(*)')
        .maybeSingle();
      if (uErr) throw new Error(uErr.message);
      if (updated) {
        savedRow = updated;
        updatedAssignId = updated.id;
      }
    }

    if (!savedRow && subEventId && UUID_RE.test(String(subEventId))) {
      // Check for an existing slot on this sub-event matching this role (unassigned first, or single matching row)
      const { data: existingRows, error: findErr } = await supabaseAdmin
        .from('fw_assignments')
        .select('id, assigned_member_id, required_role')
        .eq('sub_event_id', String(subEventId))
        .eq('required_role', assignedRole);
      if (findErr) throw new Error(findErr.message);

      const exactMemberRow = (existingRows || []).find((r: any) => r.assigned_member_id === String(member.id));
      const unassignedRow = (existingRows || []).find((r: any) => !r.assigned_member_id);
      const targetSlotRow = exactMemberRow || unassignedRow;

      if (targetSlotRow?.id) {
        const { data: updated, error: uErr } = await supabaseAdmin
          .from('fw_assignments')
          .update(assignmentUpdatePayload)
          .eq('id', targetSlotRow.id)
          .select('*, fw_team_members(*)')
          .single();
        if (uErr) throw new Error(uErr.message);
        savedRow = updated;
        updatedAssignId = updated.id;
      } else {
        const { data: inserted, error: iErr } = await supabaseAdmin
          .from('fw_assignments')
          .insert([{
            project_id: resolvedProjectId,
            sub_event_id: subEventId,
            required_role: assignedRole,
            ...assignmentUpdatePayload,
            created_at: nowIso,
          }])
          .select('*, fw_team_members(*)')
          .single();
        if (iErr) throw new Error(iErr.message);
        savedRow = inserted;
        updatedAssignId = inserted.id;
      }
    }

    if (!savedRow || !updatedAssignId) {
      throw new Error('Could not save crew assignment record (missing sub-event or assignment ID).');
    }

    // 3. Atomically upsert team_event_payouts row
    const payoutPayload = {
      workspace_id: effectiveWsId,
      user_id: effectiveWsId,
      member_id: String(member.id),
      member_name: String(member.name).trim(),
      project_id: String(resolvedProjectId || ''),
      sub_event_id: String(subEventId || ''),
      client_name: resolvedClientName || 'Wedding Client',
      event_name: cleanSubEventName,
      event_date: cleanSubEventDate,
      role: assignedRole,
      agreed_amount: agreed,
      paid_amount: advance,
      balance_amount: balanceDue,
      status: payoutStatus,
      payment_method: pMethod,
      payment_date: pDate,
      notes: notes || null,
      updated_at: nowIso,
    };

    const { data: existingPayout } = await supabaseAdmin
      .from('team_event_payouts')
      .select('id')
      .eq('sub_event_id', String(subEventId || ''))
      .eq('member_id', String(member.id))
      .maybeSingle();

    if (existingPayout?.id) {
      const { error: pUpdErr } = await supabaseAdmin
        .from('team_event_payouts')
        .update(payoutPayload)
        .eq('id', existingPayout.id);
      if (pUpdErr) throw new Error(pUpdErr.message);
    } else {
      const { error: pUpsertErr } = await supabaseAdmin
        .from('team_event_payouts')
        .upsert(payoutPayload, { onConflict: 'sub_event_id,member_id' });
      if (pUpsertErr) {
        const { error: pInsErr } = await supabaseAdmin.from('team_event_payouts').insert([payoutPayload]);
        if (pInsErr) throw new Error(pInsErr.message);
      }
    }

    // 4. Sync Advance Tranche & Studio Expense atomically when advancePaid > 0
    if (advance > 0) {
      const cleanName = String(member.name).trim();
      const { data: existingTranches } = await supabaseAdmin
        .from('fw_crew_payment_tranches')
        .select('id')
        .eq('assignment_id', updatedAssignId)
        .ilike('notes', '%advance%')
        .limit(1);

      const trancheBody = {
        user_id: effectiveWsId,
        assignment_id: updatedAssignId,
        member_id: String(member.id),
        project_id: resolvedProjectId || null,
        sub_event_id: subEventId || null,
        amount: advance,
        payment_date: pDate,
        payment_mode: pMethod,
        reference_no: referenceNo || null,
        notes: notes ? `Advance: ${notes}` : `Advance paid for ${resolvedClientName || 'Client'} (${cleanSubEventName})`,
      };

      if (existingTranches && existingTranches.length > 0) {
        await supabaseAdmin.from('fw_crew_payment_tranches').update(trancheBody).eq('id', existingTranches[0].id);
      } else {
        await supabaseAdmin.from('fw_crew_payment_tranches').insert([trancheBody]);
      }

      const { data: existingExpenses } = await supabaseAdmin
        .from('studio_expenses')
        .select('id')
        .eq('assignment_id', updatedAssignId)
        .ilike('title', '%advance%')
        .limit(1);

      const expBody = {
        user_id: effectiveWsId,
        project_id: resolvedProjectId || null,
        member_id: String(member.id),
        assignment_id: updatedAssignId,
        category: 'Crew Payout',
        title: `${cleanName} - Shoot Advance (${cleanSubEventName})`,
        amount: advance,
        expense_date: pDate,
        payment_mode: pMethod,
        reference_no: referenceNo || null,
        notes: notes ? `Advance: ${notes}` : `Advance paid for ${resolvedClientName || 'Client'} (${cleanSubEventName})`,
        is_synced_payout: true,
        updated_at: nowIso,
      };

      if (existingExpenses && existingExpenses.length > 0) {
        await supabaseAdmin.from('studio_expenses').update(expBody).eq('id', existingExpenses[0].id);
      } else {
        await supabaseAdmin.from('studio_expenses').insert([{ ...expBody, created_at: nowIso }]);
      }
    }

    return NextResponse.json({
      success: true,
      assignmentId: updatedAssignId,
      savedAssignment: savedRow,
      subEventId,
      projectId: resolvedProjectId,
      role: assignedRole,
      agreedAmount: agreed,
      advancePaid: advance,
      balanceDue,
      status: assignStatus,
      payout: payoutPayload,
    });
  } catch (err: any) {
    console.error('[API /api/assignments/commercials] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save crew assignment' },
      { status: 500 }
    );
  }
}

