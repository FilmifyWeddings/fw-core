import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_token, drive_letter, disk_serial } = body;

    let query = supabase.from('storage_physical_disks').update({ is_currently_mounted: false });
    if (disk_serial) {
      query = query.eq('disk_serial', disk_serial);
    } else if (drive_letter) {
      query = query.eq('drive_letter', drive_letter);
    }

    await query;

    return NextResponse.json({ success: true, message: 'Disk marked as unmounted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
