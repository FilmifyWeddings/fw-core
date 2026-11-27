import { authFetchJson } from '@/lib/client-auth-fetch';

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
  referenceNo?: string;
  notes?: string;
  clientName?: string;
  eventName?: string;
  eventDate?: string;
}

/**
 * Saves crew assignment commercials atomically on the server via /api/assignments/commercials
 * (writes fw_assignments with all NOT NULL fields, team_event_payouts, tranches & studio_expenses).
 */
export async function saveCrewAssignmentCommercials(params: SaveCrewAssignmentCommercialsParams) {
  const effectiveWsId =
    params.workspaceId ||
    (typeof window !== 'undefined' ? localStorage.getItem('sc_active_workspace_id') || '' : '');

  const res = await authFetchJson('/api/assignments/commercials', {
    method: 'POST',
    body: JSON.stringify({
      action: 'assign',
      ...params,
      workspaceId: effectiveWsId,
    }),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('team_finance_updated', {
        detail: {
          memberId: params.member.id,
          assignmentId: res.assignmentId,
          agreedAmount: res.agreedAmount,
          paidAmount: res.advancePaid,
          balanceDue: res.balanceDue,
          payout: res.payout,
        },
      })
    );
    if ((Number(params.advancePaid) || 0) > 0) {
      window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
    }
  }

  return res;
}
