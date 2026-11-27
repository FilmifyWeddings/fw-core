import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGalleryPresignedDownloadUrl, deleteGalleryObjects } from '@/lib/storage/galleryB2Client';
import { decrementWorkspaceStorage } from '@/lib/storage/galleryStorageQuota';

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

    const limitParam = searchParams.get('limit');
    const requestedLimit = limitParam ? parseInt(limitParam, 10) : null;

    let allPhotos: any[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;

    while (true) {
      let pageQuery = supabaseAdmin
        .from('gallery_photos')
        .select('*')
        .eq('gallery_id', targetGalleryId)
        .order('created_at', { ascending: false });

      if (ids) {
        const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
        if (idList.length > 0) {
          pageQuery = pageQuery.in('id', idList);
        }
      }

      if (collectionId && collectionId !== 'all') {
        pageQuery = pageQuery.or(`collection_id.eq.${collectionId},folder_id.eq.${collectionId}`);
      }

      // Fast path: small explicit limit requested (e.g. limit=50)
      if (requestedLimit && requestedLimit <= PAGE_SIZE) {
        pageQuery = pageQuery.limit(requestedLimit);
        const { data, error } = await pageQuery;
        if (error) throw error;
        allPhotos = data || [];
        break;
      }

      const to = requestedLimit
        ? Math.min(from + PAGE_SIZE - 1, requestedLimit - 1)
        : from + PAGE_SIZE - 1;

      pageQuery = pageQuery.range(from, to);

      const { data, error } = await pageQuery;
      if (error) throw error;
      if (!data || data.length === 0) break;

      allPhotos.push(...data);

      if (data.length < PAGE_SIZE) break;
      if (requestedLimit && allPhotos.length >= requestedLimit) break;

      from += PAGE_SIZE;
    }

    // Return 100% White-Labeled Native StudioCore Image URLs
    const enriched = (allPhotos || []).map((p: any) => {
      const targetPreview = p.preview_key || p.original_key || '';
      const targetThumb = p.thumb_key || p.thumbnail_key || targetPreview;
      const preview_url = targetPreview ? `/api/gallery/image?key=${encodeURIComponent(targetPreview)}` : '';
      const thumbnail_url = targetThumb ? `/api/gallery/image?key=${encodeURIComponent(targetThumb)}` : preview_url;

      return {
        id: p.id,
        gallery_id: p.gallery_id,
        collection_id: p.collection_id,
        folder_id: p.folder_id || p.collection_id,
        preview_url,
        thumbnail_url,
        original_key: p.original_key || targetPreview,
        preview_key: targetPreview,
        thumbnail_key: targetThumb,
        thumb_key: targetThumb,
        width: p.width,
        height: p.height,
        size_bytes: p.size_bytes,
        face_count: p.face_count,
        created_at: p.created_at,
        capture_time: p.capture_time || p.created_at,
        file_name: p.file_name || null,
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

    // 1. Fetch photo records from Supabase in batches of 500 to retrieve Backblaze B2 storage keys
    const CHUNK_SIZE = 500;
    const photosToDelete: any[] = [];
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const slice = targetIds.slice(i, i + CHUNK_SIZE);
      const { data: chunkPhotos, error: fetchErr } = await supabaseAdmin
        .from('gallery_photos')
        .select('id, gallery_id, original_key, preview_key, thumbnail_key, thumb_key, size_bytes')
        .in('id', slice);

      if (fetchErr) {
        console.error('[GalleryPhotos] Error fetching photos for deletion:', fetchErr);
      }
      if (chunkPhotos && chunkPhotos.length > 0) {
        photosToDelete.push(...chunkPhotos);
      }
    }

    // 2. Collect all storage keys to permanently purge from Backblaze B2
    const storageKeys = photosToDelete.flatMap((p: any) => [
      p.original_key,
      p.preview_key,
      p.thumbnail_key,
      p.thumb_key,
    ]).filter((k): k is string => typeof k === 'string' && k.length > 0);

    if (storageKeys.length > 0) {
      const purgeResult = await deleteGalleryObjects(storageKeys);
      console.log(`[GalleryPhotos] Purged ${purgeResult.deleted} files from Backblaze B2 (${purgeResult.errors} errors).`);
    }

    // 3. Clean up face vectors from Supabase in chunks
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const slice = targetIds.slice(i, i + CHUNK_SIZE);
      try {
        await supabaseAdmin.from('photo_faces').delete().in('photo_id', slice);
      } catch (_) {}
    }

    // 4. Delete photo records from Supabase gallery_photos in chunks
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const slice = targetIds.slice(i, i + CHUNK_SIZE);
      const { error: delErr } = await supabaseAdmin
        .from('gallery_photos')
        .delete()
        .in('id', slice);

      if (delErr) throw delErr;
    }

    // 5. Subtract exact freed bytes from workspace storage quota
    const freedBytes = (photosToDelete || []).reduce(
      (sum: number, p: any) => sum + (Number(p.size_bytes) || 0),
      0
    );
    const galleryId = photosToDelete?.[0]?.gallery_id;
    if (freedBytes > 0 && galleryId) {
      try {
        const { data: gal } = await supabaseAdmin
          .from('event_galleries')
          .select('workspace_id')
          .eq('id', galleryId)
          .maybeSingle();

        if (gal?.workspace_id) {
          await decrementWorkspaceStorage(gal.workspace_id, galleryId, freedBytes);
        }
      } catch (quotaErr) {
        console.warn('[GalleryPhotos] Storage quota decrement notice:', quotaErr);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: targetIds.length,
      deletedIds: targetIds,
      purgedStorageKeys: storageKeys.length,
      freedBytes,
    });
  } catch (err: any) {
    console.error('Error deleting photo(s):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
