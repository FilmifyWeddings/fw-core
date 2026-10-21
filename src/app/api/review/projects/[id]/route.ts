import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, writeReviewCache, deleteReviewCache, listReviewCache } from '@/lib/review/reviewCache';
import { deleteReviewObjects } from '@/lib/review/reviewStorage';

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

      return NextResponse.json({
        success: true,
        project,
        videos: videos || [],
        versions: versions || [],
        shares: shares || [],
      });
    }
  } catch (err) {
    console.warn('[Review API] Single project fetch fallback:', err);
  }

  // Fallback cache
  const cachedProjects = readReviewCache('review_projects');
  const project = cachedProjects[id];

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
    is_fallback: true,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    const projects = readReviewCache('review_projects');
    if (projects[id]) {
      projects[id] = { ...projects[id], ...updateData };
      writeReviewCache('review_projects', id, projects[id]);
    }

    try {
      await supabaseAdmin.from('review_projects').update(updateData).eq('id', id);
    } catch (_) {}

    return NextResponse.json({ success: true, project: projects[id] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/review/projects/[id]
 * Permanently deletes the project, all database records, AND purges all stored video files from Backblaze B2!
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // 1. Gather all video version storage keys for this project to purge from Backblaze B2
    const storageKeys: string[] = [];
    let freedBytes = 0;
    let workspaceId: string | null = null;

    try {
      const { data: versions } = await supabaseAdmin
        .from('review_video_versions')
        .select('storage_key, file_size_bytes, workspace_id')
        .eq('project_id', id);

      if (versions && versions.length > 0) {
        for (const ver of versions) {
          if (ver.storage_key) storageKeys.push(ver.storage_key);
          freedBytes += Number(ver.file_size_bytes) || 0;
          if (ver.workspace_id && !workspaceId) workspaceId = ver.workspace_id;
        }
      }
    } catch (_) {}

    // Check cached versions too
    const cachedVersions = listReviewCache('review_video_versions', (v: any) => v.project_id === id);
    for (const ver of cachedVersions) {
      if (ver.storage_key && !storageKeys.includes(ver.storage_key)) {
        storageKeys.push(ver.storage_key);
        freedBytes += Number(ver.file_size_bytes) || 0;
      }
    }

    // 2. Physical purge from Backblaze B2
    if (storageKeys.length > 0) {
      console.log(`[Review Storage Purge] Deleting ${storageKeys.length} files from Backblaze B2 for project ${id}...`);
      await deleteReviewObjects(storageKeys);
    }

    // 3. Delete from Supabase Database (cascade will delete videos, versions, comments, shares, approvals)
    try {
      await supabaseAdmin.from('review_projects').delete().eq('id', id);
    } catch (dbErr) {
      console.error('[Review DB] Failed to delete project row:', dbErr);
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
      message: 'Project and all associated media files permanently purged from storage',
      purged_files_count: storageKeys.length,
      freed_bytes: freedBytes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
