import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || !token.trim()) {
      return NextResponse.json({ error: 'Attendance token is required' }, { status: 400 });
    }

    // 1. Resolve member link by secure_token
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('attendance_member_links')
      .select('id, user_id, workspace_id, member_id, is_active')
      .eq('secure_token', token.trim())
      .maybeSingle();

    if (linkErr || !link || !link.is_active) {
      if (token.startsWith('mock_') || token.startsWith('demo_')) {
        return NextResponse.json({
          member: {
            id: 'demo_emp_1',
            name: 'Sushant Nawale',
            primary_role: 'Lead Cinematographer',
            avatar_url: null,
            phone_number: '+918169159784'
          },
          todayDate: new Date().toISOString().split('T')[0],
          todayRecord: null,
          activeBreak: null,
          settings: {
            require_selfie: true,
            require_geofence: true,
            grace_period_minutes: 15,
            default_shift_start: '09:30:00',
            default_shift_end: '18:30:00'
          },
          locations: [
            {
              id: 'loc_1',
              name: 'Main Studio HQ (Bandra West)',
              latitude: 19.0596,
              longitude: 72.8295,
              radius_meters: 150
            }
          ],
          shifts: [
            {
              id: 'shift_1',
              name: 'Standard Studio Shift',
              start_time: '09:30:00',
              end_time: '18:30:00',
              grace_period_minutes: 15
            }
          ],
          monthlyHistory: [],
          recentLeaves: []
        });
      }

      return NextResponse.json({ error: 'Invalid or expired personal attendance link' }, { status: 404 });
    }

    // Update last_accessed_at timestamp
    await supabaseAdmin
      .from('attendance_member_links')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', link.id);

    // 2. Fetch Employee Profile
    const { data: member } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .eq('id', link.member_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // 3. Fetch Today's Attendance Record for this member
    const { data: todayRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    // 4. Fetch Active Break if any
    let activeBreak = null;
    if (todayRecord) {
      const { data: openBreak } = await supabaseAdmin
        .from('attendance_breaks')
        .select('*')
        .eq('attendance_record_id', todayRecord.id)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      activeBreak = openBreak;
    }

    // 5. Fetch Settings
    const { data: settings } = await supabaseAdmin
      .from('attendance_settings')
      .select('*')
      .eq('user_id', link.user_id)
      .maybeSingle();

    // 6. Fetch Active Geofence Locations (Include Custom Staff Location first if assigned)
    let locations: any[] = [];
    const { data: allLocations } = await supabaseAdmin
      .from('attendance_locations')
      .select('id, name, latitude, longitude, radius_meters, address')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

    locations = allLocations || [];

    // Prioritize member's direct assigned geofence if configured
    if (member.latitude && member.longitude) {
      const staffLoc = {
        id: `staff_${member.id}`,
        name: member.location_name || 'Assigned Work Location',
        latitude: Number(member.latitude),
        longitude: Number(member.longitude),
        radius_meters: Number(member.radius_meters) || 150,
        address: member.location_name || 'Assigned Studio/Office'
      };
      locations = [staffLoc, ...locations.filter(l => l.name !== staffLoc.name)];
    } else if (member.default_geofence_id) {
      const userLoc = locations.find(l => l.id === member.default_geofence_id);
      if (userLoc) {
        locations = [userLoc, ...locations.filter(l => l.id !== member.default_geofence_id)];
      }
    }

    // 7. Check if today is a Company Holiday or Weekly Off
    const { data: holidayToday } = await supabaseAdmin
      .from('company_holidays')
      .select('*')
      .eq('holiday_date', todayDate)
      .maybeSingle();

    const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date());
    const isWeeklyOff = Array.isArray(member.weekly_offs) && member.weekly_offs.includes(todayDayName);

    // 8. Fetch Active Shifts (or construct from member profile)
    let shifts: any[] = [];
    if (member.shift_start && member.shift_end) {
      shifts.push({
        id: `shift_${member.id}`,
        name: `${member.name}'s Shift`,
        start_time: member.shift_start,
        end_time: member.shift_end,
        grace_period_minutes: 15
      });
    }

    const { data: dbShifts } = await supabaseAdmin
      .from('attendance_shifts')
      .select('id, name, start_time, end_time, grace_period_minutes')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

    if (dbShifts && dbShifts.length > 0) {
      shifts = [...shifts, ...dbShifts];
    } else if (shifts.length === 0) {
      shifts = [{
        id: 'shift_default',
        name: 'Standard Shift (10 AM - 7 PM)',
        start_time: '10:00:00',
        end_time: '19:00:00',
        grace_period_minutes: 15
      }];
    }

    // 8. Fetch Current Month Attendance Records
    const startOfMonth = `${todayDate.substring(0, 7)}-01`;
    const { data: monthlyHistory } = await supabaseAdmin
      .from('attendance_records')
      .select('id, date, status, check_in_time, check_out_time, work_duration_minutes, late_minutes, overtime_minutes, check_in_photo_path, check_out_photo_path')
      .eq('member_id', link.member_id)
      .gte('date', startOfMonth)
      .order('date', { ascending: false });

    // 9. Fetch Recent Leave Requests
    const { data: recentLeaves } = await supabaseAdmin
      .from('attendance_leave_requests')
      .select('id, leave_type, start_date, end_date, reason, status, created_at')
      .eq('member_id', link.member_id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      member,
      todayDate,
      todayRecord,
      activeBreak,
      settings: settings || {
        require_selfie: true,
        require_geofence: true,
        grace_period_minutes: 15,
        default_shift_start: '09:30:00',
        default_shift_end: '18:30:00'
      },
      locations,
      shifts: shifts || [],
      holidayToday: holidayToday || null,
      isWeeklyOff: !!isWeeklyOff,
      monthlyHistory: monthlyHistory || [],
      recentLeaves: recentLeaves || []
    });

  } catch (err: any) {
    console.error('Attendance session API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
