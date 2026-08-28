import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id') || searchParams.get('galleryId');
    const workspaceId = searchParams.get('workspace_id');

    if (!galleryId && !workspaceId) {
      return NextResponse.json({ success: false, error: 'gallery_id or workspace_id is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('event_guest_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (galleryId) {
      query = query.eq('gallery_id', galleryId);
    } else if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: guests, error } = await query;

    if (error) {
      console.warn('Error fetching guest list:', error.message);
      return NextResponse.json({ success: true, guests: [], count: 0 });
    }

    return NextResponse.json({
      success: true,
      guests: guests || [],
      count: guests?.length || 0,
    });
  } catch (err: any) {
    console.error('Guest list exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
