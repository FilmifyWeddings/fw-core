import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, accuracy, photoBase64, address } = body;

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

    if (record.check_out_time) {
      return NextResponse.json({ error: 'Already checked out for today', record }, { status: 409 });
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

    // Automated Half Day Check: If total working minutes < 240 mins (4 hours)
    let finalStatus = record.status;
    if (netWorkMinutes < 240) {
      finalStatus = 'half_day';
    }

    // Overtime threshold (default 9 hours = 540 min)
    const overtimeThreshold = 540;
    const overtimeMinutes = netWorkMinutes > overtimeThreshold ? netWorkMinutes - overtimeThreshold : 0;

    // Fast Check-Out Address
    const punchOutAddress = address || (lat && lng ? `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}` : 'Studio Venue');

    // Persistent Check-Out Photo Upload to Supabase Storage
    let photoPath: string | null = null;
    if (photoBase64 && photoBase64.includes('base64,')) {
      try {
        const base64Data = photoBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${link.member_id}_${todayDate}_out_${Date.now()}.webp`;

        const { data: uploadData } = await supabaseAdmin.storage
          .from('attendance-selfies')
          .upload(filename, buffer, { contentType: 'image/webp', upsert: true });

        if (uploadData) {
          const { data: urlData } = supabaseAdmin.storage
            .from('attendance-selfies')
            .getPublicUrl(uploadData.path);
          photoPath = urlData.publicUrl || uploadData.path;
        }
      } catch (ex) {
        console.error('Checkout photo upload error:', ex);
      }
    }

    const formattedIstTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(nowTime);

    const updatedNotes = [
      record.notes,
      punchOutAddress ? `Punch Out: ${punchOutAddress}` : null
    ].filter(Boolean).join(' | ');

    const updatedDeviceInfo = {
      ...(record.device_info || {}),
      check_out_ist: formattedIstTime,
      check_out_address: punchOutAddress
    };

    // 6. Update Record
    const updatePayload = {
      status: finalStatus,
      check_out_time: nowTime.toISOString(),
      check_out_lat: lat ? Number(lat) : null,
      check_out_lng: lng ? Number(lng) : null,
      check_out_photo_path: photoPath || photoBase64 || record.check_out_photo_path,
      check_out_selfie: photoPath || photoBase64 || record.check_out_photo_path,
      check_out_verified: true,
      work_duration_minutes: netWorkMinutes,
      total_work_minutes: netWorkMinutes,
      break_duration_minutes: totalBreakMinutes,
      total_pause_minutes: totalBreakMinutes,
      overtime_minutes: overtimeMinutes,
      device_info: updatedDeviceInfo,
      notes: updatedNotes,
      updated_at: nowTime.toISOString()
    };

    const { data: updatedRecord, error: updErr } = await supabaseAdmin
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', record.id)
      .select('*')
      .single();

    if (updErr) throw updErr;

    const workHoursFormatted = `${Math.floor(netWorkMinutes / 60)}h ${netWorkMinutes % 60}m`;

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      status: finalStatus,
      workDurationMinutes: netWorkMinutes,
      overtimeMinutes,
      punchOutAddress,
      message: `Checked out at ${formattedIstTime} IST (Total Work: ${workHoursFormatted})`
    });

  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
