import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractFacesFromS3Key, extractFacesBatchFromS3Keys } from '@/lib/faceAI';
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
      .select('id, gallery_id, preview_key, thumbnail_key, width, height')
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

    // Rule 2 & 3: Process in batches of 16 using 640px thumbnail_key
    const BATCH_SIZE = 16;
    for (let i = 0; i < (photos || []).length; i += BATCH_SIZE) {
      const chunk = (photos || []).slice(i, i + BATCH_SIZE);
      const batchItems = chunk.map((p) => ({
        id: p.id,
        key: p.thumbnail_key || p.preview_key,
      }));

      const resultMap = await extractFacesBatchFromS3Keys(batchItems);

      const allFaceRecords: any[] = [];
      const photoUpdatePromises: Promise<any>[] = [];

      for (const p of chunk) {
        const faces = resultMap.get(p.id) || [];
        if (faces.length > 0) {
          totalFacesFound += faces.length;
          indexedCount++;
          for (const f of faces) {
            allFaceRecords.push({
              photo_id: p.id,
              gallery_id: p.gallery_id,
              bounding_box: f.box,
              embedding: f.embedding,
            });
          }
          photoUpdatePromises.push(
            supabaseAdmin.from('gallery_photos').update({ face_count: faces.length }).eq('id', p.id)
          );
        } else {
          photoUpdatePromises.push(
            supabaseAdmin.from('gallery_photos').update({ face_count: 0 }).eq('id', p.id)
          );
        }
      }

      const photoIds = chunk.map((p) => p.id);
      await supabaseAdmin.from('photo_faces').delete().in('photo_id', photoIds);
      if (allFaceRecords.length > 0) {
        await supabaseAdmin.from('photo_faces').insert(allFaceRecords);
      }
      await Promise.all(photoUpdatePromises);
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
