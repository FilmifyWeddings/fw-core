import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractFacesFromImageUrl } from '@/lib/faceAI';
import { getPublicGalleryUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    let countQuery = supabaseAdmin
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true });

    if (galleryId) {
      countQuery = countQuery.eq('gallery_id', galleryId);
    }

    const { count: totalCount, error: countErr } = await countQuery;
    if (countErr) {
      return NextResponse.json({ success: false, error: countErr.message }, { status: 500 });
    }

    const totalPhotos = totalCount || 0;
    if (totalPhotos === 0 || offset >= totalPhotos) {
      return NextResponse.json({
        success: true,
        totalPhotos,
        offset,
        limit,
        hasMore: false,
        indexedCount: 0,
        totalFacesFound: 0,
      });
    }

    // Fetch batch slice
    let query = supabaseAdmin
      .from('gallery_photos')
      .select('id, gallery_id, preview_key, width, height')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (galleryId) {
      query = query.eq('gallery_id', galleryId);
    }

    const { data: photos, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let indexedCount = 0;
    let totalFacesFound = 0;

    // Process batch in parallel chunks of 4 for speed
    const CHUNK_SIZE = 4;
    for (let i = 0; i < (photos || []).length; i += CHUNK_SIZE) {
      const chunk = photos.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (p) => {
          try {
            const previewUrl = getPublicGalleryUrl(p.preview_key);
            const faces = await extractFacesFromImageUrl(previewUrl);

            // 1. Delete previous faces for this photo to avoid stale/fake records
            await supabaseAdmin.from('photo_faces').delete().eq('photo_id', p.id);

            if (faces && faces.length > 0) {
              totalFacesFound += faces.length;

              // 2. Insert valid face records
              const faceRecords = faces.map((f) => ({
                photo_id: p.id,
                gallery_id: p.gallery_id,
                bounding_box: f.box,
                embedding: f.embedding,
              }));

              const { error: insErr } = await supabaseAdmin.from('photo_faces').insert(faceRecords);
              if (!insErr) {
                indexedCount++;
                await supabaseAdmin
                  .from('gallery_photos')
                  .update({ face_count: faces.length })
                  .eq('id', p.id);
              }
            } else {
              // Reset face_count to 0 if no faces detected
              await supabaseAdmin
                .from('gallery_photos')
                .update({ face_count: 0 })
                .eq('id', p.id);
            }
          } catch (err) {
            console.warn('Error processing photo in chunk:', p.id, err);
          }
        })
      );
    }

    const nextOffset = offset + (photos?.length || 0);
    const hasMore = nextOffset < totalPhotos;

    return NextResponse.json({
      success: true,
      totalPhotos,
      offset,
      nextOffset,
      limit,
      hasMore,
      indexedCount,
      totalFacesFound,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
