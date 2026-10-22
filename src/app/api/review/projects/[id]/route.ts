import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, writeReviewCache, deleteReviewCache, listReviewCache } from '@/lib/review/reviewCache';
import { deleteReviewObjects, purgeReviewPrefix } from '@/lib/review/reviewStorage';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { data: project } = await supabaseAdmin
      .from('review_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (project) {
      const { data: videos } = await supabaseAdmin
        .from('review_videos')
        .select('*')
        .eq('project_id', id)
        .order('order_index', { ascending: true });

      const { data: versions } = await supabaseAdmin
        .from('review_video_versions')
        .select('*')
        .eq('project_id', id)
        .order('version_number', { ascending: true });

      const { data: shares } = await supabaseAdmin
        .from('review_shares')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Merge with fallback cache if DB has 0 videos but cache has them
      const cachedVideos = listReviewCache('review_videos', (v: any) => v.project_id === id);
      const cachedVersions = listReviewCache('review_video_versions', (v: any) => v.project_id === id);

      const finalVideos = (videos && videos.length > 0) ? videos : cachedVideos;
      const finalVersions = (versions && versions.length > 0) ? versions : cachedVersions;

      return NextResponse.json({
        success: true,
        project,
        videos: finalVideos,
        versions: finalVersions,
        shares: shares || [],
      });
    }
  } catch (err) {
    console.warn('[Review API] Single project fetch fallback:', err);
  }

  // Fallback to local cache
  const projects = readReviewCache('review_projects');
  const project = projects[id];

  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  const videos = listReviewCache('review_videos', (v: any) => v.project_id === id);
  const versions = listReviewCache('review_video_versions', (v: any) => v.project_id === id);
  const shares = listReviewCache('review_shares', (s: any) => s.project_id === id);

  return NextResponse.json({
    success: true,
    project,
    videos,
    versions,
    shares,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, client_name, client_email, status, cover_image_url } = body;

    const patch: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name.trim();
    if (client_name !== undefined) patch.client_name = client_name?.trim() || null;
    if (client_email !== undefined) patch.client_email = client_email?.trim() || null;
    if (status !== undefined) patch.status = status;
    if (cover_image_url !== undefined) patch.cover_image_url = cover_image_url;

    // Cache update
    const projects = readReviewCache('review_projects');
    if (projects[id]) {
      Object.assign(projects[id], patch);
      writeReviewCache('review_projects', id, projects[id]);
    }

    // Supabase DB update
    try {
      const { data, error } = await supabaseAdmin
        .from('review_projects')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, project: data });
      }
    } catch (_) {}

    return NextResponse.json({ success: true, project: projects[id] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // 1. Collect all storage keys to delete from Backblaze B2
    const storageKeys: string[] = [];
    let freedBytes = 0;
    let workspaceId: string | null = null;

    try {
      // Find project details to get workspace_id
      const { data: proj } = await supabaseAdmin
        .from('review_projects')
        .select('workspace_id')
        .eq('id', id)
        .maybeSingle();

      if (proj?.workspace_id) workspaceId = proj.workspace_id;

      // Find all videos for this project
      const { data: vids } = await supabaseAdmin
        .from('review_videos')
        .select('id, workspace_id')
        .eq('project_id', id);

      const videoIds = (vids || []).map(v => v.id);

      // Find all versions
      let vQuery = supabaseAdmin
        .from('review_video_versions')
        .select('id, storage_key, file_size_bytes, workspace_id');

      if (videoIds.length > 0) {
        vQuery = vQuery.or(`project_id.eq.${id},video_id.in.(${videoIds.join(',')})`);
      } else {
        vQuery = vQuery.eq('project_id', id);
      }

      const { data: versions } = await vQuery;

      if (versions && versions.length > 0) {
        for (const ver of versions) {
          if (ver.storage_key) {
            storageKeys.push(ver.storage_key);
            // Also include storyboard JSON
            const sbKey = `${ver.storage_key.replace(/\.[^.]+$/, '')}_storyboard.json`;
            storageKeys.push(sbKey);
          }
          freedBytes += Number(ver.file_size_bytes) || 0;
          if (ver.workspace_id && !workspaceId) workspaceId = ver.workspace_id;
        }
      }
    } catch (queryErr) {
      console.warn('[Review DB] Error querying versions for purge:', queryErr);
    }

    // Check cached versions too
    const cachedVersions = listReviewCache('review_video_versions', (v: any) => v.project_id === id);
    for (const ver of cachedVersions) {
      if (ver.storage_key && !storageKeys.includes(ver.storage_key)) {
        storageKeys.push(ver.storage_key);
        const sbKey = `${ver.storage_key.replace(/\.[^.]+$/, '')}_storyboard.json`;
        storageKeys.push(sbKey);
        freedBytes += Number(ver.file_size_bytes) || 0;
      }
    }

    // 2. Physical purge from Backblaze B2: Direct keys + folder prefixes (permanent versioned purge)
    if (storageKeys.length > 0) {
      console.log(`[Review Storage Purge] Instantly deleting ${storageKeys.length} files from Backblaze B2 for project ${id}...`);
      await deleteReviewObjects(storageKeys);
    }

    // Also purge whole folder prefixes to guarantee zero leftover files or delete markers in B2
    const prefixes = new Set<string>();
    if (workspaceId) prefixes.add(`reviews/${workspaceId}/${id}/`);
    prefixes.add(`reviews/general/${id}/`);
    storageKeys.forEach(k => {
      const lastSlash = k.lastIndexOf('/');
      if (lastSlash !== -1) {
        prefixes.add(k.substring(0, lastSlash + 1));
      }
    });

    for (const prefix of prefixes) {
      await purgeReviewPrefix(prefix);
    }

    // 3. Delete from Supabase Database explicitly
    try {
      await supabaseAdmin.from('review_comments').delete().eq('project_id', id);
      await supabaseAdmin.from('review_approvals').delete().eq('project_id', id);
      await supabaseAdmin.from('review_shares').delete().eq('project_id', id);
      await supabaseAdmin.from('review_video_versions').delete().eq('project_id', id);
      await supabaseAdmin.from('review_videos').delete().eq('project_id', id);
      await supabaseAdmin.from('review_projects').delete().eq('id', id);
    } catch (dbErr) {
      console.error('[Review DB] Failed to delete project records:', dbErr);
    }

    // 4. Update workspace quota if applicable
    if (workspaceId && freedBytes > 0) {
      try {
        const { data: quota } = await supabaseAdmin
          .from('review_storage_quotas')
          .select('used_bytes')
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (quota) {
          const newUsed = Math.max(0, (Number(quota.used_bytes) || 0) - freedBytes);
          await supabaseAdmin
            .from('review_storage_quotas')
            .update({ used_bytes: newUsed, updated_at: new Date().toISOString() })
            .eq('workspace_id', workspaceId);
        }
      } catch (_) {}
    }

    // 5. Clean local fallback caches
    deleteReviewCache('review_projects', id);
    for (const v of listReviewCache('review_videos', (x: any) => x.project_id === id)) {
      deleteReviewCache('review_videos', v.id);
    }
    for (const ver of cachedVersions) {
      deleteReviewCache('review_video_versions', ver.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Project and all associated media files permanently purged from storage instantly',
      purged_files_count: storageKeys.length,
      freed_bytes: freedBytes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
