import { NextRequest, NextResponse } from 'next/server';
import { getReviewPresignedUploadUrl, REVIEW_BUCKET_NAME } from '@/lib/review/reviewStorage';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, content_type, file_size_bytes, workspace_id, project_id } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400 });
    }

    const validWsId = isValidUUID(workspace_id) ? workspace_id : null;
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = cleanName.split('.').pop() || 'mp4';
    const key = `reviews/${validWsId || 'general'}/${project_id || 'misc'}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const contentType = content_type || 'video/mp4';

    // 1 GB Free Trial limit enforcement (1,073,741,824 bytes)
    const ONE_GB = 1024 * 1024 * 1024;
    let quotaLimit = ONE_GB;

    if (validWsId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_plan')
          .eq('id', validWsId)
          .maybeSingle();

        if (profile?.subscription_plan && profile.subscription_plan !== 'trial' && profile.subscription_plan !== 'free') {
          quotaLimit = 50 * ONE_GB; // 50GB for paid tiers
        }
      } catch (_) {}
    }

    // Check existing used bytes
    let usedBytes = 0;
    try {
      let query = supabaseAdmin.from('review_video_versions').select('file_size_bytes');
      if (validWsId) query = query.or(`workspace_id.eq.${validWsId},workspace_id.is.null`);
      const { data: versions } = await query;
      if (versions && versions.length > 0) {
        usedBytes = versions.reduce((sum, v) => sum + (Number(v.file_size_bytes) || 0), 0);
      }
    } catch (_) {}

    const uploadSize = Number(file_size_bytes) || 0;
    if (usedBytes + uploadSize > quotaLimit) {
      const isTrial = quotaLimit <= ONE_GB;
      const limitText = isTrial ? '1 GB (Free Trial Account Limit)' : `${(quotaLimit / (1024*1024*1024)).toFixed(0)} GB`;
      return NextResponse.json({
        success: false,
        error: `Storage quota exceeded. Your current limit is ${limitText}. Used: ${(usedBytes / (1024*1024)).toFixed(1)} MB. Please upgrade your subscription or delete older project files from Backblaze B2.`,
      }, { status: 403 });
    }

    // Generate direct Backblaze B2 presigned upload URL
    const uploadUrl = await getReviewPresignedUploadUrl(key, contentType, 7200);

    // Playback media streaming route
    const publicUrl = `/api/review/media?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      success: true,
      key,
      upload_url: uploadUrl,
      public_url: publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
