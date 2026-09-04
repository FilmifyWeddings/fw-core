import { supabase } from '@/lib/supabase';

export async function fetchMemberPayouts(memberId: string) {
  const { data, error } = await supabase
    .from('team_event_payouts')
    .select('*')
    .eq('member_id', String(memberId))
    .order('event_date', { ascending: false });

  if (error) {
    console.error('Error fetching event payouts:', error);
    return [];
  }
  return data || [];
}

export async function recordMemberPayment(
  payoutId: string,
  amount: number,
  member: { id: string; name: string },
  eventMeta: { client_name: string; event_name: string; event_date: string }
) {
  // Fetch current payout to calculate balance accurately
  let newBalance = 0;
  try {
    const { data: existing } = await supabase
      .from('team_event_payouts')
      .select('agreed_amount, paid_amount')
      .eq('id', payoutId)
      .maybeSingle();

    const agreed = Number(existing?.agreed_amount) || 0;
    newBalance = Math.max(0, agreed - Number(amount));
  } catch (_) {
    newBalance = 0;
  }

  // 1. Update team_event_payouts
  await supabase
    .from('team_event_payouts')
    .update({
      paid_amount: amount,
      balance_amount: newBalance,
      status: 'PAID',
      updated_at: new Date().toISOString()
    })
    .eq('id', payoutId);

  // 2. Automatically sync record into finance expenses table
  const expensePayload: any = {
    category: 'Crew & Freelancer Payout',
    title: `Crew Payout: ${member.name} (${eventMeta.client_name} - ${eventMeta.event_name})`,
    amount: amount,
    payment_mode: 'Direct Payout',
    payment_date: new Date().toISOString().split('T')[0],
    paid_to: member.name,
    team_member_id: member.id,
    team_member_name: member.name,
    status: 'paid',
    notes: `Auto-recorded from Team & Partners ledger for shoot on ${eventMeta.event_date}. Ref: ${payoutId}`
  };

  const { error: expErr } = await supabase.from('finance_expenses').insert([expensePayload]);
  if (expErr) {
    console.error('[teamPayoutService] Error syncing expense:', expErr);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
  }
}
