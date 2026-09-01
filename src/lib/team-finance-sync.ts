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
const LS_MEMBER_RATES_KEY = 'fw_ws_member_rates_';

// ── 0. ISOLATED WORKSPACE TEAM MEMBER RATES (PER-STUDIO RATE ISOLATION) ─────

export async function fetchWorkspaceMemberRate(workspaceId: string, memberId: string): Promise<number> {
  if (!workspaceId || !memberId) return 0;
  try {
    const { data, error } = await supabase
      .from('workspace_team_member_rates')
      .select('default_daily_rate')
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', memberId)
      .maybeSingle();

    if (!error && data && data.default_daily_rate != null) {
      return Number(data.default_daily_rate);
    }
  } catch (_) {}

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_MEMBER_RATES_KEY}${workspaceId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed[memberId] != null) return Number(parsed[memberId]);
      } catch (_) {}
    }
  }
  return 0;
}

export async function fetchWorkspaceMemberRatesMap(workspaceId: string): Promise<Record<string, any>> {
  if (!workspaceId) return {};
  const ratesMap: Record<string, any> = {};

  try {
    const { data, error } = await supabase
      .from('workspace_team_member_rates')
      .select('team_member_id, default_daily_rate, payout_frequency')
      .eq('workspace_id', workspaceId);

    if (!error && data && Array.isArray(data)) {
      data.forEach((r: any) => {
        if (r.team_member_id) {
          ratesMap[r.team_member_id] = {
            rate: Number(r.default_daily_rate) || 0,
            frequency: r.payout_frequency === 'monthly' ? 'monthly' : 'daily'
          };
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_MEMBER_RATES_KEY}${workspaceId}`, JSON.stringify(ratesMap));
      }
      return ratesMap;
    }
  } catch (_) {}

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_MEMBER_RATES_KEY}${workspaceId}`);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
  }
  return ratesMap;
}

export async function saveWorkspaceMemberRate(
  workspaceId: string,
  memberId: string,
  defaultDailyRate: number,
  currency = 'INR',
  payoutFrequency: 'daily' | 'monthly' = 'daily'
): Promise<void> {
  if (!workspaceId || !memberId) return;
  const numRate = Number(defaultDailyRate) || 0;

  try {
    const { data: existingRate } = await supabase
      .from('workspace_team_member_rates')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('team_member_id', memberId)
      .maybeSingle();

    if (existingRate?.id) {
      await supabase
        .from('workspace_team_member_rates')
        .update({
          default_daily_rate: numRate,
          payout_frequency: payoutFrequency,
          currency: currency || 'INR',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRate.id);
    } else {
      await supabase
        .from('workspace_team_member_rates')
        .insert([{
          workspace_id: workspaceId,
          team_member_id: memberId,
          default_daily_rate: numRate,
          payout_frequency: payoutFrequency,
          currency: currency || 'INR',
          updated_at: new Date().toISOString()
        }]);
    }
  } catch (err) {
    console.warn('[team-finance-sync] saveWorkspaceMemberRate error:', err);
  }

  // Also update fw_team_members as baseline fallback
  try {
    await supabase.from('fw_team_members').update({
      default_daily_rate: numRate,
      default_currency: currency || 'INR',
      payout_frequency: payoutFrequency
    }).eq('id', memberId);
  } catch (_) {}

  // Also update workspace_members
  try {
    await supabase.from('workspace_members').update({
      default_daily_rate: numRate,
      default_currency: currency || 'INR',
      payout_frequency: payoutFrequency
    }).eq('id', memberId);
  } catch (_) {}

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`${LS_MEMBER_RATES_KEY}${workspaceId}`);
    const map = local ? JSON.parse(local) : {};
    map[memberId] = { rate: numRate, frequency: payoutFrequency };
    localStorage.setItem(`${LS_MEMBER_RATES_KEY}${workspaceId}`, JSON.stringify(map));
  }
}

// ── 1. FREELANCER EVENT PAYOUTS (CREW ASSIGNMENT FINANCE) ───────────────────

export async function fetchMemberEventPayouts(workspaceId: string, memberId: string): Promise<TeamEventPayout[]> {
  const resultList: TeamEventPayout[] = [];
  const seenIds = new Set<string>();
  const memberIdsToQuery = new Set<string>([memberId]);
  let memberName = '';
  let memberEmail = '';

  try {
    // 0. Try Supabase RPC get_member_complete_commercial_ledger (Strict DB Ledger)
    try {
      const { data: ledgerRows, error: ledgerErr } = await supabase.rpc('get_member_complete_commercial_ledger', {
        p_workspace_id: workspaceId,
        p_member_id: memberId
      });

      if (!ledgerErr && ledgerRows && Array.isArray(ledgerRows) && ledgerRows.length > 0) {
        return ledgerRows.map((r: any) => ({
          id: r.assignment_id || `assign_${r.event_id}`,
          workspace_id: workspaceId,
          member_id: memberId,
          member_name: memberName || '',
          project_id: r.event_id || '',
          sub_event_id: '',
          client_name: r.client_name || 'Wedding Client',
          event_name: r.sub_event_title || 'Shoot Event',
          event_date: r.shoot_date || new Date().toISOString().split('T')[0],
          role: r.role_name || 'Crew',
          agreed_amount: Number(r.agreed_amount) || 0,
          paid_amount: Number(r.advance_amount) || 0,
          balance_amount: Number(r.balance_amount) || 0,
          status: (r.payment_status === 'completed' || (Number(r.agreed_amount) > 0 && Number(r.balance_amount) === 0) ? 'PAID' : Number(r.advance_amount) > 0 ? 'PARTIAL' : 'PENDING') as any,
          payment_method: r.payment_method || 'UPI / Bank Transfer',
          payment_date: r.payment_date || undefined,
          notes: '',
          venue: r.venue || '',
          start_time: r.start_time || '',
          end_time: r.end_time || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
    } catch (_) {}

    // 0.5. Parallel lookup of member aliases & rates across fw_team_members, workspace_members & workspace_team_member_rates
    const [ftmRes, wmRes, rateRes] = await Promise.all([
      supabase.from('fw_team_members').select('id, name, email, default_daily_rate').eq('id', memberId).maybeSingle().catch(() => ({ data: null })),
      supabase.from('workspace_members').select('id, name, email, default_daily_rate').eq('id', memberId).maybeSingle().catch(() => ({ data: null })),
      supabase.from('workspace_team_member_rates').select('default_daily_rate').eq('workspace_id', workspaceId).eq('team_member_id', memberId).maybeSingle().catch(() => ({ data: null }))
    ]);

    const m1 = ftmRes?.data;
    const m2 = wmRes?.data;
    const rateRow = rateRes?.data;

    if (m1) {
      if (m1.name) memberName = m1.name;
      if (m1.email) memberEmail = m1.email;
    }
    if (m2) {
      if (m2.name && !memberName) memberName = m2.name;
      if (m2.email && !memberEmail) memberEmail = m2.email;
    }

    const defaultDailyRate = Number(rateRow?.default_daily_rate) || Number(m1?.default_daily_rate) || Number(m2?.default_daily_rate) || 0;

    // Resolve any linked IDs by email/name in parallel
    if (memberEmail || memberName) {
      const aliasQueries = [];
      if (memberEmail) {
        aliasQueries.push(supabase.from('fw_team_members').select('id').eq('email', memberEmail).catch(() => ({ data: null })));
        aliasQueries.push(supabase.from('workspace_members').select('id').eq('email', memberEmail).catch(() => ({ data: null })));
      }
      if (memberName) {
        aliasQueries.push(supabase.from('fw_team_members').select('id').ilike('name', memberName).catch(() => ({ data: null })));
      }
      const aliasResults = await Promise.all(aliasQueries);
      aliasResults.forEach(res => {
        if (res?.data && Array.isArray(res.data)) {
          res.data.forEach((r: any) => { if (r.id) memberIdsToQuery.add(r.id); });
        }
      });
    }

    const idList = Array.from(memberIdsToQuery);

    // 1. Fetch fw_assignments, crew_assignments_finance, and team_event_payouts concurrently
    const [assignRes, crewFinRes, teamPayoutRes] = await Promise.all([
      (idList.length === 1 
        ? supabase.from('fw_assignments').select('*').eq('assigned_member_id', idList[0])
        : supabase.from('fw_assignments').select('*').in('assigned_member_id', idList)
      ).order('created_at', { ascending: false }).catch(() => ({ data: null, error: null })),

      (idList.length === 1
        ? supabase.from('crew_assignments_finance').select('*').eq('team_member_id', idList[0])
        : supabase.from('crew_assignments_finance').select('*').in('team_member_id', idList)
      ).order('created_at', { ascending: false }).catch(() => ({ data: null })),

      (idList.length === 1
        ? supabase.from('team_event_payouts').select('*').eq('member_id', idList[0])
        : supabase.from('team_event_payouts').select('*').in('member_id', idList)
      ).order('created_at', { ascending: false }).catch(() => ({ data: null }))
    ]);

    const assignData = assignRes?.data || [];
    const crewFinData = crewFinRes?.data || [];
    const teamPayoutData = teamPayoutRes?.data || [];

    if (assignData && assignData.length > 0) {
      // Collect sub_event_ids and project_ids for fast batch lookup
      const subEventIds = assignData.map((a: any) => a.sub_event_id).filter(Boolean);
      const projectIds: string[] = assignData.map((a: any) => a.project_id || a.event_id).filter(Boolean);

      const [seListRes, pListRes] = await Promise.all([
        subEventIds.length > 0
          ? supabase.from('fw_sub_events').select('id, project_id, event_title, event_date, start_time, end_time, venue, location, client_name, couple_name').in('id', subEventIds).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        projectIds.length > 0
          ? supabase.from('fw_projects').select('id, client_name, project_name, bride_name, groom_name, couple_name, venue_location').in('id', projectIds).catch(() => ({ data: null }))
          : Promise.resolve({ data: null })
      ]);

      const subEventsMap: Record<string, any> = {};
      const projectsMap: Record<string, any> = {};

      const additionalProjIds: string[] = [];
      if (seListRes?.data) {
        seListRes.data.forEach((se: any) => {
          subEventsMap[se.id] = se;
          if (se.project_id && !projectIds.includes(se.project_id)) {
            additionalProjIds.push(se.project_id);
          }
        });
      }

      if (pListRes?.data) {
        pListRes.data.forEach((p: any) => {
          projectsMap[p.id] = p;
        });
      }

      if (additionalProjIds.length > 0) {
        try {
          const { data: addProjs } = await supabase
            .from('fw_projects')
            .select('id, client_name, project_name, bride_name, groom_name, couple_name, venue_location')
            .in('id', additionalProjIds);
          if (addProjs) {
            addProjs.forEach((p: any) => { projectsMap[p.id] = p; });
          }
        } catch (_) {}
      }

      assignData.forEach((a: any) => {
        const se = a.sub_event_id ? subEventsMap[a.sub_event_id] : null;
        const proj = (a.project_id || se?.project_id) ? projectsMap[a.project_id || se?.project_id] : null;

        // Intelligent Couple / Client Name Resolution
        let resolvedClientName = '';
        if (proj?.couple_name && proj.couple_name.trim()) {
          resolvedClientName = proj.couple_name.trim();
        } else if (proj?.bride_name && proj?.groom_name) {
          resolvedClientName = `${proj.bride_name} & ${proj.groom_name}`;
        } else if (proj?.client_name && proj.client_name.trim() && proj.client_name.toLowerCase() !== 'wedding client' && proj.client_name.toLowerCase() !== 'client') {
          resolvedClientName = proj.client_name.trim();
        } else if (proj?.project_name && proj.project_name.trim() && proj.project_name.toLowerCase() !== 'wedding project') {
          resolvedClientName = proj.project_name.trim();
        } else if (proj?.bride_name) {
          resolvedClientName = proj.bride_name.trim();
        } else if (proj?.groom_name) {
          resolvedClientName = proj.groom_name.trim();
        } else if (se?.couple_name && se.couple_name.trim()) {
          resolvedClientName = se.couple_name.trim();
        } else if (se?.client_name && se.client_name.trim() && se.client_name.toLowerCase() !== 'wedding client') {
          resolvedClientName = se.client_name.trim();
        } else if (a.client_name && a.client_name.trim() && a.client_name.toLowerCase() !== 'wedding client') {
          resolvedClientName = a.client_name.trim();
        } else {
          resolvedClientName = proj?.client_name || 'Wedding Client';
        }

        const rawAgreed = Number(a.agreed_amount) || 0;
        const agreed = rawAgreed > 0 ? rawAgreed : defaultDailyRate;
        const paid = Number(a.advance_amount ?? a.paid_amount) || 0;
        const bal = Number(a.balance_amount) > 0 ? Number(a.balance_amount) : Math.max(0, agreed - paid);
        const pStatus: 'PENDING' | 'PARTIAL' | 'PAID' = (agreed > 0 && bal === 0)
          ? 'PAID' 
          : paid > 0 
          ? 'PARTIAL' 
          : 'PENDING';

        const eventTitle = se?.event_title || a.sub_event_name || a.event_name || a.required_role || 'Shoot Event';
        const eventDate = se?.event_date || a.sub_event_date || a.payment_date || new Date().toISOString().split('T')[0];
        const venue = se?.venue || se?.location || proj?.venue_location || a.venue || '';
        const startTime = se?.start_time || a.start_time || '';
        const endTime = se?.end_time || a.end_time || '';

        const item: TeamEventPayout = {
          id: a.id,
          workspace_id: a.workspace_id || workspaceId,
          member_id: a.assigned_member_id,
          member_name: a.assigned_member_name || memberName || '',
          project_id: a.project_id || a.event_id || se?.project_id || '',
          sub_event_id: a.sub_event_id || '',
          client_name: resolvedClientName,
          event_name: eventTitle,
          event_date: eventDate,
          role: a.required_role || a.role_name || 'Crew',
          agreed_amount: agreed,
          paid_amount: paid,
          balance_amount: bal,
          status: pStatus,
          payment_method: a.payment_method || 'UPI / Bank Transfer',
          payment_date: a.payment_date || undefined,
          notes: a.notes || '',
          synced_expense_id: a.synced_expense_id,
          venue: venue,
          start_time: startTime,
          end_time: endTime,
          created_at: a.created_at,
          updated_at: a.updated_at
        };
        seenIds.add(item.id);
        resultList.push(item);
      });
    }

    // Unify crew_assignments_finance without duplicates
    if (crewFinData.length > 0) {
      crewFinData.forEach((c: any) => {
        if (!seenIds.has(c.id)) {
          const rawAgreed = Number(c.final_agreed_amount) || 0;
          const agreed = rawAgreed > 0 ? rawAgreed : defaultDailyRate;
          const paid = Number(c.advance_paid_amount) || 0;
          const bal = Number(c.balance_amount) > 0 ? Number(c.balance_amount) : Math.max(0, agreed - paid);
          const pStatus = (agreed > 0 && bal === 0) ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

          seenIds.add(c.id);
          resultList.push({
            id: c.id,
            workspace_id: c.workspace_id || workspaceId,
            member_id: c.team_member_id,
            member_name: c.team_member_name || memberName,
            project_id: c.event_id || '',
            sub_event_id: c.sub_event_id || '',
            client_name: c.client_name || 'Wedding Client',
            event_name: c.role_name || 'Shoot Event',
            event_date: c.payment_date || new Date().toISOString().split('T')[0],
            role: c.role_name || 'Crew',
            agreed_amount: agreed,
            paid_amount: paid,
            balance_amount: bal,
            status: pStatus as any,
            payment_method: c.payment_method || 'UPI',
            payment_date: c.payment_date || undefined,
            notes: c.notes || '',
            created_at: c.created_at,
            updated_at: c.updated_at
          });
        }
      });
    }

    // Unify team_event_payouts without duplicates
    if (teamPayoutData.length > 0) {
      teamPayoutData.forEach((tp: any) => {
        if (!seenIds.has(tp.id)) {
          const rawAgreed = Number(tp.agreed_amount) || 0;
          const agreed = rawAgreed > 0 ? rawAgreed : defaultDailyRate;
          const paid = Number(tp.paid_amount) || 0;
          const bal = Number(tp.balance_amount) > 0 ? Number(tp.balance_amount) : Math.max(0, agreed - paid);
          const pStatus = (agreed > 0 && bal === 0) ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING');

          seenIds.add(tp.id);
          resultList.push({
            id: tp.id,
            workspace_id: tp.workspace_id || workspaceId,
            member_id: tp.member_id,
            member_name: tp.member_name || memberName,
            project_id: tp.project_id || '',
            sub_event_id: tp.sub_event_id || '',
            client_name: tp.client_name || 'Wedding Client',
            event_name: tp.event_name || 'Shoot Event',
            event_date: tp.event_date || new Date().toISOString().split('T')[0],
            role: tp.role || 'Crew',
            agreed_amount: agreed,
            paid_amount: paid,
            balance_amount: bal,
            status: pStatus as any,
            payment_method: tp.payment_method || 'UPI / Bank Transfer',
            payment_date: tp.payment_date || undefined,
            notes: tp.notes || '',
            synced_expense_id: tp.synced_expense_id,
            created_at: tp.created_at,
            updated_at: tp.updated_at
          });
        }
      });
    }

    // 2. Try crew_assignments_finance
    try {
      let cfQuery = supabase.from('crew_assignments_finance').select('*');
      if (idList.length === 1) {
        cfQuery = cfQuery.eq('team_member_id', idList[0]);
      } else {
        cfQuery = cfQuery.in('team_member_id', idList);
      }
      const { data: crewFinData } = await cfQuery.order('payment_date', { ascending: false });

      if (crewFinData && crewFinData.length > 0) {
        crewFinData.forEach((c: any) => {
          if (!seenIds.has(c.id)) {
            const agreed = Number(c.final_agreed_amount) || 0;
            const paid = Number(c.advance_paid_amount) || 0;
            const bal = Number(c.balance_amount) || Math.max(0, agreed - paid);
            const pStatus = (c.payment_status === 'completed' ? 'PAID' : c.payment_status === 'partial' ? 'PARTIAL' : 'PENDING') as any;

            const item: TeamEventPayout = {
              id: c.id,
              workspace_id: c.workspace_id || workspaceId,
              member_id: c.team_member_id,
              member_name: c.team_member_name || c.member_name || memberName || '',
              project_id: c.event_id || '',
              sub_event_id: c.sub_event_id || '',
              client_name: c.client_name || 'Wedding Shoot',
              event_name: c.event_name || c.role_name || 'Shoot Event',
              event_date: c.payment_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              role: c.role_name || 'Crew',
              agreed_amount: agreed,
              paid_amount: paid,
              balance_amount: bal,
              status: pStatus,
              payment_method: c.payment_method || 'UPI / Bank Transfer',
              payment_date: c.payment_date,
              notes: c.notes || '',
              synced_expense_id: c.synced_expense_id,
              created_at: c.created_at,
              updated_at: c.updated_at
            };
            seenIds.add(c.id);
            resultList.push(item);
          }
        });
      }
    } catch (_) {}

    // 3. Fallback to team_event_payouts
    try {
      let tpQuery = supabase.from('team_event_payouts').select('*');
      if (idList.length === 1) {
        tpQuery = tpQuery.eq('member_id', idList[0]);
      } else {
        tpQuery = tpQuery.in('member_id', idList);
      }
      const { data } = await tpQuery.order('event_date', { ascending: false });

      if (data && data.length > 0) {
        data.forEach((p: any) => {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            resultList.push(p);
          }
        });
      }
    } catch (_) {}

    if (resultList.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${LS_PAYOUTS_KEY}${workspaceId}_${memberId}`, JSON.stringify(resultList));
      }
      return resultList;
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

export async function updateCrewAssignmentPayment(
  workspaceId: string,
  assignmentId: string,
  params: {
    advanceAmount: number;
    paymentStatus: 'pending' | 'partial' | 'completed';
    paymentMethod?: string;
    paymentDate?: string;
    notes?: string;
    teamMemberId?: string;
    teamMemberName?: string;
    clientName?: string;
    eventName?: string;
    roleName?: string;
    agreedAmount?: number;
  }
): Promise<{ success: boolean; expenseId?: string }> {
  try {
    const paymentMethod = params.paymentMethod || 'UPI / Bank Transfer';
    const paymentDate = params.paymentDate || new Date().toISOString().split('T')[0];
    const advanceAmount = Number(params.advanceAmount) || 0;
    const agreedAmount = Number(params.agreedAmount) || 0;
    const balanceAmount = Math.max(0, agreedAmount - advanceAmount);
    const amountToLog = params.paymentStatus === 'completed' ? agreedAmount : advanceAmount;

    // 1. Try Supabase RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_crew_assignment_payment', {
        p_assignment_id: assignmentId,
        p_workspace_id: workspaceId,
        p_advance_amount: advanceAmount,
        p_payment_status: params.paymentStatus,
        p_payment_method: paymentMethod,
        p_payment_date: paymentDate
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('team_finance_updated'));
          window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
        }
        return { success: true, expenseId: rpcRes.expense_id };
      }
    } catch (_) {}

    // 2. Direct Sync Fallback
    // A. Sync into Finance Expenses & Transactions if paid > 0
    if (amountToLog > 0) {
      await syncTeamPaymentToFinanceExpense(workspaceId, {
        title: `Crew Payout: ${params.teamMemberName || 'Member'} (${params.roleName || 'Crew'})`,
        category: 'Crew & Freelancer Payout',
        amount: amountToLog,
        date: paymentDate,
        payment_mode: paymentMethod,
        notes: params.notes || `Shoot: ${params.eventName || 'Event'} | Client: ${params.clientName || 'Client'} | Status: ${params.paymentStatus}`,
        team_member_name: params.teamMemberName,
        team_member_id: params.teamMemberId,
        client_name: params.clientName,
        event_name: params.eventName,
        linked_event_id: assignmentId
      });
    }

    // B. Update fw_assignments
    if (assignmentId && !assignmentId.includes('-role-')) {
      await supabase.from('fw_assignments').update({
        advance_amount: advanceAmount,
        balance_amount: balanceAmount,
        payment_status: params.paymentStatus,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: params.notes || undefined,
        updated_at: new Date().toISOString()
      }).eq('id', assignmentId);
    }

    // C. Update crew_assignments_finance
    try {
      await supabase.from('crew_assignments_finance').update({
        advance_paid_amount: advanceAmount,
        balance_amount: balanceAmount,
        payment_status: params.paymentStatus,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: params.notes || undefined,
        updated_at: new Date().toISOString()
      }).eq('id', assignmentId);
    } catch (_) {}

    // D. Update team_event_payouts
    try {
      await supabase.from('team_event_payouts').update({
        paid_amount: advanceAmount,
        balance_amount: balanceAmount,
        status: params.paymentStatus === 'completed' ? 'PAID' : params.paymentStatus === 'partial' ? 'PARTIAL' : 'PENDING',
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: params.notes || undefined,
        updated_at: new Date().toISOString()
      }).eq('id', assignmentId);
    } catch (_) {}

    // E. Broadcast live event for real-time drawer & page refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('team_finance_updated'));
      window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
    }

    return { success: true };
  } catch (err) {
    console.error('[updateCrewAssignmentPayment] error:', err);
    return { success: false };
  }
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
      team_member_name: payoutData.member_name,
      client_name: payoutData.client_name,
      event_name: payoutData.event_name,
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
      event_name: payload.event_name,
      linked_event_id: payload.project_id
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

// ── 1.5 ATOMIC ASSIGNMENT & COMMERCIALS SYNC (FIXES UNASSIGNED REFRESH BUG) ──

export async function assignCrewMemberWithCommercials(params: {
  workspaceId: string;
  eventId: string;
  subEventId?: string;
  assignmentId?: string;
  teamMemberId: string;
  teamMemberName: string;
  teamMemberPhone?: string;
  roleName: string;
  roleShortCode?: string;
  finalAgreedAmount: number;
  advancePaidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'completed';
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  clientName?: string;
  eventName?: string;
}): Promise<{ success: boolean }> {
  const agreed = Number(params.finalAgreedAmount) >= 0 ? Number(params.finalAgreedAmount) : 0;
  const advance = Number(params.advancePaidAmount) || 0;

  // 1. Try Supabase RPC assign_or_replace_crew_slot
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('assign_or_replace_crew_slot', {
      p_workspace_id: params.workspaceId,
      p_event_id: params.eventId,
      p_sub_event_id: String(params.subEventId || ''),
      p_role_short_code: params.roleShortCode || params.roleName?.slice(0, 4) || 'CREW',
      p_role_name: params.roleName,
      p_member_id: params.teamMemberId,
      p_member_name: params.teamMemberName,
      p_member_phone: params.teamMemberPhone || '',
      p_custom_agreed_amount: agreed,
      p_advance_amount: advance,
      p_payment_status: params.paymentStatus || 'pending'
    });

    if (!rpcErr && rpcData?.success) {
      await persistAssignmentSlot(params);
      return { success: true };
    }
  } catch (err) {
    console.warn('[team-finance-sync] assign_or_replace_crew_slot RPC fallback:', err);
  }

  // 1.5 Try fallback RPC assign_crew_member_with_commercials
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('assign_crew_member_with_commercials', {
      p_workspace_id: params.workspaceId,
      p_event_id: params.eventId,
      p_sub_event_id: params.subEventId || null,
      p_team_member_id: params.teamMemberId,
      p_team_member_name: params.teamMemberName,
      p_team_member_phone: params.teamMemberPhone || '',
      p_role_name: params.roleName,
      p_role_short_code: params.roleShortCode || '',
      p_final_agreed_amount: agreed,
      p_advance_paid_amount: advance,
      p_payment_status: params.paymentStatus || 'pending',
      p_payment_date: params.paymentDate || new Date().toISOString().split('T')[0]
    });

    if (!rpcErr && rpcData?.success) {
      await persistAssignmentSlot(params);
      return { success: true };
    }
  } catch (_) {}

  // 2. Direct persistence fallback
  await saveOrUpdateEventPayout(params.workspaceId, {
    member_id: params.teamMemberId,
    member_name: params.teamMemberName,
    project_id: params.eventId,
    sub_event_id: params.subEventId,
    client_name: params.clientName || 'Wedding Client',
    event_name: params.eventName || params.roleName || 'Shoot Event',
    event_date: params.paymentDate || new Date().toISOString().split('T')[0],
    role: params.roleName,
    agreed_amount: agreed,
    advance_paid_amount: advance,
    payment_method: params.paymentMethod || 'UPI / Bank Transfer',
    payment_date: params.paymentDate,
    notes: params.notes
  });

  await persistAssignmentSlot(params);
  return { success: true };
}

export async function unassignCrewSlot(params: {
  workspaceId: string;
  eventId: string;
  subEventId?: string;
  assignmentId?: string;
  roleShortCode?: string;
  roleName?: string;
  teamMemberId?: string;
}): Promise<{ success: boolean }> {
  try {
    // 1. Try Supabase RPC unassign_crew_slot_strict (Complete multi-table purge)
    try {
      await supabase.rpc('unassign_crew_slot_strict', {
        p_workspace_id: params.workspaceId,
        p_event_id: params.eventId,
        p_sub_event_id: String(params.subEventId || ''),
        p_role_short_code: params.roleShortCode || params.roleName?.slice(0, 4) || '',
        p_member_id: params.teamMemberId || null
      });
    } catch (_) {}

    // 1.5. Try fallback RPC unassign_crew_slot
    try {
      await supabase.rpc('unassign_crew_slot', {
        p_workspace_id: params.workspaceId,
        p_event_id: params.eventId,
        p_sub_event_id: String(params.subEventId || ''),
        p_role_short_code: params.roleShortCode || params.roleName?.slice(0, 4) || ''
      });
    } catch (_) {}

    // 2. Direct clean up in fw_assignments
    if (params.assignmentId && !params.assignmentId.includes('-role-')) {
      await supabase.from('fw_assignments').update({
        assigned_member_id: null,
        assigned_member_name: null,
        agreed_amount: 0,
        advance_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        payment_status: 'pending',
        notes: null
      }).eq('id', params.assignmentId);
    } else if (params.subEventId && params.roleName) {
      await supabase.from('fw_assignments').update({
        assigned_member_id: null,
        assigned_member_name: null,
        agreed_amount: 0,
        advance_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        payment_status: 'pending',
        notes: null
      }).eq('sub_event_id', params.subEventId).eq('required_role', params.roleName);
    }

    // 3. Purge from crew_assignments_finance and team_event_payouts if memberId was given
    if (params.teamMemberId) {
      try {
        let q = supabase.from('crew_assignments_finance').delete().eq('team_member_id', params.teamMemberId);
        if (params.subEventId) q = q.eq('sub_event_id', params.subEventId);
        else if (params.eventId) q = q.eq('event_id', params.eventId);
        await q;
      } catch (_) {}
      try {
        let q = supabase.from('team_event_payouts').delete().eq('member_id', params.teamMemberId);
        if (params.subEventId) q = q.eq('sub_event_id', params.subEventId);
        else if (params.eventId) q = q.eq('project_id', params.eventId);
        await q;
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('team_finance_updated', {
        detail: { memberId: params.teamMemberId, unassigned: true }
      }));
    }

    return { success: true };
  } catch (err) {
    console.error('[team-finance-sync] unassignCrewSlot error:', err);
    return { success: false };
  }
}

async function persistAssignmentSlot(params: {
  workspaceId: string;
  eventId: string;
  subEventId?: string;
  assignmentId?: string;
  teamMemberId: string;
  teamMemberName?: string;
  teamMemberPhone?: string;
  roleName: string;
  finalAgreedAmount?: number;
  advancePaidAmount?: number;
  paymentStatus?: string;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  clientName?: string;
  eventName?: string;
}) {
  try {
    const agreed = Number(params.finalAgreedAmount) || 0;
    const advance = Number(params.advancePaidAmount) || 0;
    const balance = Math.max(0, agreed - advance);
    const pStatus = params.paymentStatus || (agreed > 0 && balance === 0 ? 'completed' : advance > 0 ? 'partial' : 'pending');
    const pDate = params.paymentDate || new Date().toISOString().split('T')[0];
    const pMethod = params.paymentMethod || 'UPI / Bank Transfer';

    // 1. CRITICAL: Ensure member exists in fw_team_members so foreign key constraint NEVER fails
    if (params.teamMemberId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUid = session?.user?.id;
        await supabase.from('fw_team_members').upsert({
          id: params.teamMemberId,
          name: params.teamMemberName || 'Team Member',
          phone_number: params.teamMemberPhone || null,
          primary_role: params.roleName || 'Crew',
          user_id: currentUid || undefined,
          is_active: true,
          default_daily_rate: agreed > 0 ? agreed : undefined
        }, { onConflict: 'id' });
      } catch (_) {}
    }

    const assignmentPayload: any = {
      assigned_member_id: params.teamMemberId,
      assigned_member_name: params.teamMemberName || null,
      agreed_amount: agreed,
      advance_amount: advance,
      paid_amount: advance,
      balance_amount: balance,
      payment_status: pStatus,
      payment_method: pMethod,
      payment_date: pDate,
      notes: params.notes || null,
      workspace_id: params.workspaceId || null,
      sub_event_name: params.eventName || null,
      client_name: params.clientName || null
    };

    // 2. Perform fw_assignments update or insert
    if (params.assignmentId && !params.assignmentId.includes('-role-')) {
      await supabase
        .from('fw_assignments')
        .update(assignmentPayload)
        .eq('id', params.assignmentId);
    } else if (params.subEventId) {
      const { data: existing } = await supabase
        .from('fw_assignments')
        .select('id')
        .eq('sub_event_id', params.subEventId)
        .eq('required_role', params.roleName)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('fw_assignments')
          .update(assignmentPayload)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('fw_assignments')
          .insert([{
            project_id: params.eventId,
            sub_event_id: params.subEventId,
            required_role: params.roleName,
            status: 'pending',
            ...assignmentPayload
          }]);
      }
    }
  } catch (err) {
    console.warn('[team-finance-sync] persistAssignmentSlot error:', err);
  }
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
          member_name: payment.memberName || data.team_member_name || '',
          project_id: data.event_id,
          sub_event_id: data.sub_event_id,
          client_name: payment.clientName || data.client_name || 'Wedding Client',
          event_name: payment.eventName || data.event_name || 'Shoot Event',
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
          event_name: existingPayout.event_name,
          linked_event_id: existingPayout.project_id
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
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;
    const effectiveWsId = workspaceId || currentUid || '';

    const expId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const payDate = expenseData.date || new Date().toISOString().split('T')[0];
    const amt = Number(expenseData.amount) || 0;

    const expenseItem = {
      id: expId,
      workspace_id: effectiveWsId,
      user_id: currentUid || effectiveWsId,
      title: expenseData.title,
      category: expenseData.category || 'Crew & Freelancer Payout',
      expense_type: 'project_expense',
      amount: amt,
      paid_to: expenseData.team_member_name || 'Team Member',
      payment_date: payDate,
      date: payDate,
      payment_mode: expenseData.payment_mode || 'UPI',
      notes: expenseData.notes || '',
      team_member_name: expenseData.team_member_name || '',
      team_member_id: expenseData.team_member_id || null,
      client_name: expenseData.client_name || '',
      status: 'paid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Insert into finance_expenses DB table
    try {
      await supabase.from('finance_expenses').insert([expenseItem]);
    } catch (_) {}

    // 2. Insert into finance_transactions DB table
    try {
      await supabase.from('finance_transactions').insert({
        workspace_id: effectiveWsId,
        user_id: currentUid || effectiveWsId,
        type: 'expense',
        category: expenseData.category || 'Crew & Freelancer Payout',
        amount: amt,
        payment_date: payDate,
        title: expenseData.title,
        description: expenseData.notes || `Crew Payout for ${expenseData.team_member_name || 'Member'}`,
        client_name: expenseData.client_name || null,
        team_member_id: expenseData.team_member_id || null,
        linked_event_id: expenseData.linked_event_id || null,
        payment_status: 'paid',
        payment_mode: expenseData.payment_mode || 'UPI'
      });
    } catch (_) {}

    // 3. Also update local storage and notify listeners
    if (typeof window !== 'undefined') {
      const lsKey = `fw_finance_expenses_${effectiveWsId}`;
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

  // 1. Fetch Shoot Event Payouts (Universal for all assigned shoots)
  const payouts = await fetchMemberEventPayouts(workspaceId, memberId);
  const eventAgreed = payouts.reduce((acc, p) => acc + Number(p.agreed_amount || 0), 0);
  const eventPaid = payouts.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const eventBalance = payouts.reduce((acc, p) => acc + Number(p.balance_amount || 0), 0);

  let additionalAgreed = 0;
  let additionalPaid = 0;
  let additionalBalance = 0;
  let additionalActiveCount = 0;
  let additionalPaidCount = 0;

  // 2. Partner Album Orders (if lab partner)
  if (normType.includes('LAB') || normType.includes('ALBUM') || normType.includes('PARTNER')) {
    const orders = await fetchPartnerAlbumOrders(workspaceId, memberId);
    if (orders.length > 0) {
      additionalAgreed += orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
      additionalPaid += orders.reduce((acc, o) => acc + Number(o.paid_amount || 0), 0);
      additionalBalance += Math.max(0, additionalAgreed - additionalPaid);
      additionalActiveCount += orders.length;
      additionalPaidCount += orders.filter(o => o.payment_status === 'PAID').length;
    }
  }

  // 3. In-House Salary Records (if in-house staff)
  if (normType.includes('HOUSE') || normType.includes('STAFF')) {
    const salaries = await fetchMemberSalaryRecords(workspaceId, memberId);
    if (salaries.length > 0) {
      const salAgreed = salaries.reduce((acc, s) => acc + Number(s.net_payable || 0), 0);
      const salPaid = salaries.reduce((acc, s) => acc + Number(s.paid_amount || 0), 0);
      additionalAgreed += salAgreed;
      additionalPaid += salPaid;
      additionalBalance += Math.max(0, salAgreed - salPaid);
      additionalActiveCount += salaries.length;
      additionalPaidCount += salaries.filter(s => s.payment_status === 'PAID').length;
    }
  }

  const totalAgreed = eventAgreed + additionalAgreed;
  const totalPaid = eventPaid + additionalPaid;
  const totalBalance = eventBalance + additionalBalance;
  const activeCount = payouts.length + additionalActiveCount;
  const paidCount = payouts.filter(p => p.status === 'PAID').length + additionalPaidCount;
  const pendingCount = activeCount - paidCount;

  // Monthly breakdown
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
    active_events_count: activeCount,
    paid_events_count: paidCount,
    pending_events_count: pendingCount,
    monthly_breakdown: monthlyBreakdown
  };
}
