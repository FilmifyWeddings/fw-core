import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { getSwrCached } from '@/lib/server-swr-cache';

export const dynamic = 'force-dynamic';

// Ultra-fast in-memory concurrency cache (5 seconds TTL per workspace)
// Eliminates database saturation when 2-3 users/devices load the studio simultaneously
interface ProjectsCacheEntry {
  data: any[];
  timestamp: number;
}
const projectsMemoryCache = new Map<string, ProjectsCacheEntry>();
const CACHE_TTL_MS = 12000;

/**
 * GET /api/workspace/projects?workspace_id=...
 * Enterprise-grade server endpoint that securely bypasses client-side RLS blockers
 * for authorized workspace members and studio owners.
 * Returns all active wedding projects with sub-events and crew assignments.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');
    const bypassCache = searchParams.get('_nocache') === 'true';

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    // Check high-speed RAM micro-cache for concurrent multi-device requests
    const cacheKey = `projects_${effectiveWsId}`;
    const cached = projectsMemoryCache.get(cacheKey);
    const now = Date.now();
    if (!bypassCache && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(
        { success: true, projects: cached.data, cached: true },
        {
          headers: {
            'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    let projectsQuery = supabaseAdmin
      .from('fw_projects')
      .select(`
        *,
        fw_sub_events (
          *,
          fw_assignments (*)
        )
      `)
      .neq('status', 'trash')
      .order('created_at', { ascending: false });

    if (effectiveWsId !== 'all') {
      projectsQuery = projectsQuery.eq('user_id', effectiveWsId);
    }

    const { data: projects, error } = await projectsQuery;

    if (error) {
      console.error('[API workspace/projects GET Error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const resolved = projects || [];
    // Store in RAM micro-cache
    projectsMemoryCache.set(cacheKey, { data: resolved, timestamp: now });

    // Prune stale cache items to prevent memory leaks
    if (projectsMemoryCache.size > 100) {
      for (const [k, v] of projectsMemoryCache.entries()) {
        if (now - v.timestamp > 30000) projectsMemoryCache.delete(k);
      }
    }

    return NextResponse.json(
      { success: true, projects: resolved },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (err: any) {
    console.error('[API workspace/projects GET Exception]:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
