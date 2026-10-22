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

    // 2. Fetch Partner Memberships by email or user_id
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
      for (const mem of memberships) {
        // Auto-link user_id if this invited email is now logged in
        if ((!mem.user_id || mem.user_id !== uId) && mem.email?.toLowerCase() === uEmail) {
          supabaseAdmin
            .from('workspace_members')
            .update({ user_id: uId, status: 'ACTIVE' })
            .eq('id', mem.id)
            .then(() => {});
        }

        // Skip if this is their own workspace
        if (mem.workspace_id === uId || (ownerWs?.id && mem.workspace_id === ownerWs.id)) {
          continue;
        }

        // Fetch parent workspace name
        let partnerStudioName = 'Partner Studio';
        const { data: wsData } = await supabaseAdmin
          .from('workspaces')
          .select('id, name, logo_url')
          .eq('id', mem.workspace_id)
          .maybeSingle();

        let partnerStudioSlug = mem.workspace_id.slice(0, 8);
        if (wsData?.name) {
          partnerStudioName = wsData.name;
          if ((wsData as any).slug) partnerStudioSlug = (wsData as any).slug;
        }
        
        // Fetch studio_slug from profiles
        const { data: pData } = await supabaseAdmin
          .from('profiles')
          .select('workspace_name, full_name, studio_slug')
          .eq('id', mem.workspace_id)
          .maybeSingle();
        if (pData?.workspace_name && !wsData?.name) partnerStudioName = pData.workspace_name;
        if (pData?.studio_slug) partnerStudioSlug = pData.studio_slug;

        // Permissions from isolated studio_member_permissions table
        let studioPerm: any = null;
        try {
          const { data: sp } = await supabaseAdmin
            .from('studio_member_permissions')
            .select('*')
            .eq('owner_id', mem.workspace_id)
            .eq('member_id', mem.id)
            .maybeSingle();
          if (sp) studioPerm = sp;
        } catch (_) {}

        const legacyPerm = mem.member_permissions?.[0] || mem.member_permissions;
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

        // Attendance is strictly visible ONLY for in-house members added by this studio owner
        const hasAtt = isInHouseMem;

        workspaceList.push({
          workspaceId: mem.workspace_id,
          studioName: partnerStudioName,
          studioSlug: partnerStudioSlug,
          userRole: mem.primary_role || 'FREELANCER',
          isOwner: false,
          memberId: mem.id,
          roles: mem.roles || [mem.primary_role || 'FREELANCER'],
          member_types: mem.member_types || (isInHouseMem ? ['IN_HOUSE'] : ['FREELANCER']),
          primary_type: primType,
          has_attendance: hasAtt,
          permissions: memberPerms,
          avatarUrl: mem.avatar_url || wsData?.logo_url || '',
          ownerEmail: '',
        });
      }
    }

    return NextResponse.json({
      success: true,
      workspaces: workspaceList,
      hasPartnerWorkspaces: workspaceList.length > 1,
    });
  } catch (err: any) {
    console.error('[my-workspaces GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
