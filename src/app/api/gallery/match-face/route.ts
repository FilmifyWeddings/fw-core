import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractEmbeddingFromBase64, cosineSimilarity, normalizeVector } from '@/lib/faceAI';
import { getPublicGalleryUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gallery_id,
      galleryId,
      embedding,
      selfieBase64,
      threshold = 0.33,
      match_threshold,
      similarityThreshold,
    } = body;

    const targetGalleryId = gallery_id || galleryId;
    let queryEmbedding = embedding;

    if (!queryEmbedding && selfieBase64) {
      queryEmbedding = await extractEmbeddingFromBase64(selfieBase64);
    }

    if (!targetGalleryId || !queryEmbedding) {
      return NextResponse.json({ error: 'Missing gallery_id or embedding', photos: [], count: 0 }, { status: 400 });
    }

    const normalizedQuery = normalizeVector(queryEmbedding);
    const finalThreshold = match_threshold ?? threshold ?? similarityThreshold ?? 0.33;

    let matchedPhotoMap = new Map<string, number>(); // photo_id -> max similarity

    // 1. Try Supabase RPC match_guest_faces first
    try {
      const { data: matches, error: matchErr } = await supabaseAdmin.rpc('match_guest_faces', {
        query_embedding: normalizedQuery,
        match_gallery_id: targetGalleryId,
        match_threshold: finalThreshold,
        match_limit: 500,
      });

      if (!matchErr && Array.isArray(matches) && matches.length > 0) {
        for (const m of matches) {
          matchedPhotoMap.set(m.photo_id, Math.max(matchedPhotoMap.get(m.photo_id) || 0, Number(m.similarity || 0.5)));
        }
      }
    } catch (_) {}

    // 2. Fallback: Direct DB query on photo_faces with accurate in-memory Cosine Similarity
    if (matchedPhotoMap.size === 0) {
      const { data: faces } = await supabaseAdmin
        .from('photo_faces')
        .select('photo_id, embedding')
        .eq('gallery_id', targetGalleryId);

      if (faces && faces.length > 0) {
        for (const f of faces) {
          const emb = Array.isArray(f.embedding) ? f.embedding : (typeof f.embedding === 'string' ? JSON.parse(f.embedding) : null);
          if (emb && emb.length === 512) {
            const sim = cosineSimilarity(normalizedQuery, emb);
            if (sim >= finalThreshold) {
              matchedPhotoMap.set(f.photo_id, Math.max(matchedPhotoMap.get(f.photo_id) || 0, sim));
            }
          }
        }
      }
    }

    const matchedPhotoIds = Array.from(matchedPhotoMap.keys());

    if (matchedPhotoIds.length === 0) {
      return NextResponse.json({ success: true, photos: [], count: 0, matches: [] });
    }

    // 3. Fetch matched photo details
    const { data: matchedPhotos, error: photoErr } = await supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .in('id', matchedPhotoIds);

    if (photoErr) {
      return NextResponse.json({ error: photoErr.message, photos: [], count: 0 }, { status: 500 });
    }

    const formattedPhotos = (matchedPhotos || []).map((p: any) => {
      const sim = Number(matchedPhotoMap.get(p.id) || 0.5);
      return {
        id: p.id,
        gallery_id: p.gallery_id,
        collection_id: p.collection_id,
        preview_url: getPublicGalleryUrl(p.preview_key),
        thumbnail_url: getPublicGalleryUrl(p.thumbnail_key),
        original_key: p.original_key,
        width: p.width,
        height: p.height,
        face_count: p.face_count || 1,
        similarity: sim,
        confidencePercent: Math.round(sim * 100),
      };
    }).sort((a, b) => b.confidencePercent - a.confidencePercent);

    return NextResponse.json({
      success: true,
      photos: formattedPhotos,
      count: formattedPhotos.length,
    });
  } catch (err: any) {
    console.error('Match Face Exception:', err);
    return NextResponse.json({ error: err.message, photos: [], count: 0 }, { status: 500 });
  }
}
