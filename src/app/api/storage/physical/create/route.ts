import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspace_id,
      disk_name,
      disk_serial,
      disk_label,
      disk_type,
      physical_location,
      total_capacity_gb,
      free_capacity_gb,
      assigned_to_user_name,
    } = body;

    if (!workspace_id || !disk_name) {
      return NextResponse.json({ success: false, error: 'workspace_id and disk_name are required' }, { status: 400 });
    }

    const payload = {
      workspace_id,
      disk_name,
      disk_serial: disk_serial || `MANUAL-SN-${Date.now()}`,
      disk_label: disk_label || disk_name,
      disk_type: disk_type || 'EXTERNAL_HDD',
      physical_location: physical_location || 'Main Office Rack',
      total_capacity_gb: total_capacity_gb || 4000,
      free_capacity_gb: free_capacity_gb || 1800,
      total_capacity_bytes: (total_capacity_gb || 4000) * 1024 * 1024 * 1024,
      free_capacity_bytes: (free_capacity_gb || 1800) * 1024 * 1024 * 1024,
      assigned_to_user_name: assigned_to_user_name || null,
      is_currently_mounted: false,
      last_scanned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('storage_physical_disks')
      .upsert([payload], { onConflict: 'workspace_id,disk_name' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, disk: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
