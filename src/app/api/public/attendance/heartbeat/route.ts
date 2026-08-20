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

    const todayDate = new Date().toISOString().split('T')[0];

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

    if (member?.default_geofence_id) {
      const userLoc = locations.find(l => l.id === member.default_geofence_id);
      if (userLoc) {
        locations = [userLoc, ...locations.filter(l => l.id !== member.default_geofence_id)];
      }
    }

    // 4. Calculate Distance & In-Zone Status
    let isInside = false;
    let minDistance = Infinity;
    let allowedRadius = 50;
    let matchedLocationName = '';

    if (locations.length > 0 && lat && lng) {
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
          allowedRadius = Number(loc.radius_meters || 50);
        }

        if (dist <= Number(loc.radius_meters || 50)) {
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

    const shiftEnd = settings?.default_shift_end || '18:30:00';
    const [eH, eM] = shiftEnd.split(':').map(Number);
    const shiftEndMinutes = eH * 60 + eM;

    // Auto-Checkout Trigger:
    // 1) Employee is outside and consecutive outside pings >= 15 (approx 15 mins)
    // 2) OR current time is past shift end AND employee is outside
    let autoCheckoutTriggered = false;
    let finalCheckOutTime = null;

    if (!isInside && (consecutiveOutsidePings >= 15 || currentIstMinutes >= shiftEndMinutes)) {
      autoCheckoutTriggered = true;
      // Stamp checkout at exact exit timestamp if available, otherwise current time
      finalCheckOutTime = lastExitTime || deviceInfo.last_exit_time || now.toISOString();
    }

    // 5. Update Record State
    const checkInMs = new Date(record.check_in_time).getTime();
    const currentMs = now.getTime();
    const grossMinutes = Math.max(0, Math.round((currentMs - checkInMs) / 60000));
    const pausedMinutes = (record.break_duration_minutes || 0) + (isInside ? 0 : 1);
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
      break_duration_minutes: pausedMinutes,
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

    const { data: updatedRecord } = await supabaseAdmin
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', record.id)
      .select('*')
      .single();

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
