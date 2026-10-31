import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      billingCycle = 'monthly',
      userId: explicitUserId,
      demo = false,
    } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: 'planId is required' }, { status: 400 });
    }

    // 1. Identify User
    let userId: string | null = explicitUserId || null;
    let userEmail = 'studio@studiocore.in';
    let studioName = 'StudioCore Workspace';

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email || userEmail;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User session required' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, studio_name, subscription_expires_at, custom_overrides')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      userEmail = profile.email || userEmail;
      studioName = profile.studio_name || studioName;
    }

    // 2. Validate Tier (Dynamic DB first, static fallback)
    let planName = '';
    let priceRupees = 0;
    let planStorageGB = 30;
    let planTeamSeats = 1;
    let planEventsPerMonth = 5;
    let planAiScans = 1500;

    const { data: dbPlan } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (dbPlan) {
      planName = dbPlan.name;
      priceRupees = billingCycle === 'yearly' ? dbPlan.price_yearly : dbPlan.price_monthly;
      planStorageGB = Math.round((Number(dbPlan.storage_bytes_limit) || 0) / (1024 * 1024 * 1024)) || 30;
      planTeamSeats = Number(dbPlan.team_members_limit) || 1;
      planEventsPerMonth = Number(dbPlan.events_per_month_limit) || 5;
      planAiScans = Number(dbPlan.ai_face_scans_limit) || 1500;
    } else {
      const targetTier = SUBSCRIPTION_TIERS.find((t) => t.id === planId);
      if (!targetTier) {
        return NextResponse.json({ success: false, error: `Invalid planId: ${planId}` }, { status: 400 });
      }
      planName = targetTier.name;
      priceRupees = billingCycle === 'yearly'
        ? targetTier.priceYearly
        : billingCycle === '6months'
        ? (targetTier.price6Months || Math.round(targetTier.priceYearly / 2))
        : targetTier.priceMonthly;
      planStorageGB = targetTier.storageGB || 30;
      planTeamSeats = targetTier.teamSeats || 1;
      planEventsPerMonth = typeof targetTier.events === 'number' ? targetTier.events : (targetTier.eventsPerMonth || 5);
      planAiScans = targetTier.aiScans || 1500;
    }

    // 3. Signature Verification (if live keys present)
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const isLive = Boolean(keySecret && !demo && razorpay_order_id && razorpay_payment_id && razorpay_signature);

    if (isLive) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const expectedSignature = hmac.digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: 'Payment signature verification failed' },
          { status: 400 }
        );
      }
    }

    // 4. Calculate Expiry Date (Stack onto remaining days if active)
    const now = Date.now();
    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    const durationMs = durationDays * 86400000;

    let baseTime = now;
    if (profile?.subscription_expires_at) {
      const currentExpiry = new Date(profile.subscription_expires_at).getTime();
      if (currentExpiry > now) {
        baseTime = currentExpiry; // Add onto current active subscription
      }
    }
    const newExpiresAt = new Date(baseTime + durationMs);

    // 5. Update Profile with Plan & Limits
    const updatedOverrides = {
      ...(profile?.custom_overrides || {}),
      storage_quota_gb: profile?.custom_overrides?.storage_quota_gb || planStorageGB,
      team_members_limit: profile?.custom_overrides?.team_members_limit || planTeamSeats,
      events_per_month_limit: profile?.custom_overrides?.events_per_month_limit || planEventsPerMonth,
      ai_scans_limit: profile?.custom_overrides?.ai_scans_limit || planAiScans,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: planId,
        subscription_tier: planId,
        subscription_status: 'active',
        subscription_expires_at: newExpiresAt.toISOString(),
        billing_cycle: billingCycle,
        custom_overrides: updatedOverrides,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('[Verify Payment Profile Update Error]:', updateErr);
      throw new Error(updateErr.message);
    }

    // 6. Record in subscriptions table
    const { data: subRecord, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        workspace_id: userId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        amount_paid_inr: priceRupees,
        current_period_start: new Date(baseTime).toISOString(),
        current_period_end: newExpiresAt.toISOString(),
        razorpay_subscription_id: razorpay_order_id || `demo_order_${Date.now()}`,
        payment_method: 'UPI_OR_CARD',
        last_payment_date: new Date().toISOString(),
        next_billing_date: newExpiresAt.toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (subErr) {
      console.warn('[Verify Payment Subscription Insert Warning]:', subErr.message);
    }

    // 7. Generate GST Compliant Sequential Invoice
    const currentYear = new Date().getFullYear();
    const countRes = await supabaseAdmin
      .from('subscription_invoices')
      .select('id', { count: 'exact', head: true });
    const invoiceSeq = (countRes.count || 0) + 1001;
    const invoiceNumber = `SC-${currentYear}-${invoiceSeq}`;

    // 18% GST Breakdown (SAC 998315)
    const amountSubtotal = Math.round(priceRupees / 1.18);
    const taxAmount = priceRupees - amountSubtotal;

    const { error: invErr } = await supabaseAdmin
      .from('subscription_invoices')
      .insert({
        invoice_number: invoiceNumber,
        workspace_id: userId,
        subscription_id: subRecord?.id || null,
        plan_name: planName,
        amount_subtotal: amountSubtotal,
        tax_rate_percent: 18.00,
        tax_amount: taxAmount,
        amount_total: priceRupees,
        currency: 'INR',
        sac_code: '998315',
        customer_name: studioName,
        customer_email: userEmail,
        studio_name: studioName,
        payment_status: 'paid',
        razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
        razorpay_order_id: razorpay_order_id || `ord_${Date.now()}`,
      });

    if (invErr) {
      console.warn('[Verify Payment Invoice Insert Warning]:', invErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planName}!`,
      plan: {
        id: planId,
        name: planName,
        billingCycle,
        expiresAt: newExpiresAt.toISOString(),
        daysRemaining: Math.ceil((newExpiresAt.getTime() - now) / 86400000),
      },
      invoice: {
        invoiceNumber,
        amountTotal: priceRupees,
        sacCode: '998315',
      },
    });
  } catch (err: any) {
    console.error('[Verify Payment API Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Payment verification processing error' },
      { status: 500 }
    );
  }
}
