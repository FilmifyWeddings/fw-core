import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getR2PublicUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');
    const collectionId = searchParams.get('collection_id');
    const slug = searchParams.get('slug');

    let targetGalleryId = galleryId;

    if (!targetGalleryId && slug) {
      const { data: g } = await supabaseAdmin
        .from('event_galleries')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (g) targetGalleryId = g.id;
    }

    if (!targetGalleryId) {
      return NextResponse.json({ success: false, error: 'gallery_id or slug is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', targetGalleryId)
      .order('created_at', { ascending: false });

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId);
    }

    const { data: photos, error } = await query;

    if (error) throw error;

    const enriched = (photos || []).map(p => ({
      id: p.id,
      gallery_id: p.gallery_id,
      collection_id: p.collection_id,
      preview_url: getR2PublicUrl(p.preview_key),
      thumbnail_url: getR2PublicUrl(p.thumbnail_key),
      original_key: p.original_key,
      width: p.width,
      height: p.height,
      size_bytes: p.size_bytes,
      face_count: p.face_count,
      created_at: p.created_at,
    }));

    return NextResponse.json({
      success: true,
      count: enriched.length,
      photos: enriched,
    });
  } catch (err: any) {
    console.error('Error fetching gallery photos:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('photo_id');

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'photo_id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('gallery_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
    return NextResponse.json({ success: true, deletedId: photoId });
  } catch (err: any) {
    console.error('Error deleting photo:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
