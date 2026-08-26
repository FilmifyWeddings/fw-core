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
      userRole: 'OWNER',
      isOwner: true,
      permissions: {
        leads_access: 'FULL_EDIT',
        quotations_access: 'MANAGE',
        team_manager_access: 'MANAGE_ALL',
        post_production_access: 'FULL_ACCESS',
        finance_access: 'MANAGE',
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

        if (wsData?.name) {
          partnerStudioName = wsData.name;
        } else {
          // Fallback to profile table
          const { data: pData } = await supabaseAdmin
            .from('profiles')
            .select('workspace_name, full_name')
            .eq('id', mem.workspace_id)
            .maybeSingle();
          if (pData?.workspace_name) partnerStudioName = pData.workspace_name;
        }

        // Permissions
        const perm = mem.member_permissions?.[0] || mem.member_permissions;
        const memberPerms = {
          leads_access: perm?.leads_access || 'NONE',
          quotations_access: perm?.quotations_access || 'NONE',
          team_manager_access: perm?.team_manager_access || 'ASSIGNED_ONLY_VIEW',
          post_production_access: perm?.post_production_access || 'ASSIGNED_ONLY',
          finance_access: perm?.finance_access || 'NONE',
        };

        workspaceList.push({
          workspaceId: mem.workspace_id,
          studioName: partnerStudioName,
          userRole: mem.primary_role || 'FREELANCER',
          isOwner: false,
          memberId: mem.id,
          roles: mem.roles || [mem.primary_role || 'FREELANCER'],
          member_types: mem.member_types || ['IN_HOUSE'],
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
