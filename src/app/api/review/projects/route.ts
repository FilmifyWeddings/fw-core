import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, writeReviewCache, listReviewCache } from '@/lib/review/reviewCache';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    let query = supabaseAdmin.from('review_projects').select('*').order('updated_at', { ascending: false });
    if (workspaceId && workspaceId !== 'all') {
      query = query.eq('workspace_id', workspaceId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      let filtered = data;
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name?.toLowerCase().includes(term) || 
          p.client_name?.toLowerCase().includes(term)
        );
      }
      return NextResponse.json({ success: true, projects: filtered });
    }
  } catch (_) {}

  // Resilient fallback to local cache
  let cached = listReviewCache('review_projects');
  if (workspaceId && workspaceId !== 'all') {
    cached = cached.filter((p: any) => p.workspace_id === workspaceId);
  }
  if (status && status !== 'all') {
    cached = cached.filter((p: any) => p.status === status);
  }
  if (search) {
    const term = search.toLowerCase();
    cached = cached.filter((p: any) => 
      p.name?.toLowerCase().includes(term) || 
      p.client_name?.toLowerCase().includes(term)
    );
  }
  cached.sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

  return NextResponse.json({ success: true, projects: cached, is_fallback: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      workspace_id, name, description, client_id, client_name, client_email, 
      event_date, tags, cover_thumbnail_url 
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
    }

    const newProject = {
      id: crypto.randomUUID(),
      workspace_id: workspace_id || null,
      name: name.trim(),
      description: description?.trim() || '',
      client_id: client_id || null,
      client_name: client_name?.trim() || '',
      client_email: client_email?.trim() || '',
      event_date: event_date || null,
      status: 'in_review',
      cover_thumbnail_url: cover_thumbnail_url || null,
      tags: Array.isArray(tags) ? tags : ['Highlight Film'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mirror to fallback cache
    writeReviewCache('review_projects', newProject.id, newProject);

    // Save to Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from('review_projects')
        .insert(newProject)
        .select()
        .single();
      if (!error && data) {
        return NextResponse.json({ success: true, project: data });
      }
    } catch (_) {}

    return NextResponse.json({ success: true, project: newProject, is_fallback: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
