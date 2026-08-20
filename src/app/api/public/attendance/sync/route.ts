import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { punches } = body;

    if (!Array.isArray(punches) || punches.length === 0) {
      return NextResponse.json({ error: 'No punches provided for synchronization' }, { status: 400 });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const p of punches) {
      try {
        const { id, token, action, timestamp, latitude, longitude, accuracy, selfieBase64, notes } = p;

        if (!token) {
          results.push({ id, success: false, error: 'Missing token' });
          continue;
        }

        // 1. Resolve token
        const { data: link, error: linkErr } = await supabaseAdmin
          .from('attendance_member_links')
          .select('id, user_id, workspace_id, member_id, is_active')
          .eq('secure_token', token.trim())
          .maybeSingle();

        if (linkErr || !link || !link.is_active) {
          results.push({ id, success: false, error: 'Invalid token' });
          continue;
        }

        const punchDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const punchTime = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

        // 2. Fetch Locations
        const { data: locations } = await supabaseAdmin
          .from('attendance_locations')
          .select('id, name, latitude, longitude, radius_meters')
          .eq('user_id', link.user_id)
          .eq('is_active', true);

        let geofenceStatus: 'verified' | 'outside_geofence' | 'no_geofence' = 'no_geofence';
        let matchedLocationId: string | null = null;

        if (locations && locations.length > 0 && latitude && longitude) {
          geofenceStatus = 'outside_geofence';
          for (const loc of locations) {
            const dist = calculateHaversineDistanceMeters(
              Number(latitude),
              Number(longitude),
              Number(loc.latitude),
              Number(loc.longitude)
            );
            if (dist <= Number(loc.radius_meters || 150)) {
              geofenceStatus = 'verified';
              matchedLocationId = loc.id;
              break;
            }
          }
        }

        // 3. Upload Selfie if present
        let photoPath: string | null = null;
        if (selfieBase64 && selfieBase64.includes('base64,')) {
          try {
            const base64Data = selfieBase64.split('base64,')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const pDate = new Date(punchTime);
            const filename = `${link.workspace_id}/${link.member_id}/${pDate.getFullYear()}/${String(pDate.getMonth() + 1).padStart(2, '0')}/${String(pDate.getDate()).padStart(2, '0')}/offline_${action}_${Date.now()}.webp`;

            const { data: uploadData } = await supabaseAdmin.storage
              .from('attendance-selfies')
              .upload(filename, buffer, { contentType: 'image/webp', upsert: true });

            if (uploadData) {
              const { data: urlData } = supabaseAdmin.storage
                .from('attendance-selfies')
                .getPublicUrl(uploadData.path);
              photoPath = urlData.publicUrl || uploadData.path;
            }
          } catch (_) {}
        }

        // 4. Handle Action
        if (action === 'check_in') {
          const { data: existing } = await supabaseAdmin
            .from('attendance_records')
            .select('id')
            .eq('member_id', link.member_id)
            .eq('date', punchDate)
            .maybeSingle();

          const recordPayload = {
            user_id: link.user_id,
            workspace_id: link.workspace_id,
            member_id: link.member_id,
            date: punchDate,
            check_in_time: punchTime,
            check_in_lat: latitude ? Number(latitude) : null,
            check_in_lng: longitude ? Number(longitude) : null,
            check_in_accuracy: accuracy ? Number(accuracy) : null,
            check_in_photo_path: photoPath,
            check_in_location_id: matchedLocationId,
            check_in_verified: true,
            check_in_geofence_status: geofenceStatus,
            status: 'present',
            notes: notes ? `[Offline Synced] ${notes}` : '[Offline Synced]',
            updated_at: new Date().toISOString()
          };

          if (existing) {
            await supabaseAdmin
              .from('attendance_records')
              .update(recordPayload)
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('attendance_records')
              .insert([{ ...recordPayload, created_at: new Date().toISOString() }]);
          }

          results.push({ id, success: true });
        } else if (action === 'check_out') {
          const { data: existing } = await supabaseAdmin
            .from('attendance_records')
            .select('*')
            .eq('member_id', link.member_id)
            .eq('date', punchDate)
            .maybeSingle();

          if (existing) {
            const checkInMs = new Date(existing.check_in_time || punchTime).getTime();
            const checkOutMs = new Date(punchTime).getTime();
            const grossMin = Math.max(0, Math.round((checkOutMs - checkInMs) / 60000));
            const netWorkMinutes = Math.max(0, grossMin - (existing.break_duration_minutes || 0));
            const overtimeMinutes = netWorkMinutes > 540 ? netWorkMinutes - 540 : 0;

            await supabaseAdmin
              .from('attendance_records')
              .update({
                check_out_time: punchTime,
                check_out_lat: latitude ? Number(latitude) : null,
                check_out_lng: longitude ? Number(longitude) : null,
                check_out_photo_path: photoPath || existing.check_out_photo_path,
                check_out_verified: true,
                work_duration_minutes: netWorkMinutes,
                overtime_minutes: overtimeMinutes,
                notes: existing.notes ? `${existing.notes} | [Offline Check-Out Synced]` : '[Offline Check-Out Synced]',
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
          }

          results.push({ id, success: true });
        }
      } catch (itemErr: any) {
        results.push({ id: p.id, success: false, error: itemErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (err: any) {
    console.error('Attendance sync error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
