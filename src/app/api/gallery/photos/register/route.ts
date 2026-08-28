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

    // 1. Fetch gallery to get workspace_id
    const { data: gallery } = await supabaseAdmin
      .from('event_galleries')
      .select('id, workspace_id, cover_url')
      .eq('id', galleryId)
      .maybeSingle();

    const workspaceId = gallery?.workspace_id || '00000000-0000-0000-0000-000000000000';

    // 2. Insert photos into gallery_photos
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('gallery_photos')
      .insert(photos)
      .select('id, preview_key, thumbnail_key, original_key');

    if (insertError) {
      console.error('Error inserting photos:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 3. Set cover_url on event_galleries if it does not have one
    const firstPreview = inserted?.[0]?.preview_key;
    if (firstPreview && !gallery?.cover_url) {
      const publicUrl = getR2PublicUrl(firstPreview);
      await supabaseAdmin
        .from('event_galleries')
        .update({ cover_url: publicUrl })
        .eq('id', galleryId);
    }

    // 4. Multi-Face Indexing (Asynchronous background processing)
    if (inserted && inserted.length > 0) {
      (async () => {
        for (const p of inserted) {
          try {
            const previewUrl = getR2PublicUrl(p.preview_key);
            const faces = await extractFacesFromImageUrl(previewUrl);

            if (faces && faces.length > 0) {
              const faceRecords = faces.map(f => ({
                photo_id: p.id,
                gallery_id: galleryId,
                workspace_id: workspaceId,
                bounding_box: f.box,
                embedding: f.embedding,
                confidence: f.confidence || 0.95,
              }));

              // Delete previous face vectors for this photo to avoid duplicates
              await supabaseAdmin.from('photo_faces').delete().eq('photo_id', p.id);
              await supabaseAdmin.from('photo_faces').insert(faceRecords);

              // Update photo with true detected face count
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
