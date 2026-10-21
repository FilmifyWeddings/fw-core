import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readReviewCache, writeReviewCache, listReviewCache } from '@/lib/review/reviewCache';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawWorkspaceId = searchParams.get('workspace_id');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const validWsId = isValidUUID(rawWorkspaceId) ? rawWorkspaceId : null;

  try {
    let query = supabaseAdmin.from('review_projects').select('*').order('updated_at', { ascending: false });

    if (validWsId) {
      query = query.or(`workspace_id.eq.${validWsId},workspace_id.is.null`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
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
  } catch (err) {
    console.warn('[Review API] Projects fetch error, falling back to cache:', err);
  }

  // Resilient fallback to local cache
  let cached = listReviewCache('review_projects');
  if (validWsId) {
    cached = cached.filter((p: any) => !p.workspace_id || p.workspace_id === validWsId);
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
    const { name, description, client_name, client_email, event_date, workspace_id, tags } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 });
    }

    const projectId = crypto.randomUUID();
    const validWsId = isValidUUID(workspace_id) ? workspace_id : null;

    const newProject = {
      id: projectId,
      workspace_id: validWsId,
      name: name.trim(),
      description: description?.trim() || null,
      client_name: client_name?.trim() || null,
      client_email: client_email?.trim() || null,
      event_date: event_date || null,
      status: 'in_review',
      cover_thumbnail_url: null,
      assigned_team_member_ids: [],
      tags: Array.isArray(tags) ? tags : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Cache fallback
    writeReviewCache('review_projects', projectId, newProject);

    // Supabase DB persistent insert
    try {
      const { data, error } = await supabaseAdmin.from('review_projects').insert(newProject).select().single();
      if (!error && data) {
        return NextResponse.json({ success: true, project: data });
      }
    } catch (_) {}

    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
