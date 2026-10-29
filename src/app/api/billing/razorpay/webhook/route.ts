import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/razorpay/webhook
 * Listens for asynchronous payment events & Auto-Pay recurring debits from Razorpay:
 * - order.paid
 * - payment.captured
 * - subscription.charged (Nov 5 e-Mandate auto-debit)
 * - subscription.halted / subscription.cancelled
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify Webhook Signature if secret configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('[Razorpay Webhook]: Signature mismatch');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody || '{}');
    const eventType = event.event;
    const payload = event.payload || {};

    console.log(`[Razorpay Webhook Received]: Event ${eventType}`);

    switch (eventType) {
      // 1. One-time payment or Order paid
      case 'order.paid':
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        const notes = payment?.notes || {};
        const userId = notes.user_id;
        const planId = notes.plan_id;
        const billingCycle = notes.billing_cycle || 'monthly';
        const amountPaise = payment?.amount || 0;
        const amountRupees = Math.round(amountPaise / 100);

        if (userId && userId !== 'anonymous' && planId) {
          const durationDays = billingCycle === 'yearly' ? 365 : 30;
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('subscription_expires_at')
            .eq('id', userId)
            .maybeSingle();

          const now = Date.now();
          let baseTime = now;
          if (profile?.subscription_expires_at) {
            const currentExpiry = new Date(profile.subscription_expires_at).getTime();
            if (currentExpiry > now) baseTime = currentExpiry;
          }

          const newExpiry = new Date(baseTime + durationDays * 86400000);

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_plan: planId,
              subscription_tier: planId,
              subscription_status: 'active',
              subscription_expires_at: newExpiry.toISOString(),
              billing_cycle: billingCycle,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          // Generate sequential tax invoice
          const currentYear = new Date().getFullYear();
          const countRes = await supabaseAdmin
            .from('subscription_invoices')
            .select('id', { count: 'exact', head: true });
          const invoiceNumber = `SC-${currentYear}-${(countRes.count || 0) + 1001}`;

          const amountSubtotal = Math.round(amountRupees / 1.18);
          const taxAmount = amountRupees - amountSubtotal;

          await supabaseAdmin.from('subscription_invoices').insert({
            invoice_number: invoiceNumber,
            workspace_id: userId,
            plan_name: planId.toUpperCase(),
            amount_subtotal: amountSubtotal,
            tax_rate_percent: 18.00,
            tax_amount: taxAmount,
            amount_total: amountRupees,
            currency: 'INR',
            sac_code: '998315',
            payment_status: 'paid',
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id,
          });
        }
        break;
      }

      // 2. Auto-Pay Recurring Subscription Charged (5 Nov feature)
      case 'subscription.charged': {
        const sub = payload.subscription?.entity;
        const payment = payload.payment?.entity;
        const subId = sub?.id;
        const customerId = sub?.customer_id;

        // Find studio workspace with matching razorpay_customer_id or subId
        let { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, subscription_plan, subscription_expires_at, billing_cycle')
          .or(`razorpay_customer_id.eq.${customerId}`)
          .maybeSingle();

        if (profile) {
          const cycle = profile.billing_cycle || 'monthly';
          const durationDays = cycle === 'yearly' ? 365 : 30;
          const currentExpiry = profile.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : Date.now();
          const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
          const newExpiry = new Date(baseTime + durationDays * 86400000);

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_expires_at: newExpiry.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          console.log(`[Auto-Pay Renewed]: Studio ${profile.id} extended to ${newExpiry.toISOString()}`);
        }
        break;
      }

      // 3. Subscription Failed or Halted
      case 'subscription.halted':
      case 'subscription.paused': {
        const sub = payload.subscription?.entity;
        const customerId = sub?.customer_id;
        if (customerId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('razorpay_customer_id', customerId);
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook]: Unhandled event ${eventType}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('[Razorpay Webhook Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
