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
      // Check fallback mock token if local testing
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
              name: 'Mumbai Studio (Andheri West)',
              latitude: 19.1363,
              longitude: 72.8277,
              radius_meters: 250
            }
          ]
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
      .select('id, name, primary_role, avatar_url, phone_number, email')
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

    // 6. Fetch Active Geofence Locations
    const { data: locations } = await supabaseAdmin
      .from('attendance_locations')
      .select('id, name, latitude, longitude, radius_meters, address')
      .eq('user_id', link.user_id)
      .eq('is_active', true);

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
      locations: locations || []
    });

  } catch (err: any) {
    console.error('Attendance session API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
