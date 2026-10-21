import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, writeReviewCache, deleteReviewCache, listReviewCache } from '@/lib/review/reviewCache';

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
  } catch (_) {}

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

    // Update in fallback cache
    const cachedProjects = readReviewCache('review_projects');
    if (cachedProjects[id]) {
      writeReviewCache('review_projects', id, { ...cachedProjects[id], ...updateData });
    }

    try {
      const { data } = await supabaseAdmin
        .from('review_projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (data) {
        return NextResponse.json({ success: true, project: data });
      }
    } catch (_) {}

    return NextResponse.json({ success: true, project: { ...cachedProjects[id], ...updateData } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteReviewCache('review_projects', id);
    try {
      await supabaseAdmin.from('review_projects').delete().eq('id', id);
    } catch (_) {}
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
