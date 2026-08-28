import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractFacesFromImageUrl } from '@/lib/faceAI';
import { getR2PublicUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, photoId, imageUrl, previewKey } = body;

    if (!galleryId || (!imageUrl && !previewKey && !photoId)) {
      return NextResponse.json({ success: false, error: 'Missing galleryId, photoId, or imageUrl' }, { status: 400 });
    }

    let finalImageUrl = imageUrl;
    let targetPhotoId = photoId;

    if (!finalImageUrl && previewKey) {
      finalImageUrl = getR2PublicUrl(previewKey);
    } else if (!finalImageUrl && photoId) {
      const { data: photo } = await supabaseAdmin
        .from('gallery_photos')
        .select('preview_key')
        .eq('id', photoId)
        .maybeSingle();

      if (photo?.preview_key) {
        finalImageUrl = getR2PublicUrl(photo.preview_key);
      }
    }

    if (!finalImageUrl) {
      return NextResponse.json({ success: false, error: 'Could not resolve image URL' }, { status: 400 });
    }

    // Call Face AI Extraction (VPS / UniFace / ArcFace engine)
    const faces = await extractFacesFromImageUrl(finalImageUrl);

    if (faces.length > 0 && targetPhotoId) {
      // 1. Delete previous face embeddings for this photo if any
      await supabaseAdmin.from('photo_faces').delete().eq('photo_id', targetPhotoId);

      // 2. Insert new face vector embeddings
      const faceRecords = faces.map(f => ({
        photo_id: targetPhotoId,
        gallery_id: galleryId,
        bounding_box: f.box,
        embedding: f.embedding,
      }));

      const { error: insertErr } = await supabaseAdmin.from('photo_faces').insert(faceRecords);
      if (insertErr) {
        console.error('Error inserting face vectors:', insertErr);
      }

      // 3. Update face count on gallery_photos
      await supabaseAdmin
        .from('gallery_photos')
        .update({ face_count: faces.length })
        .eq('id', targetPhotoId);
    }

    return NextResponse.json({
      success: true,
      faceCount: faces.length,
      faces: faces.map(f => ({ box: f.box })),
    });
  } catch (err: any) {
    console.error('Error in /api/gallery/index-face:', err);
    return NextResponse.json({ success: false, error: err.message || 'Face indexing failed' }, { status: 500 });
  }
}
