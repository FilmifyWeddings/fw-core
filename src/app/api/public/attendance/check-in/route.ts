import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, accuracy, photoBase64, address, deviceInfo } = body;

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

    // 2. Fetch Employee Profile
    const { data: member } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .eq('id', link.member_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Staff member profile not found' }, { status: 404 });
    }

    // 3. Resolve Geofence Locations (Support direct columns, custom_data, and notes fallback)
    let locationsQuery = supabaseAdmin
      .from('attendance_locations')
      .select('id, name, latitude, longitude, radius_meters')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

    const { data: allLocations } = await locationsQuery;
    let locations = allLocations || [];

    const custom = (member.custom_data as any) || {};
    let parsedNotes = {};
    try {
      if (member.notes && member.notes.startsWith('{')) parsedNotes = JSON.parse(member.notes);
    } catch (_) {}

    const mLat = Number(member.latitude) || Number(custom.latitude) || Number((parsedNotes as any).latitude);
    const mLng = Number(member.longitude) || Number(custom.longitude) || Number((parsedNotes as any).longitude);
    const mRadius = Number(member.radius_meters) || Number(custom.radius_meters) || Number((parsedNotes as any).radius_meters) || 150;
    const mLocName = member.location_name || custom.location_name || (parsedNotes as any).location_name || 'Assigned Work Location';

    if (mLat && mLng) {
      const staffLoc = {
        id: `staff_${member.id}`,
        name: mLocName,
        latitude: mLat,
        longitude: mLng,
        radius_meters: mRadius,
        address: mLocName
      };
      locations = [staffLoc, ...locations.filter(l => l.name !== staffLoc.name)];
    } else if (locations.length === 0) {
      locations = [{
        id: 'loc_default',
        name: 'Studio Main Office (Bandra West)',
        latitude: 19.0596,
        longitude: 72.8295,
        radius_meters: 150
      }];
    }

    // 4. Ultra-Fast Geofence Verification using Haversine
    let geofenceStatus: 'verified' | 'outside_geofence' | 'no_geofence' = 'no_geofence';
    let matchedLocationId: string | null = null;
    let minDistance = Infinity;
    let closestLocationName = '';
    let allowedRadius = mRadius || 150;

    const isGeofenceExempt = Boolean(
      member.is_geofence_exempt || 
      member.geofence_required === false || 
      custom.is_geofence_exempt || 
      custom.allow_anywhere || 
      (parsedNotes as any).is_geofence_exempt
    );

    if (isGeofenceExempt) {
      geofenceStatus = 'verified';
      closestLocationName = mLocName || 'Anywhere (Remote Authorized)';
    } else if (locations && locations.length > 0 && lat && lng) {
      for (const loc of locations) {
        const dist = calculateHaversineDistanceMeters(
          Number(lat), 
          Number(lng), 
          Number(loc.latitude), 
          Number(loc.longitude)
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestLocationName = loc.name;
          allowedRadius = Number(loc.radius_meters || 150);
        }

        if (dist <= Number(loc.radius_meters || 150)) {
          geofenceStatus = 'verified';
          matchedLocationId = loc.id;
          break;
        }
      }

      if (geofenceStatus !== 'verified') {
        geofenceStatus = 'outside_geofence';
        const distStr = minDistance >= 1000 ? `${(minDistance / 1000).toFixed(1)} km` : `${minDistance}m`;
        return NextResponse.json({
          error: `Outside Geofence (${distStr} away from ${closestLocationName}). Check-in allowed only inside assigned perimeter (${allowedRadius}m).`,
          distanceMeters: minDistance,
          allowedRadiusMeters: allowedRadius
        }, { status: 403 });
      }
    }

    // 5. Punch Address
    const punchAddress = address || closestLocationName || (lat && lng ? `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}` : 'Studio Location');

    // 6. Selfie Upload to Supabase Storage
    // 6. Accurate Indian Standard Time (Asia/Kolkata) Extraction
    const nowTime = new Date();
    const istDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(nowTime); // Exact YYYY-MM-DD in IST
    const todayDate = istDateStr;

    const istTimeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const istParts = istTimeFormatter.formatToParts(nowTime);
    const istH = Number(istParts.find(p => p.type === 'hour')?.value || 0);
    const istM = Number(istParts.find(p => p.type === 'minute')?.value || 0);
    const currentTotalMinutes = istH * 60 + istM;

    const formattedIstTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(nowTime);

    let photoPath: string | null = null;
    if (photoBase64 && photoBase64.includes('base64,')) {
      try {
        const base64Data = photoBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${link.member_id}_${istDateStr}_in_${Date.now()}.webp`;

        const { data: uploadData } = await supabaseAdmin.storage
          .from('attendance-selfies')
          .upload(filename, buffer, {
            contentType: 'image/webp',
            upsert: true
          });

        if (uploadData) {
          const { data: urlData } = supabaseAdmin.storage
            .from('attendance-selfies')
            .getPublicUrl(uploadData.path);
          photoPath = urlData.publicUrl || uploadData.path;
        }
      } catch (ex) {
        console.error('Checkin selfie upload error:', ex);
      }
    }

    // 7. Check if already checked in today
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', link.member_id)
      .eq('date', istDateStr)
      .maybeSingle();

    if (existingRecord && existingRecord.check_in_time) {
      return NextResponse.json({
        error: 'Already clocked-in today',
        record: existingRecord
      }, { status: 400 });
    }

    // 8. Calculate Shift Timings & Late Penalty
    const mShiftStart = member?.shift_start ? String(member.shift_start).slice(0, 5) : (custom.shift_start ? String(custom.shift_start).slice(0, 5) : '10:00');
    const [shiftHRaw, shiftMRaw] = mShiftStart.split(':').map(Number);
    const shiftH = Number.isFinite(shiftHRaw) ? shiftHRaw : 10;
    const shiftM = Number.isFinite(shiftMRaw) ? shiftMRaw : 0;
    const shiftStartMinutes = shiftH * 60 + shiftM;

    // Check Holiday or Weekly Off
    const { data: holidayToday } = await supabaseAdmin
      .from('company_holidays')
      .select('*')
      .eq('holiday_date', istDateStr)
      .maybeSingle();

    const todayDayName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short'
    }).format(nowTime);
    const weeklyOffsList = Array.isArray(member?.weekly_offs) ? member.weekly_offs : (Array.isArray(custom.weekly_offs) ? custom.weekly_offs : ['Sun']);
    const isWeeklyOff = weeklyOffsList.includes(todayDayName);

    let status: 'present' | 'late' | 'half_day' | 'holiday' | 'week_off' = 'present';
    let lateMinutes = 0;
    let earlyArrivalMinutes = 0;

    if (currentTotalMinutes > shiftStartMinutes) {
      lateMinutes = currentTotalMinutes - shiftStartMinutes;
      if (currentTotalMinutes > shiftStartMinutes + 180) {
        status = 'half_day';
      } else {
        status = 'late';
      }
    } else if (currentTotalMinutes < shiftStartMinutes) {
      earlyArrivalMinutes = shiftStartMinutes - currentTotalMinutes;
      status = 'present';
    } else {
      status = 'present';
    }

    if (holidayToday) {
      status = 'holiday';
    } else if (isWeeklyOff) {
      status = 'week_off';
    }

    const lateText = lateMinutes > 0
      ? `${Math.floor(lateMinutes / 60) > 0 ? `${Math.floor(lateMinutes / 60)}h ` : ''}${lateMinutes % 60}m`
      : null;

    const earlyText = earlyArrivalMinutes > 0
      ? `${Math.floor(earlyArrivalMinutes / 60) > 0 ? `${Math.floor(earlyArrivalMinutes / 60)}h ` : ''}${earlyArrivalMinutes % 60}m`
      : null;

    // 9. Resilient Record Insertion with Column Fallback
    const recordPayload: Record<string, any> = {
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      member_id: link.member_id,
      date: istDateStr,
      status,
      check_in_time: nowTime.toISOString(),
      check_in_lat: lat ? Number(lat) : null,
      check_in_lng: lng ? Number(lng) : null,
      check_in_accuracy: accuracy ? Number(accuracy) : null,
      check_in_photo_path: photoPath || photoBase64,
      check_in_selfie: photoPath || photoBase64,
      check_in_location_id: matchedLocationId,
      check_in_verified: true,
      check_in_geofence_status: geofenceStatus,
      late_minutes: lateMinutes,
      early_arrival_minutes: earlyArrivalMinutes,
      total_work_minutes: 0,
      total_pause_minutes: 0,
      device_info: {
        ...(deviceInfo || {}),
        check_in_ist: formattedIstTime,
        check_in_address: punchAddress,
        selfie_url: photoPath || photoBase64,
        late_minutes: lateMinutes,
        late_text: lateText,
        early_arrival_minutes: earlyArrivalMinutes,
        early_text: earlyText,
        shift_start: mShiftStart,
        is_holiday_work: !!holidayToday,
        is_week_off_work: !!isWeeklyOff,
        holiday_name: holidayToday?.name || null,
        last_heartbeat_at: nowTime.toISOString(),
        last_heartbeat_inside: true
      },
      notes: punchAddress ? `Punch In: ${punchAddress}` : null,
      updated_at: nowTime.toISOString()
    };

    let savedRecord = null;
    let currentPayload = { ...recordPayload };

    // Intelligent Retry Loop: Auto-strip any missing column that fails PostgREST schema cache
    for (let attempt = 0; attempt < 5; attempt++) {
      const query = existingRecord
        ? supabaseAdmin.from('attendance_records').update(currentPayload).eq('id', existingRecord.id).select('*').single()
        : supabaseAdmin.from('attendance_records').insert([{ ...currentPayload, created_at: nowTime.toISOString() }]).select('*').single();

      const res = await query;
      if (!res.error) {
        savedRecord = res.data;
        break;
      }

      const errMsg = res.error.message || '';
      const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
      if (match && match[1]) {
        const missingCol = match[1];
        delete currentPayload[missingCol];
      } else {
        console.warn('Attendance record insert attempt error:', errMsg);
        break;
      }
    }

    // Final Fallback if schema cache is still strict
    if (!savedRecord) {
      const minimalCorePayload = {
        user_id: link.user_id,
        workspace_id: link.workspace_id,
        member_id: link.member_id,
        date: todayDate,
        status,
        check_in_time: nowTime.toISOString(),
        check_in_lat: lat ? Number(lat) : null,
        check_in_lng: lng ? Number(lng) : null,
        check_in_photo_path: photoPath || photoBase64,
        notes: punchAddress,
        updated_at: nowTime.toISOString()
      };

      const finalQuery = existingRecord
        ? supabaseAdmin.from('attendance_records').update(minimalCorePayload).eq('id', existingRecord.id).select('*').single()
        : supabaseAdmin.from('attendance_records').insert([{ ...minimalCorePayload, created_at: nowTime.toISOString() }]).select('*').single();

      const finalRes = await finalQuery;
      if (finalRes.error) throw finalRes.error;
      savedRecord = finalRes.data;
    }

    return NextResponse.json({
      success: true,
      record: savedRecord,
      status,
      lateMinutes,
      geofenceStatus,
      punchAddress,
      earlyArrivalMinutes,
      message: status === 'late'
        ? `Checked in at ${formattedIstTime} IST (Late by ${Math.floor(lateMinutes / 60) > 0 ? `${Math.floor(lateMinutes / 60)}h ` : ''}${lateMinutes % 60}m)`
        : earlyArrivalMinutes > 0
        ? `Checked in at ${formattedIstTime} IST (Arrived ${Math.floor(earlyArrivalMinutes / 60) > 0 ? `${Math.floor(earlyArrivalMinutes / 60)}h ` : ''}${earlyArrivalMinutes % 60}m early)`
        : `Checked in on-time at ${formattedIstTime} IST`
    });

  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
