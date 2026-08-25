import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, photoBase64, address } = body;

    if (!token || !token.trim()) {
      return NextResponse.json({ error: 'Attendance token is required' }, { status: 400 });
    }

    // 1. Resolve member link
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('attendance_member_links')
      .select('id, user_id, workspace_id, member_id, is_active')
      .eq('secure_token', token.trim())
      .maybeSingle();

    if (linkErr || !link || !link.is_active) {
      return NextResponse.json({ error: 'Invalid or expired attendance link' }, { status: 404 });
    }

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 2. Fetch today's record & member profile
    const { data: record, error: recErr } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    if (recErr || !record || !record.check_in_time) {
      return NextResponse.json({ error: 'No active check-in record found for today' }, { status: 400 });
    }

    if (record.check_out_time) {
      return NextResponse.json({
        error: 'Already clocked-out today',
        record
      }, { status: 400 });
    }

    const { data: member } = await supabaseAdmin
      .from('fw_team_members')
      .select('id, name, shift_start, shift_end, custom_data')
      .eq('id', link.member_id)
      .maybeSingle();

    // 3. Close any open break if active
    const { data: openBreak } = await supabaseAdmin
      .from('attendance_breaks')
      .select('*')
      .eq('attendance_record_id', record.id)
      .is('break_end', null)
      .maybeSingle();

    const nowTime = new Date();

    if (openBreak) {
      const bStart = new Date(openBreak.break_start).getTime();
      const bEnd = nowTime.getTime();
      const bDuration = Math.max(1, Math.round((bEnd - bStart) / (1000 * 60)));

      await supabaseAdmin
        .from('attendance_breaks')
        .update({
          break_end: nowTime.toISOString(),
          duration_minutes: bDuration,
          updated_at: nowTime.toISOString()
        })
        .eq('id', openBreak.id);
    }

    // 4. Calculate Total Break / Paused Duration
    const { data: allBreaks } = await supabaseAdmin
      .from('attendance_breaks')
      .select('duration_minutes')
      .eq('attendance_record_id', record.id);

    const totalBreakMinutes = (allBreaks || []).reduce((acc, b) => acc + (b.duration_minutes || 0), 0);

    // 5. Calculate Total Active Work Duration
    const inTime = new Date(record.check_in_time).getTime();
    const outTime = nowTime.getTime();
    const grossWorkMinutes = Math.max(1, Math.round((outTime - inTime) / (1000 * 60)));
    const netWorkMinutes = Math.max(1, grossWorkMinutes - totalBreakMinutes);

    // If net work is less than 4 hours (240 min) and wasn't late, mark as half-day
    let finalStatus = record.status;
    if (netWorkMinutes < 240 && finalStatus === 'present') {
      finalStatus = 'half_day';
    }

    // Overtime threshold (default 9 hours = 540 min)
    const overtimeThreshold = 540;
    const overtimeMinutes = netWorkMinutes > overtimeThreshold ? netWorkMinutes - overtimeThreshold : 0;

    // Calculate Early Checkout vs Shift End Time (IST)
    const custom = (member?.custom_data as any) || {};
    const mShiftEnd = member?.shift_end ? member.shift_end.slice(0, 5) : (custom.shift_end ? custom.shift_end.slice(0, 5) : '19:00');
    const [sEndH, sEndM] = mShiftEnd.split(':').map(Number);
    const shiftEndTotalMinutes = sEndH * 60 + sEndM;

    const istTimeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).format(nowTime);
    const [currH, currM] = istTimeStr.split(':').map(Number);
    const currentTotalMinutes = currH * 60 + currM;

    let earlyCheckoutMinutes = 0;
    let lateDepartureMinutes = 0;
    if (currentTotalMinutes < shiftEndTotalMinutes) {
      earlyCheckoutMinutes = shiftEndTotalMinutes - currentTotalMinutes;
    } else if (currentTotalMinutes > shiftEndTotalMinutes) {
      lateDepartureMinutes = currentTotalMinutes - shiftEndTotalMinutes;
    }

    const finalOvertimeMinutes = Math.max(overtimeMinutes, lateDepartureMinutes);

    // Check-Out Address
    const punchOutAddress = address || (lat && lng ? `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}` : 'Studio Venue');

    // Check-Out Photo Upload to Supabase Storage
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
      check_out_address: punchOutAddress,
      early_checkout_minutes: earlyCheckoutMinutes,
      late_departure_minutes: lateDepartureMinutes,
      overtime_minutes: finalOvertimeMinutes,
      selfie_out_url: photoPath || photoBase64
    };

    // 6. Resilient Record Update with Retry Loop
    const updatePayload: Record<string, any> = {
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
      overtime_minutes: finalOvertimeMinutes,
      early_checkout_minutes: earlyCheckoutMinutes,
      device_info: updatedDeviceInfo,
      notes: updatedNotes,
      updated_at: nowTime.toISOString()
    };

    let updatedRecord = null;
    let currentPayload = { ...updatePayload };

    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await supabaseAdmin
        .from('attendance_records')
        .update(currentPayload)
        .eq('id', record.id)
        .select('*')
        .single();

      if (!res.error) {
        updatedRecord = res.data;
        break;
      }

      const errMsg = res.error.message || '';
      const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
      if (match && match[1]) {
        const missingCol = match[1];
        delete currentPayload[missingCol];
      } else {
        break;
      }
    }

    if (!updatedRecord) {
      const minimalPayload = {
        status: finalStatus,
        check_out_time: nowTime.toISOString(),
        check_out_lat: lat ? Number(lat) : null,
        check_out_lng: lng ? Number(lng) : null,
        check_out_photo_path: photoPath || photoBase64,
        work_duration_minutes: netWorkMinutes,
        break_duration_minutes: totalBreakMinutes,
        notes: updatedNotes,
        updated_at: nowTime.toISOString()
      };

      const finalRes = await supabaseAdmin
        .from('attendance_records')
        .update(minimalPayload)
        .eq('id', record.id)
        .select('*')
        .single();

      if (finalRes.error) throw finalRes.error;
      updatedRecord = finalRes.data;
    }

    const workHoursFormatted = `${Math.floor(netWorkMinutes / 60)}h ${netWorkMinutes % 60}m`;

    let checkoutMsg = `Clocked out at ${formattedIstTime} IST (Worked: ${workHoursFormatted})`;
    if (earlyCheckoutMinutes > 0) {
      const eHrs = Math.floor(earlyCheckoutMinutes / 60);
      const eMins = earlyCheckoutMinutes % 60;
      const earlyStr = eHrs > 0 && eMins > 0 ? `${eHrs}h ${eMins}m` : (eHrs > 0 ? `${eHrs}h` : `${eMins}m`);
      checkoutMsg = `Clocked out at ${formattedIstTime} IST (Left ${earlyStr} early | Worked: ${workHoursFormatted})`;
    } else if (overtimeMinutes > 0) {
      const oHrs = Math.floor(overtimeMinutes / 60);
      const oMins = overtimeMinutes % 60;
      const otStr = oHrs > 0 && oMins > 0 ? `${oHrs}h ${oMins}m` : (oHrs > 0 ? `${oHrs}h` : `${oMins}m`);
      checkoutMsg = `Clocked out at ${formattedIstTime} IST (+${otStr} Overtime | Worked: ${workHoursFormatted})`;
    }

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      status: finalStatus,
      workDurationMinutes: netWorkMinutes,
      breakDurationMinutes: totalBreakMinutes,
      earlyCheckoutMinutes,
      overtimeMinutes,
      message: checkoutMsg
    });

  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
