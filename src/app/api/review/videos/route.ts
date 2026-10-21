import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, deleteReviewCache, listReviewCache, readReviewCache } from '@/lib/review/reviewCache';

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
      project_id, workspace_id, title, category, source_type,
      video_url, original_file_url, storage_key, youtube_url,
      duration_seconds, resolution, file_size_bytes, changelog_notes
    } = body;

    if (!project_id || !title?.trim()) {
      return NextResponse.json({ success: false, error: 'project_id and title are required' }, { status: 400 });
    }

    const videoId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const isYouTube = source_type === 'youtube' || Boolean(youtube_url);
    const ytId = isYouTube ? (extractYouTubeId(youtube_url || video_url || '') || '') : null;

    if (isYouTube && !ytId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const resolvedVideoUrl = isYouTube 
      ? `https://www.youtube.com/watch?v=${ytId}` 
      : (video_url || '');

    const resolvedThumbnail = isYouTube 
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
      : null;

    // 1. Create Video Version 1
    const newVersion = {
      id: versionId,
      video_id: videoId,
      project_id,
      workspace_id: workspace_id || null,
      version_number: 1,
      version_label: 'V1',
      source_type: isYouTube ? 'youtube' : 'upload',
      storage_key: storage_key || null,
      video_url: resolvedVideoUrl,
      original_file_url: original_file_url || (isYouTube ? null : resolvedVideoUrl),
      youtube_video_id: ytId,
      thumbnail_url: resolvedThumbnail,
      duration_seconds: Number(duration_seconds) || 0,
      resolution: resolution || (isYouTube ? '1080p' : 'HD'),
      file_size_bytes: Number(file_size_bytes) || 0,
      changelog_notes: changelog_notes?.trim() || 'Initial cut uploaded',
      status: 'in_review',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Create Video Asset
    const newVideo = {
      id: videoId,
      project_id,
      workspace_id: workspace_id || null,
      title: title.trim(),
      category: category || 'Highlight Film',
      current_version_id: versionId,
      status: 'in_review',
      order_index: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Fallback cache
    writeReviewCache('review_video_versions', versionId, newVersion);
    writeReviewCache('review_videos', videoId, newVideo);

    // Update project cover thumbnail if not set
    const projects = readReviewCache('review_projects');
    if (projects[project_id] && !projects[project_id].cover_thumbnail_url && resolvedThumbnail) {
      projects[project_id].cover_thumbnail_url = resolvedThumbnail;
      writeReviewCache('review_projects', project_id, projects[project_id]);
    }

    // Supabase DB
    try {
      await supabaseAdmin.from('review_videos').insert(newVideo);
      await supabaseAdmin.from('review_video_versions').insert(newVersion);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      video: newVideo,
      version: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  deleteReviewCache('review_videos', id);
  try {
    await supabaseAdmin.from('review_videos').delete().eq('id', id);
  } catch (_) {}

  return NextResponse.json({ success: true });
}
