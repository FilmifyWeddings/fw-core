import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, readReviewCache, listReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateSecureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const providedPasscode = searchParams.get('passcode');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
  }

  // 1. Find share record
  let share: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('review_shares')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (data) share = data;
  } catch (_) {}

  if (!share) {
    const shares = listReviewCache('review_shares', (s: any) => s.token === token);
    share = shares[0] || null;
  }

  if (!share) {
    return NextResponse.json({ success: false, error: 'Invalid or expired review link' }, { status: 404 });
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ success: false, error: 'This review link has expired' }, { status: 410 });
  }

  // Check passcode
  if (share.require_passcode && share.passcode) {
    if (!providedPasscode || providedPasscode.trim() !== share.passcode.trim()) {
      return NextResponse.json({
        success: false,
        requires_passcode: true,
        error: 'Passcode required to access this review project',
      }, { status: 401 });
    }
  }

  // Increment view count
  try {
    share.view_count = (share.view_count || 0) + 1;
    writeReviewCache('review_shares', share.id, share);
    await supabaseAdmin
      .from('review_shares')
      .update({ view_count: share.view_count })
      .eq('id', share.id);
  } catch (_) {}

  // 2. Fetch Project & Videos
  const projectId = share.project_id;
  let project: any = null;
  let videos: any[] = [];
  let versions: any[] = [];

  try {
    const { data: pData } = await supabaseAdmin.from('review_projects').select('*').eq('id', projectId).maybeSingle();
    if (pData) project = pData;

    const { data: vData } = await supabaseAdmin.from('review_videos').select('*').eq('project_id', projectId).order('order_index', { ascending: true });
    if (vData) videos = vData;

    const { data: verData } = await supabaseAdmin.from('review_video_versions').select('*').eq('project_id', projectId).order('version_number', { ascending: true });
    if (verData) versions = verData;
  } catch (_) {}

  if (!project) {
    project = readReviewCache('review_projects')[projectId];
    videos = listReviewCache('review_videos', (v: any) => v.project_id === projectId);
    versions = listReviewCache('review_video_versions', (v: any) => v.project_id === projectId);
  }

  if (!project) {
    return NextResponse.json({ success: false, error: 'Project no longer exists' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    share: {
      id: share.id,
      token: share.token,
      allow_comments: share.allow_comments,
      allow_approvals: share.allow_approvals,
      allow_downloads: share.allow_downloads,
    },
    project,
    videos,
    versions,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      project_id, workspace_id, allow_comments, allow_approvals, 
      allow_downloads, require_passcode, passcode, expires_at 
    } = body;

    if (!project_id) {
      return NextResponse.json({ success: false, error: 'project_id required' }, { status: 400 });
    }

    const shareId = crypto.randomUUID();
    const token = generateSecureToken();

    const newShare = {
      id: shareId,
      project_id,
      workspace_id: workspace_id || null,
      token,
      allow_comments: allow_comments ?? true,
      allow_approvals: allow_approvals ?? true,
      allow_downloads: allow_downloads ?? true,
      require_passcode: Boolean(require_passcode),
      passcode: passcode?.trim() || null,
      expires_at: expires_at || null,
      view_count: 0,
      created_at: new Date().toISOString(),
    };

    writeReviewCache('review_shares', shareId, newShare);

    try {
      await supabaseAdmin.from('review_shares').insert(newShare);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      share: newShare,
      share_url: `/r/${token}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
