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
      partnerName = 'Team Specialist',
      totalAmount,
      paidAmount,
      amount,
      isFullPaid,
      category,
      paymentMode = 'UPI',
      paymentDate = new Date().toISOString().split('T')[0],
      referenceNo = '',
      notes = '',
      autoSyncExpense = true
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Fetch existing order or create placeholder
    let { data: order, error: fetchErr } = await supabaseAdmin
      .from('partner_album_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      const orderCat = category || (orderId.startsWith('shoot_') ? 'shoot' : (orderId.includes('video') ? 'video_editing' : (orderId.includes('photo') ? 'photo_editing' : 'photo_editing')));
      const placeholder = {
        id: orderId,
        workspace_id: workspaceId,
        partner_id: partnerId || 'unknown',
        partner_name: partnerName,
        client_name: 'Valued Couple',
        album_type: 'Assignment Order',
        category: orderCat,
        total_amount: Number(totalAmount) || 0,
        paid_amount: 0,
        balance_amount: Number(totalAmount) || 0,
        order_status: 'In Progress',
        payment_status: 'PENDING',
        order_date: new Date().toISOString().split('T')[0],
        comments: []
      };
      const { data: created } = await supabaseAdmin
        .from('partner_album_orders')
        .insert(placeholder)
        .select()
        .single();
      order = created;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found and could not be initialized' }, { status: 404 });
    }

    // Determine target agreed Done Price
    const donePrice = totalAmount !== undefined ? Number(totalAmount) : (Number(order.total_amount) || 0);

    let newPaid = 0;
    if (isFullPaid) {
      newPaid = donePrice;
    } else if (paidAmount !== undefined) {
      newPaid = Math.max(0, Number(paidAmount));
    } else if (amount !== undefined) {
      const currentPaid = Number(order.paid_amount) || 0;
      newPaid = Math.max(0, currentPaid + Number(amount));
    } else {
      newPaid = Number(order.paid_amount) || 0;
    }

    const newBalance = Math.max(0, donePrice - newPaid);
    const paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 
      newBalance === 0 && donePrice > 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

    const updatePayload: any = {
      total_amount: donePrice,
      paid_amount: newPaid,
      balance_amount: newBalance,
      payment_status: paymentStatus,
      notes: notes || order.notes || undefined,
      updated_at: new Date().toISOString()
    };
    if (category) {
      updatePayload.category = category;
    }

    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('partner_album_orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Bi-Directional Sync: post_production_deliverables
    const delivId = order.deliverable_id || (orderId.startsWith('order_deliv_') ? orderId.replace('order_', '') : (orderId.startsWith('deliv_') ? orderId : ''));
    if (delivId) {
      try {
        await supabaseAdmin.from('post_production_deliverables').update({
          agreed_amount: donePrice,
          paid_amount: newPaid,
          balance_amount: newBalance,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        }).eq('id', delivId);
      } catch (delivSyncErr) {
        console.warn('[Payments API] post_production_deliverables sync error:', delivSyncErr);
      }
    }

    // Bi-Directional Sync: fw_assignments
    const assignId = order.assignment_id || (orderId.startsWith('shoot_assign_') ? orderId.replace('shoot_assign_', '') : (orderId.startsWith('shoot_') && !orderId.includes('payout') ? orderId.replace('shoot_', '') : ''));
    if (assignId) {
      try {
        await supabaseAdmin.from('fw_assignments').update({
          agreed_amount: donePrice,
          paid_amount: newPaid,
          advance_amount: newPaid,
          balance_amount: newBalance,
          payment_status: paymentStatus === 'PAID' ? 'completed' : paymentStatus === 'PARTIAL' ? 'partial' : 'pending',
          payment_method: paymentMode,
          payment_date: paymentDate,
          notes: notes || undefined,
          updated_at: new Date().toISOString()
        }).eq('id', assignId);
      } catch (assignSyncErr) {
        console.warn('[Payments API] fw_assignments sync error:', assignSyncErr);
      }
    }

    // Bi-Directional Sync: team_event_payouts
    const payoutId = order.payout_id || (orderId.startsWith('shoot_payout_') ? orderId.replace('shoot_payout_', '') : '');
    if (payoutId) {
      try {
        await supabaseAdmin.from('team_event_payouts').update({
          agreed_amount: donePrice,
          paid_amount: newPaid,
          balance_amount: newBalance,
          status: paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
          payment_method: paymentMode,
          payment_date: paymentDate,
          notes: notes || undefined,
          updated_at: new Date().toISOString()
        }).eq('id', payoutId);
      } catch (payoutSyncErr) {
        console.warn('[Payments API] team_event_payouts sync error:', payoutSyncErr);
      }
    }

    // Optional Expense Sync
    if (autoSyncExpense && newPaid > 0) {
      const priorPaid = Number(order.paid_amount) || 0;
      const logAmount = (newPaid > priorPaid) ? (newPaid - priorPaid) : newPaid;
      const currentCategory = category || order.category;
      await syncTeamPaymentToExpensesAndAnalytics(workspaceId, {
        paymentType: currentCategory === 'shoot' 
          ? 'Freelance Shoot Payout' 
          : currentCategory === 'photo_editing'
          ? 'Photo Editing Fee'
          : currentCategory === 'video_editing'
          ? 'Video Editing Fee'
          : 'Vendor Album Fee',
        memberName: partnerName || order.partner_name,
        memberId: partnerId || order.partner_id,
        memberType: currentCategory === 'shoot' ? 'FREELANCER' : 'PARTNER',
        paidAmount: logAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMode,
        safeAssignmentId: orderId,
        notes: notes || `Payment for ${order.client_name} (${order.event_name || order.album_type || 'Task'})`
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
