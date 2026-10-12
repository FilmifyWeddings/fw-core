import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Retrieve all contact groups for a tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  try {
    const candidateIds = new Set<string>();
    if (tenantId) {
      candidateIds.add(tenantId);

      // Check if tenantId is a user ID with associated workspace(s)
      const { data: ownedWs } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('owner_id', tenantId);

      if (ownedWs && ownedWs.length > 0) {
        ownedWs.forEach(w => candidateIds.add(w.id));
      }

      const { data: memberWs } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', tenantId);

      if (memberWs && memberWs.length > 0) {
        memberWs.forEach(m => candidateIds.add(m.workspace_id));
      }
    }

    const idList = Array.from(candidateIds).filter(Boolean);
    let groups: any[] | null = null;

    if (idList.length > 0) {
      const { data } = await supabaseAdmin
        .from('whatsapp_contact_groups')
        .select('*')
        .in('tenant_id', idList)
        .order('group_name', { ascending: true });
      groups = data;
    }

    if (!groups || groups.length === 0) {
      // Fallback: Check all studio contact groups
      const { data: fallbackGroups } = await supabaseAdmin
        .from('whatsapp_contact_groups')
        .select('*')
        .order('group_name', { ascending: true })
        .limit(50);
      if (fallbackGroups && fallbackGroups.length > 0) {
        groups = fallbackGroups;
      }
    }

    return NextResponse.json({
      success: true,
      results: groups || []
    });
  } catch (err: any) {
    console.error('Fetch contact groups error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new contact group
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { group_name, group_description } = await req.json();

    if (!group_name) {
      return NextResponse.json({ error: 'Missing group_name parameter' }, { status: 400 });
    }

    const { data: group, error } = await supabaseAdmin
      .from('whatsapp_contact_groups')
      .insert({
        tenant_id: tenantId,
        group_name,
        group_description
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      group
    });
  } catch (err: any) {
    console.error('Create contact group error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a contact group
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');
  const groupId = searchParams.get('group_id');

  if (!tenantId || !groupId) {
    return NextResponse.json({ error: 'Missing tenant_id or group_id parameter' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('whatsapp_contact_groups')
      .delete()
      .eq('id', groupId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete contact group error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update a contact group's details
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');
  const groupId = searchParams.get('group_id');

  if (!tenantId || !groupId) {
    return NextResponse.json({ error: 'Missing tenant_id or group_id parameter' }, { status: 400 });
  }

  try {
    const { group_name, group_description } = await req.json();

    const { data: group, error } = await supabaseAdmin
      .from('whatsapp_contact_groups')
      .update({
        group_name,
        group_description
      })
      .eq('id', groupId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      group
    });
  } catch (err: any) {
    console.error('Update contact group error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
