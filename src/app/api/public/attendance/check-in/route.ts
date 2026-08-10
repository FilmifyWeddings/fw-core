import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistance } from '@/lib/geofence';

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

    if (locations && locations.length > 0 && lat && lng) {
      for (const loc of locations) {
        const dist = calculateHaversineDistance(
          Number(lat), 
          Number(lng), 
          Number(loc.latitude), 
          Number(loc.longitude)
        );

        if (dist < minDistance) {
          minDistance = dist;
        }

        if (dist <= Number(loc.radius_meters || 150)) {
          geofenceStatus = 'verified';
          matchedLocationId = loc.id;
          break;
        }
      }

      if (geofenceStatus !== 'verified') {
        geofenceStatus = 'outside_geofence';
      }
    }

    // 5. Selfie Upload to Supabase Storage (if photo supplied)
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
          .from('attendance_selfies')
          .upload(filename, buffer, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          photoPath = uploadData.path;
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

    // Default 09:30 AM + 15 min grace = 09:45 AM (585 min)
    const shiftStart = settings?.default_shift_start || '09:30:00';
    const [sHour, sMin] = shiftStart.split(':').map(Number);
    const grace = Number(settings?.grace_period_minutes || 15);
    const shiftCutoffMinutes = sHour * 60 + sMin + grace;

    let lateMinutes = 0;
    let status: 'present' | 'late' = 'present';
    if (currentTotalMinutes > shiftCutoffMinutes) {
      lateMinutes = currentTotalMinutes - (sHour * 60 + sMin);
      status = 'late';
    }

    // 7. Insert Attendance Record
    const recordPayload = {
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      member_id: link.member_id,
      date: todayDate,
      status: status,
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
      created_at: nowTime.toISOString(),
      updated_at: nowTime.toISOString()
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('attendance_records')
      .upsert(recordPayload, { onConflict: 'member_id,date' })
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting attendance record:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 8. Log to Audit
    await supabaseAdmin.from('attendance_audit_logs').insert([{
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      action: 'CHECK_IN',
      entity_type: 'attendance_record',
      entity_id: inserted.id,
      performed_by: link.member_id,
      new_value: recordPayload,
      reason: 'Mobile selfie clock-in'
    }]);

    return NextResponse.json({
      success: true,
      record: inserted,
      geofenceStatus,
      minDistance: minDistance !== Infinity ? minDistance : null,
      lateMinutes
    });

  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
