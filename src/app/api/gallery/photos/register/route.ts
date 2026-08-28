import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getR2PublicUrl } from '@/lib/r2';
import { extractFacesFromImageUrl } from '@/lib/faceAI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, photos } = body;

    if (!galleryId || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid galleryId or empty photos array' }, { status: 400 });
    }

    // 1. Insert photos into gallery_photos
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('gallery_photos')
      .insert(photos)
      .select('id, preview_key, thumbnail_key, original_key');

    if (insertError) {
      console.error('Error inserting photos:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 2. Set cover_url on event_galleries if it does not have one
    const firstPreview = inserted?.[0]?.preview_key;
    if (firstPreview) {
      const publicUrl = getR2PublicUrl(firstPreview);
      await supabaseAdmin
        .from('event_galleries')
        .update({ cover_url: publicUrl })
        .eq('id', galleryId)
        .is('cover_url', null);
    }

    // 3. Background Face Indexing (Asynchronous processing)
    // Run face detection on each photo in background
    if (inserted && inserted.length > 0) {
      (async () => {
        for (const p of inserted) {
          try {
            const previewUrl = getR2PublicUrl(p.preview_key);
            const faces = await extractFacesFromImageUrl(previewUrl);

            if (faces.length > 0) {
              const faceRecords = faces.map(f => ({
                photo_id: p.id,
                gallery_id: galleryId,
                bounding_box: f.box,
                embedding: f.embedding,
              }));

              await supabaseAdmin.from('photo_faces').insert(faceRecords);
              await supabaseAdmin
                .from('gallery_photos')
                .update({ face_count: faces.length })
                .eq('id', p.id);
            }
          } catch (faceErr) {
            console.warn(`[FaceIndex] Error processing photo ${p.id}:`, faceErr);
          }
        }
      })();
    }

    return NextResponse.json({
      success: true,
      registeredCount: inserted?.length || 0,
      photos: inserted,
    });
  } catch (err: any) {
    console.error('Error in /api/gallery/photos/register:', err);
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 });
  }
}
