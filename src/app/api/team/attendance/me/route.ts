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

    // 1. Resolve team member in fw_team_members
    // Try matching auth_user_id or email
    let { data: member } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .or(`auth_user_id.eq.${userId},email.ilike.${cleanEmail}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If not found in fw_team_members, check workspace_members
    if (!member) {
      const { data: wsMember } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (wsMember) {
        // Find or create in fw_team_members
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
            primary_type: 'in-house',
            member_types: ['in-house'],
            is_active: true,
            active_status: true,
          }, { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        member = upserted || wsMember;
      }
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

    const memberWorkspaceId = member.user_id || member.workspace_id;

    // 2. Fetch or create personal attendance link
    let { data: link } = await supabaseAdmin
      .from('attendance_member_links')
      .select('*')
      .eq('member_id', member.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

    // 3. Fetch today's record
    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const { data: todayRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', member.id)
      .eq('date', todayDate)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      member,
      secureToken: link?.secure_token,
      directUrl,
      todayRecord,
      workspaceId: memberWorkspaceId,
    });
  } catch (err: any) {
    console.error('[API /team/attendance/me] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
