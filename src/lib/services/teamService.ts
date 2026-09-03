/**
 * StudioCore Team Service
 * Provides guarded crew assignment payment updates and dual-sync with Expenses & Analytics.
 */

import { 
  updateCrewAssignmentPayment, 
  syncTeamPaymentToExpensesAndAnalytics,
  fetchMemberFinancialSummary,
  fetchMemberEventPayouts,
  saveOrUpdateEventPayout,
  recordPayoutTransaction
} from '@/lib/team-finance-sync';

export {
  updateCrewAssignmentPayment,
  syncTeamPaymentToExpensesAndAnalytics,
  fetchMemberFinancialSummary,
  fetchMemberEventPayouts,
  saveOrUpdateEventPayout,
  recordPayoutTransaction
};
