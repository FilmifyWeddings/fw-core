import { deleteReviewObjects } from '@/lib/review/reviewStorage';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, deleteReviewCache, listReviewCache, readReviewCache } from '@/lib/review/reviewCache';

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
      duration_seconds, resolution, file_size_bytes, changelog_notes, thumbnail_url
    } = body;

    if (!project_id || !title?.trim()) {
      return NextResponse.json({ success: false, error: 'project_id and title are required' }, { status: 400 });
    }

    const videoId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const validWsId = isValidUUID(workspace_id) ? workspace_id : null;

    const isYouTube = source_type === 'youtube' || Boolean(youtube_url);
    const ytId = isYouTube ? (extractYouTubeId(youtube_url || video_url || '') || '') : null;

    if (isYouTube && !ytId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL provided' }, { status: 400 });
    }

    const resolvedVideoUrl = isYouTube 
      ? `https://www.youtube.com/watch?v=${ytId}` 
      : (video_url || (storage_key ? `/api/review/media?key=${encodeURIComponent(storage_key)}` : ''));

    const resolvedThumbnail = isYouTube 
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
      : (thumbnail_url || null);

    // 1. Create Video Version 1
    const newVersion = {
      id: versionId,
      video_id: videoId,
      project_id,
      workspace_id: validWsId,
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

    // Sequential order_index calculation (PostgreSQL INT32-safe)
    let nextOrder = 1;
    try {
      const { count } = await supabaseAdmin
        .from('review_videos')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id);
      if (typeof count === 'number' && !isNaN(count)) {
        nextOrder = count + 1;
      }
    } catch (_) {
      nextOrder = Math.floor(Date.now() / 1000) % 1000000;
    }

    // 2. Create Video Asset
    const newVideo = {
      id: videoId,
      project_id,
      workspace_id: validWsId,
      title: title.trim(),
      category: category || 'Highlight Film',
      current_version_id: versionId,
      status: 'in_review',
      order_index: nextOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Fallback cache write
    writeReviewCache('review_video_versions', versionId, newVersion);
    writeReviewCache('review_videos', videoId, newVideo);

    // Update project cover thumbnail if not already set
    const projects = readReviewCache('review_projects');
    if (projects[project_id] && !projects[project_id].cover_thumbnail_url && resolvedThumbnail) {
      projects[project_id].cover_thumbnail_url = resolvedThumbnail;
      writeReviewCache('review_projects', project_id, projects[project_id]);
    }

    // Supabase DB persistent insert
    try {
      const { error: vErr } = await supabaseAdmin.from('review_videos').insert(newVideo);
      if (vErr) {
        console.error('[Review DB] Video insert error:', vErr);
      }

      const { error: verErr } = await supabaseAdmin.from('review_video_versions').insert(newVersion);
      if (verErr) {
        console.error('[Review DB] Version insert error:', verErr);
      }

      if (resolvedThumbnail) {
        await supabaseAdmin
          .from('review_projects')
          .update({ cover_thumbnail_url: resolvedThumbnail, updated_at: new Date().toISOString() })
          .eq('id', project_id)
          ;
      }

      // Update storage quota used_bytes for uploads
      if (validWsId && !isYouTube && Number(file_size_bytes) > 0) {
        const { data: q } = await supabaseAdmin.from('review_storage_quotas').select('used_bytes').eq('workspace_id', validWsId).maybeSingle();
        if (q) {
          await supabaseAdmin
            .from('review_storage_quotas')
            .update({ used_bytes: (Number(q.used_bytes) || 0) + Number(file_size_bytes), updated_at: new Date().toISOString() })
            .eq('workspace_id', validWsId);
        }
      }
    } catch (dbErr) {
      console.error('[Review DB] Video insert exception:', dbErr);
    }

    return NextResponse.json({
      success: true,
      video: newVideo,
      version: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/review/videos
 * Deletes a video asset, all its revisions, and purges all media files from Backblaze B2
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    const storageKeys: string[] = [];

    // Find all versions of this video
    const { data: versions } = await supabaseAdmin
      .from('review_video_versions')
      .select('id, storage_key, project_id, workspace_id')
      .eq('video_id', id);

    if (versions && versions.length > 0) {
      for (const ver of versions) {
        if (ver.storage_key) {
          storageKeys.push(ver.storage_key);
          storageKeys.push(`${ver.storage_key.replace(/\.[^.]+$/, '')}_storyboard.json`);
        }
      }
    }

    // Purge files from Backblaze B2 immediately
    if (storageKeys.length > 0) {
      await deleteReviewObjects(storageKeys);
    }

    // Delete from DB (cascade deletes comments and versions)
    await supabaseAdmin.from('review_comments').delete().eq('video_id', id);
    await supabaseAdmin.from('review_video_versions').delete().eq('video_id', id);
    await supabaseAdmin.from('review_videos').delete().eq('id', id);

    deleteReviewCache('review_videos', id);
    if (versions) {
      for (const v of versions) {
        deleteReviewCache('review_video_versions', v.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Video deleted and storage purged' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
