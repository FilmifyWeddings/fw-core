import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGalleryPresignedDownloadUrl } from '@/lib/storage/galleryB2Client';
import { extractFacesFromS3Key, extractFacesBatchFromS3Keys, cosineSimilarity, normalizeVector } from '@/lib/faceAI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, photos } = body;

    if (!galleryId || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid galleryId or empty photos array' }, { status: 400 });
    }

    // 1. Fetch gallery to verify, get studio workspace_id, and check Face AI toggle
    let isFaceAiEnabled = true;
    let workspaceId = '00000000-0000-0000-0000-000000000000';
    let galleryCoverUrl: string | null = null;

    try {
      const { data: gallery } = await supabaseAdmin
        .from('event_galleries')
        .select('id, workspace_id, cover_url, is_face_ai_enabled')
        .eq('id', galleryId)
        .maybeSingle();

      if (gallery) {
        workspaceId = gallery.workspace_id || workspaceId;
        galleryCoverUrl = gallery.cover_url || null;
        if (gallery.is_face_ai_enabled !== undefined && gallery.is_face_ai_enabled !== null) {
          isFaceAiEnabled = Boolean(gallery.is_face_ai_enabled);
        } else if (gallery.cover_url && typeof gallery.cover_url === 'string') {
          if (gallery.cover_url.includes('face_ai=false') || gallery.cover_url.includes('face_ai=0')) {
            isFaceAiEnabled = false;
          }
        }
      }
    } catch (_) {
      // Fallback query if is_face_ai_enabled column does not exist yet
      try {
        const { data: fallbackGal } = await supabaseAdmin
          .from('event_galleries')
          .select('id, workspace_id, cover_url')
          .eq('id', galleryId)
          .maybeSingle();
        if (fallbackGal) {
          workspaceId = fallbackGal.workspace_id || workspaceId;
          galleryCoverUrl = fallbackGal.cover_url || null;
          if (fallbackGal.cover_url?.includes('face_ai=false')) {
            isFaceAiEnabled = false;
          }
        }
      } catch (_) {}
    }

    // 2. Insert photos into gallery_photos
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('gallery_photos')
      .insert(photos)
      .select('*');

    if (insertError) {
      console.error('Error inserting photos:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 3. Set immortal cover_url on event_galleries if it does not have one
    const firstPreview = inserted?.[0]?.preview_key;
    if (firstPreview && !galleryCoverUrl) {
      const coverUrl = `/api/gallery/image?key=${encodeURIComponent(firstPreview)}`;
      await supabaseAdmin
        .from('event_galleries')
        .update({ cover_url: coverUrl })
        .eq('id', galleryId);
    }

    // 4. Ultra-Fast Multi-Face Batch Indexing (Rule 1, 2, 3)
    if (inserted && inserted.length > 0 && isFaceAiEnabled) {
      // Non-blocking background face extraction: returns immediate 200 OK so uploads finish in milliseconds
      (async () => {
        try {
          // Rule 2 & 3: Process in batches of 16 using 640px thumbnail_key
          const BATCH_SIZE = 16;
          for (let i = 0; i < inserted.length; i += BATCH_SIZE) {
            const chunk = inserted.slice(i, i + BATCH_SIZE);
            const batchItems = chunk.map((p) => ({
              id: p.id,
              // Rule 3: Prefer 640px thumbnail_key over 2048px preview_key for 8x speed & 80% bandwidth saving
              key: p.thumbnail_key || p.preview_key,
            }));

            const resultMap = await extractFacesBatchFromS3Keys(batchItems);

            const allFaceRecords: any[] = [];
            const photoUpdatePromises: Promise<any>[] = [];

            for (const p of chunk) {
              const faces = resultMap.get(p.id) || [];
              if (faces.length > 0) {
                for (const f of faces) {
                  allFaceRecords.push({
                    photo_id: p.id,
                    gallery_id: galleryId,
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

            // Clean previous records and bulk insert new faces
            const photoIds = chunk.map((p) => p.id);
            await supabaseAdmin.from('photo_faces').delete().in('photo_id', photoIds);
            if (allFaceRecords.length > 0) {
              await supabaseAdmin.from('photo_faces').insert(allFaceRecords);
            }
            await Promise.all(photoUpdatePromises);
          }

          // Update gallery aggregate total_faces
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

          // Automatic Guest Re-Sync: Match new photo faces against registered guests in background
          const { data: guests } = await supabaseAdmin
            .from('event_guest_registrations')
            .select('id, face_embedding, matched_photo_ids')
            .eq('gallery_id', galleryId);

          if (guests && guests.length > 0) {
            const { data: newFaces } = await supabaseAdmin
              .from('photo_faces')
              .select('photo_id, embedding')
              .in('photo_id', inserted.map((p) => p.id));

            if (newFaces && newFaces.length > 0) {
              for (const guest of guests) {
                const rawEmb = Array.isArray(guest.face_embedding)
                  ? guest.face_embedding
                  : (typeof guest.face_embedding === 'string' ? JSON.parse(guest.face_embedding) : null);

                if (!rawEmb || rawEmb.length !== 512) continue;
                const guestVector = normalizeVector(rawEmb);
                const currentMatches = new Set<string>(
                  Array.isArray(guest.matched_photo_ids) ? guest.matched_photo_ids : []
                );
                let hasNewMatch = false;

                for (const nf of newFaces) {
                  const nfEmb = Array.isArray(nf.embedding)
                    ? nf.embedding
                    : (typeof nf.embedding === 'string' ? JSON.parse(nf.embedding) : null);

                  if (nfEmb && nfEmb.length === 512) {
                    const sim = cosineSimilarity(guestVector, nfEmb);
                    if (sim >= 0.48) {
                      currentMatches.add(nf.photo_id);
                      hasNewMatch = true;
                    }
                  }
                }

                if (hasNewMatch) {
                  await supabaseAdmin
                    .from('event_guest_registrations')
                    .update({
                      matched_photo_ids: Array.from(currentMatches),
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', guest.id);
                }
              }
            }
          }
        } catch (bgErr) {
          console.warn('[FaceIndex Background Task Notice]:', bgErr);
        }
      })();
    } else if (inserted && inserted.length > 0 && !isFaceAiEnabled) {
      // Face AI is disabled for this event: zero out face_count immediately
      try {
        await supabaseAdmin
          .from('gallery_photos')
          .update({ face_count: 0 })
          .in('id', inserted.map((p) => p.id));
      } catch (_) {}
    }

    const enrichedPhotos = (inserted || []).map((p: any) => ({
      id: p.id,
      gallery_id: p.gallery_id,
      collection_id: p.collection_id,
      original_key: p.original_key,
      preview_key: p.preview_key,
      thumbnail_key: p.thumbnail_key,
      preview_url: `/api/gallery/image?key=${encodeURIComponent(p.preview_key)}`,
      thumbnail_url: `/api/gallery/image?key=${encodeURIComponent(p.thumbnail_key || p.preview_key)}`,
      width: p.width,
      height: p.height,
      size_bytes: p.size_bytes,
      face_count: p.face_count || 0,
      created_at: p.created_at,
    }));

    return NextResponse.json({
      success: true,
      registeredCount: inserted?.length || 0,
      photos: enrichedPhotos,
    });
  } catch (err: any) {
    console.error('Error in /api/gallery/photos/register:', err);
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 });
  }
}
