import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGalleryPresignedDownloadUrl, deleteGalleryObjects } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');
    const collectionId = searchParams.get('collection_id');
    const slug = searchParams.get('slug');
    const ids = searchParams.get('ids');

    let targetGalleryId = galleryId;

    if (!targetGalleryId && slug) {
      const { data: g } = await supabaseAdmin
        .from('event_galleries')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (g) targetGalleryId = g.id;
    }

    if (!targetGalleryId) {
      return NextResponse.json({ success: false, error: 'gallery_id or slug is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', targetGalleryId)
      .order('created_at', { ascending: false });

    if (ids) {
      const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
      if (idList.length > 0) {
        query = query.in('id', idList);
      }
    }

    if (collectionId && collectionId !== 'all') {
      query = query.eq('collection_id', collectionId);
    }

    const { data: photos, error } = await query;

    if (error) throw error;

    // Return 100% White-Labeled Native StudioCore Image URLs
    const enriched = (photos || []).map((p) => {
      const preview_url = `/api/gallery/image?key=${encodeURIComponent(p.preview_key)}`;
      const thumbnail_url = `/api/gallery/image?key=${encodeURIComponent(p.thumbnail_key || p.preview_key)}`;

      return {
        id: p.id,
        gallery_id: p.gallery_id,
        collection_id: p.collection_id,
        preview_url,
        thumbnail_url,
        original_key: p.original_key,
        preview_key: p.preview_key,
        thumbnail_key: p.thumbnail_key,
        width: p.width,
        height: p.height,
        size_bytes: p.size_bytes,
        face_count: p.face_count,
        created_at: p.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      photos: enriched,
    });
  } catch (err: any) {
    console.error('Error fetching gallery photos:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryPhotoId = searchParams.get('photo_id');
    const queryPhotoIds = searchParams.get('photo_ids');

    let targetIds: string[] = [];

    if (queryPhotoId) {
      targetIds.push(queryPhotoId);
    } else if (queryPhotoIds) {
      targetIds.push(...queryPhotoIds.split(',').map((id) => id.trim()).filter(Boolean));
    } else {
      // Check JSON body if provided
      try {
        const body = await req.json();
        if (body.photo_id) targetIds.push(body.photo_id);
        if (Array.isArray(body.photo_ids)) targetIds.push(...body.photo_ids);
      } catch (_) {}
    }

    // Deduplicate IDs
    targetIds = Array.from(new Set(targetIds.filter(Boolean)));

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'photo_id or photo_ids is required' }, { status: 400 });
    }

    // 1. Fetch photo records from Supabase to retrieve Backblaze B2 storage keys
    const { data: photosToDelete, error: fetchErr } = await supabaseAdmin
      .from('gallery_photos')
      .select('id, original_key, preview_key, thumbnail_key')
      .in('id', targetIds);

    if (fetchErr) {
      console.error('[GalleryPhotos] Error fetching photos for deletion:', fetchErr);
    }

    // 2. Collect all storage keys to permanently purge from Backblaze B2
    const storageKeys = (photosToDelete || []).flatMap((p) => [
      p.original_key,
      p.preview_key,
      p.thumbnail_key,
    ]).filter((k): k is string => typeof k === 'string' && k.length > 0);

    if (storageKeys.length > 0) {
      const purgeResult = await deleteGalleryObjects(storageKeys);
      console.log(`[GalleryPhotos] Purged ${purgeResult.deleted} files from Backblaze B2 (${purgeResult.errors} errors).`);
    }

    // 3. Clean up face vectors from Supabase
    try {
      await supabaseAdmin.from('photo_faces').delete().in('photo_id', targetIds);
    } catch (_) {}

    // 4. Delete photo records from Supabase gallery_photos
    const { error: delErr } = await supabaseAdmin
      .from('gallery_photos')
      .delete()
      .in('id', targetIds);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      deletedCount: targetIds.length,
      deletedIds: targetIds,
      purgedStorageKeys: storageKeys.length,
    });
  } catch (err: any) {
    console.error('Error deleting photo(s):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
