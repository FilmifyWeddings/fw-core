import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchVendorAlbumOrders } from '@/lib/services/vendorDeliverablesService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = (body.email || '').trim().toLowerCase();
    const studioSlug = body.studio || '';

    if (!rawEmail) {
      return NextResponse.json({ error: 'Vendor email is required' }, { status: 400 });
    }

    // 1. Search for matching team member or partner by email
    let memberMatch: any = null;
    let workspaceId: string = '';

    // Check fw_team_members
    const { data: teamMembers } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .ilike('email', rawEmail);

    if (teamMembers && teamMembers.length > 0) {
      memberMatch = teamMembers[0];
      workspaceId = memberMatch.workspace_id || memberMatch.user_id || '';
    }

    // Fallback: check workspace_members
    if (!memberMatch) {
      const { data: wsMembers } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .ilike('email', rawEmail);

      if (wsMembers && wsMembers.length > 0) {
        memberMatch = wsMembers[0];
        workspaceId = memberMatch.workspace_id || '';
      }
    }

    // Fallback: check partner_album_orders directly
    if (!memberMatch) {
      const { data: albumOrders } = await supabaseAdmin
        .from('partner_album_orders')
        .select('*')
        .ilike('partner_email', rawEmail)
        .limit(1);

      if (albumOrders && albumOrders.length > 0) {
        const first = albumOrders[0];
        memberMatch = {
          id: first.partner_id,
          name: first.partner_name,
          email: first.partner_email,
          primary_role: 'Album Designer',
          primary_type: 'PARTNER'
        };
        workspaceId = first.workspace_id;
      }
    }

    if (!memberMatch) {
      return NextResponse.json({ 
        error: 'No active vendor account found for this email. Please ask your studio manager to invite or add your email in Team & Partners.' 
      }, { status: 404 });
    }

    // 2. Fetch studio profile details
    let studioName = 'StudioCore Partner Studio';
    if (workspaceId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('workspace_name, company_name, phone, email, logo_url')
        .eq('id', workspaceId)
        .maybeSingle();

      if (profile) {
        studioName = profile.workspace_name || profile.company_name || 'StudioCore Partner Studio';
      }
    }

    // 3. Fetch current assigned album orders
    const orders = await fetchVendorAlbumOrders(workspaceId, memberMatch.id, rawEmail);

    return NextResponse.json({
      success: true,
      vendor: {
        id: memberMatch.id,
        name: memberMatch.name,
        email: memberMatch.email || rawEmail,
        role: memberMatch.primary_role || 'Album Designer',
        type: memberMatch.primary_type || 'PARTNER',
        workspace_id: workspaceId,
        studio_name: studioName
      },
      orders
    });
  } catch (error: any) {
    console.error('[API /vendors/portal-auth POST error]:', error);
    return NextResponse.json({ error: error.message || 'Vendor authentication failed' }, { status: 500 });
  }
}
