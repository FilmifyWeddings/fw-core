import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const wsId = req.nextUrl.searchParams.get('workspace_id');

    if (!token || !wsId) {
      return NextResponse.json({ error: 'Missing token or workspace_id' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch members for this workspace
    const { data: members, error: memErr } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        *,
        member_permissions (*)
      `)
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false });

    if (memErr) {
      // Fallback query if relation join is pending
      const { data: fallbackMembers } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });

      return NextResponse.json({ success: true, members: fallbackMembers || [] });
    }

    return NextResponse.json({ success: true, members: members || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const body = await req.json();

    const {
      workspace_id,
      name,
      email,
      phone,
      primary_role,
      roles,
      avatar_url,
      permissions
    } = body;

    if (!token || !workspace_id || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields (workspace_id, name, email)' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if user already exists in auth.users by email
    let invitedUserId: string | null = null;
    try {
      const { data: userData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (userData?.id) invitedUserId = userData.id;
    } catch (_) {}

    // 2. Upsert into workspace_members
    const { data: member, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .upsert({
        workspace_id,
        user_id: invitedUserId,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone || null,
        primary_role: primary_role || 'FREELANCER',
        roles: Array.isArray(roles) ? roles : [primary_role || 'FREELANCER'],
        avatar_url: avatar_url || null,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id, email' })
      .select()
      .single();

    if (memberError || !member) {
      console.error('[workspace_members Upsert Error]:', memberError);
      return NextResponse.json({ error: memberError?.message || 'Failed to save member' }, { status: 500 });
    }

    // 3. Upsert into member_permissions
    if (permissions) {
      await supabaseAdmin
        .from('member_permissions')
        .upsert({
          member_id: member.id,
          workspace_id,
          leads_access: permissions.leads_access || 'NONE',
          quotations_access: permissions.quotations_access || 'NONE',
          team_manager_access: permissions.team_manager_access || 'VIEW_ASSIGNED',
          post_production_access: permissions.post_production_access || 'ASSIGNED_ONLY',
          finance_access: permissions.finance_access || 'NONE',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });
    }

    return NextResponse.json({
      success: true,
      member,
      message: 'Workspace partner member registered and permissions matrix applied successfully.',
    });
  } catch (err: any) {
    console.error('[workspace_members POST Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
