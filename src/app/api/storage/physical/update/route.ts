import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, physical_location, assigned_to_user_name, disk_name } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Disk ID required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (physical_location !== undefined) updates.physical_location = physical_location;
    if (assigned_to_user_name !== undefined) updates.assigned_to_user_name = assigned_to_user_name;
    if (disk_name !== undefined) updates.disk_name = disk_name;

    const { data, error } = await supabase
      .from('storage_physical_disks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, disk: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
