import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistanceMeters, reverseGeocodeAddress } from '@/lib/attendance/geo-fence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, accuracy, lastExitTime, isPausedClient } = body;

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
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 2. Fetch today's active attendance record
    const { data: record, error: recErr } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    if (recErr || !record || !record.check_in_time) {
      return NextResponse.json({ active: false, message: 'No active check-in for today' });
    }

    if (record.check_out_time) {
      return NextResponse.json({ active: false, checkedOut: true, record });
    }

    // 3. Fetch Member & Geofence Locations
    const { data: member } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .eq('id', link.member_id)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('attendance_settings')
      .select('*')
      .eq('user_id', link.user_id)
      .maybeSingle();

    let locationsQuery = supabaseAdmin
      .from('attendance_locations')
      .select('id, name, latitude, longitude, radius_meters')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

    const { data: allLocations } = await locationsQuery;
    let locations = allLocations || [];

    // Prioritize member's direct assigned geofence if configured
    if (member?.latitude && member?.longitude) {
      const staffLoc = {
        id: `staff_${member.id}`,
        name: member.location_name || 'Assigned Work Location',
        latitude: Number(member.latitude),
        longitude: Number(member.longitude),
        radius_meters: Number(member.radius_meters) || 150
      };
      locations = [staffLoc, ...locations.filter(l => l.name !== staffLoc.name)];
    } else if (member?.default_geofence_id) {
      const userLoc = locations.find(l => l.id === member.default_geofence_id);
      if (userLoc) {
        locations = [userLoc, ...locations.filter(l => l.id !== member.default_geofence_id)];
      }
    }

    // 4. Calculate Distance & In-Zone Status
    let isInside = false;
    let minDistance = Infinity;
    let allowedRadius = member?.radius_meters ? Number(member.radius_meters) : 150;
    let matchedLocationName = '';

    const custom = (member?.custom_data as any) || {};
    let parsedNotes = {};
    try {
      if (member?.notes && member.notes.startsWith('{')) parsedNotes = JSON.parse(member.notes);
    } catch (_) {}

    const isMemberExempt = Boolean(
      member?.is_geofence_exempt === true ||
      member?.geofence_required === false ||
      custom.is_geofence_exempt === true ||
      custom.allow_anywhere === true ||
      custom.geofence_required === false ||
      (parsedNotes as any).is_geofence_exempt === true ||
      (parsedNotes as any).allow_anywhere === true ||
      (parsedNotes as any).geofence_required === false
    );

    if (isMemberExempt) {
      isInside = true;
      minDistance = 0;
      allowedRadius = 99999;
      matchedLocationName = 'Remote / Anywhere';
    } else if (locations.length > 0 && lat && lng) {
      for (const loc of locations) {
        const dist = calculateHaversineDistanceMeters(
          Number(lat),
          Number(lng),
          Number(loc.latitude),
          Number(loc.longitude)
        );

        if (dist < minDistance) {
          minDistance = dist;
          matchedLocationName = loc.name;
          allowedRadius = Number(loc.radius_meters || 150);
        }

        if (dist <= Number(loc.radius_meters || 150)) {
          isInside = true;
          break;
        }
      }
    } else {
      isInside = true;
    }

    const now = new Date();
    const deviceInfo = record.device_info || {};
    let consecutiveOutsidePings = (deviceInfo.consecutive_outside_pings || 0);

    if (isInside) {
      consecutiveOutsidePings = 0;
    } else {
      consecutiveOutsidePings += 1;
    }

    // Check if current time is past shift end in IST
    const istTimeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).format(now);
    const [istH, istM] = istTimeStr.split(':').map(Number);
    const currentIstMinutes = istH * 60 + istM;

    const shiftEnd = member?.shift_end ? member.shift_end.slice(0, 5) : (settings?.default_shift_end || '19:00:00');
    const [eH, eM] = shiftEnd.split(':').map(Number);
    const shiftEndMinutes = eH * 60 + eM;

    // Auto-Checkout Trigger:
    // 1) Employee is outside and consecutive outside pings >= 15 (approx 15 mins)
    // 2) OR current time is past shift end AND employee is outside
    let autoCheckoutTriggered = false;
    let finalCheckOutTime = null;

    if (!isInside && (consecutiveOutsidePings >= 15 || currentIstMinutes >= shiftEndMinutes)) {
      autoCheckoutTriggered = true;
      finalCheckOutTime = lastExitTime || deviceInfo.last_exit_time || now.toISOString();
    }

    // Manage attendance_pause_logs (Auto-pause out of bounds events)
    try {
      if (!isInside && !autoCheckoutTriggered) {
        // Check if there is already an open pause log
        const { data: openPause } = await supabaseAdmin
          .from('attendance_pause_logs')
          .select('id')
          .eq('attendance_record_id', record.id)
          .is('resumed_at', null)
          .maybeSingle();

        if (!openPause) {
          await supabaseAdmin.from('attendance_pause_logs').insert([{
            user_id: link.user_id,
            workspace_id: link.workspace_id,
            attendance_record_id: record.id,
            member_id: link.member_id,
            paused_at: now.toISOString(),
            reason: `Out of Bounds (${minDistance}m from ${matchedLocationName})`
          }]);
        }
      } else if (isInside) {
        // Resumed inside perimeter: close open pause log if any
        const { data: openPause } = await supabaseAdmin
          .from('attendance_pause_logs')
          .select('id, paused_at')
          .eq('attendance_record_id', record.id)
          .is('resumed_at', null)
          .maybeSingle();

        if (openPause) {
          const pauseStartMs = new Date(openPause.paused_at).getTime();
          const durationMins = Math.max(1, Math.round((now.getTime() - pauseStartMs) / 60000));
          await supabaseAdmin
            .from('attendance_pause_logs')
            .update({
              resumed_at: now.toISOString(),
              duration_minutes: durationMins
            })
            .eq('id', openPause.id);
        }
      }
    } catch (pauseLogErr) {
      console.warn('Pause log error:', pauseLogErr);
    }

    // 5. Update Record State
    const checkInMs = new Date(record.check_in_time).getTime();
    const currentMs = now.getTime();
    const grossMinutes = Math.max(0, Math.round((currentMs - checkInMs) / 60000));
    const pausedMinutes = (record.break_duration_minutes || record.total_pause_minutes || 0) + (isInside ? 0 : 1);
    const netActiveMinutes = Math.max(0, grossMinutes - pausedMinutes);

    const updatedDeviceInfo = {
      ...deviceInfo,
      last_heartbeat_at: now.toISOString(),
      last_heartbeat_inside: isInside,
      last_heartbeat_distance_meters: minDistance,
      consecutive_outside_pings: consecutiveOutsidePings,
      last_exit_time: !isInside ? (lastExitTime || deviceInfo.last_exit_time || now.toISOString()) : null,
      auto_checkout_triggered: autoCheckoutTriggered
    };

    const updatePayload: any = {
      work_duration_minutes: netActiveMinutes,
      total_work_minutes: netActiveMinutes,
      break_duration_minutes: pausedMinutes,
      total_pause_minutes: pausedMinutes,
      auto_checkout: autoCheckoutTriggered,
      device_info: updatedDeviceInfo,
      updated_at: now.toISOString()
    };

    if (autoCheckoutTriggered) {
      updatePayload.check_out_time = finalCheckOutTime;
      updatePayload.check_out_lat = lat ? Number(lat) : null;
      updatePayload.check_out_lng = lng ? Number(lng) : null;
      updatePayload.check_out_verified = true;
      updatePayload.notes = [record.notes, `Auto-Checked Out at exit time: ${finalCheckOutTime}`].filter(Boolean).join(' | ');
    }

    let updatedRecord = null;
    let currentPayload = { ...updatePayload };

    for (let attempt = 0; attempt < 5; attempt++) {
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
        delete currentPayload[match[1]];
      } else {
        break;
      }
    }

    if (!updatedRecord) {
      const minimalPayload = {
        work_duration_minutes: netActiveMinutes,
        break_duration_minutes: pausedMinutes,
        updated_at: now.toISOString()
      };
      const finalRes = await supabaseAdmin
        .from('attendance_records')
        .update(minimalPayload)
        .eq('id', record.id)
        .select('*')
        .single();
      updatedRecord = finalRes.data;
    }

    return NextResponse.json({
      success: true,
      active: !autoCheckoutTriggered,
      isInside,
      minDistance,
      allowedRadius,
      consecutiveOutsidePings,
      autoCheckoutTriggered,
      workDurationMinutes: netActiveMinutes,
      pausedMinutes,
      record: updatedRecord
    });

  } catch (err: any) {
    console.error('Attendance heartbeat error:', err);
    return NextResponse.json({ error: err.message || 'Heartbeat internal error' }, { status: 500 });
  }
}
