import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getR2PublicUrl } from '@/lib/r2';
import { extractEmbeddingFromBase64, cosineSimilarity } from '@/lib/faceAI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, selfieBase64, similarityThreshold = 0.55, matchCount = 200 } = body;

    if (!galleryId || !selfieBase64) {
      return NextResponse.json({ success: false, error: 'Missing galleryId or selfie image' }, { status: 400 });
    }

    // 1. Extract 512-D embedding from guest selfie
    const guestEmbedding = await extractEmbeddingFromBase64(selfieBase64);

    let matchedPhotos: any[] = [];

    // 2. Try Supabase pgvector RPC function
    try {
      const { data: rpcMatches, error: rpcError } = await supabaseAdmin.rpc('match_guest_faces', {
        query_embedding: guestEmbedding,
        target_gallery_id: galleryId,
        similarity_threshold: similarityThreshold,
        match_count: matchCount,
      });

      if (!rpcError && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
        matchedPhotos = rpcMatches.map((m: any) => ({
          photoId: m.photo_id,
          thumbnailUrl: getR2PublicUrl(m.thumbnail_key),
          previewUrl: getR2PublicUrl(m.preview_key),
          originalKey: m.original_key,
          similarity: Number(m.similarity) || 0.9,
          confidencePercent: Math.min(100, Math.round((Number(m.similarity) || 0.9) * 100)),
        }));
      }
    } catch (rpcErr) {
      console.warn('[FaceMatch] RPC match_guest_faces not found or failed, using high-speed vector fallback:', rpcErr);
    }

    // 3. Resilient Fallback Matching if RPC returned 0 or wasn't configured
    if (matchedPhotos.length === 0) {
      const { data: allFaces } = await supabaseAdmin
        .from('photo_faces')
        .select(`
          id,
          photo_id,
          embedding,
          gallery_photos (
            id,
            original_key,
            preview_key,
            thumbnail_key
          )
        `)
        .eq('gallery_id', galleryId)
        .limit(1000);

      if (allFaces && allFaces.length > 0) {
        const scoredMap = new Map<string, { photo: any; maxSim: number }>();

        for (const face of allFaces) {
          const photo = face.gallery_photos;
          if (!photo || !face.embedding) continue;

          let emb = face.embedding;
          if (typeof emb === 'string') {
            try { emb = JSON.parse(emb); } catch (_) { continue; }
          }
          if (!Array.isArray(emb)) continue;

          const sim = cosineSimilarity(guestEmbedding, emb);
          if (sim >= similarityThreshold) {
            const existing = scoredMap.get(photo.id);
            if (!existing || sim > existing.maxSim) {
              scoredMap.set(photo.id, { photo, maxSim: sim });
            }
          }
        }

        const sorted = Array.from(scoredMap.values()).sort((a, b) => b.maxSim - a.maxSim);
        matchedPhotos = sorted.slice(0, matchCount).map(item => ({
          photoId: item.photo.id,
          thumbnailUrl: getR2PublicUrl(item.photo.thumbnail_key),
          previewUrl: getR2PublicUrl(item.photo.preview_key),
          originalKey: item.photo.original_key,
          similarity: item.maxSim,
          confidencePercent: Math.min(100, Math.round(item.maxSim * 100)),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      count: matchedPhotos.length,
      matches: matchedPhotos,
    });
  } catch (err: any) {
    console.error('Error in /api/gallery/face-match:', err);
    return NextResponse.json({ success: false, error: err.message || 'Face match failed' }, { status: 500 });
  }
}
