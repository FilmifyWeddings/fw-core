import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId, billingCycle = 'monthly', userId: explicitUserId } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: 'planId is required' }, { status: 400 });
    }

    // 1. Identify User Session
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

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, studio_name')
        .eq('id', userId)
        .maybeSingle();
      if (profile) {
        userEmail = profile.email || userEmail;
        studioName = profile.studio_name || studioName;
      }
    }

    // 2. Lookup Plan Specs (Dynamic DB first, static fallback)
    let planName = '';
    let priceRupees = 0;

    const { data: dbPlan } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (dbPlan) {
      planName = dbPlan.name;
      priceRupees = billingCycle === 'yearly' ? dbPlan.price_yearly : dbPlan.price_monthly;
    } else {
      const targetTier = SUBSCRIPTION_TIERS.find((t) => t.id === planId);
      if (!targetTier) {
        return NextResponse.json({ success: false, error: `Invalid planId: ${planId}` }, { status: 400 });
      }
      planName = targetTier.name;
      priceRupees = billingCycle === 'yearly' ? targetTier.priceYearly : targetTier.priceMonthly;
    }

    const amountPaise = priceRupees * 100;

    // 3. Razorpay Credentials
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // If live/test Razorpay keys are configured, create real Razorpay Order
    if (keyId && keySecret && !keyId.includes('placeholder')) {
      const authBasic = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authBasic}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
          notes: {
            plan_id: planId,
            billing_cycle: billingCycle,
            user_id: userId || 'anonymous',
            studio_name: studioName,
          },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok || !rzpData.id) {
        console.error('[Razorpay Order Error]:', rzpData);
        throw new Error(rzpData?.error?.description || 'Razorpay order creation failed');
      }

      return NextResponse.json({
        success: true,
        orderId: rzpData.id,
        amount: amountPaise,
        currency: 'INR',
        keyId,
        demoMode: false,
        plan: {
          id: planId,
          name: planName,
          priceRupees,
          billingCycle,
        },
        prefill: {
          email: userEmail,
          name: studioName,
        },
      });
    }

    // Demo/Sandbox fallback mode if Razorpay credentials are not yet saved
    const mockOrderId = `order_demo_${Date.now()}`;
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: 'rzp_test_mock_mode_active',
      demoMode: true,
      plan: {
        id: planId,
        name: planName,
        priceRupees,
        billingCycle,
      },
      prefill: {
        email: userEmail,
        name: studioName,
      },
      message: 'Demo mode active: Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live payments',
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize payment order' },
      { status: 500 }
    );
  }
}
