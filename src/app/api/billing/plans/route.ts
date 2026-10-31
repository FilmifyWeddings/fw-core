import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  SUBSCRIPTION_TIERS, 
  GALLERY_PLANS, 
  CRM_PLANS, 
  GALLERY_FEATURE_MATRIX, 
  CRM_FEATURE_MATRIX, 
  SubscriptionTier 
} from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/plans
 * Public endpoint to fetch dynamically configured pricing tiers & features.
 * Used by UpgradePlanModal, /pricing page, Homepage, and Studio Settings.
 */
export async function GET(req: NextRequest) {
  try {
    const { data: dbPlans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    let activeGalleryPlans = [...GALLERY_PLANS];
    let activeCrmPlans = [...CRM_PLANS];

    if (!error && dbPlans && dbPlans.length > 0) {
      // Merge DB customizations into static definitions
      dbPlans.forEach((dbRow: any) => {
        const rowId = String(dbRow.id || '').toLowerCase().trim();
        const isGallery = rowId.startsWith('gallery_') || dbRow.features?.category === 'gallery';
        
        const storageGB = Math.round((Number(dbRow.storage_bytes_limit) || 0) / (1024 * 1024 * 1024));
        let features = dbRow.features;
        if (Array.isArray(features)) {
          features = features.map((f: any) => {
            if (typeof f === 'string') return { text: f, included: true, highlight: false };
            return {
              text: f.text || '',
              included: f.included !== false,
              highlight: Boolean(f.highlight),
            };
          });
        }

        const tierPatch: Partial<SubscriptionTier> = {
          id: rowId,
          name: dbRow.name,
          tagline: dbRow.tagline || '',
          badge: dbRow.badge,
          popular: dbRow.is_popular !== undefined ? Boolean(dbRow.is_popular) : undefined,
          priceMonthly: Number(dbRow.price_monthly) || 0,
          priceYearly: Number(dbRow.price_yearly) || 0,
          storageGB: storageGB > 0 ? storageGB : undefined,
          teamSeats: Number(dbRow.team_members_limit) || undefined,
          eventsPerMonth: Number(dbRow.events_per_month_limit) || undefined,
          aiScans: Number(dbRow.ai_face_scans_limit) || undefined,
        };

        if (Array.isArray(features) && features.length > 0) {
          tierPatch.features = features;
        }

        if (isGallery) {
          const idx = activeGalleryPlans.findIndex((p) => p.id === rowId);
          if (idx >= 0) {
            activeGalleryPlans[idx] = { ...activeGalleryPlans[idx], ...tierPatch };
          } else {
            activeGalleryPlans.push({
              id: rowId,
              category: 'gallery',
              name: dbRow.name,
              tagline: dbRow.tagline || '',
              priceMonthly: Number(dbRow.price_monthly) || 0,
              priceYearly: Number(dbRow.price_yearly) || 0,
              storageGB: storageGB || 50,
              teamSeats: 2,
              aiScans: 5000,
              features: Array.isArray(features) ? features : [],
              ...tierPatch,
            } as SubscriptionTier);
          }
        } else {
          // CRM plan
          const idx = activeCrmPlans.findIndex((p) => p.id === rowId);
          if (idx >= 0) {
            activeCrmPlans[idx] = { ...activeCrmPlans[idx], ...tierPatch };
          } else {
            activeCrmPlans.push({
              id: rowId,
              category: 'crm',
              name: dbRow.name,
              tagline: dbRow.tagline || '',
              priceMonthly: Number(dbRow.price_monthly) || 0,
              priceYearly: Number(dbRow.price_yearly) || 0,
              storageGB: storageGB || 30,
              teamSeats: 5,
              aiScans: 1500,
              features: Array.isArray(features) ? features : [],
              ...tierPatch,
            } as SubscriptionTier);
          }
        }
      });
    }

    const allPlans = [...activeCrmPlans, ...activeGalleryPlans];

    return NextResponse.json(
      {
        success: true,
        source: error || !dbPlans?.length ? 'static_fallback' : 'database',
        plans: allPlans,
        galleryPlans: activeGalleryPlans,
        crmPlans: activeCrmPlans,
        galleryMatrix: GALLERY_FEATURE_MATRIX,
        crmMatrix: CRM_FEATURE_MATRIX,
        trialDurationDays: 14,
      },
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
      galleryPlans: GALLERY_PLANS,
      crmPlans: CRM_PLANS,
      galleryMatrix: GALLERY_FEATURE_MATRIX,
      crmMatrix: CRM_FEATURE_MATRIX,
      trialDurationDays: 14,
    });
  }
}
