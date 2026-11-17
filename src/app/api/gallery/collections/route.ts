import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteGalleryObjects, deleteGalleryPrefix } from '@/lib/storage/galleryB2Client';
import { decrementWorkspaceStorage } from '@/lib/storage/galleryStorageQuota';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');

    if (!galleryId) {
      return NextResponse.json({ success: true, collections: [] }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from('gallery_collections')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching collections:', error);
      return NextResponse.json({ success: true, error: error.message, collections: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, collections: data || [] });
  } catch (err: any) {
    console.error('Collection GET Exception:', err);
    return NextResponse.json({ success: true, error: err.message, collections: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, name } = body;

    if (!gallery_id || !name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Missing gallery_id or name' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if collection with same name already exists in this gallery (deduplicate double/triple taps)
    const { data: existingSameName } = await supabaseAdmin
      .from('gallery_collections')
      .select('id, name')
      .eq('gallery_id', gallery_id)
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existingSameName) {
      return NextResponse.json({
        success: false,
        error: `A collection named "${trimmedName}" already exists in this event.`,
      }, { status: 409 });
    }

    let cleanSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug) {
      cleanSlug = `col-${Date.now().toString(36)}`;
    }

    // Check if slug already exists for this gallery
    const { data: existing } = await supabaseAdmin
      .from('gallery_collections')
      .select('id')
      .eq('gallery_id', gallery_id)
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existing) {
      cleanSlug = `${cleanSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const { data, error } = await supabaseAdmin
      .from('gallery_collections')
      .insert({
        gallery_id,
        name: trimmedName,
        slug: cleanSlug,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting collection:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, collection: data });
  } catch (err: any) {
    console.error('Collection POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'Collection ID and name are required' }, { status: 400 });
    }

    let cleanSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug) {
      cleanSlug = `col-${Date.now().toString(36)}`;
    }

    const { data, error } = await supabaseAdmin
      .from('gallery_collections')
      .update({
        name: name.trim(),
        slug: cleanSlug,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, collection: data });
  } catch (err: any) {
    console.error('Collection PATCH Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('folder_id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Collection or Folder ID is required' }, { status: 400 });
    }

    // 1. Fetch collection/folder details to identify gallery and workspace
    const { data: collection } = await supabaseAdmin
      .from('gallery_collections')
      .select('id, gallery_id, name')
      .eq('id', id)
      .maybeSingle();

    const eventId = collection?.gallery_id;
    let workspaceId: string | null = null;
    if (eventId) {
      const { data: gallery } = await supabaseAdmin
        .from('event_galleries')
        .select('workspace_id')
        .eq('id', eventId)
        .maybeSingle();
      workspaceId = gallery?.workspace_id || null;
    }

    // 2. Fetch all photos belonging to this folder/collection to retrieve keys and calculate freed bytes
    const { data: photosInCol } = await supabaseAdmin
      .from('gallery_photos')
      .select('id, original_key, preview_key, thumbnail_key, thumb_key, size_bytes')
      .or(`collection_id.eq.${id},folder_id.eq.${id}`);

    const photoIds = (photosInCol || []).map((p) => p.id);
    const storageKeys = (photosInCol || []).flatMap((p: any) => [
      p.original_key,
      p.preview_key,
      p.thumbnail_key,
      p.thumb_key,
    ]).filter((k): k is string => typeof k === 'string' && k.length > 0);

    const freedBytes = (photosInCol || []).reduce(
      (sum, p: any) => sum + (Number(p.size_bytes) || 0),
      0
    );

    // 3. Permanently purge explicit photo keys from Backblaze B2
    if (storageKeys.length > 0) {
      const purgeResult = await deleteGalleryObjects(storageKeys);
      console.log(`[GalleryCollections] Purged ${purgeResult.deleted} files from Backblaze B2 for folder ${id}.`);
    }

    // 4. Batch-delete entire folder prefix in Backblaze B2 to ensure zero orphan files
    const prefixesToPurge: string[] = [];
    if (workspaceId && eventId) {
      prefixesToPurge.push(`gallery/${workspaceId}/${eventId}/${id}/`);
      prefixesToPurge.push(`gallery/${workspaceId}/${eventId}/folders/${id}/`);
      prefixesToPurge.push(`workspaces/${workspaceId}/events/${eventId}/folders/${id}/`);
    }
    if (eventId) {
      prefixesToPurge.push(`gallery/default/${eventId}/${id}/`);
      prefixesToPurge.push(`events/${eventId}/folders/${id}/`);
      prefixesToPurge.push(`galleries/${workspaceId || 'default'}/${eventId}/folders/${id}/`);
    }

    for (const prefix of prefixesToPurge) {
      try {
        await deleteGalleryPrefix(prefix);
      } catch (prefixErr) {
        console.warn(`[GalleryCollections] Note purging prefix ${prefix}:`, prefixErr);
      }
    }

    // 5. Remove face vectors from Supabase
    if (photoIds.length > 0) {
      try {
        await supabaseAdmin.from('photo_faces').delete().in('photo_id', photoIds);
      } catch (_) {}

      // 6. Delete photo records from Supabase
      try {
        await supabaseAdmin.from('gallery_photos').delete().in('id', photoIds);
      } catch (err) {
        console.warn('[GalleryCollections] Note on deleting photos:', err);
      }
    }

    // 7. Delete the collection/folder record from Supabase
    const { error } = await supabaseAdmin
      .from('gallery_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 8. Decrement workspace storage quota
    if (freedBytes > 0 && workspaceId) {
      decrementWorkspaceStorage(workspaceId, eventId || null, freedBytes).catch((qErr) =>
        console.warn('[GalleryCollections] Storage quota decrement notice:', qErr)
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      deletedPhotosCount: photoIds.length,
      purgedStorageKeys: storageKeys.length,
      freedBytes,
    });
  } catch (err: any) {
    console.error('Error deleting gallery collection/folder:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
