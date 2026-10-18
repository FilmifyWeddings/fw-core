import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGalleryPresignedDownloadUrl } from '@/lib/storage/galleryB2Client';

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

    // Return 100% White-Labeled Native StudioCore Image URLs
    const enriched = (photos || []).map((p) => {
      const preview_url = `/api/gallery/image?key=${encodeURIComponent(p.preview_key)}`;
      const thumbnail_url = `/api/gallery/image?key=${encodeURIComponent(p.thumbnail_key || p.preview_key)}`;

        return {
          id: p.id,
          gallery_id: p.gallery_id,
          collection_id: p.collection_id,
          preview_url,
          thumbnail_url,
          original_key: p.original_key,
          preview_key: p.preview_key,
          thumbnail_key: p.thumbnail_key,
          width: p.width,
          height: p.height,
          size_bytes: p.size_bytes,
          face_count: p.face_count,
          created_at: p.created_at,
        };
      });

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

    // Clean up face vectors
    try {
      await supabaseAdmin.from('photo_faces').delete().eq('photo_id', photoId);
    } catch (_) {}

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
