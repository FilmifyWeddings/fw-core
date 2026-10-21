import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, readReviewCache, listReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      video_id, project_id, workspace_id, source_type,
      video_url, original_file_url, storage_key, youtube_url,
      duration_seconds, resolution, file_size_bytes, changelog_notes, version_label
    } = body;

    if (!video_id || !project_id) {
      return NextResponse.json({ success: false, error: 'video_id and project_id are required' }, { status: 400 });
    }

    // Determine current version count
    let existingVersions = listReviewCache('review_video_versions', (v: any) => v.video_id === video_id);
    try {
      const { data } = await supabaseAdmin
        .from('review_video_versions')
        .select('*')
        .eq('video_id', video_id);
      if (data && data.length > 0) existingVersions = data;
    } catch (_) {}

    const nextVerNum = (existingVersions.length || 0) + 1;
    const finalLabel = version_label?.trim() || `V${nextVerNum}`;
    const isYouTube = source_type === 'youtube' || Boolean(youtube_url);
    const ytId = isYouTube ? (extractYouTubeId(youtube_url || video_url || '') || '') : null;

    const resolvedVideoUrl = isYouTube 
      ? `https://www.youtube.com/watch?v=${ytId}` 
      : (video_url || '');

    const resolvedThumbnail = isYouTube 
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
      : null;

    const versionId = crypto.randomUUID();
    const newVersion = {
      id: versionId,
      video_id,
      project_id,
      workspace_id: workspace_id || null,
      version_number: nextVerNum,
      version_label: finalLabel,
      source_type: isYouTube ? 'youtube' : 'upload',
      storage_key: storage_key || null,
      video_url: resolvedVideoUrl,
      original_file_url: original_file_url || (isYouTube ? null : resolvedVideoUrl),
      youtube_video_id: ytId,
      thumbnail_url: resolvedThumbnail,
      duration_seconds: Number(duration_seconds) || 0,
      resolution: resolution || (isYouTube ? '1080p' : 'HD'),
      file_size_bytes: Number(file_size_bytes) || 0,
      changelog_notes: changelog_notes?.trim() || `Version ${nextVerNum} revision`,
      status: 'in_review',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update video's current_version_id
    const videos = readReviewCache('review_videos');
    if (videos[video_id]) {
      videos[video_id].current_version_id = versionId;
      videos[video_id].updated_at = new Date().toISOString();
      writeReviewCache('review_videos', video_id, videos[video_id]);
    }
    writeReviewCache('review_video_versions', versionId, newVersion);

    try {
      await supabaseAdmin.from('review_video_versions').insert(newVersion);
      await supabaseAdmin
        .from('review_videos')
        .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
        .eq('id', video_id);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      version: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
