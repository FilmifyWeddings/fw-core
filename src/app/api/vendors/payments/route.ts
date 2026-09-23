import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { syncTeamPaymentToExpensesAndAnalytics } from '@/lib/team-finance-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json();
    const {
      orderId,
      workspaceId = userId,
      partnerId,
      partnerName = 'Album Designer',
      amount,
      paymentMode = 'UPI',
      referenceNo = '',
      notes = '',
      autoSyncExpense = true
    } = body;

    if (!orderId || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'orderId and amount are required' }, { status: 400 });
    }

    const payAmount = Number(amount) || 0;

    // Fetch existing order
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('partner_album_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const totalAmount = Number(order.total_amount) || 0;
    const currentPaid = Number(order.paid_amount) || 0;
    const newPaid = Math.min(totalAmount, currentPaid + payAmount);
    const newBalance = Math.max(0, totalAmount - newPaid);
    const paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 
      newBalance === 0 && totalAmount > 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('partner_album_orders')
      .update({
        paid_amount: newPaid,
        balance_amount: newBalance,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Optional Expense Sync
    if (autoSyncExpense && payAmount > 0) {
      await syncTeamPaymentToExpensesAndAnalytics(workspaceId, {
        paymentType: 'Vendor Album Fee',
        memberName: partnerName,
        memberId: partnerId || order.partner_id,
        memberType: 'PARTNER',
        paidAmount: payAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMode,
        safeAssignmentId: orderId,
        notes: notes || `Album Design / Printing payment for ${order.client_name} (${order.album_type})`
      }).catch((e) => console.warn('[Vendor Payment] Expense sync warning:', e));
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error: any) {
    console.error('[API /vendors/payments POST error]:', error);
    return NextResponse.json({ error: error.message || 'Payment recording failed' }, { status: 500 });
  }
}
