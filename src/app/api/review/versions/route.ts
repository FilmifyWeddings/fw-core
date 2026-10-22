import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, readReviewCache, listReviewCache, deleteReviewCache } from '@/lib/review/reviewCache';
import { deleteReviewObject } from '@/lib/review/reviewStorage';

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
      video_id, project_id, workspace_id, source_type,
      video_url, original_file_url, storage_key, youtube_url,
      duration_seconds, resolution, file_size_bytes, changelog_notes, changelogNotes, version_label
    } = body;

    if (!video_id || !project_id) {
      return NextResponse.json({ success: false, error: 'video_id and project_id are required' }, { status: 400 });
    }

    const validWsId = isValidUUID(workspace_id) ? workspace_id : null;

    // Determine current version count
    let existingVersions: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('review_video_versions')
        .select('*')
        .eq('video_id', video_id);
      if (data && data.length > 0) existingVersions = data;
    } catch (_) {}

    if (existingVersions.length === 0) {
      existingVersions = listReviewCache('review_video_versions', (v: any) => v.video_id === video_id);
    }

    const nextVerNum = (existingVersions.length || 0) + 1;
    const finalLabel = version_label?.trim() || `V${nextVerNum}`;
    const isYouTube = source_type === 'youtube' || Boolean(youtube_url);
    const ytId = isYouTube ? (extractYouTubeId(youtube_url || video_url || '') || '') : null;

    const resolvedVideoUrl = isYouTube 
      ? `https://www.youtube.com/watch?v=${ytId}` 
      : (video_url || (storage_key ? `/api/review/media?key=${encodeURIComponent(storage_key)}` : ''));

    const resolvedThumbnail = isYouTube 
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` 
      : null;

    const versionId = crypto.randomUUID();
    const newVersion = {
      id: versionId,
      video_id,
      project_id,
      workspace_id: validWsId,
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
      changelog_notes: (changelog_notes || changelogNotes || '').trim() || `Version ${nextVerNum} revision`,
      status: 'in_review',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update video's current_version_id in cache
    const videos = readReviewCache('review_videos');
    if (videos[video_id]) {
      videos[video_id].current_version_id = versionId;
      videos[video_id].updated_at = new Date().toISOString();
      writeReviewCache('review_videos', video_id, videos[video_id]);
    }
    writeReviewCache('review_video_versions', versionId, newVersion);

    // Supabase DB persistent insert
    try {
      const { error: verErr } = await supabaseAdmin.from('review_video_versions').insert(newVersion);
      if (verErr) {
        console.error('[Review DB] Version insert error:', verErr);
      }

      const { error: vidErr } = await supabaseAdmin
        .from('review_videos')
        .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
        .eq('id', video_id);
      if (vidErr) {
        console.error('[Review DB] Video current_version update error:', vidErr);
      }

      // Quota update for uploads
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
      console.error('[Review DB] Version insert exception:', dbErr);
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/review/versions
 * Permanently deletes a single version revision, its associated comments, approvals,
 * and physically purges the video file from Backblaze B2 storage immediately.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || searchParams.get('version_id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || body?.version_id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Version id parameter is required' }, { status: 400 });
    }

    // 1. Fetch the version from Supabase or Cache
    let version: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('review_video_versions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) version = data;
    } catch (_) {}

    if (!version) {
      const cached = readReviewCache('review_video_versions');
      version = cached[id];
    }

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version record not found' }, { status: 404 });
    }

    const { video_id, project_id, storage_key, file_size_bytes, workspace_id } = version;

    // 2. Permanently purge media from Backblaze B2 storage (all versions and delete markers)
    let keyToPurge = storage_key;
    if (!keyToPurge && (version.original_file_url || version.video_url)) {
      const url = version.original_file_url || version.video_url || '';
      const match = url.match(/[?&]key=([^&#]+)/) || url.match(/\/file\/[^\/]+\/(.+)$/);
      if (match) {
        try { keyToPurge = decodeURIComponent(match[1]); } catch (_) {}
      }
    }

    if (keyToPurge) {
      console.log(`[Review Version Purge] Purging video object from Backblaze B2: ${keyToPurge}...`);
      await deleteReviewObject(keyToPurge);

      const storyboardKey = `${keyToPurge.replace(/\.[^.]+$/, '')}_storyboard.json`;
      await deleteReviewObject(storyboardKey);
    }

    // 3. Delete comments & annotations for this version
    try {
      await supabaseAdmin.from('review_comments').delete().eq('version_id', id);
    } catch (err) {
      console.warn('[Review DB] Comments purge note:', err);
    }

    // 4. Delete approvals for this version
    try {
      await supabaseAdmin.from('review_approvals').delete().eq('version_id', id);
    } catch (err) {
      console.warn('[Review DB] Approvals purge note:', err);
    }

    // 5. Delete the version record from review_video_versions
    try {
      await supabaseAdmin.from('review_video_versions').delete().eq('id', id);
    } catch (err) {
      console.error('[Review DB] Failed to delete version record:', err);
    }
    deleteReviewCache('review_video_versions', id);

    // 6. Find remaining versions for this video to re-assign current_version_id
    let remainingVersions: any[] = [];
    try {
      const { data: rem } = await supabaseAdmin
        .from('review_video_versions')
        .select('*')
        .eq('video_id', video_id)
        .order('version_number', { ascending: false });

      if (rem) remainingVersions = rem;
    } catch (_) {}

    if (remainingVersions.length === 0) {
      remainingVersions = listReviewCache('review_video_versions', (v: any) => v.video_id === video_id)
        .filter((v: any) => v.id !== id);
    }

    const nextCurrentVersionId = remainingVersions.length > 0 ? remainingVersions[0].id : null;

    // 7. Update parent video current_version_id
    try {
      await supabaseAdmin
        .from('review_videos')
        .update({
          current_version_id: nextCurrentVersionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', video_id);

      const videos = readReviewCache('review_videos');
      if (videos[video_id]) {
        videos[video_id].current_version_id = nextCurrentVersionId;
        videos[video_id].updated_at = new Date().toISOString();
        writeReviewCache('review_videos', video_id, videos[video_id]);
      }
    } catch (vidErr) {
      console.error('[Review DB] Failed to update video current version:', vidErr);
    }

    // 8. Deduct freed bytes from workspace quota
    if (workspace_id && Number(file_size_bytes) > 0) {
      try {
        const { data: q } = await supabaseAdmin
          .from('review_storage_quotas')
          .select('used_bytes')
          .eq('workspace_id', workspace_id)
          .maybeSingle();

        if (q) {
          const newUsed = Math.max(0, (Number(q.used_bytes) || 0) - Number(file_size_bytes));
          await supabaseAdmin
            .from('review_storage_quotas')
            .update({ used_bytes: newUsed, updated_at: new Date().toISOString() })
            .eq('workspace_id', workspace_id);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Version cut, comments, and media permanently purged from storage',
      deleted_version_id: id,
      next_active_version_id: nextCurrentVersionId,
      remaining_versions: remainingVersions,
    });

  } catch (err: any) {
    console.error('[Review Version Delete Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
