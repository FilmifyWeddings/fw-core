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
    const rawTargetWs = req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('studio') || req.headers.get('x-workspace-id') || null;

    // Resolve studio slug to UUID if needed
    let resolvedWsId: string | null = null;
    if (rawTargetWs && rawTargetWs !== 'all') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTargetWs);
      if (isUuid) {
        resolvedWsId = rawTargetWs;
      } else {
        try {
          // Look up by studio_slug or studio_code in profiles
          const { data: profRow } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .or(`studio_slug.eq.${rawTargetWs},studio_code.eq.${rawTargetWs}`)
            .limit(1)
            .maybeSingle();

          if (profRow?.id) {
            resolvedWsId = profRow.id;
          } else {
            // Check workspaces table using 'slug' column
            const { data: wsRow } = await supabaseAdmin
              .from('workspaces')
              .select('id, owner_id')
              .or(`slug.eq.${rawTargetWs},id.eq.${rawTargetWs}`)
              .limit(1)
              .maybeSingle();

            if (wsRow?.id || wsRow?.owner_id) {
              resolvedWsId = wsRow.id || wsRow.owner_id;
            }
          }

          // Fallback: match hex suffix (e.g. filmify-weddings-f9359a -> f9359a)
          if (!resolvedWsId) {
            const hexMatch = rawTargetWs.match(/[0-9a-f]{6,}$/i) || rawTargetWs.match(/[0-9a-f]{6,}/i);
            if (hexMatch) {
              const hexPrefix = hexMatch[0].toLowerCase();
              const { data: profHex } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .ilike('id', `${hexPrefix}%`)
                .limit(1)
                .maybeSingle();
              if (profHex?.id) {
                resolvedWsId = profHex.id;
              } else {
                const { data: wsHex } = await supabaseAdmin
                  .from('workspaces')
                  .select('id, owner_id')
                  .or(`id.ilike.${hexPrefix}%,owner_id.ilike.${hexPrefix}%`)
                  .limit(1)
                  .maybeSingle();
                if (wsHex?.id || wsHex?.owner_id) {
                  resolvedWsId = wsHex.id || wsHex.owner_id;
                }
              }
            }
          }
        } catch (_) {}
      }
    }

    // 1. Resolve team member across fw_team_members
    let member: any = null;
    let wsMember: any = null;

    const { data: allMatchingMembers } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .or(`auth_user_id.eq.${userId},email.ilike.${cleanEmail}`)
      .order('created_at', { ascending: false });

    if (allMatchingMembers && allMatchingMembers.length > 0) {
      if (resolvedWsId) {
        member = allMatchingMembers.find(
          (m: any) => String(m.workspace_id) === String(resolvedWsId) || String(m.user_id) === String(resolvedWsId)
        );
      }
      if (!member) {
        member = allMatchingMembers[0];
      }
    }

    // 2. Fallback to workspace_members if still not found
    const { data: allMatchingWsMembers } = await supabaseAdmin
      .from('workspace_members')
      .select('*')
      .or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)
      .order('created_at', { ascending: false });

    if (!member && allMatchingWsMembers && allMatchingWsMembers.length > 0) {
      if (resolvedWsId) {
        wsMember = allMatchingWsMembers.find(
          (wm: any) => String(wm.workspace_id) === String(resolvedWsId)
        );
      }
      if (!wsMember) {
        wsMember = allMatchingWsMembers[0];
      }

      if (wsMember) {
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

    const memberWorkspaceId = resolvedWsId || member.user_id || member.workspace_id;

    // Build candidate IDs strictly scoped to THIS workspace/studio
    const candidateIds = new Set<string>([String(member.id)]);
    if (wsMember?.id && (String(wsMember.workspace_id) === String(memberWorkspaceId) || !resolvedWsId)) {
      candidateIds.add(String(wsMember.id));
    }

    if (allMatchingMembers) {
      allMatchingMembers.forEach((a: any) => {
        if (a.id && (String(a.workspace_id) === String(memberWorkspaceId) || String(a.user_id) === String(memberWorkspaceId))) {
          candidateIds.add(String(a.id));
        }
      });
    }
    if (allMatchingWsMembers) {
      allMatchingWsMembers.forEach((a: any) => {
        if (a.id && String(a.workspace_id) === String(memberWorkspaceId)) {
          candidateIds.add(String(a.id));
        }
      });
    }

    const candidateIdsList = Array.from(candidateIds);

    // 2. Fetch existing personal attendance link strictly matching member.id or candidate IDs for this studio
    let { data: link } = await supabaseAdmin
      .from('attendance_member_links')
      .select('*')
      .eq('member_id', member.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!link && candidateIdsList.length > 0) {
      const { data: scopedLink } = await supabaseAdmin
        .from('attendance_member_links')
        .select('*')
        .in('member_id', candidateIdsList)
        .or(`user_id.eq.${memberWorkspaceId},workspace_id.eq.${memberWorkspaceId}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scopedLink) link = scopedLink;
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

    // Resolve true public origin (handling NGINX reverse-proxy headers to eliminate internal localhost:3000)
    let host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    let proto = req.headers.get('x-forwarded-proto') || 'https';
    if (proto.includes(',')) proto = proto.split(',')[0].trim();

    let reqOrigin = '';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      reqOrigin = `${proto}://${host}`;
    } else if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
      reqOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    } else if (req.nextUrl.origin && !req.nextUrl.origin.includes('localhost')) {
      reqOrigin = req.nextUrl.origin;
    } else {
      reqOrigin = 'https://studio.filmifyweddings.com';
    }
    reqOrigin = reqOrigin.replace(/\/+$/, '');

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
