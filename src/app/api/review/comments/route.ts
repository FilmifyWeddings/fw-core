import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeReviewCache, deleteReviewCache, listReviewCache, readReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get('version_id');

  if (!versionId) {
    return NextResponse.json({ success: false, error: 'version_id required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('review_comments')
      .select('*')
      .eq('version_id', versionId)
      .order('timestamp_seconds', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ success: true, comments: data });
    }
  } catch (_) {}

  // Fallback cache
  const cached = listReviewCache('review_comments', (c: any) => c.version_id === versionId);
  cached.sort((a: any, b: any) => {
    if (a.timestamp_seconds !== b.timestamp_seconds) {
      return a.timestamp_seconds - b.timestamp_seconds;
    }
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  return NextResponse.json({ success: true, comments: cached, is_fallback: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      version_id, video_id, project_id, parent_comment_id,
      timestamp_seconds, author_name, author_email, author_role,
      content, is_internal, has_annotation, annotation_data 
    } = body;

    if (!version_id || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'version_id and content are required' }, { status: 400 });
    }

    const commentId = crypto.randomUUID();
    const newComment = {
      id: commentId,
      version_id,
      video_id: video_id || null,
      project_id: project_id || null,
      parent_comment_id: parent_comment_id || null,
      timestamp_seconds: Number(timestamp_seconds) || 0,
      author_name: (author_name || 'Reviewer').trim(),
      author_email: (author_email || '').trim().toLowerCase(),
      author_role: author_role || 'reviewer',
      content: content.trim(),
      is_resolved: false,
      is_internal: Boolean(is_internal),
      has_annotation: Boolean(has_annotation),
      annotation_data: annotation_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    writeReviewCache('review_comments', commentId, newComment);

    try {
      await supabaseAdmin.from('review_comments').insert(newComment);
    } catch (_) {}

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_resolved, content } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const comments = readReviewCache('review_comments');
    if (comments[id]) {
      if (typeof is_resolved === 'boolean') comments[id].is_resolved = is_resolved;
      if (typeof content === 'string') comments[id].content = content.trim();
      comments[id].updated_at = new Date().toISOString();
      writeReviewCache('review_comments', id, comments[id]);
    }

    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (typeof is_resolved === 'boolean') updatePayload.is_resolved = is_resolved;
      if (typeof content === 'string') updatePayload.content = content.trim();

      await supabaseAdmin.from('review_comments').update(updatePayload).eq('id', id);
    } catch (_) {}

    return NextResponse.json({ success: true, comment: comments[id] || { id, is_resolved, content } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  deleteReviewCache('review_comments', id);
  try {
    await supabaseAdmin.from('review_comments').delete().eq('id', id);
  } catch (_) {}

  return NextResponse.json({ success: true });
}
