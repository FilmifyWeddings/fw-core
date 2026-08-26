import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

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

    // Fetch leads using supabaseAdmin (bypasses RLS issues)
    let dbLeads: any[] = [];

    // 1. Try querying by workspace_id
    const res = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (res.error) {
      console.warn('[API /leads Workspace Query Warning]:', res.error.message);
    } else {
      dbLeads = res.data || [];
    }

    // 2. If 0 leads found by workspace_id, try tenant_id
    if (dbLeads.length === 0) {
      const tenantRes = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('tenant_id', workspaceId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!tenantRes.error && tenantRes.data && tenantRes.data.length > 0) {
        dbLeads = tenantRes.data;
      }
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
      hasMore: sanitizedLeads.length >= pageSize,
    });
  } catch (error: any) {
    console.error('[API /leads Server Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
