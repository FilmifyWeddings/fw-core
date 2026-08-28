import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractEmbeddingFromBase64 } from '@/lib/faceAI';
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
      threshold = 0.45,
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

    const finalThreshold = match_threshold ?? threshold ?? similarityThreshold ?? 0.45;

    // Strict Vector Search in Supabase RPC
    const { data: matches, error: matchErr } = await supabaseAdmin.rpc('match_guest_faces', {
      query_embedding: queryEmbedding,
      match_gallery_id: targetGalleryId,
      match_threshold: finalThreshold,
      match_limit: 250,
    });

    if (matchErr) {
      console.error('Vector RPC Error:', matchErr);
      return NextResponse.json({ error: matchErr.message, photos: [], count: 0 }, { status: 500 });
    }

    const matchedPhotoIds = (matches || []).map((m: any) => m.photo_id);

    if (matchedPhotoIds.length === 0) {
      return NextResponse.json({ success: true, photos: [], count: 0, matches: [] });
    }

    // Strictly fetch ONLY the matched photos
    const { data: matchedPhotos, error: photoErr } = await supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .in('id', matchedPhotoIds);

    if (photoErr) {
      return NextResponse.json({ error: photoErr.message, photos: [], count: 0 }, { status: 500 });
    }

    const similarityMap = new Map((matches || []).map((m: any) => [m.photo_id, m.similarity]));

    const formattedPhotos = (matchedPhotos || []).map((p: any) => {
      const sim = similarityMap.get(p.id) || 0.5;
      return {
        id: p.id,
        gallery_id: p.gallery_id,
        collection_id: p.collection_id,
        preview_url: getPublicGalleryUrl(p.preview_key),
        thumbnail_url: getPublicGalleryUrl(p.thumbnail_key),
        original_key: p.original_key,
        width: p.width,
        height: p.height,
        face_count: p.face_count,
        similarity: sim,
        confidencePercent: Math.round(sim * 100),
      };
    }).sort((a, b) => b.confidencePercent - a.confidencePercent);

    return NextResponse.json({
      success: true,
      photos: formattedPhotos,
      count: formattedPhotos.length,
      matches: matches || [],
    });
  } catch (err: any) {
    console.error('Match Face Exception:', err);
    return NextResponse.json({ error: err.message, photos: [], count: 0 }, { status: 500 });
  }
}
