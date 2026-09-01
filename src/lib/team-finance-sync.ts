import { supabase } from './supabase';

export interface TeamEventPayout {
  id: string;
  workspace_id: string;
  member_id: string;
  member_name: string;
  project_id?: string;
  sub_event_id?: string;
  client_name: string;
  event_name: string;
  event_date: string;
  role: string;
  agreed_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'completed' | 'partial' | 'pending';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  synced_expense_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamPayoutTransaction {
  id: string;
  workspace_id: string;
  payout_id?: string;
  member_id: string;
  amount: number;
  payment_date: string;
  payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  reference_no?: string;
  notes?: string;
  finance_expense_id?: string;
  created_at?: string;
}

export interface PartnerAlbumOrder {
  id: string;
  workspace_id: string;
  partner_id: string;
  partner_name: string;
  client_name: string;
  project_id?: string;
  album_type: string;
  sheet_count: number;
  rate_per_sheet: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: 'DESIGNING' | 'PRINTING' | 'BINDING' | 'DISPATCHED' | 'DELIVERED';
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  order_date: string;
  delivery_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamSalaryRecord {
  id: string;
  workspace_id: string;
  member_id: string;
  member_name: string;
  month_year: string; // e.g. 2026-08
  base_salary: number;
  incentive_amount: number;
  deductions: number;
  net_payable: number;
  paid_amount: number;
  payment_status: 'PENDING' | 'PAID';
  paid_date?: string;
  payment_mode?: string;
  reference_no?: string;
  notes?: string;
  finance_expense_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamFinancialSummary {
  member_id: string;
  total_agreed: number;
  total_paid: number;
  total_balance: number;
  active_events_count: number;
  paid_events_count: number;
  pending_events_count: number;
  monthly_breakdown?: Array<{
    month: string;
    agreed: number;
    paid: number;
    balance: number;
  }>;
}

// Storage Keys
const LS_PAYOUTS_KEY = 'fw_team_event_payouts_';
const LS_ALBUMS_KEY = 'fw_partner_album_orders_';
const LS_SALARIES_KEY = 'fw_team_salaries_';
const LS_TRANSACTIONS_KEY = 'fw_team_transactions_';

// ── 1. FREELANCER EVENT PAYOUTS (CREW ASSIGNMENT FINANCE) ───────────────────

export async function fetchMemberEventPayouts(workspaceId: string, memberId: string): Promise<TeamEventPayout[]> {
  try {
    // Try crew_assignments_finance first
    const { data: crewFinData, error: crewFinErr } = await supabase
      .from('crew_assignments_finance')
      .select('*')
      .eq('team_member_id', memberId)
      .order('payment_date', { ascending: false });

    if (!crewFinErr && crewFinData && crewFinData.length > 0) {
      const mapped: TeamEventPayout[] = crewFinData.map((c: any) => ({
        id: c.id,
        workspace_id: c.workspace_id || workspaceId,
        member_id: c.team_member_id,
        member_name: c.member_name || '',
        project_id: c.event_id || '',
        sub_event_id: c.sub_event_id || '',
        client_name: c.client_name || 'Wedding Shoot',
        event_name: c.event_name || c.role_name || 'Shoot Event',
        event_date: c.payment_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        role: c.role_name || 'Crew',
        agreed_amount: Number(c.final_agreed_amount) || 0,
        paid_amount: Number(c.advance_paid_amount) || 0,
        balance_amount: Number(c.balance_amount) || Math.max(0, (Number(c.final_agreed_amount) || 0) - (Number(c.advance_paid_amount) || 0)),
        status: (c.payment_status === 'completed' ? 'PAID' : c.payment_status === 'partial' ? 'PARTIAL' : 'PENDING') as any,
        payment_method: c.payment_method || 'UPI/Bank Transfer',
        payment_date: c.payment_date,
        notes: c.notes || '',
        synced_expense_id: c.synced_expense_id,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`, JSON.stringify(mapped));
      }
      return mapped;
    }

    // Fallback to team_event_payouts
    const { data, error } = await supabase
      .from('team_event_payouts')
      .select('*')
      .eq('member_id', memberId)
      .order('event_date', { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`, JSON.stringify(data));
      }
      return data as TeamEventPayout[];
    }
  } catch (err) {
    console.warn('[team-finance-sync] DB fetchMemberEventPayouts error, checking fallback:', err);
  }

  // Local Storage Fallback
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
  }
  return [];
}

export async function saveOrUpdateEventPayout(
  workspaceId: string,
  payoutData: Partial<TeamEventPayout> & { 
    member_id: string; 
    member_name: string; 
    client_name: string; 
    event_name: string; 
    event_date: string; 
    role: string; 
    agreed_amount: number;
    advance_paid_amount?: number;
    payment_method?: string;
    payment_date?: string;
  }
): Promise<TeamEventPayout> {
  const agreed = Number(payoutData.agreed_amount) || 0;
  const paid = Number(payoutData.advance_paid_amount ?? payoutData.paid_amount) || 0;
  const balance = Math.max(0, agreed - paid);
  const status: 'PENDING' | 'PARTIAL' | 'PAID' = balance === 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
  const paymentStatusDb = status === 'PAID' ? 'completed' : status === 'PARTIAL' ? 'partial' : 'pending';

  const payoutId = payoutData.id || `payout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const paymentDate = payoutData.payment_date || payoutData.event_date || new Date().toISOString().split('T')[0];
  const paymentMethod = payoutData.payment_method || 'UPI/Bank Transfer';

  const payload: TeamEventPayout = {
    id: payoutId,
    workspace_id: workspaceId,
    member_id: payoutData.member_id,
    member_name: payoutData.member_name,
    project_id: payoutData.project_id || '',
    sub_event_id: payoutData.sub_event_id || '',
    client_name: payoutData.client_name,
    event_name: payoutData.event_name,
    event_date: payoutData.event_date,
    role: payoutData.role,
    agreed_amount: agreed,
    paid_amount: paid,
    balance_amount: balance,
    status,
    payment_method: paymentMethod,
    payment_date: paymentDate,
    notes: payoutData.notes || '',
    updated_at: new Date().toISOString()
  };

  // 1. Persist to crew_assignments_finance table
  try {
    await supabase.from('crew_assignments_finance').upsert({
      id: payoutId,
      workspace_id: workspaceId,
      event_id: payoutData.project_id || null,
      sub_event_id: payoutData.sub_event_id || null,
      team_member_id: payoutData.member_id,
      role_name: payoutData.role || 'Crew',
      final_agreed_amount: agreed,
      advance_paid_amount: paid,
      payment_status: paymentStatusDb,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: payoutData.notes || null,
      updated_at: new Date().toISOString()
    });
  } catch (crewErr) {
    console.warn('[team-finance-sync] crew_assignments_finance upsert error:', crewErr);
  }

  // 2. Also upsert to team_event_payouts table
  try {
    await supabase.from('team_event_payouts').upsert(payload);
  } catch (err) {
    console.warn('[team-finance-sync] DB saveOrUpdateEventPayout error:', err);
  }

  // 3. If advance or full payment made, automatically sync to Finance Expenses!
  if (paid > 0) {
    await syncTeamPaymentToFinanceExpense(workspaceId, {
      title: `Crew Pay: ${payload.member_name} (${payload.role})`,
      category: 'Crew & Freelancer Payout',
      amount: paid,
      date: paymentDate,
      payment_mode: paymentMethod,
      notes: `Event: ${payload.event_name} | Client: ${payload.client_name} | Status: ${status}`,
      team_member_name: payload.member_name,
      team_member_id: payload.member_id,
      client_name: payload.client_name,
      event_name: payload.event_name
    });
  }

  // 4. Update Local Cache & Dispatch Real-Time Event
  if (typeof window !== 'undefined') {
    const key = `${LS_PAYOUTS_KEY}${workspaceId}_${payload.member_id}`;
    const raw = localStorage.getItem(key);
    let list: TeamEventPayout[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === payload.id || (p.sub_event_id && p.sub_event_id === payload.sub_event_id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
    } else {
      list.unshift(payload);
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId: payload.member_id, payout: payload } }));
  }

  return payload;
}

export async function recordPayoutTransaction(
  workspaceId: string,
  payoutId: string,
  memberId: string,
  payment: {
    amount: number;
    payment_date: string;
    payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    reference_no?: string;
    notes?: string;
    autoCreateExpense?: boolean;
    clientName?: string;
    eventName?: string;
    memberName?: string;
    role?: string;
  }
): Promise<{ success: boolean; updatedPayout?: TeamEventPayout }> {
  try {
    const txnPayload: TeamPayoutTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspace_id: workspaceId,
      payout_id: payoutId,
      member_id: memberId,
      amount: Number(payment.amount) || 0,
      payment_date: payment.payment_date,
      payment_mode: payment.payment_mode,
      reference_no: payment.reference_no || '',
      notes: payment.notes || '',
      created_at: new Date().toISOString()
    };

    // 1. Insert Transaction into DB
    try {
      await supabase.from('team_payout_transactions').insert(txnPayload);
    } catch (_) {}

    // 2. Fetch & Update Payout
    let existingPayout: TeamEventPayout | null = null;
    try {
      const { data } = await supabase.from('crew_assignments_finance').select('*').eq('id', payoutId).single();
      if (data) {
        existingPayout = {
          id: data.id,
          workspace_id: data.workspace_id || workspaceId,
          member_id: data.team_member_id,
          member_name: payment.memberName || '',
          project_id: data.event_id,
          sub_event_id: data.sub_event_id,
          client_name: payment.clientName || 'Wedding Client',
          event_name: payment.eventName || 'Shoot Event',
          event_date: data.payment_date || payment.payment_date,
          role: data.role_name || payment.role || 'Crew',
          agreed_amount: Number(data.final_agreed_amount) || 0,
          paid_amount: Number(data.advance_paid_amount) || 0,
          balance_amount: Number(data.balance_amount) || 0,
          status: data.payment_status === 'completed' ? 'PAID' : data.payment_status === 'partial' ? 'PARTIAL' : 'PENDING'
        };
      }
    } catch (_) {}

    if (!existingPayout) {
      try {
        const { data } = await supabase.from('team_event_payouts').select('*').eq('id', payoutId).single();
        if (data) existingPayout = data as TeamEventPayout;
      } catch (_) {}
    }

    // Local fallback for payout
    if (!existingPayout && typeof window !== 'undefined') {
      const key = `${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const list: TeamEventPayout[] = JSON.parse(raw);
        existingPayout = list.find(p => p.id === payoutId) || null;
      }
    }

    if (existingPayout) {
      const newPaid = Number(existingPayout.paid_amount || 0) + Number(payment.amount || 0);
      const newBalance = Math.max(0, Number(existingPayout.agreed_amount || 0) - newPaid);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';
      const dbStatus = newBalance === 0 ? 'completed' : 'partial';

      const updatedPayout: TeamEventPayout = {
        ...existingPayout,
        paid_amount: newPaid,
        balance_amount: newBalance,
        status: newStatus,
        payment_method: payment.payment_mode,
        payment_date: payment.payment_date,
        updated_at: new Date().toISOString()
      };

      // Update crew_assignments_finance
      try {
        await supabase.from('crew_assignments_finance').update({
          advance_paid_amount: newPaid,
          payment_status: dbStatus,
          payment_method: payment.payment_mode,
          payment_date: payment.payment_date,
          updated_at: updatedPayout.updated_at
        }).eq('id', payoutId);
      } catch (_) {}

      // Update team_event_payouts
      try {
        await supabase.from('team_event_payouts').update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          status: newStatus,
          updated_at: updatedPayout.updated_at
        }).eq('id', payoutId);
      } catch (_) {}

      // Auto-sync into Finance Expenses
      if (payment.autoCreateExpense !== false) {
        await syncTeamPaymentToFinanceExpense(workspaceId, {
          title: `Crew Pay: ${payment.memberName || existingPayout.member_name} (${existingPayout.role})`,
          category: 'Crew & Freelancer Payout',
          amount: Number(payment.amount),
          date: payment.payment_date,
          payment_mode: payment.payment_mode,
          notes: `Event: ${existingPayout.event_name} | Client: ${existingPayout.client_name} | Ref: ${payment.reference_no || 'N/A'}`,
          team_member_name: payment.memberName || existingPayout.member_name,
          team_member_id: memberId,
          client_name: existingPayout.client_name,
          event_name: existingPayout.event_name
        });
      }

      // Update Local cache
      if (typeof window !== 'undefined') {
        const key = `${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: TeamEventPayout[] = JSON.parse(raw);
          const idx = list.findIndex(p => p.id === payoutId);
          if (idx >= 0) {
            list[idx] = updatedPayout;
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
        window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId } }));
      }

      return { success: true, updatedPayout };
    }

    return { success: true };
  } catch (err) {
    console.error('[team-finance-sync] recordPayoutTransaction error:', err);
    return { success: false };
  }
}

// ── 2. PARTNER ALBUM ORDERS ──────────────────────────────────────────────────

export async function fetchPartnerAlbumOrders(workspaceId: string, partnerId: string): Promise<PartnerAlbumOrder[]> {
  try {
    const { data, error } = await supabase
      .from('partner_album_orders')
      .select('*')
      .eq('partner_id', partnerId)
      .order('order_date', { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_ALBUMS_KEY}${workspaceId}_${partnerId}`, JSON.stringify(data));
      }
      return data as PartnerAlbumOrder[];
    }
  } catch (err) {
    console.warn('[team-finance-sync] DB fetchPartnerAlbumOrders error:', err);
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_ALBUMS_KEY}${workspaceId}_${partnerId}`);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
  }
  return [];
}

export async function savePartnerAlbumOrder(
  workspaceId: string,
  orderData: Partial<PartnerAlbumOrder> & { partner_id: string; partner_name: string; client_name: string; total_amount: number }
): Promise<PartnerAlbumOrder> {
  const total = Number(orderData.total_amount) || 0;
  const paid = Number(orderData.paid_amount) || 0;
  const balance = Math.max(0, total - paid);
  const payStatus: 'PENDING' | 'PARTIAL' | 'PAID' = balance === 0 && total > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

  const payload: PartnerAlbumOrder = {
    id: orderData.id || `album_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    workspace_id: workspaceId,
    partner_id: orderData.partner_id,
    partner_name: orderData.partner_name,
    client_name: orderData.client_name,
    project_id: orderData.project_id || '',
    album_type: orderData.album_type || 'Luxury Photobook',
    sheet_count: Number(orderData.sheet_count) || 30,
    rate_per_sheet: Number(orderData.rate_per_sheet) || 300,
    total_amount: total,
    paid_amount: paid,
    balance_amount: balance,
    order_status: orderData.order_status || 'DESIGNING',
    payment_status: payStatus,
    order_date: orderData.order_date || new Date().toISOString().split('T')[0],
    delivery_date: orderData.delivery_date || '',
    notes: orderData.notes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('partner_album_orders').upsert(payload);
  } catch (err) {
    console.warn('[team-finance-sync] DB savePartnerAlbumOrder error:', err);
  }

  if (typeof window !== 'undefined') {
    const key = `${LS_ALBUMS_KEY}${workspaceId}_${payload.partner_id}`;
    const raw = localStorage.getItem(key);
    let list: PartnerAlbumOrder[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(o => o.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { partnerId: payload.partner_id } }));
  }

  return payload;
}

export async function recordAlbumOrderPayment(
  workspaceId: string,
  orderId: string,
  partnerId: string,
  payment: {
    amount: number;
    payment_date: string;
    payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    reference_no?: string;
    notes?: string;
    autoCreateExpense?: boolean;
    clientName?: string;
    partnerName?: string;
  }
): Promise<{ success: boolean; updatedOrder?: PartnerAlbumOrder }> {
  try {
    let existingOrder: PartnerAlbumOrder | null = null;
    try {
      const { data } = await supabase.from('partner_album_orders').select('*').eq('id', orderId).single();
      if (data) existingOrder = data as PartnerAlbumOrder;
    } catch (_) {}

    if (!existingOrder && typeof window !== 'undefined') {
      const key = `${LS_ALBUMS_KEY}${workspaceId}_${partnerId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const list: PartnerAlbumOrder[] = JSON.parse(raw);
        existingOrder = list.find(o => o.id === orderId) || null;
      }
    }

    if (existingOrder) {
      const newPaid = Number(existingOrder.paid_amount || 0) + Number(payment.amount || 0);
      const newBalance = Math.max(0, Number(existingOrder.total_amount || 0) - newPaid);
      const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

      const updatedOrder: PartnerAlbumOrder = {
        ...existingOrder,
        paid_amount: newPaid,
        balance_amount: newBalance,
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      };

      try {
        await supabase.from('partner_album_orders').update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          payment_status: newStatus,
          updated_at: updatedOrder.updated_at
        }).eq('id', orderId);
      } catch (_) {}

      if (payment.autoCreateExpense !== false) {
        await syncTeamPaymentToFinanceExpense(workspaceId, {
          title: `Album Printing Pay: ${payment.partnerName || existingOrder.partner_name}`,
          category: 'Album Printing & Binding',
          amount: Number(payment.amount),
          date: payment.payment_date,
          payment_mode: payment.payment_mode,
          notes: `Client: ${existingOrder.client_name} | Type: ${existingOrder.album_type} | Ref: ${payment.reference_no || 'N/A'}`,
          team_member_name: payment.partnerName || existingOrder.partner_name,
          team_member_id: partnerId,
          client_name: existingOrder.client_name
        });
      }

      if (typeof window !== 'undefined') {
        const key = `${LS_ALBUMS_KEY}${workspaceId}_${partnerId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: PartnerAlbumOrder[] = JSON.parse(raw);
          const idx = list.findIndex(o => o.id === orderId);
          if (idx >= 0) {
            list[idx] = updatedOrder;
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
        window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { partnerId } }));
      }

      return { success: true, updatedOrder };
    }

    return { success: true };
  } catch (err) {
    console.error('[team-finance-sync] recordAlbumOrderPayment error:', err);
    return { success: false };
  }
}

// ── 3. IN-HOUSE TEAM SALARIES ────────────────────────────────────────────────

export async function fetchMemberSalaryRecords(workspaceId: string, memberId: string): Promise<TeamSalaryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('team_salary_records')
      .select('*')
      .eq('member_id', memberId)
      .order('month_year', { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_SALARIES_KEY}${workspaceId}_${memberId}`, JSON.stringify(data));
      }
      return data as TeamSalaryRecord[];
    }
  } catch (err) {
    console.warn('[team-finance-sync] DB fetchMemberSalaryRecords error:', err);
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_SALARIES_KEY}${workspaceId}_${memberId}`);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
  }
  return [];
}

export async function saveSalaryRecord(
  workspaceId: string,
  salaryData: Partial<TeamSalaryRecord> & { member_id: string; member_name: string; month_year: string; base_salary: number }
): Promise<TeamSalaryRecord> {
  const base = Number(salaryData.base_salary) || 0;
  const inc = Number(salaryData.incentive_amount) || 0;
  const ded = Number(salaryData.deductions) || 0;
  const net = Math.max(0, base + inc - ded);
  const paid = Number(salaryData.paid_amount) || 0;
  const status: 'PENDING' | 'PAID' = paid >= net && net > 0 ? 'PAID' : 'PENDING';

  const payload: TeamSalaryRecord = {
    id: salaryData.id || `sal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    workspace_id: workspaceId,
    member_id: salaryData.member_id,
    member_name: salaryData.member_name,
    month_year: salaryData.month_year,
    base_salary: base,
    incentive_amount: inc,
    deductions: ded,
    net_payable: net,
    paid_amount: paid,
    payment_status: status,
    paid_date: salaryData.paid_date || '',
    payment_mode: salaryData.payment_mode || 'Bank Transfer',
    reference_no: salaryData.reference_no || '',
    notes: salaryData.notes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('team_salary_records').upsert(payload);
  } catch (err) {
    console.warn('[team-finance-sync] DB saveSalaryRecord error:', err);
  }

  if (typeof window !== 'undefined') {
    const key = `${LS_SALARIES_KEY}${workspaceId}_${payload.member_id}`;
    const raw = localStorage.getItem(key);
    let list: TeamSalaryRecord[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s.id === payload.id || s.month_year === payload.month_year);
    if (idx >= 0) list[idx] = payload;
    else list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId: payload.member_id } }));
  }

  return payload;
}

export async function recordSalaryPayment(
  workspaceId: string,
  salaryId: string,
  memberId: string,
  payment: {
    amount: number;
    paid_date: string;
    payment_mode: string;
    reference_no?: string;
    notes?: string;
    autoCreateExpense?: boolean;
    memberName?: string;
    monthYear?: string;
  }
): Promise<{ success: boolean; updatedRecord?: TeamSalaryRecord }> {
  try {
    let existing: TeamSalaryRecord | null = null;
    try {
      const { data } = await supabase.from('team_salary_records').select('*').eq('id', salaryId).single();
      if (data) existing = data as TeamSalaryRecord;
    } catch (_) {}

    if (!existing && typeof window !== 'undefined') {
      const key = `${LS_SALARIES_KEY}${workspaceId}_${memberId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const list: TeamSalaryRecord[] = JSON.parse(raw);
        existing = list.find(s => s.id === salaryId) || null;
      }
    }

    if (existing) {
      const updated: TeamSalaryRecord = {
        ...existing,
        paid_amount: Number(payment.amount),
        payment_status: 'PAID',
        paid_date: payment.paid_date,
        payment_mode: payment.payment_mode,
        reference_no: payment.reference_no || '',
        notes: payment.notes || existing.notes || '',
        updated_at: new Date().toISOString()
      };

      try {
        await supabase.from('team_salary_records').update(updated).eq('id', salaryId);
      } catch (_) {}

      if (payment.autoCreateExpense !== false) {
        await syncTeamPaymentToFinanceExpense(workspaceId, {
          title: `Staff Salary: ${payment.memberName || existing.member_name} (${existing.month_year})`,
          category: 'Studio Staff Salary',
          amount: Number(payment.amount),
          date: payment.paid_date,
          payment_mode: payment.payment_mode,
          notes: `Month: ${existing.month_year} | Ref: ${payment.reference_no || 'N/A'}`,
          team_member_name: payment.memberName || existing.member_name,
          team_member_id: memberId
        });
      }

      if (typeof window !== 'undefined') {
        const key = `${LS_SALARIES_KEY}${workspaceId}_${memberId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: TeamSalaryRecord[] = JSON.parse(raw);
          const idx = list.findIndex(s => s.id === salaryId);
          if (idx >= 0) {
            list[idx] = updated;
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
        window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId } }));
      }

      return { success: true, updatedRecord: updated };
    }

    return { success: true };
  } catch (err) {
    console.error('[team-finance-sync] recordSalaryPayment error:', err);
    return { success: false };
  }
}

// ── 4. DIRECT EXPENSES & FINANCE TRANSACTIONS SYNC ───────────────────────────

export async function syncTeamPaymentToFinanceExpense(
  workspaceId: string,
  expenseData: {
    title: string;
    category: string;
    amount: number;
    date: string;
    payment_mode: string;
    notes?: string;
    team_member_name?: string;
    team_member_id?: string;
    client_name?: string;
    event_name?: string;
    linked_event_id?: string;
  }
): Promise<void> {
  try {
    const expenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspace_id: workspaceId,
      title: expenseData.title,
      category: expenseData.category || 'Crew & Freelancer Payout',
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      payment_mode: expenseData.payment_mode || 'UPI',
      notes: expenseData.notes || '',
      team_member_name: expenseData.team_member_name || '',
      client_name: expenseData.client_name || '',
      created_at: new Date().toISOString()
    };

    // 1. Insert into finance_transactions DB table
    try {
      await supabase.from('finance_transactions').insert({
        workspace_id: workspaceId,
        type: 'expense',
        category: expenseData.category || 'Crew & Freelancer Payout',
        amount: Number(expenseData.amount) || 0,
        payment_date: expenseData.date || new Date().toISOString().split('T')[0],
        title: expenseData.title,
        description: expenseData.notes || `Crew Payout for ${expenseData.team_member_name || 'Member'}`,
        client_name: expenseData.client_name || null,
        team_member_id: expenseData.team_member_id || null,
        linked_event_id: expenseData.linked_event_id || null,
        payment_status: 'paid'
      });
    } catch (_) {}

    // 2. Insert into finance_expenses DB table if exists
    try {
      await supabase.from('finance_expenses').insert(expenseItem);
    } catch (_) {}

    // 3. Also update local storage for /workspace/finance
    if (typeof window !== 'undefined') {
      const lsKey = `fw_finance_expenses_${workspaceId}`;
      const raw = localStorage.getItem(lsKey);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(expenseItem);
      localStorage.setItem(lsKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('finance_expenses_updated', { detail: expenseItem }));
      window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: expenseItem }));
    }
  } catch (err) {
    console.error('[team-finance-sync] syncTeamPaymentToFinanceExpense error:', err);
  }
}

// ── 5. AGGREGATED MEMBER FINANCIAL SUMMARY & MONTHLY BREAKDOWN ──────────────

export async function fetchMemberFinancialSummary(
  workspaceId: string,
  memberId: string,
  memberType: 'FREELANCER' | 'ALBUM_LAB' | 'IN_HOUSE' | string = 'FREELANCER'
): Promise<TeamFinancialSummary> {
  const normType = (memberType || '').toUpperCase();

  if (normType.includes('LAB') || normType.includes('ALBUM') || normType.includes('PARTNER')) {
    const orders = await fetchPartnerAlbumOrders(workspaceId, memberId);
    const totalAgreed = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const totalPaid = orders.reduce((acc, o) => acc + Number(o.paid_amount || 0), 0);
    const totalBalance = Math.max(0, totalAgreed - totalPaid);

    const monthlyMap: Record<string, { agreed: number; paid: number; balance: number }> = {};
    orders.forEach(o => {
      const m = (o.order_date || '').slice(0, 7) || 'Other';
      if (!monthlyMap[m]) monthlyMap[m] = { agreed: 0, paid: 0, balance: 0 };
      monthlyMap[m].agreed += Number(o.total_amount || 0);
      monthlyMap[m].paid += Number(o.paid_amount || 0);
      monthlyMap[m].balance += Number(o.balance_amount || 0);
    });

    const monthlyBreakdown = Object.keys(monthlyMap).sort().map(m => ({
      month: m,
      ...monthlyMap[m]
    }));

    return {
      member_id: memberId,
      total_agreed: totalAgreed,
      total_paid: totalPaid,
      total_balance: totalBalance,
      active_events_count: orders.length,
      paid_events_count: orders.filter(o => o.payment_status === 'PAID').length,
      pending_events_count: orders.filter(o => o.payment_status !== 'PAID').length,
      monthly_breakdown: monthlyBreakdown
    };
  }

  if (normType.includes('HOUSE') || normType.includes('STAFF')) {
    const salaries = await fetchMemberSalaryRecords(workspaceId, memberId);
    const totalAgreed = salaries.reduce((acc, s) => acc + Number(s.net_payable || 0), 0);
    const totalPaid = salaries.reduce((acc, s) => acc + Number(s.paid_amount || 0), 0);
    const totalBalance = Math.max(0, totalAgreed - totalPaid);

    const monthlyMap: Record<string, { agreed: number; paid: number; balance: number }> = {};
    salaries.forEach(s => {
      const m = s.month_year || 'Other';
      if (!monthlyMap[m]) monthlyMap[m] = { agreed: 0, paid: 0, balance: 0 };
      monthlyMap[m].agreed += Number(s.net_payable || 0);
      monthlyMap[m].paid += Number(s.paid_amount || 0);
      monthlyMap[m].balance += Math.max(0, Number(s.net_payable || 0) - Number(s.paid_amount || 0));
    });

    const monthlyBreakdown = Object.keys(monthlyMap).sort().map(m => ({
      month: m,
      ...monthlyMap[m]
    }));

    return {
      member_id: memberId,
      total_agreed: totalAgreed,
      total_paid: totalPaid,
      total_balance: totalBalance,
      active_events_count: salaries.length,
      paid_events_count: salaries.filter(s => s.payment_status === 'PAID').length,
      pending_events_count: salaries.filter(s => s.payment_status !== 'PAID').length,
      monthly_breakdown: monthlyBreakdown
    };
  }

  // Default Freelancer
  const payouts = await fetchMemberEventPayouts(workspaceId, memberId);
  const totalAgreed = payouts.reduce((acc, p) => acc + Number(p.agreed_amount || 0), 0);
  const totalPaid = payouts.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalBalance = Math.max(0, totalAgreed - totalPaid);

  const monthlyMap: Record<string, { agreed: number; paid: number; balance: number }> = {};
  payouts.forEach(p => {
    const m = (p.event_date || '').slice(0, 7) || 'Other';
    if (!monthlyMap[m]) monthlyMap[m] = { agreed: 0, paid: 0, balance: 0 };
    monthlyMap[m].agreed += Number(p.agreed_amount || 0);
    monthlyMap[m].paid += Number(p.paid_amount || 0);
    monthlyMap[m].balance += Number(p.balance_amount || 0);
  });

  const monthlyBreakdown = Object.keys(monthlyMap).sort().map(m => ({
    month: m,
    ...monthlyMap[m]
  }));

  return {
    member_id: memberId,
    total_agreed: totalAgreed,
    total_paid: totalPaid,
    total_balance: totalBalance,
    active_events_count: payouts.length,
    paid_events_count: payouts.filter(p => p.status === 'PAID').length,
    pending_events_count: payouts.filter(p => p.status !== 'PAID').length,
    monthly_breakdown: monthlyBreakdown
  };
}
