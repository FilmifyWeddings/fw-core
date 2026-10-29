import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/auth/super-admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sushant/admin/fw/plans
 * Fetches all subscription plans from DB. If empty, seeds with default tiers.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySuperAdminSession(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required' }, { status: 401 });
    }

    const { data: dbPlans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (error) {
      console.error('[Admin Plans GET DB Error]:', error);
      throw new Error(error.message);
    }

    // If table is empty or unseeded, seed defaults
    if (!dbPlans || dbPlans.length === 0) {
      const seedRows = SUBSCRIPTION_TIERS.map((tier) => ({
        id: tier.id,
        name: tier.name,
        tagline: tier.tagline,
        price_monthly: tier.priceMonthly,
        price_yearly: tier.priceYearly,
        storage_bytes_limit: tier.storageGB * 1024 * 1024 * 1024,
        team_members_limit: tier.teamSeats,
        events_per_month_limit: tier.eventsPerMonth,
        ai_face_scans_limit: tier.aiScans,
        features: tier.features,
        is_active: true,
      }));

      const { data: inserted, error: seedErr } = await supabaseAdmin
        .from('subscription_plans')
        .insert(seedRows)
        .select('*');

      if (!seedErr && inserted) {
        return NextResponse.json({ success: true, plans: inserted });
      }
    }

    // Format plans for admin UI
    const formattedPlans = (dbPlans || []).map((p: any) => {
      const storageGB = Math.round((Number(p.storage_bytes_limit) || 0) / (1024 * 1024 * 1024));
      
      // Features can be array of strings or array of objects
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
        badge: p.badge || (p.id === 'pro' ? "Founder's Choice · Most Popular" : p.id === 'enterprise' ? 'Maximum Power' : ''),
        popular: p.is_popular !== undefined ? Boolean(p.is_popular) : p.id === 'pro',
        priceMonthly: Number(p.price_monthly) || 0,
        priceYearly: Number(p.price_yearly) || 0,
        storageGB,
        teamSeats: Number(p.team_members_limit) || 1,
        eventsPerMonth: Number(p.events_per_month_limit) || 5,
        aiScans: Number(p.ai_face_scans_limit) || 1500,
        isActive: p.is_active !== false,
        features,
        updatedAt: p.updated_at,
      };
    });

    return NextResponse.json({ success: true, plans: formattedPlans });
  } catch (err: any) {
    console.error('[Admin Plans GET Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sushant/admin/fw/plans
 * Super Admin updates or creates a subscription plan in real time.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySuperAdminSession(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan } = body;

    if (!plan || !plan.id || !plan.name) {
      return NextResponse.json({ success: false, error: 'Valid plan object with id and name is required' }, { status: 400 });
    }

    const storageGB = Number(plan.storageGB) || 30;
    const storageBytes = storageGB * 1024 * 1024 * 1024;

    const rowToUpsert: Record<string, any> = {
      id: plan.id.toLowerCase().trim(),
      name: plan.name.trim(),
      tagline: plan.tagline || '',
      price_monthly: Math.max(0, Math.round(Number(plan.priceMonthly) || 0)),
      price_yearly: Math.max(0, Math.round(Number(plan.priceYearly) || 0)),
      storage_bytes_limit: storageBytes,
      team_members_limit: Math.max(1, Math.round(Number(plan.teamSeats) || 1)),
      events_per_month_limit: Math.max(1, Math.round(Number(plan.eventsPerMonth) || 1)),
      ai_face_scans_limit: Math.max(0, Math.round(Number(plan.aiScans) || 0)),
      features: Array.isArray(plan.features) ? plan.features : [],
      is_active: plan.isActive !== false,
      updated_at: new Date().toISOString(),
    };

    // Include badge & is_popular if columns exist, or fallback safely
    try {
      const { error: upsertErr } = await supabaseAdmin
        .from('subscription_plans')
        .upsert({
          ...rowToUpsert,
          badge: plan.badge || null,
          is_popular: Boolean(plan.popular),
        }, { onConflict: 'id' });

      if (upsertErr) {
        // If badge or is_popular column doesn't exist yet, retry without them
        if (upsertErr.message.includes('column') && (upsertErr.message.includes('badge') || upsertErr.message.includes('is_popular'))) {
          const { error: fallbackErr } = await supabaseAdmin
            .from('subscription_plans')
            .upsert(rowToUpsert, { onConflict: 'id' });
          if (fallbackErr) throw new Error(fallbackErr.message);
        } else {
          throw new Error(upsertErr.message);
        }
      }
    } catch (e: any) {
      const { error: fallbackErr } = await supabaseAdmin
        .from('subscription_plans')
        .upsert(rowToUpsert, { onConflict: 'id' });
      if (fallbackErr) throw new Error(fallbackErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully! Changes are live across all studio accounts.`,
      plan: {
        ...plan,
        storageGB,
      },
    });
  } catch (err: any) {
    console.error('[Admin Plans POST Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update plan' },
      { status: 500 }
    );
  }
}
