import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cosineSimilarity, clusterFacesWithAI } from '@/lib/faceAI';
import { getPublicGalleryUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

interface FaceRecord {
  id: string;
  photo_id: string;
  gallery_id: string;
  bounding_box: { x: number; y: number; w: number; h: number };
  embedding: number[];
  confidence?: number;
}

interface PhotoRecord {
  id: string;
  preview_key: string;
  thumbnail_key: string;
  width: number;
  height: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');

    if (!galleryId) {
      return NextResponse.json({ success: false, error: 'Missing gallery_id' }, { status: 400 });
    }

    // 1. Fetch all faces in gallery
    const { data: rawFaces, error: faceErr } = await supabaseAdmin
      .from('photo_faces')
      .select('id, photo_id, gallery_id, bounding_box, embedding')
      .eq('gallery_id', galleryId);

    if (faceErr) {
      return NextResponse.json({ success: false, error: faceErr.message }, { status: 500 });
    }

    if (!rawFaces || rawFaces.length === 0) {
      return NextResponse.json({ success: true, people: [], totalFaces: 0, totalPeople: 0 });
    }

    // 2. Fetch associated photos for preview keys
    const photoIds = Array.from(new Set(rawFaces.map(f => f.photo_id)));
    const { data: rawPhotos } = await supabaseAdmin
      .from('gallery_photos')
      .select('id, preview_key, thumbnail_key, width, height')
      .in('id', photoIds);

    const photoMap = new Map<string, PhotoRecord>();
    (rawPhotos || []).forEach((p: any) => photoMap.set(p.id, p));

    // 3. Prepare normalized face records with 512-D embeddings
    const validFaces: any[] = [];
    for (const f of rawFaces) {
      const emb = Array.isArray(f.embedding)
        ? f.embedding
        : typeof f.embedding === 'string'
        ? JSON.parse(f.embedding)
        : null;

      if (emb && emb.length === 512) {
        validFaces.push({
          id: f.id,
          photo_id: f.photo_id,
          gallery_id: f.gallery_id,
          bounding_box: f.bounding_box,
          embedding: emb,
        });
      }
    }

    if (validFaces.length === 0) {
      return NextResponse.json({ success: true, people: [], totalFaces: 0, totalPeople: 0 });
    }

    // 4. Cluster faces into unique people (Python DBSCAN with Union-Find graph fallback)
    const clusterResult = await clusterFacesWithAI(validFaces, 0.48);
    const clusters = clusterResult.people || [];

    // 5. Format People List (sort by photo count descending)
    const people = clusters.map((c, idx) => {
      const repFace = c.avatar_face || c.representative_face || c.faces?.[0];
      const repPhotoId = repFace?.photo_id;
      const repPhoto = repPhotoId ? photoMap.get(repPhotoId) : undefined;
      const previewUrl = repPhoto?.preview_key ? `/api/gallery/image?key=${encodeURIComponent(repPhoto.preview_key)}` : '';
      const thumbnailUrl = repPhoto?.thumbnail_key ? `/api/gallery/image?key=${encodeURIComponent(repPhoto.thumbnail_key)}` : previewUrl;

      const photoIds = Array.isArray(c.photo_ids)
        ? c.photo_ids
        : Array.from(new Set((c.faces || []).map((f: any) => f.photo_id).filter(Boolean)));

      return {
        id: c.person_id || `person_${idx + 1}`,
        name: `Person #${idx + 1}`,
        photo_count: c.total_photos ?? photoIds.length,
        face_count: c.face_count ?? (c.faces ? c.faces.length : 1),
        photo_ids: photoIds,
        avatar_url: thumbnailUrl || previewUrl,
        avatar_thumbnail: thumbnailUrl || previewUrl,
        box: repFace?.bounding_box || repFace?.box || { x: 0, y: 0, w: 100, h: 100 },
        representative_photo_id: repPhotoId,
      };
    }).sort((a, b) => b.photo_count - a.photo_count);

    return NextResponse.json({
      success: true,
      people,
      totalFaces: rawFaces.length,
      totalPeople: people.length,
    });
  } catch (err: any) {
    console.error('Error clustering gallery people:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
