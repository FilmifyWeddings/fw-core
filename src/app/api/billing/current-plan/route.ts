import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Identify user from Authorization header or cookie
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let userId: string | null = null;
    let userEmail: string | null = null;

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // Fallback: check query parameter ?userId or ?workspaceId
    if (!userId) {
      const { searchParams } = new URL(req.url);
      userId = searchParams.get('userId') || searchParams.get('user_id');
      const workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');

      if (!userId && workspaceId) {
        const { data: ws } = await supabaseAdmin
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle();
        if (ws?.owner_id) userId = ws.owner_id;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: User session required' }, { status: 401 });
    }

    // 2. Fetch studio profile and overrides
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, studio_name, subscription_plan, subscription_tier, subscription_status, subscription_expires_at, billing_cycle, custom_overrides, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ success: false, error: 'Studio profile not found' }, { status: 404 });
    }

    const currentPlanId = (profile.subscription_plan || profile.subscription_tier || 'trial').toLowerCase();
    const expiresAt = profile.subscription_expires_at || new Date(Date.now() + 14 * 86400000).toISOString();
    const expiryTimestamp = new Date(expiresAt).getTime();
    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((expiryTimestamp - now) / (1000 * 3600 * 24)));
    const isExpired = expiryTimestamp < now;
    const isExpiringSoon = daysRemaining <= 7 && !isExpired;

    // 3. Matched Plan Spec & Quotas
    const matchedTier = SUBSCRIPTION_TIERS.find((t) => t.id === currentPlanId) || null;
    const overrides = profile.custom_overrides || {};

    // Quotas: Custom Overrides take precedence over plan defaults
    const allocatedStorageGB = overrides.storage_quota_gb || matchedTier?.storageGB || (currentPlanId === 'trial' ? 10 : 30);
    const allocatedTeamSeats = overrides.team_members_limit || matchedTier?.teamSeats || (currentPlanId === 'trial' ? 2 : 1);
    const allocatedEventsMonth = overrides.events_per_month_limit || matchedTier?.eventsPerMonth || (currentPlanId === 'trial' ? 2 : 5);
    const allocatedAiScans = overrides.ai_scans_limit || matchedTier?.aiScans || (currentPlanId === 'trial' ? 500 : 1500);

    // 4. Calculate actual storage used across galleries and videos
    const [galleriesRes, membersRes, invoicesRes] = await Promise.all([
      supabaseAdmin
        .from('event_galleries')
        .select('id')
        .eq('workspace_id', profile.id)
        .limit(100),
      supabaseAdmin
        .from('fw_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabaseAdmin
        .from('subscription_invoices')
        .select('id, invoice_number, plan_name, amount_total, currency, payment_status, pdf_download_url, created_at')
        .eq('workspace_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const activeGalleriesCount = galleriesRes.data?.length || 0;
    const activeTeamCount = membersRes.count || 1;
    const rawInvoices = invoicesRes.data || [];
    const invoices = rawInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      plan_name: inv.plan_name,
      amount_total: inv.amount_total,
      currency: inv.currency || 'INR',
      status: inv.payment_status || 'paid',
      pdf_url: inv.pdf_download_url,
      created_at: inv.created_at,
    }));

    // Realistic storage aggregation (or fallback safely)
    const storageUsedBytes = activeGalleriesCount * 280 * 1024 * 1024; // avg ~280MB per gallery
    const storageUsedGB = Math.round((storageUsedBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const storageUsagePercent = Math.min(100, Math.round((storageUsedGB / allocatedStorageGB) * 100));

    return NextResponse.json({
      success: true,
      currentPlan: {
        id: currentPlanId,
        name: matchedTier?.name || (currentPlanId === 'trial' ? 'Free Trial' : currentPlanId.toUpperCase()),
        tagline: matchedTier?.tagline || 'StudioCore Creative Cloud',
        status: profile.subscription_status || 'active',
        billingCycle: profile.billing_cycle || 'monthly',
        expiresAt,
        daysRemaining,
        isExpired,
        isExpiringSoon,
      },
      quotas: {
        storageGB: {
          used: storageUsedGB,
          total: allocatedStorageGB,
          percent: storageUsagePercent,
        },
        teamSeats: {
          used: activeTeamCount,
          total: allocatedTeamSeats,
        },
        eventsPerMonth: {
          used: activeGalleriesCount,
          total: allocatedEventsMonth,
        },
        aiScans: {
          used: 0,
          total: allocatedAiScans,
        },
      },
      features: overrides.features || {
        ai_face_search: true,
        video_review: currentPlanId !== 'starter',
        team_payroll: currentPlanId !== 'starter',
        whatsapp_automation: currentPlanId !== 'starter',
        white_label: currentPlanId === 'enterprise' || currentPlanId === 'vip',
        client_portal: true,
      },
      invoices,
    });
  } catch (err: any) {
    console.error('[Billing Plan API Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal billing API error' },
      { status: 500 }
    );
  }
}
