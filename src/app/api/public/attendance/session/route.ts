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

    // 2. Fetch Employee Profile (from fw_team_members or workspace_members for in-house crew)
    let member: any = null;
    const { data: fwMember } = await supabaseAdmin
      .from('fw_team_members')
      .select('*')
      .eq('id', link.member_id)
      .maybeSingle();

    if (fwMember) {
      member = fwMember;
    } else {
      const { data: wsMember } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('id', link.member_id)
        .maybeSingle();

      if (wsMember) {
        member = {
          ...wsMember,
          primary_role: wsMember.primary_role || wsMember.role || 'Staff Member',
          role: wsMember.primary_role || wsMember.role || 'Staff Member',
          primary_type: wsMember.primary_type || 'IN_HOUSE',
          member_type: wsMember.primary_type || 'IN_HOUSE',
          phone: wsMember.phone || '',
          name: wsMember.name || 'Team Member',
          email: wsMember.email || '',
        };
      }
    }

    if (!member) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Resolve any member aliases across fw_team_members & workspace_members so no punch records are omitted
    const memberAliasIds = [link.member_id];
    if (member?.id && !memberAliasIds.includes(member.id)) {
      memberAliasIds.push(member.id);
    }
    const searchEmail = (member?.email || '').trim().toLowerCase();
    const searchName = (member?.name || '').trim();

    if (searchEmail || searchName) {
      const orCondition = searchEmail && searchName 
        ? `email.ilike.${searchEmail},name.ilike.${searchName}`
        : searchEmail ? `email.ilike.${searchEmail}` : `name.ilike.${searchName}`;

      const [aliasFw, aliasWs] = await Promise.all([
        supabaseAdmin.from('fw_team_members').select('id').or(orCondition),
        supabaseAdmin.from('workspace_members').select('id').or(orCondition)
      ]);

      (aliasFw.data || []).forEach((a: any) => {
        if (a.id && !memberAliasIds.includes(a.id)) memberAliasIds.push(a.id);
      });
      (aliasWs.data || []).forEach((a: any) => {
        if (a.id && !memberAliasIds.includes(a.id)) memberAliasIds.push(a.id);
      });
    }

    // 3. Fetch Today's Attendance Record for this member (supporting aliases)
    const { data: todayRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .in('member_id', memberAliasIds)
      .eq('date', todayDate)
      .order('created_at', { ascending: false })
      .limit(1)
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

    // Prioritize member's direct assigned geofence (from columns, custom_data, or notes JSON)
    const custom = (member.custom_data as any) || {};
    let parsedNotes = {};
    try {
      if (member.notes && member.notes.startsWith('{')) parsedNotes = JSON.parse(member.notes);
    } catch (_) {}

    const isMemberExempt = Boolean(
      member.geofence_exempt === true ||
      member.is_geofence_exempt === true ||
      member.geofence_required === false ||
      custom.geofence_exempt === true ||
      custom.is_geofence_exempt === true ||
      custom.allow_anywhere === true ||
      custom.geofence_required === false ||
      (parsedNotes as any).geofence_exempt === true ||
      (parsedNotes as any).is_geofence_exempt === true ||
      (parsedNotes as any).allow_anywhere === true ||
      (parsedNotes as any).geofence_required === false
    );

    const mLat = Number(member.office_latitude) || Number(member.assigned_lat) || Number(member.latitude) || Number(custom.office_latitude) || Number(custom.assigned_lat) || Number(custom.latitude) || Number((parsedNotes as any).office_latitude) || Number((parsedNotes as any).latitude);
    const mLng = Number(member.office_longitude) || Number(member.assigned_lng) || Number(member.longitude) || Number(custom.office_longitude) || Number(custom.assigned_lng) || Number(custom.longitude) || Number((parsedNotes as any).office_longitude) || Number((parsedNotes as any).longitude);
    const mRadius = Number(member.geofence_radius_meters) || Number(member.radius_meters) || Number(custom.geofence_radius_meters) || Number(custom.radius_meters) || Number((parsedNotes as any).radius_meters) || 100;
    const mLocName = member.office_address || member.location_name || custom.office_address || custom.location_name || (parsedNotes as any).location_name || 'Assigned Studio/Office';

    if (isMemberExempt) {
      locations = [{
        id: 'loc_exempt',
        name: 'Anywhere (Remote Authorized)',
        latitude: mLat || 19.0596,
        longitude: mLng || 72.8295,
        radius_meters: 50000000, // 50,000 km (covers entire earth)
        address: 'Remote / Unlimited Perimeter'
      }];
    } else if (mLat && mLng) {
      const staffLoc = {
        id: `staff_${member.id}`,
        name: mLocName,
        latitude: mLat,
        longitude: mLng,
        radius_meters: mRadius,
        address: mLocName
      };
      locations = [staffLoc, ...locations.filter(l => l.name !== staffLoc.name)];
    } else if (member.default_geofence_id) {
      const userLoc = locations.find(l => l.id === member.default_geofence_id);
      if (userLoc) {
        locations = [userLoc, ...locations.filter(l => l.id !== member.default_geofence_id)];
      }
    }

    if (locations.length === 0) {
      locations = [{
        id: 'loc_default',
        name: 'Studio Main Office (Bandra West)',
        latitude: 19.0596,
        longitude: 72.8295,
        radius_meters: 150,
        address: 'Studio Main Office, Bandra West, Mumbai'
      }];
    }

    // 7. Check Company Holidays (all holidays for workspace + today's holiday)
    const { data: allHolidays } = await supabaseAdmin
      .from('company_holidays')
      .select('id, holiday_date, name, note, is_optional')
      .eq('user_id', link.user_id)
      .order('holiday_date', { ascending: true });

    const holidayToday = (allHolidays || []).find(h => h.holiday_date === todayDate) || null;

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


    // 9. Fetch Attendance Records & Logs (supporting past months calendar switcher or date range)
    const monthParam = searchParams.get('month');
    const startDateParam = searchParams.get('startDate') || searchParams.get('start_date');
    const endDateParam = searchParams.get('endDate') || searchParams.get('end_date');

    let recQuery = supabaseAdmin
      .from('attendance_records')
      .select('*')
      .in('member_id', memberAliasIds)
      .order('date', { ascending: false });

    let logQuery = supabaseAdmin
      .from('attendance_logs')
      .select('*')
      .in('member_id', memberAliasIds)
      .order('date', { ascending: false });

    if (startDateParam && endDateParam) {
      recQuery = recQuery.gte('date', startDateParam).lte('date', endDateParam);
      logQuery = logQuery.gte('date', startDateParam).lte('date', endDateParam);
    } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      recQuery = recQuery.gte('date', `${monthParam}-01`).lte('date', `${monthParam}-31`);
      logQuery = logQuery.gte('date', `${monthParam}-01`).lte('date', `${monthParam}-31`);
    } else {
      // Default: past 730 days (2 years) so that any month/preset selected in UI displays immediately
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      const minDate = pastDate.toISOString().split('T')[0];
      recQuery = recQuery.gte('date', minDate);
      logQuery = logQuery.gte('date', minDate);
    }

    const [{ data: recData }, { data: logData }] = await Promise.all([
      recQuery,
      logQuery
    ]);

    const mergedMap = new Map<string, any>();
    (recData || []).forEach((r: any) => {
      const recInPhoto = r.check_in_photo || r.check_in_selfie || r.check_in_photo_path || r.selfie_url || r.photo_path || null;
      const recOutPhoto = r.check_out_photo || r.check_out_selfie || r.punch_out_selfie || r.check_out_photo_path || null;

      mergedMap.set(r.date, {
        ...r,
        punch_in_time: r.punch_in_time || r.check_in_time,
        punch_out_time: r.punch_out_time || r.check_out_time,
        punch_in_lat: r.punch_in_lat || r.check_in_lat || null,
        punch_in_lng: r.punch_in_lng || r.check_in_lng || null,
        punch_out_lat: r.punch_out_lat || r.check_out_lat || null,
        punch_out_lng: r.punch_out_lng || r.check_out_lng || null,
        selfie_url: recInPhoto,
        check_in_photo: recInPhoto,
        check_in_selfie: recInPhoto,
        check_out_selfie_url: recOutPhoto,
        check_out_photo: recOutPhoto,
        check_out_selfie: recOutPhoto,
        location_address: r.location_address || r.location_name || null,
        check_out_address: r.check_out_address || r.location_address || r.location_name || null,
      });
    });

    (logData || []).forEach((log: any) => {
      const existing = mergedMap.get(log.date);
      const logInPhoto = log.selfie_url || log.punch_in_selfie || log.check_in_selfie || log.check_in_photo || null;
      const logOutPhoto = log.check_out_selfie_url || log.punch_out_selfie || log.check_out_photo_path || log.check_out_selfie || null;

      if (existing) {
        existing.log_id = log.id;
        if (log.punch_in_time) {
          existing.punch_in_time = log.punch_in_time;
          if (!existing.check_in_time) existing.check_in_time = log.punch_in_time;
        }
        if (log.punch_out_time) {
          existing.punch_out_time = log.punch_out_time;
          if (!existing.check_out_time) existing.check_out_time = log.punch_out_time;
        }
        if (log.total_work_minutes !== undefined && log.total_work_minutes !== null) {
          existing.total_work_minutes = log.total_work_minutes;
          if (!existing.work_duration_minutes) existing.work_duration_minutes = log.total_work_minutes;
        }
        if (log.punch_in_lat) existing.punch_in_lat = log.punch_in_lat;
        if (log.punch_in_lng) existing.punch_in_lng = log.punch_in_lng;
        if (log.punch_out_lat) existing.punch_out_lat = log.punch_out_lat;
        if (log.punch_out_lng) existing.punch_out_lng = log.punch_out_lng;
        if (log.early_minutes) existing.early_minutes = log.early_minutes;
        if (log.late_minutes) existing.late_minutes = log.late_minutes;
        if (log.overtime_minutes) existing.overtime_minutes = log.overtime_minutes;
        if (logInPhoto && !existing.selfie_url) existing.selfie_url = logInPhoto;
        if (logInPhoto && !existing.check_in_photo) existing.check_in_photo = logInPhoto;
        if (logOutPhoto && !existing.check_out_selfie_url) existing.check_out_selfie_url = logOutPhoto;
        if (logOutPhoto && !existing.check_out_photo) existing.check_out_photo = logOutPhoto;
        if (log.location_address && !existing.location_address) existing.location_address = log.location_address;
        if (log.check_out_address && !existing.check_out_address) existing.check_out_address = log.check_out_address;
      } else {
        mergedMap.set(log.date, {
          id: log.id,
          log_id: log.id,
          member_id: member.id,
          date: log.date,
          status: (log.status || 'present').toLowerCase(),
          check_in_time: log.punch_in_time,
          punch_in_time: log.punch_in_time,
          check_out_time: log.punch_out_time,
          punch_out_time: log.punch_out_time,
          punch_in_lat: log.punch_in_lat,
          punch_in_lng: log.punch_in_lng,
          punch_out_lat: log.punch_out_lat,
          punch_out_lng: log.punch_out_lng,
          early_minutes: log.early_minutes,
          late_minutes: log.late_minutes,
          overtime_minutes: log.overtime_minutes,
          selfie_url: logInPhoto,
          check_in_photo: logInPhoto,
          check_in_selfie: logInPhoto,
          check_out_selfie_url: logOutPhoto,
          check_out_photo: logOutPhoto,
          check_out_selfie: logOutPhoto,
          location_address: log.location_address || null,
          check_out_address: log.check_out_address || null,
          work_duration_minutes: log.total_work_minutes || 0,
          total_work_minutes: log.total_work_minutes || 0,
          is_geofence_exempt: log.is_geofence_exempt || false,
          notes: log.notes
        });
      }
    });

    const monthlyHistory = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // 10. Fetch Recent Leave Requests
    const { data: recentLeaves } = await supabaseAdmin
      .from('attendance_leave_requests')
      .select('id, leave_type, start_date, end_date, reason, status, created_at')
      .in('member_id', memberAliasIds)
      .order('created_at', { ascending: false })
      .limit(10);

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
      companyHolidays: allHolidays || [],
      isWeeklyOff: !!isWeeklyOff,
      monthlyHistory: monthlyHistory || [],
      recentLeaves: recentLeaves || []
    });

  } catch (err: any) {
    console.error('Attendance session API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
