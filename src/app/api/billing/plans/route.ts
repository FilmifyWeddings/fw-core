import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/plans
 * Public endpoint to fetch dynamically configured pricing tiers & features.
 * Used by UpgradePlanModal, Pricing Page, and Studio Settings.
 */
export async function GET(req: NextRequest) {
  try {
    const { data: dbPlans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error || !dbPlans || dbPlans.length === 0) {
      // Fallback cleanly to hardcoded tiers
      return NextResponse.json({
        success: true,
        source: 'static_fallback',
        plans: SUBSCRIPTION_TIERS,
      });
    }

    const tiers: SubscriptionTier[] = dbPlans.map((p: any) => {
      const storageGB = Math.round((Number(p.storage_bytes_limit) || 0) / (1024 * 1024 * 1024));

      let features = p.features;
      if (Array.isArray(features)) {
        features = features.map((f: any) => {
          if (typeof f === 'string') {
            return { text: f, included: true, highlight: false };
          }
          return {
            text: f.text || '',
            included: f.included !== false,
            highlight: Boolean(f.highlight),
          };
        });
      } else {
        features = [];
      }

      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline || '',
        badge: p.badge || (p.id === 'pro' ? "Founder's Choice · Most Popular" : p.id === 'enterprise' ? 'Maximum Power' : undefined),
        popular: p.is_popular !== undefined ? Boolean(p.is_popular) : p.id === 'pro',
        priceMonthly: Number(p.price_monthly) || 0,
        priceYearly: Number(p.price_yearly) || 0,
        storageGB,
        teamSeats: Number(p.team_members_limit) || 1,
        eventsPerMonth: Number(p.events_per_month_limit) || 5,
        aiScans: Number(p.ai_face_scans_limit) || 1500,
        features,
      };
    });

    return NextResponse.json(
      { success: true, source: 'database', plans: tiers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.warn('[Billing Plans API Warning]:', err?.message);
    return NextResponse.json({
      success: true,
      source: 'static_error_fallback',
      plans: SUBSCRIPTION_TIERS,
    });
  }
}
