import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGalleryPresignedDownloadUrl } from '@/lib/storage/galleryB2Client';
import { extractFacesFromS3Key } from '@/lib/faceAI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, photos } = body;

    if (!galleryId || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid galleryId or empty photos array' }, { status: 400 });
    }

    // 1. Fetch gallery to verify and get studio workspace_id
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

    // 3. Set immortal cover_url on event_galleries if it does not have one
    const firstPreview = inserted?.[0]?.preview_key;
    if (firstPreview && !gallery?.cover_url) {
      const coverUrl = `/api/gallery/image?key=${encodeURIComponent(firstPreview)}`;
      await supabaseAdmin
        .from('event_galleries')
        .update({ cover_url: coverUrl })
        .eq('id', galleryId);
    }

    // 4. Automatic Multi-Face Indexing: Direct S3 Buffer -> InsightFace
    let totalFacesFound = 0;
    if (inserted && inserted.length > 0) {
      const CHUNK_SIZE = 4;
      for (let i = 0; i < inserted.length; i += CHUNK_SIZE) {
        const chunk = inserted.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (p) => {
            try {
              const faces = await extractFacesFromS3Key(p.preview_key);
              await supabaseAdmin.from('photo_faces').delete().eq('photo_id', p.id);

              if (faces && faces.length > 0) {
                totalFacesFound += faces.length;
                const faceRecords = faces.map((f) => ({
                  photo_id: p.id,
                  gallery_id: galleryId,
                  workspace_id: workspaceId,
                  bounding_box: f.box,
                  embedding: f.embedding,
                }));

                await supabaseAdmin.from('photo_faces').insert(faceRecords);
                await supabaseAdmin
                  .from('gallery_photos')
                  .update({ face_count: faces.length })
                  .eq('id', p.id);
              } else {
                await supabaseAdmin
                  .from('gallery_photos')
                  .update({ face_count: 0 })
                  .eq('id', p.id);
              }
            } catch (faceErr) {
              console.warn(`[FaceIndex] Error processing photo ${p.id}:`, faceErr);
            }
          })
        );
      }

      // Update gallery aggregate total_faces
      try {
        const { count: faceCount } = await supabaseAdmin
          .from('photo_faces')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', galleryId);

        if (typeof faceCount === 'number') {
          await supabaseAdmin
            .from('event_galleries')
            .update({ total_faces: faceCount })
            .eq('id', galleryId);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      registeredCount: inserted?.length || 0,
      totalFacesFound,
      photos: inserted,
    });
  } catch (err: any) {
    console.error('Error in /api/gallery/photos/register:', err);
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 });
  }
}
