import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cosineSimilarity } from '@/lib/faceAI';
import { getPublicGalleryUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

interface FaceRecord {
  id: string;
  photo_id: string;
  gallery_id: string;
  bounding_box: { x: number; y: number; w: number; h: number };
  embedding: number[];
  confidence: number;
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
      .select('id, photo_id, gallery_id, bounding_box, embedding, confidence')
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

    // 3. Cluster faces into unique people (Cosine Similarity threshold >= 0.52)
    const CLUSTER_THRESHOLD = 0.52;
    const clusters: {
      id: string;
      representativeFace: FaceRecord;
      photoIds: Set<string>;
      faces: FaceRecord[];
    }[] = [];

    for (const f of rawFaces) {
      const emb = Array.isArray(f.embedding)
        ? f.embedding
        : typeof f.embedding === 'string'
        ? JSON.parse(f.embedding)
        : null;

      if (!emb || emb.length !== 512) continue;

      const faceObj: FaceRecord = {
        ...f,
        embedding: emb,
      };

      let bestCluster: (typeof clusters)[0] | null = null;
      let maxSim = 0;

      for (const cluster of clusters) {
        const sim = cosineSimilarity(faceObj.embedding, cluster.representativeFace.embedding);
        if (sim >= CLUSTER_THRESHOLD && sim > maxSim) {
          maxSim = sim;
          bestCluster = cluster;
        }
      }

      if (bestCluster) {
        bestCluster.faces.push(faceObj);
        bestCluster.photoIds.add(faceObj.photo_id);
      } else {
        const newClusterId = `person_${clusters.length + 1}`;
        clusters.push({
          id: newClusterId,
          representativeFace: faceObj,
          photoIds: new Set([faceObj.photo_id]),
          faces: [faceObj],
        });
      }
    }

    // 4. Format People List (sort by photo count descending)
    const people = clusters
      .map((c, idx) => {
        const repPhoto = photoMap.get(c.representativeFace.photo_id);
        const previewUrl = repPhoto?.preview_key ? getPublicGalleryUrl(repPhoto.preview_key) : '';
        const thumbnailUrl = repPhoto?.thumbnail_key ? getPublicGalleryUrl(repPhoto.thumbnail_key) : previewUrl;

        return {
          id: c.id,
          name: `Person #${idx + 1}`,
          photo_count: c.photoIds.size,
          face_count: c.faces.length,
          photo_ids: Array.from(c.photoIds),
          avatar_url: thumbnailUrl || previewUrl,
          box: c.representativeFace.bounding_box,
          representative_photo_id: c.representativeFace.photo_id,
        };
      })
      .sort((a, b) => b.photo_count - a.photo_count);

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
