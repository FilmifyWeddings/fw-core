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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id') || body.workspace_id;

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
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('id, name, email, roles, primary_role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (member) {
        memberRecord = member;
        const { data: perm } = await supabaseAdmin
          .from('studio_member_permissions')
          .select('leads_access')
          .eq('owner_id', workspaceId)
          .eq('member_id', member.id)
          .maybeSingle();

        leadsAccessLevel = perm?.leads_access || 'NONE';
      } else {
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

    if (!isOwner && (leadsAccessLevel === 'NONE' || leadsAccessLevel === 'ASSIGNED_VIEW' || leadsAccessLevel === 'ALL_VIEW')) {
      return NextResponse.json({
        error: 'Forbidden: You do not have permission to create leads in this workspace.'
      }, { status: 403 });
    }

    const rawName = (body.name || body.full_name || 'New Lead').trim();
    const rawPhone = (body.phone || body.phone_number || '').trim();
    const rawEmail = (body.email || '').trim() || null;
    const rawSource = body.source || 'Manual';
    const rawStatus = body.status || 'new';
    const rawStageId = body.stage_id || 'new';
    const rawScore = body.score || 'Warm 👍';
    const rawScoreReason = body.score_reason || 'Manually created lead.';
    const rawBudget = body.budget || body.raw_payload?.budget || null;
    const rawLocation = body.location || body.city || body.raw_payload?.location || body.raw_payload?.city || null;
    const rawEventDate = body.event_date || body.raw_payload?.event_date || null;

    // Validate UUID format for stage_id to prevent Postgres "invalid input syntax for type uuid" error
    const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    let resolvedStageId: string | null = null;

    if (rawStageId && isUUID(rawStageId)) {
      resolvedStageId = rawStageId;
    } else {
      // Look up corresponding stage UUID from crm_stages for this workspace
      try {
        const { data: crmStages } = await supabaseAdmin
          .from('crm_stages')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('position', { ascending: true });

        if (crmStages && crmStages.length > 0) {
          const match = crmStages.find(s => 
            s.id === rawStageId || 
            s.name.toLowerCase() === rawStatus.toLowerCase() ||
            (rawStatus === 'new' && (s.name.toLowerCase().includes('inquiry') || s.name.toLowerCase().includes('new')))
          );
          resolvedStageId = match ? match.id : crmStages[0].id;
        }
      } catch (stErr) {
        console.warn('[API /leads POST] crm_stages lookup warning:', stErr);
      }
    }

    // Disambiguate lead name against existing leads in this workspace
    let disambiguatedName = rawName;
    try {
      const { data: existingLeads } = await supabaseAdmin
        .from('leads')
        .select('name')
        .eq('workspace_id', workspaceId)
        .ilike('name', `${rawName}%`);

      if (existingLeads && existingLeads.length > 0) {
        const { disambiguateNameAgainstList } = await import('@/lib/name-disambiguation');
        disambiguatedName = disambiguateNameAgainstList(rawName, existingLeads.map(l => l.name));
      }
    } catch (dErr) {
      console.warn('[API /leads POST] Disambiguation warning:', dErr);
    }

    const leadToInsert: any = {
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      name: disambiguatedName,
      full_name: disambiguatedName,
      phone: rawPhone,
      phone_number: rawPhone,
      email: rawEmail,
      source: rawSource,
      status: rawStatus,
      stage_id: resolvedStageId,
      score: rawScore,
      score_reason: rawScoreReason,
      budget: rawBudget,
      location: rawLocation,
      city: rawLocation,
      event_date: rawEventDate,
      raw_payload: {
        ...(body.raw_payload || {}),
        budget: rawBudget,
        location: rawLocation,
        city: rawLocation,
        event_date: rawEventDate,
        lead_owner: body.raw_payload?.lead_owner || body.owner || 'Unassigned',
      },
      custom_color: body.custom_color || null,
      comments: Array.isArray(body.comments) ? body.comments : [],
      wa_welcome_sent: body.wa_welcome_sent || false,
      google_synced: body.google_synced || false,
      wgl_dispatched: body.wgl_dispatched || false,
      followup_timeline: Array.isArray(body.followup_timeline) ? body.followup_timeline : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([leadToInsert])
      .select()
      .single();

    if (insertError) {
      console.error('[API /leads POST Insert Error]:', insertError);
      return NextResponse.json({ error: insertError.message || 'Failed to insert lead' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lead: insertedData
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API /leads POST Server Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
