import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uId = user.id;
    const uEmail = (user.email || '').trim().toLowerCase();

    // 1. Fetch Owner Profile & Owner Workspace
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', uId)
      .maybeSingle();

    const { data: ownerWs } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('owner_id', uId)
      .maybeSingle();

    const ownerStudioName = ownerWs?.name || profile?.workspace_name || user.user_metadata?.workspace_name || 'My Studio';

    const ownerWorkspace = {
      workspaceId: ownerWs?.id || uId,
      studioName: ownerStudioName,
      studioSlug: profile?.studio_slug || ownerWs?.slug || uId.slice(0, 8),
      userRole: 'OWNER',
      isOwner: true,
      permissions: {
        leads_access: 'ALL_MANAGE',
        quotations_access: 'MANAGE',
        team_manager_access: 'ALL_MANAGE',
        post_production_access: 'ALL_MANAGE',
        finance_access: 'MANAGE',
        clients_access: 'ALL_MANAGE',
        client_modules_access: ['overview', 'quotations', 'events', 'moodboard', 'tasks', 'post_production', 'finance'],
      },
      avatarUrl: profile?.avatar_url || profile?.logo_url || user.user_metadata?.avatar_url || '',
      ownerEmail: uEmail,
    };

    const workspaceList: any[] = [ownerWorkspace];

    // 2. Fetch Partner Memberships by email or user_id (High-Speed Batch Resolution)
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        user_id,
        email,
        name,
        primary_role,
        roles,
        member_types,
        primary_type,
        status,
        avatar_url,
        member_permissions (*)
      `)
      .or(`email.ilike.${uEmail},user_id.eq.${uId}`);

    if (!memErr && memberships && memberships.length > 0) {
      // Auto-link user_id in background for unlinked records
      const unlinked = memberships.filter(m => (!m.user_id || m.user_id !== uId) && m.email?.toLowerCase() === uEmail);
      if (unlinked.length > 0) {
        Promise.all(unlinked.map(m =>
          supabaseAdmin.from('workspace_members').update({ user_id: uId, status: 'ACTIVE' }).eq('id', m.id)
        )).catch(() => {});
      }

      // Filter out self-owned workspace records
      const validMems = memberships.filter(m => 
        m.workspace_id !== uId && (!ownerWs?.id || m.workspace_id !== ownerWs.id)
      );

      if (validMems.length > 0) {
        const wsIds = Array.from(new Set(validMems.map(m => m.workspace_id).filter(Boolean)));
        const memIds = Array.from(new Set(validMems.map(m => m.id).filter(Boolean)));

        // ⚡ Parallel batch fetch: single network roundtrip for all studios & permissions
        const [wsRes, profilesRes, permsRes] = await Promise.all([
          supabaseAdmin
            .from('workspaces')
            .select('id, name, logo_url, owner_id, slug')
            .in('id', wsIds),
          supabaseAdmin
            .from('profiles')
            .select('id, workspace_name, full_name, studio_slug')
            .in('id', wsIds),
          supabaseAdmin
            .from('studio_member_permissions')
            .select('*')
            .in('member_id', memIds)
        ]);

        const wsMap = new Map((wsRes.data || []).map((w: any) => [w.id, w]));
        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        const permsMap = new Map((permsRes.data || []).map((p: any) => [`${p.member_id}_${p.owner_id}`, p]));

        for (const mem of validMems) {
          const wsData = wsMap.get(mem.workspace_id);
          const pData = profileMap.get(mem.workspace_id);

          let partnerStudioName = wsData?.name || pData?.workspace_name || 'Partner Studio';
          let partnerStudioSlug = wsData?.slug || pData?.studio_slug || mem.workspace_id.slice(0, 8);

          // Get studio permissions from batch map
          const studioPerm = permsMap.get(`${mem.id}_${mem.workspace_id}`) || 
            (wsData?.owner_id ? permsMap.get(`${mem.id}_${wsData.owner_id}`) : null);

          const legacyPerm = Array.isArray(mem.member_permissions) ? mem.member_permissions[0] : mem.member_permissions;
          let clientsAccess = studioPerm?.clients_access || legacyPerm?.clients_access || 'NONE';
          let clientModulesAccess = studioPerm?.client_modules_access || legacyPerm?.client_modules_access || null;

          if (studioPerm?.partner_access_code) {
            try {
              const parsed = JSON.parse(studioPerm.partner_access_code);
              if (parsed.clients_access) clientsAccess = parsed.clients_access;
              if (Array.isArray(parsed.client_modules_access)) clientModulesAccess = parsed.client_modules_access;
            } catch (_) {}
          }

          const memberPerms = {
            leads_access: studioPerm?.leads_access || legacyPerm?.leads_access || 'NONE',
            quotations_access: studioPerm?.quotations_access || legacyPerm?.quotations_access || 'NONE',
            team_manager_access: studioPerm?.team_manager_access || legacyPerm?.team_manager_access || 'NONE',
            post_production_access: studioPerm?.post_production_access || legacyPerm?.post_production_access || 'NONE',
            finance_access: studioPerm?.finance_access || legacyPerm?.finance_access || 'NONE',
            clients_access: clientsAccess,
            client_modules_access: clientModulesAccess,
          };

          const primType = mem.primary_type || (Array.isArray(mem.member_types) && mem.member_types[0]) || 'FREELANCER';
          const isInHouseMem = Boolean(
            ['in_house', 'in-house', 'inhouse'].includes(String(primType).toLowerCase()) ||
            (Array.isArray(mem.member_types) && mem.member_types.some((t: any) => String(t).toLowerCase().includes('house')))
          );

          workspaceList.push({
            workspaceId: mem.workspace_id,
            studioName: partnerStudioName,
            studioSlug: partnerStudioSlug,
            userRole: mem.primary_role || 'FREELANCER',
            isOwner: false,
            memberId: mem.id,
            memberName: mem.name || '',
            memberEmail: mem.email || '',
            memberPhone: mem.phone || '',
            roles: mem.roles || [mem.primary_role || 'FREELANCER'],
            member_types: mem.member_types || (isInHouseMem ? ['IN_HOUSE'] : ['FREELANCER']),
            primary_type: primType,
            has_attendance: isInHouseMem,
            permissions: memberPerms,
            avatarUrl: mem.avatar_url || wsData?.logo_url || '',
            ownerEmail: '',
          });
        }
      }
    }

    // Determine if user is purely an invited freelancer (no actual studio of their own)
    const isPureFreelancer = Boolean(
      workspaceList.length > 1 && 
      !ownerWs?.name && 
      (!profile?.workspace_name || profile.workspace_name === 'My Studio')
    );

    // If pure freelancer, prioritize their primary partner studio first and flag pure freelancer mode
    if (isPureFreelancer && workspaceList.length > 1) {
      // Move owner dummy option to end or mark it restricted
      const partnerOnly = workspaceList.filter(w => !w.isOwner);
      const ownerDummy = workspaceList.find(w => w.isOwner);
      if (ownerDummy) {
        ownerDummy.studioName = `${profile?.full_name || 'Freelancer'} (Personal Workspace)`;
      }
      workspaceList.splice(0, workspaceList.length, ...partnerOnly, ...(ownerDummy ? [ownerDummy] : []));
    }

    return NextResponse.json({
      success: true,
      workspaces: workspaceList,
      hasPartnerWorkspaces: workspaceList.some(w => !w.isOwner),
      isPureFreelancer,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
      }
    });
  } catch (err: any) {
    console.error('[my-workspaces GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
