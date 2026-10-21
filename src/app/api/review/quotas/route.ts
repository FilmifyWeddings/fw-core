import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, listReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawWsId = searchParams.get('workspace_id');
  const validWsId = isValidUUID(rawWsId) ? rawWsId : null;

  const ONE_GB = 1024 * 1024 * 1024; // 1,073,741,824 bytes
  const FIFTY_GB = 50 * ONE_GB;

  let totalQuota = ONE_GB; // Free Trial default 1 GB limit
  let tierName = 'Free Trial (1 GB)';
  let usedBytes = 0;

  try {
    // 1. Check workspace subscription tier in profiles
    if (validWsId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_plan')
        .eq('id', validWsId)
        .maybeSingle();

      if (profile?.subscription_plan && profile.subscription_plan !== 'trial' && profile.subscription_plan !== 'free') {
        totalQuota = FIFTY_GB;
        tierName = `${profile.subscription_plan.toUpperCase()} (50 GB)`;
      }
    }

    // 2. Aggregate actual video version file sizes
    let query = supabaseAdmin.from('review_video_versions').select('file_size_bytes');
    if (validWsId) {
      query = query.or(`workspace_id.eq.${validWsId},workspace_id.is.null`);
    }
    const { data: versions } = await query;
    if (versions && versions.length > 0) {
      usedBytes = versions.reduce((sum, v) => sum + (Number(v.file_size_bytes) || 0), 0);
    }
  } catch (err) {
    console.warn('[Review Quota API] DB calculate fallback:', err);
  }

  if (usedBytes === 0) {
    const cachedVersions = listReviewCache('review_video_versions');
    usedBytes = cachedVersions.reduce((sum, v) => sum + (Number(v.file_size_bytes) || 0), 0);
  }

  const availableBytes = Math.max(0, totalQuota - usedBytes);
  const percentage = Math.min(100, Math.round((usedBytes / totalQuota) * 100));

  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const totalMB = (totalQuota / (1024 * 1024)).toFixed(0);

  return NextResponse.json({
    success: true,
    quota: {
      workspace_id: validWsId || 'default',
      quota_bytes: totalQuota,
      used_bytes: usedBytes,
      available_bytes: availableBytes,
      percentage_used: percentage,
      tier_name: tierName,
      formatted_used: totalQuota <= ONE_GB ? `${usedMB} MB` : `${(usedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      formatted_total: totalQuota <= ONE_GB ? `${totalMB} MB (1 GB)` : `${(totalQuota / (1024 * 1024 * 1024)).toFixed(0)} GB`,
      is_trial: totalQuota <= ONE_GB,
    },
  });
}
