import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, readReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_id, video_id, version_id, workspace_id, client_name, client_email, decision, notes } = body;

    if (!project_id || !version_id || !client_name || !decision) {
      return NextResponse.json({ 
        success: false, 
        error: 'project_id, version_id, client_name, and decision (approved | changes_requested) are required' 
      }, { status: 400 });
    }

    const approvalId = crypto.randomUUID();
    const newApproval = {
      id: approvalId,
      project_id,
      video_id: video_id || null,
      version_id,
      workspace_id: workspace_id || null,
      client_name: client_name.trim(),
      client_email: (client_email || '').trim().toLowerCase(),
      decision,
      notes: notes?.trim() || '',
      created_at: new Date().toISOString(),
    };

    writeReviewCache('review_approvals', approvalId, newApproval);

    // Update version status
    const versions = readReviewCache('review_video_versions');
    if (versions[version_id]) {
      versions[version_id].status = decision;
      versions[version_id].updated_at = new Date().toISOString();
      writeReviewCache('review_video_versions', version_id, versions[version_id]);
    }

    // Update video status
    if (video_id) {
      const videos = readReviewCache('review_videos');
      if (videos[video_id]) {
        videos[video_id].status = decision;
        videos[video_id].updated_at = new Date().toISOString();
        writeReviewCache('review_videos', video_id, videos[video_id]);
      }
    }

    // Update project status if approved
    const projects = readReviewCache('review_projects');
    if (projects[project_id]) {
      projects[project_id].status = decision;
      projects[project_id].updated_at = new Date().toISOString();
      writeReviewCache('review_projects', project_id, projects[project_id]);
    }

    try {
      await supabaseAdmin.from('review_approvals').insert(newApproval);
      await supabaseAdmin.from('review_video_versions').update({ status: decision, updated_at: new Date().toISOString() }).eq('id', version_id);
      if (video_id) {
        await supabaseAdmin.from('review_videos').update({ status: decision, updated_at: new Date().toISOString() }).eq('id', video_id);
      }
      await supabaseAdmin.from('review_projects').update({ status: decision, updated_at: new Date().toISOString() }).eq('id', project_id);
    } catch (_) {}

    return NextResponse.json({ success: true, approval: newApproval });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
