import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractFacesFromImageUrl } from '@/lib/faceAI';
import { getPublicGalleryUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');

    let query = supabaseAdmin
      .from('gallery_photos')
      .select('id, gallery_id, preview_key, width, height');

    if (galleryId) {
      query = query.eq('gallery_id', galleryId);
    }

    const { data: photos, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ success: true, indexedCount: 0, message: 'No photos found' });
    }

    let indexedCount = 0;
    let totalFacesFound = 0;

    for (const p of photos) {
      try {
        const previewUrl = getPublicGalleryUrl(p.preview_key);
        const faces = await extractFacesFromImageUrl(previewUrl);

        // 1. Delete previous faces for this photo to avoid stale/fake records
        await supabaseAdmin.from('photo_faces').delete().eq('photo_id', p.id);

        if (faces && faces.length > 0) {
          totalFacesFound += faces.length;

          // 2. Insert valid face records
          const faceRecords = faces.map(f => ({
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
          } else {
            console.error('Failed inserting faces for photo', p.id, insErr);
          }
        } else {
          // Reset face_count to 0 if no faces detected
          await supabaseAdmin
            .from('gallery_photos')
            .update({ face_count: 0 })
            .eq('id', p.id);
        }
      } catch (err) {
        console.warn('Error processing photo:', p.id, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalPhotos: photos.length,
      indexedCount,
      totalFacesFound,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
