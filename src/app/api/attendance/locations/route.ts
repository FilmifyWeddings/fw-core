import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// GET: Fetch all saved geofence locations
export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id && isValidUUID(session.user.id) ? session.user.id : DEFAULT_USER_ID;

    // Fetch user's locations or default locations
    let query = supabaseAdmin
      .from('attendance_locations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId !== DEFAULT_USER_ID) {
      query = query.or(`user_id.eq.${userId},user_id.eq.${DEFAULT_USER_ID}`);
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error);
      // Fallback: fetch all active locations
      const { data: allLocs } = await supabaseAdmin
        .from('attendance_locations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return NextResponse.json({ locations: allLocs || [] });
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (err: any) {
    console.error('Locations API GET error:', err);
    return NextResponse.json({ locations: [], error: err.message }, { status: 500 });
  }
}

// POST: Create or Update a geofence location
export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id && isValidUUID(session.user.id) ? session.user.id : DEFAULT_USER_ID;

    const body = await request.json();
    const { id, name, latitude, longitude, radius_meters, address } = body;

    if (!name || !latitude || !longitude) {
      return NextResponse.json({ error: 'Name, latitude, and longitude are required' }, { status: 400 });
    }

    const payload: any = {
      user_id: userId,
      workspace_id: userId,
      name: name.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Number(radius_meters) || 50,
      address: address?.trim() || '',
      is_active: true,
      updated_at: new Date().toISOString()
    };

    let resultLocation = null;

    // If existing valid UUID is provided, update
    if (id && isValidUUID(id)) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('attendance_locations')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (updErr) throw updErr;
      resultLocation = updated;
    } else {
      // Create new location with auto-generated UUID
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('attendance_locations')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select('*')
        .single();

      if (insErr) throw insErr;
      resultLocation = inserted;
    }

    return NextResponse.json({ success: true, location: resultLocation });
  } catch (err: any) {
    console.error('Locations API POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save location' }, { status: 500 });
  }
}

// DELETE: Remove a geofence location
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: 'Valid location ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('attendance_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Locations API DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete location' }, { status: 500 });
  }
}
