import { NextRequest, NextResponse } from 'next/server';
import { getReviewPresignedUploadUrl, REVIEW_CDN_URL, REVIEW_BUCKET_NAME } from '@/lib/review/reviewStorage';
import { readReviewCache, writeReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, content_type, file_size_bytes, workspace_id, project_id } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400 });
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = cleanName.split('.').pop() || 'mp4';
    const key = `reviews/${workspace_id || 'general'}/${project_id || 'misc'}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const contentType = content_type || 'video/mp4';

    // Check workspace quota (default 50GB Starter = 53,687,091,200 bytes)
    const quotas = readReviewCache('review_storage_quotas');
    const wsId = workspace_id || 'default';
    const currentQuota = quotas[wsId] || {
      workspace_id: wsId,
      quota_bytes: 53687091200,
      used_bytes: 0,
      tier_name: 'Starter (50GB)',
    };

    const size = Number(file_size_bytes) || 0;
    if (currentQuota.used_bytes + size > currentQuota.quota_bytes) {
      return NextResponse.json({
        success: false,
        error: `Workspace storage quota exceeded (${Math.round(currentQuota.used_bytes / (1024*1024*1024))}GB / ${Math.round(currentQuota.quota_bytes / (1024*1024*1024))}GB used). Please upgrade storage tier or remove older versions.`,
      }, { status: 403 });
    }

    // Generate presigned upload URL
    const uploadUrl = await getReviewPresignedUploadUrl(key, contentType, 3600);

    // Calculate public / playback video URL
    const publicUrl = REVIEW_CDN_URL 
      ? `${REVIEW_CDN_URL.replace(/\/+$/, '')}/${key}`
      : `https://${REVIEW_BUCKET_NAME}.s3.eu-central-003.backblazeb2.com/${key}`;

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
