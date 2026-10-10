import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '250', 10);
    const search = (searchParams.get('search') || '').trim();

    // Verify Session
    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || authResult.userId;

    if (!workspaceId && requestedWorkspaceId) {
      workspaceId = requestedWorkspaceId;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const candidateSet = new Set<string>();
    if (workspaceId) candidateSet.add(workspaceId);
    if (authResult.workspaceId) candidateSet.add(authResult.workspaceId);
    if (authResult.userId) candidateSet.add(authResult.userId);
    if (requestedWorkspaceId) candidateSet.add(requestedWorkspaceId);
    const candidates = Array.from(candidateSet);

    // Fetch leads using supabaseAdmin (bypasses RLS issues)
    let dbLeads: any[] = [];
    let totalCount = 0;

    // 1. Query by workspace_id or tenant_id across all valid candidates
    const orConditions = candidates.flatMap(c => [`workspace_id.eq.${c}`, `tenant_id.eq.${c}`]).join(',');
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .or(orConditions);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const res = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (res.error) {
      console.warn('[API /leads Workspace Query Warning]:', res.error.message);
      // Fallback: single eq query
      let fallbackQuery = supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId);

      if (search) {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const fallbackRes = await fallbackQuery
        .order('created_at', { ascending: false })
        .range(from, to);
      dbLeads = fallbackRes.data || [];
      totalCount = fallbackRes.count ?? dbLeads.length;
    } else {
      dbLeads = res.data || [];
      totalCount = res.count ?? dbLeads.length;
    }

    // 3. Sanitize lead data
    const sanitizedLeads = dbLeads.map(l => {
      const raw = l.raw_payload || {};
      return {
        ...l,
        name: l.name || l.full_name || raw.full_name || raw.name || 'Facebook Lead',
        phone: l.phone || l.phone_number || raw.phone || raw.phone_number || '-',
        email: l.email || raw.email || '-',
        source: l.source || raw.source || (raw.campaign_name ? `Facebook Ads / ${raw.campaign_name}` : 'Facebook Lead Ad'),
        status: l.status || 'new',
        score: l.score || 'Cold ❄️',
        score_reason: l.score_reason || '',
        location: l.location || l.city || raw.location || raw.city || '-',
        budget: l.budget || raw.budget || '-',
        event_date: l.event_date || raw.event_date || '-',
        raw_payload: raw,
      };
    });

    return NextResponse.json({
      success: true,
      leads: sanitizedLeads,
      count: sanitizedLeads.length,
      totalCount: totalCount,
      hasMore: from + sanitizedLeads.length < totalCount,
    });
  } catch (error: any) {
    console.error('[API /leads Server Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
