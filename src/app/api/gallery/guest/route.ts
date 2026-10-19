import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('id') || searchParams.get('guest_id');
    const token = searchParams.get('token');

    if (!guestId && !token) {
      return NextResponse.json({ success: false, error: 'guest_id or token is required' }, { status: 400 });
    }

    let query = supabaseAdmin.from('event_guest_registrations').select('*');

    if (guestId) {
      query = query.eq('id', guestId);
    } else if (token) {
      query = query.eq('access_token', token);
    }

    const { data: guest, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching guest by id:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!guest) {
      return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        gallery_id: guest.gallery_id,
        workspace_id: guest.workspace_id,
        guest_name: guest.guest_name,
        guest_phone: guest.guest_phone,
        guest_email: guest.guest_email,
        selfie_url: guest.selfie_url,
        face_embedding: guest.face_embedding,
        access_token: guest.access_token,
        matched_photo_ids: Array.isArray(guest.matched_photo_ids) ? guest.matched_photo_ids : [],
        created_at: guest.created_at,
      },
    });
  } catch (err: any) {
    console.error('Guest fetch exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
