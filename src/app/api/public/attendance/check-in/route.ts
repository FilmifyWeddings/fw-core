import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, lat, lng, accuracy, photoBase64, deviceInfo } = body;

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

    // 2. Anti-Duplicate Check: Prevent 2 active check-ins for the same employee today
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('id, check_in_time, status')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    if (existingRecord && existingRecord.check_in_time) {
      return NextResponse.json({ 
        error: 'Already checked in for today',
        record: existingRecord 
      }, { status: 409 });
    }

    // 3. Fetch Settings & Geofence Locations
    const { data: settings } = await supabaseAdmin
      .from('attendance_settings')
      .select('*')
      .eq('user_id', link.user_id)
      .maybeSingle();

    const { data: locations } = await supabaseAdmin
      .from('attendance_locations')
      .select('id, name, latitude, longitude, radius_meters')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

    // 4. Geofence Verification
    let geofenceStatus: 'verified' | 'outside_geofence' | 'no_geofence' = 'no_geofence';
    let matchedLocationId: string | null = null;
    let minDistance = Infinity;
    let closestLocationName = '';
    let allowedRadius = 150;

    if (locations && locations.length > 0 && lat && lng) {
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
        // If geofencing is strictly required and user is outside, block punch
        if (settings?.require_geofence) {
          const distStr = minDistance >= 1000 ? `${(minDistance / 1000).toFixed(1)} km` : `${minDistance}m`;
          return NextResponse.json({
            error: `You are ${distStr} away from ${closestLocationName}. Allowed radius: ${allowedRadius}m.`,
            distanceMeters: minDistance,
            allowedRadiusMeters: allowedRadius
          }, { status: 403 });
        }
      }
    }

    // 5. Selfie Upload to Supabase Storage
    let photoPath: string | null = null;
    if (photoBase64 && photoBase64.includes('base64,')) {
      try {
        const base64Data = photoBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const filename = `${link.workspace_id}/${link.member_id}/${yyyy}/${mm}/${dd}/in_${Date.now()}.webp`;

        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from('attendance-selfies')
          .upload(filename, buffer, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabaseAdmin.storage
            .from('attendance-selfies')
            .getPublicUrl(uploadData.path);
          photoPath = urlData.publicUrl || uploadData.path;
        }
      } catch (uploadEx) {
        console.error('Selfie storage upload exception:', uploadEx);
      }
    }

    // 6. Calculate Late status based on Shift / Grace Period
    const nowTime = new Date();
    const currentHour = nowTime.getHours();
    const currentMin = nowTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMin;

    const shiftStart = settings?.default_shift_start || '09:30:00';
    const [sHour, sMin] = shiftStart.split(':').map(Number);
    const shiftStartMinutes = sHour * 60 + sMin;
    const graceMinutes = Number(settings?.grace_period_minutes || 15);
    const lateThresholdMinutes = shiftStartMinutes + graceMinutes;

    let status: 'present' | 'late' | 'half_day' = 'present';
    let lateMinutes = 0;

    if (currentTotalMinutes > lateThresholdMinutes) {
      status = 'late';
      lateMinutes = currentTotalMinutes - shiftStartMinutes;
    }

    // If more than 3 hours late, mark half_day
    if (currentTotalMinutes > shiftStartMinutes + 180) {
      status = 'half_day';
    }

    // 7. Insert/Update Daily Attendance Record
    const recordPayload = {
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      member_id: link.member_id,
      date: todayDate,
      status,
      check_in_time: nowTime.toISOString(),
      check_in_lat: lat ? Number(lat) : null,
      check_in_lng: lng ? Number(lng) : null,
      check_in_accuracy: accuracy ? Number(accuracy) : null,
      check_in_photo_path: photoPath,
      check_in_location_id: matchedLocationId,
      check_in_verified: true,
      check_in_geofence_status: geofenceStatus,
      late_minutes: lateMinutes,
      device_info: deviceInfo || {},
      updated_at: nowTime.toISOString()
    };

    let savedRecord;
    if (existingRecord) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('attendance_records')
        .update(recordPayload)
        .eq('id', existingRecord.id)
        .select('*')
        .single();

      if (updErr) throw updErr;
      savedRecord = updated;
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('attendance_records')
        .insert([{ ...recordPayload, created_at: nowTime.toISOString() }])
        .select('*')
        .single();

      if (insErr) throw insErr;
      savedRecord = inserted;
    }

    return NextResponse.json({
      success: true,
      record: savedRecord,
      status,
      lateMinutes,
      geofenceStatus,
      message: status === 'late' 
        ? `Checked in at ${nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${lateMinutes} min late)`
        : `Checked in successfully on time at ${nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    });

  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
