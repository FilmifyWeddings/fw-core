import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, accuracy, photoBase64 } = body;

    if (!token || !token.trim()) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Resolve member link
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('attendance_member_links')
      .select('id, user_id, workspace_id, member_id, is_active')
      .eq('secure_token', token.trim())
      .maybeSingle();

    if (linkErr || !link || !link.is_active) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // 2. Fetch today's record
    const { data: record, error: recErr } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    if (recErr || !record || !record.check_in_time) {
      return NextResponse.json({ error: 'No active check-in found for today' }, { status: 404 });
    }

    // 3. Close open break if any
    const nowTime = new Date();
    await supabaseAdmin
      .from('attendance_breaks')
      .update({ break_end: nowTime.toISOString() })
      .eq('attendance_record_id', record.id)
      .is('break_end', null);

    // 4. Calculate total break duration in minutes
    const { data: breaks } = await supabaseAdmin
      .from('attendance_breaks')
      .select('break_start, break_end, duration_minutes')
      .eq('attendance_record_id', record.id);

    let totalBreakMinutes = 0;
    if (breaks) {
      breaks.forEach(b => {
        if (b.break_start && b.break_end) {
          const bStart = new Date(b.break_start).getTime();
          const bEnd = new Date(b.break_end).getTime();
          const diffMin = Math.max(0, Math.round((bEnd - bStart) / 60000));
          totalBreakMinutes += diffMin;
        }
      });
    }

    // 5. Calculate total gross work time and net work time
    const checkInMs = new Date(record.check_in_time).getTime();
    const checkOutMs = nowTime.getTime();
    const grossMinutes = Math.max(0, Math.round((checkOutMs - checkInMs) / 60000));
    const netWorkMinutes = Math.max(0, grossMinutes - totalBreakMinutes);

    // Overtime threshold (default 9 hours = 540 min)
    const overtimeThreshold = 540;
    const overtimeMinutes = netWorkMinutes > overtimeThreshold ? netWorkMinutes - overtimeThreshold : 0;

    // Optional Check-Out Photo Upload
    let photoPath: string | null = null;
    if (photoBase64 && photoBase64.includes('base64,')) {
      try {
        const base64Data = photoBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${link.workspace_id}/${link.member_id}/${nowTime.getFullYear()}/${String(nowTime.getMonth() + 1).padStart(2, '0')}/${String(nowTime.getDate()).padStart(2, '0')}/out_${Date.now()}.webp`;

        const { data: uploadData } = await supabaseAdmin.storage
          .from('attendance_selfies')
          .upload(filename, buffer, { contentType: 'image/webp', upsert: true });

        if (uploadData) photoPath = uploadData.path;
      } catch (ex) {
        console.error('Checkout photo upload ex:', ex);
      }
    }

    // 6. Update Record
    const updatePayload = {
      check_out_time: nowTime.toISOString(),
      check_out_lat: lat ? Number(lat) : null,
      check_out_lng: lng ? Number(lng) : null,
      check_out_photo_path: photoPath || record.check_out_photo_path,
      check_out_verified: true,
      work_duration_minutes: netWorkMinutes,
      break_duration_minutes: totalBreakMinutes,
      overtime_minutes: overtimeMinutes,
      updated_at: nowTime.toISOString()
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', record.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit Log
    await supabaseAdmin.from('attendance_audit_logs').insert([{
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      action: 'CHECK_OUT',
      entity_type: 'attendance_record',
      entity_id: record.id,
      performed_by: link.member_id,
      new_value: updatePayload,
      reason: 'Mobile check-out'
    }]);

    return NextResponse.json({
      success: true,
      record: updated,
      netWorkMinutes,
      totalBreakMinutes,
      overtimeMinutes
    });

  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
