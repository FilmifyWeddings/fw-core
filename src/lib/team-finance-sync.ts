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
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  notes?: string;
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
}

// Storage Keys
const LS_PAYOUTS_KEY = 'fw_team_event_payouts_';
const LS_ALBUMS_KEY = 'fw_partner_album_orders_';
const LS_SALARIES_KEY = 'fw_team_salaries_';
const LS_TRANSACTIONS_KEY = 'fw_team_transactions_';

// ── 1. FREELANCER EVENT PAYOUTS ──────────────────────────────────────────────

export async function fetchMemberEventPayouts(workspaceId: string, memberId: string): Promise<TeamEventPayout[]> {
  try {
    const { data, error } = await supabase
      .from('team_event_payouts')
      .select('*')
      .eq('workspace_id', workspaceId)
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
  payoutData: Partial<TeamEventPayout> & { member_id: string; member_name: string; client_name: string; event_name: string; event_date: string; role: string; agreed_amount: number }
): Promise<TeamEventPayout> {
  const agreed = Number(payoutData.agreed_amount) || 0;
  const paid = Number(payoutData.paid_amount) || 0;
  const balance = Math.max(0, agreed - paid);
  const status: 'PENDING' | 'PARTIAL' | 'PAID' = balance === 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

  const payload: TeamEventPayout = {
    id: payoutData.id || `payout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
    notes: payoutData.notes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('team_event_payouts').upsert(payload);
  } catch (err) {
    console.warn('[team-finance-sync] DB saveOrUpdateEventPayout error:', err);
  }

  // Update Local Cache
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
    window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId: payload.member_id } }));
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
      const { data } = await supabase.from('team_event_payouts').select('*').eq('id', payoutId).single();
      if (data) existingPayout = data as TeamEventPayout;
    } catch (_) {}

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

      const updatedPayout: TeamEventPayout = {
        ...existingPayout,
        paid_amount: newPaid,
        balance_amount: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      try {
        await supabase.from('team_event_payouts').update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          status: newStatus,
          updated_at: updatedPayout.updated_at
        }).eq('id', payoutId);
      } catch (_) {}

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

        // Cache transaction
        const txnKey = `${LS_TRANSACTIONS_KEY}${workspaceId}_${memberId}`;
        const rawTxns = localStorage.getItem(txnKey);
        const txns: TeamPayoutTransaction[] = rawTxns ? JSON.parse(rawTxns) : [];
        txns.unshift(txnPayload);
        localStorage.setItem(txnKey, JSON.stringify(txns));
      }

      // 3. Auto Create Expense in /workspace/finance
      if (payment.autoCreateExpense !== false) {
        await syncTeamPaymentToFinanceExpense(workspaceId, {
          title: `Crew Payout: ${payment.memberName || existingPayout.member_name} (${existingPayout.role})`,
          amount: Number(payment.amount),
          category: 'Photographer Payout',
          date: payment.payment_date,
          payment_mode: payment.payment_mode,
          notes: `Event: ${existingPayout.event_name} | Client: ${existingPayout.client_name} | Ref: ${payment.reference_no || 'N/A'}${payment.notes ? ` | Note: ${payment.notes}` : ''}`,
          team_member_id: memberId,
          team_member_name: existingPayout.member_name,
          client_name: existingPayout.client_name
        });
      }

      if (typeof window !== 'undefined') {
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

// ── 2. PARTNER ALBUM ORDERS (LABS) ──────────────────────────────────────────

export async function fetchPartnerAlbumOrders(workspaceId: string, partnerId: string): Promise<PartnerAlbumOrder[]> {
  try {
    const { data, error } = await supabase
      .from('partner_album_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
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
  orderData: Partial<PartnerAlbumOrder> & { partner_id: string; partner_name: string; client_name: string; sheet_count: number; rate_per_sheet: number }
): Promise<PartnerAlbumOrder> {
  const sheets = Number(orderData.sheet_count) || 30;
  const rate = Number(orderData.rate_per_sheet) || 0;
  const total = Number(orderData.total_amount) || (sheets * rate);
  const paid = Number(orderData.paid_amount) || 0;
  const balance = Math.max(0, total - paid);
  const paymentStatus = balance === 0 && total > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

  const payload: PartnerAlbumOrder = {
    id: orderData.id || `album_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    workspace_id: workspaceId,
    partner_id: orderData.partner_id,
    partner_name: orderData.partner_name,
    client_name: orderData.client_name,
    project_id: orderData.project_id || '',
    album_type: orderData.album_type || 'Luxury Photobook (12x36)',
    sheet_count: sheets,
    rate_per_sheet: rate,
    total_amount: total,
    paid_amount: paid,
    balance_amount: balance,
    order_status: orderData.order_status || 'PRINTING',
    payment_status: paymentStatus,
    order_date: orderData.order_date || new Date().toISOString().split('T')[0],
    delivery_date: orderData.delivery_date || '',
    notes: orderData.notes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('partner_album_orders').upsert(payload);
  } catch (_) {}

  if (typeof window !== 'undefined') {
    const key = `${LS_ALBUMS_KEY}${workspaceId}_${payload.partner_id}`;
    const raw = localStorage.getItem(key);
    let list: PartnerAlbumOrder[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(a => a.id === payload.id);
    if (idx >= 0) {
      list[idx] = payload;
    } else {
      list.unshift(payload);
    }
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
    partnerName?: string;
    clientName?: string;
  }
): Promise<boolean> {
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

      try {
        await supabase.from('partner_album_orders').update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', orderId);
      } catch (_) {}

      if (typeof window !== 'undefined') {
        const key = `${LS_ALBUMS_KEY}${workspaceId}_${partnerId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: PartnerAlbumOrder[] = JSON.parse(raw);
          const idx = list.findIndex(o => o.id === orderId);
          if (idx >= 0) {
            list[idx] = { ...list[idx], paid_amount: newPaid, balance_amount: newBalance, payment_status: newStatus };
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }

      // Auto Sync to Finance Expenses
      await syncTeamPaymentToFinanceExpense(workspaceId, {
        title: `Album Printing: ${payment.partnerName || existingOrder.partner_name} (${existingOrder.client_name})`,
        amount: Number(payment.amount),
        category: 'Hard Drives & Delivery',
        date: payment.payment_date,
        payment_mode: payment.payment_mode,
        notes: `Album: ${existingOrder.album_type} (${existingOrder.sheet_count} sheets) | Client: ${existingOrder.client_name} | Ref: ${payment.reference_no || 'N/A'}`,
        team_member_id: partnerId,
        team_member_name: existingOrder.partner_name,
        client_name: existingOrder.client_name
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { partnerId } }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[team-finance-sync] recordAlbumOrderPayment error:', err);
    return false;
  }
}

// ── 3. IN-HOUSE TEAM MONTHLY SALARY & INCENTIVES ──────────────────────────────

export async function fetchMemberSalaryRecords(workspaceId: string, memberId: string): Promise<TeamSalaryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('team_salary_records')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('member_id', memberId)
      .order('month_year', { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_SALARIES_KEY}${workspaceId}_${memberId}`, JSON.stringify(data));
      }
      return data as TeamSalaryRecord[];
    }
  } catch (_) {}

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
  const incentive = Number(salaryData.incentive_amount) || 0;
  const deductions = Number(salaryData.deductions) || 0;
  const net = Math.max(0, base + incentive - deductions);
  const paid = Number(salaryData.paid_amount) || 0;
  const status = paid >= net && net > 0 ? 'PAID' : 'PENDING';

  const payload: TeamSalaryRecord = {
    id: salaryData.id || `sal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    workspace_id: workspaceId,
    member_id: salaryData.member_id,
    member_name: salaryData.member_name,
    month_year: salaryData.month_year,
    base_salary: base,
    incentive_amount: incentive,
    deductions: deductions,
    net_payable: net,
    paid_amount: paid,
    payment_status: status,
    paid_date: salaryData.paid_date || (status === 'PAID' ? new Date().toISOString().split('T')[0] : ''),
    payment_mode: salaryData.payment_mode || 'Bank Transfer',
    reference_no: salaryData.reference_no || '',
    notes: salaryData.notes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('team_salary_records').upsert(payload);
  } catch (_) {}

  if (typeof window !== 'undefined') {
    const key = `${LS_SALARIES_KEY}${workspaceId}_${payload.member_id}`;
    const raw = localStorage.getItem(key);
    let list: TeamSalaryRecord[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s.id === payload.id || s.month_year === payload.month_year);
    if (idx >= 0) {
      list[idx] = payload;
    } else {
      list.unshift(payload);
    }
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
    memberName?: string;
    monthYear?: string;
  }
): Promise<boolean> {
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
      const newPaid = Number(payment.amount);
      const status: 'PENDING' | 'PAID' = newPaid >= existing.net_payable ? 'PAID' : 'PENDING';

      try {
        await supabase.from('team_salary_records').update({
          paid_amount: newPaid,
          payment_status: status,
          paid_date: payment.paid_date,
          payment_mode: payment.payment_mode,
          reference_no: payment.reference_no || '',
          notes: payment.notes || '',
          updated_at: new Date().toISOString()
        }).eq('id', salaryId);
      } catch (_) {}

      if (typeof window !== 'undefined') {
        const key = `${LS_SALARIES_KEY}${workspaceId}_${memberId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: TeamSalaryRecord[] = JSON.parse(raw);
          const idx = list.findIndex(s => s.id === salaryId);
          if (idx >= 0) {
            list[idx] = {
              ...list[idx],
              paid_amount: newPaid,
              payment_status: status,
              paid_date: payment.paid_date,
              payment_mode: payment.payment_mode,
              reference_no: payment.reference_no,
              notes: payment.notes
            };
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }

      // Auto sync to Finance Expenses as Salary
      await syncTeamPaymentToFinanceExpense(workspaceId, {
        title: `Staff Salary: ${payment.memberName || existing.member_name} (${existing.month_year})`,
        amount: Number(payment.amount),
        category: 'Studio Rent & Utilities',
        date: payment.paid_date,
        payment_mode: payment.payment_mode,
        notes: `Monthly Salary: Base ₹${existing.base_salary} + Incentive ₹${existing.incentive_amount} - Deductions ₹${existing.deductions} | Ref: ${payment.reference_no || 'N/A'}`,
        team_member_id: memberId,
        team_member_name: existing.member_name
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_finance_updated', { detail: { memberId } }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[team-finance-sync] recordSalaryPayment error:', err);
    return false;
  }
}

// ── 4. AUTO SYNC WITH /workspace/finance EXPENSES ─────────────────────────────

export async function syncTeamPaymentToFinanceExpense(
  workspaceId: string,
  expenseData: {
    title: string;
    amount: number;
    category: string;
    date: string;
    payment_mode: string;
    notes?: string;
    team_member_id?: string;
    team_member_name?: string;
    client_name?: string;
  }
): Promise<void> {
  try {
    const expenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workspace_id: workspaceId,
      title: expenseData.title,
      category: expenseData.category || 'Photographer Payout',
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      payment_mode: expenseData.payment_mode || 'UPI',
      notes: expenseData.notes || '',
      team_member_name: expenseData.team_member_name || '',
      client_name: expenseData.client_name || '',
      created_at: new Date().toISOString()
    };

    // 1. Insert into finance_expenses DB table if exists
    try {
      await supabase.from('finance_expenses').insert(expenseItem);
    } catch (_) {}

    // 2. Also update local storage for /workspace/finance
    if (typeof window !== 'undefined') {
      const lsKey = `fw_finance_expenses_${workspaceId}`;
      const raw = localStorage.getItem(lsKey);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(expenseItem);
      localStorage.setItem(lsKey, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('finance_expenses_updated', { detail: expenseItem }));
    }
  } catch (err) {
    console.error('[team-finance-sync] syncTeamPaymentToFinanceExpense error:', err);
  }
}

// ── 5. AGGREGATED MEMBER FINANCIAL SUMMARY ──────────────────────────────────

export async function fetchMemberFinancialSummary(
  workspaceId: string,
  memberId: string,
  memberType: 'FREELANCER' | 'ALBUM_LAB' | 'IN_HOUSE' | string = 'FREELANCER'
): Promise<TeamFinancialSummary> {
  const normType = (memberType || '').toUpperCase();

  if (normType.includes('LAB') || normType.includes('ALBUM')) {
    const orders = await fetchPartnerAlbumOrders(workspaceId, memberId);
    const totalAgreed = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const totalPaid = orders.reduce((acc, o) => acc + Number(o.paid_amount || 0), 0);
    const totalBalance = Math.max(0, totalAgreed - totalPaid);
    return {
      member_id: memberId,
      total_agreed: totalAgreed,
      total_paid: totalPaid,
      total_balance: totalBalance,
      active_events_count: orders.length,
      paid_events_count: orders.filter(o => o.payment_status === 'PAID').length,
      pending_events_count: orders.filter(o => o.payment_status !== 'PAID').length
    };
  }

  if (normType.includes('HOUSE') || normType.includes('STAFF')) {
    const salaries = await fetchMemberSalaryRecords(workspaceId, memberId);
    const totalAgreed = salaries.reduce((acc, s) => acc + Number(s.net_payable || 0), 0);
    const totalPaid = salaries.reduce((acc, s) => acc + Number(s.paid_amount || 0), 0);
    const totalBalance = Math.max(0, totalAgreed - totalPaid);
    return {
      member_id: memberId,
      total_agreed: totalAgreed,
      total_paid: totalPaid,
      total_balance: totalBalance,
      active_events_count: salaries.length,
      paid_events_count: salaries.filter(s => s.payment_status === 'PAID').length,
      pending_events_count: salaries.filter(s => s.payment_status !== 'PAID').length
    };
  }

  // Default Freelancer
  const payouts = await fetchMemberEventPayouts(workspaceId, memberId);
  const totalAgreed = payouts.reduce((acc, p) => acc + Number(p.agreed_amount || 0), 0);
  const totalPaid = payouts.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalBalance = Math.max(0, totalAgreed - totalPaid);

  return {
    member_id: memberId,
    total_agreed: totalAgreed,
    total_paid: totalPaid,
    total_balance: totalBalance,
    active_events_count: payouts.length,
    paid_events_count: payouts.filter(p => p.status === 'PAID').length,
    pending_events_count: payouts.filter(p => p.status !== 'PAID').length
  };
}
