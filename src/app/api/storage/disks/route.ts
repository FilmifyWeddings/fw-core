import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isValidUUID = (val?: string | null) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!isValidUUID(workspaceId) || workspaceId === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: true, disks: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('storage_physical_disks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('disk_name', { ascending: true });

    if (error) {
      console.warn('[StorageDisks API] DB select error:', error.message);
      return NextResponse.json({ success: true, disks: [] });
    }

    return NextResponse.json({ success: true, disks: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      workspace_id,
      disk_name,
      disk_serial,
      disk_label,
      drive_letter,
      disk_type = 'EXTERNAL_SSD',
      physical_location = 'Studio Desk',
      total_capacity_gb = 2000,
      free_capacity_gb = 1500,
      assigned_to_user_name,
      is_currently_mounted = true,
      color_tag = '#3B82F6',
      notes = '',
    } = body;

    if (!disk_name || !disk_name.trim()) {
      return NextResponse.json({ success: false, error: 'disk_name is required' }, { status: 400 });
    }

    if (!isValidUUID(workspace_id) || workspace_id === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: false, error: 'Valid workspace_id is required' }, { status: 400 });
    }

    const totalGb = Number(total_capacity_gb) || 2000;
    const freeGb = free_capacity_gb !== undefined ? Number(free_capacity_gb) : Math.round(totalGb * 0.75);

    const diskPayload: any = {
      workspace_id,
      disk_name: disk_name.trim(),
      disk_serial: disk_serial || '',
      disk_label: disk_label || disk_name.trim(),
      drive_letter: drive_letter || '',
      disk_type: disk_type || 'EXTERNAL_SSD',
      physical_location: physical_location || 'Studio Shelf',
      total_capacity_gb: totalGb,
      free_capacity_gb: freeGb,
      total_capacity_bytes: totalGb * 1024 * 1024 * 1024,
      free_capacity_bytes: freeGb * 1024 * 1024 * 1024,
      assigned_to_user_name: assigned_to_user_name || '',
      is_currently_mounted: is_currently_mounted ?? true,
      color_tag: color_tag || '#3B82F6',
      notes: notes || '',
      last_scanned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('storage_physical_disks')
        .update(diskPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, disk: data });
    } else {
      const { data, error } = await supabaseAdmin
        .from('storage_physical_disks')
        .upsert(diskPayload, { onConflict: 'workspace_id,disk_name' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, disk: data });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('storage_physical_disks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Disk deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
