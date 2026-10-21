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
    let workspaceId = requestedWorkspaceId || authResult.workspaceId || authResult.userId;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const currentUserId = authResult.userId;

    // 🔒 RBAC Permission Check for Workspace Members (Non-owners)
    let isOwner = (currentUserId === workspaceId);
    let memberRecord: any = null;
    let leadsAccessLevel: string = 'ALL_MANAGE';

    if (!isOwner) {
      // Check if user is a member of this workspace
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('id, name, email, roles, primary_role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (member) {
        memberRecord = member;
        // Check studio_member_permissions
        const { data: perm } = await supabaseAdmin
          .from('studio_member_permissions')
          .select('leads_access')
          .eq('owner_id', workspaceId)
          .eq('member_id', member.id)
          .maybeSingle();

        leadsAccessLevel = perm?.leads_access || 'NONE';
      } else {
        // Check if user owns this workspace in workspaces table
        const { data: wsOwner } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', currentUserId)
          .maybeSingle();

        if (wsOwner) {
          isOwner = true;
          leadsAccessLevel = 'ALL_MANAGE';
        } else {
          leadsAccessLevel = 'NONE';
        }
      }
    }

    // If non-owner has NO access to leads, return empty array immediately (Prevent data leak)
    if (!isOwner && (!leadsAccessLevel || leadsAccessLevel === 'NONE')) {
      return NextResponse.json({
        success: true,
        leads: [],
        count: 0,
        access_level: 'NONE',
        message: 'No access granted to leads for this studio.'
      });
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Strict workspace query (Never mix other workspaces)
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const res = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    let dbLeads: any[] = [];
    let totalCount: number = 0;

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

    // 🔒 Enforce ASSIGNED_VIEW / ASSIGNED_EDIT: Filter leads strictly assigned to this member
    if (!isOwner && (leadsAccessLevel === 'ASSIGNED_VIEW' || leadsAccessLevel === 'ASSIGNED_EDIT')) {
      const uName = (memberRecord?.name || '').trim().toLowerCase();
      const uEmail = (memberRecord?.email || '').trim().toLowerCase();
      const memberId = memberRecord?.id;

      dbLeads = dbLeads.filter(l => {
        const owner = String(l.owner || l.lead_owner || l.assigned_to || '').trim().toLowerCase();
        const rawOwner = String(l.raw_payload?.lead_owner || l.raw_payload?.assigned_to || '').trim().toLowerCase();
        const assignedId = l.assigned_to_id || l.assigned_member_id || l.raw_payload?.assigned_member_id;

        return (
          (memberId && assignedId === memberId) ||
          (currentUserId && (assignedId === currentUserId || owner === currentUserId)) ||
          (uName && (owner.includes(uName) || uName.includes(owner) || rawOwner.includes(uName))) ||
          (uEmail && (owner === uEmail || rawOwner === uEmail))
        );
      });
      totalCount = dbLeads.length;
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
