import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, listReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || 'default';

  const defaultQuota = 53687091200; // 50GB Starter
  let usedBytes = 0;

  try {
    // Try to aggregate actual video version file sizes
    const { data: versions } = await supabaseAdmin
      .from('review_video_versions')
      .select('file_size_bytes')
      .eq('workspace_id', workspaceId);

    if (versions && versions.length > 0) {
      usedBytes = versions.reduce((sum, v) => sum + (Number(v.file_size_bytes) || 0), 0);
    }
  } catch (_) {}

  if (usedBytes === 0) {
    const cachedVersions = listReviewCache('review_video_versions', (v: any) => v.workspace_id === workspaceId);
    usedBytes = cachedVersions.reduce((sum, v) => sum + (Number(v.file_size_bytes) || 0), 0);
  }

  // Quota configuration
  const quotas = readReviewCache('review_storage_quotas');
  const configured = quotas[workspaceId] || {
    quota_bytes: defaultQuota,
    tier_name: 'Starter (50GB)',
  };

  const totalQuota = configured.quota_bytes || defaultQuota;
  const availableBytes = Math.max(0, totalQuota - usedBytes);
  const percentage = Math.min(100, Math.round((usedBytes / totalQuota) * 100));

  return NextResponse.json({
    success: true,
    quota: {
      workspace_id: workspaceId,
      quota_bytes: totalQuota,
      used_bytes: usedBytes,
      available_bytes: availableBytes,
      percentage_used: percentage,
      tier_name: configured.tier_name,
      formatted_used: `${(usedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      formatted_total: `${(totalQuota / (1024 * 1024 * 1024)).toFixed(0)} GB`,
    },
  });
}
