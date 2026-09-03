/**
 * StudioCore Team Service
 * Provides guarded crew assignment payment updates and direct sync with Expenses & Analytics.
 */

import { 
  updateCrewAssignmentPayment, 
  syncTeamPaymentToExpensesAndAnalytics,
  fetchMemberFinancialSummary,
  fetchMemberEventPayouts,
  saveOrUpdateEventPayout,
  recordPayoutTransaction
} from '@/lib/team-finance-sync';
import { supabase } from '@/lib/supabase';

export async function insertExpenseSync(payload: {
  paymentType?: string;
  memberName: string;
  memberId?: string | null;
  memberType?: string;
  paidAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  safeAssignmentId: string;
  notes?: string;
  workspaceId?: string;
}) {
  const paymentDateFormatted = payload.paymentDate || new Date().toISOString().split('T')[0];

  const expensePayload = {
    title: `${payload.paymentType || 'Payout'} - ${payload.memberName}`,
    category: payload.memberType === 'partner' ? 'Lab & Printing Partner' : 'Crew & Team',
    amount: Number(payload.paidAmount),
    expense_date: paymentDateFormatted,
    date: paymentDateFormatted, // fallback for legacy schema
    payment_method: payload.paymentMethod || 'UPI / Bank Transfer',
    payment_status: 'PAID',
    recipient_type: payload.memberType || 'team_member',
    team_member_id: payload.memberId ? String(payload.memberId) : null,
    team_member_name: payload.memberName || '',
    reference_assignment_id: payload.safeAssignmentId,
    notes: payload.notes ? `Payment for ${payload.memberName}: ${payload.notes}` : `Disbursement to ${payload.memberName}`,
    ...(payload.workspaceId ? { workspace_id: payload.workspaceId } : {})
  };

  const { error: expError } = await supabase
    .from('expenses')
    .insert([expensePayload]);

  if (expError) {
    console.error('Auto-sync to expenses warning:', expError.message);
  }

  return { error: expError };
}

export {
  updateCrewAssignmentPayment,
  syncTeamPaymentToExpensesAndAnalytics,
  fetchMemberFinancialSummary,
  fetchMemberEventPayouts,
  saveOrUpdateEventPayout,
  recordPayoutTransaction
};
