import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Retrieve all contact groups for a tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenant_id') || searchParams.get('workspace_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 });
  }

  try {
    const { data: groups, error } = await supabaseAdmin
      .from('whatsapp_contact_groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback to empty if table doesn't exist
      return NextResponse.json({ success: true, results: [] });
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
