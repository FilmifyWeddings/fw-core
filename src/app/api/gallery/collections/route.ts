import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');

    if (!galleryId) {
      return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
    }

    const { data: collections, error } = await supabaseAdmin
      .from('gallery_collections')
      .select(`
        id,
        gallery_id,
        name,
        cover_url,
        created_at,
        gallery_photos (id)
      `)
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const enriched = (collections || []).map((c: any) => ({
      id: c.id,
      gallery_id: c.gallery_id,
      name: c.name,
      cover_url: c.cover_url,
      created_at: c.created_at,
      photo_count: c.gallery_photos ? c.gallery_photos.length : 0,
      gallery_photos: undefined,
    }));

    return NextResponse.json({ success: true, collections: enriched });
  } catch (err: any) {
    console.error('Error fetching gallery collections:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, name, cover_url = null } = body;

    if (!gallery_id || !name) {
      return NextResponse.json({ success: false, error: 'gallery_id and name are required' }, { status: 400 });
    }

    const { data: collection, error } = await supabaseAdmin
      .from('gallery_collections')
      .insert({
        gallery_id,
        name: name.trim(),
        cover_url,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, collection });
  } catch (err: any) {
    console.error('Error creating gallery collection:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Collection ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('gallery_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting gallery collection:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
