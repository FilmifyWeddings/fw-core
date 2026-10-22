import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    let activeUser: any = null;
    const { data: { user } } = await supabase.auth.getUser();
    activeUser = user;

    if (!activeUser) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const { data: jwtUser } = await supabaseAdmin.auth.getUser(token);
        if (jwtUser?.user) {
          activeUser = jwtUser.user;
        }
      }
    }

    if (!activeUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = activeUser.id;
    const cleanEmail = (activeUser.email || '').trim().toLowerCase();
    const targetWsId = req.nextUrl.searchParams.get('workspace_id') || req.headers.get('x-workspace-id') || null;

    // 1. Resolve team member
    let member: any = null;
    let wsMember: any = null;

    // A. If specific workspace requested (e.g. partner studio workspace), scope strictly to that workspace
    if (targetWsId && targetWsId !== 'all') {
      const { data: scopedFw } = await supabaseAdmin
        .from('fw_team_members')
        .select('*')
        .or(`user_id.eq.${targetWsId},workspace_id.eq.${targetWsId}`)
        .or(`auth_user_id.eq.${userId},email.ilike.${cleanEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scopedFw) {
        member = scopedFw;
      } else {
        const { data: scopedWsMem } = await supabaseAdmin
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', targetWsId)
          .or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scopedWsMem) {
          wsMember = scopedWsMem;
        }
      }
    }

    // B. Fallback to any matching record across fw_team_members if not found in scoped workspace
    if (!member && !wsMember) {
      const { data: generalFw } = await supabaseAdmin
        .from('fw_team_members')
        .select('*')
        .or(`auth_user_id.eq.${userId},email.ilike.${cleanEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      member = generalFw;
    }

    // C. Check workspace_members if still not found
    if (!member && !wsMember) {
      const { data: generalWsMem } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      wsMember = generalWsMem;
    }

    if (!member && wsMember) {
      // Find or create matching fw_team_members record
      const { data: upserted } = await supabaseAdmin
        .from('fw_team_members')
        .upsert({
          id: wsMember.id,
          user_id: wsMember.workspace_id,
          workspace_id: wsMember.workspace_id,
          auth_user_id: userId,
          name: wsMember.name || activeUser.user_metadata?.full_name || 'Team Member',
          email: cleanEmail,
          primary_role: wsMember.primary_role || 'Staff Member',
          roles: wsMember.roles || [wsMember.primary_role || 'Staff Member'],
          primary_type: wsMember.primary_type || 'IN_HOUSE',
          member_types: wsMember.member_types || ['IN_HOUSE'],
          is_active: true,
          active_status: true,
        }, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      member = upserted || wsMember;
    }

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'No associated team member profile found for this email.',
        email: cleanEmail
      }, { status: 404 });
    }

    // Link auth_user_id if not linked yet
    if (!member.auth_user_id && userId) {
      await supabaseAdmin
        .from('fw_team_members')
        .update({ auth_user_id: userId })
        .eq('id', member.id);
      member.auth_user_id = userId;
    }

    const memberWorkspaceId = targetWsId && targetWsId !== 'all' ? targetWsId : (member.user_id || member.workspace_id);

    // Build comprehensive candidate IDs (member.id, wsMember.id, plus any other aliases in this studio)
    const candidateIds = new Set<string>([String(member.id)]);
    if (wsMember?.id) candidateIds.add(String(wsMember.id));

    // Find any additional alias IDs by email / phone / name within the same studio workspace
    try {
      const { data: aliasRows } = await supabaseAdmin
        .from('fw_team_members')
        .select('id')
        .or(`user_id.eq.${memberWorkspaceId},workspace_id.eq.${memberWorkspaceId}`)
        .or(`email.ilike.${cleanEmail},auth_user_id.eq.${userId}`);

      if (aliasRows && aliasRows.length > 0) {
        aliasRows.forEach(a => { if (a.id) candidateIds.add(String(a.id)); });
      }

      const { data: wsAliasRows } = await supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', memberWorkspaceId)
        .or(`email.ilike.${cleanEmail},user_id.eq.${userId}`);

      if (wsAliasRows && wsAliasRows.length > 0) {
        wsAliasRows.forEach(a => { if (a.id) candidateIds.add(String(a.id)); });
      }
    } catch (_) {}

    const candidateIdsList = Array.from(candidateIds);

    // 2. Fetch existing personal attendance link matching ANY of the candidate IDs in this studio
    let { data: link } = await supabaseAdmin
      .from('attendance_member_links')
      .select('*')
      .in('member_id', candidateIdsList)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If still not found, check by workspace_id
    if (!link) {
      const { data: wsScopedLink } = await supabaseAdmin
        .from('attendance_member_links')
        .select('*')
        .or(`user_id.eq.${memberWorkspaceId},workspace_id.eq.${memberWorkspaceId}`)
        .in('member_id', candidateIdsList)
        .limit(1)
        .maybeSingle();

      if (wsScopedLink) link = wsScopedLink;
    }

    // Only create a brand new link if none exists anywhere for this member
    if (!link) {
      const secureToken = `att_${member.id.slice(0, 6)}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const { data: newLink } = await supabaseAdmin
        .from('attendance_member_links')
        .insert([{
          user_id: memberWorkspaceId,
          workspace_id: memberWorkspaceId,
          member_id: member.id,
          secure_token: secureToken,
          is_active: true,
        }])
        .select('*')
        .single();

      link = newLink;
    }

    const reqOrigin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://studio.filmifyweddings.com';
    const directUrl = `${reqOrigin}/attendance/${link?.secure_token}`;

    // 3. Fetch today's record across all candidate alias IDs
    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const { data: todayRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .in('member_id', candidateIdsList)
      .eq('date', todayDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      member,
      secureToken: link?.secure_token,
      directUrl,
      todayRecord,
      workspaceId: memberWorkspaceId,
      candidateMemberIds: candidateIdsList,
    });
  } catch (err: any) {
    console.error('[API /team/attendance/me] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
