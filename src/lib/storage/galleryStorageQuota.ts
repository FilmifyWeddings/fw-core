import { supabaseAdmin } from '@/lib/supabase';

/**
 * Accurately increments storage used for a workspace and its event gallery.
 * Storage used is strictly thumbnail_size_bytes + preview_size_bytes.
 */
export async function incrementWorkspaceStorage(
  workspaceId: string,
  eventId: string | null,
  bytesAdded: number
): Promise<void> {
  if (!workspaceId || bytesAdded <= 0) return;

  try {
    // 1. Fetch current workspace storage_used_bytes
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('id, storage_used_bytes')
      .eq('id', workspaceId)
      .maybeSingle();

    if (ws) {
      const current = Number(ws.storage_used_bytes) || 0;
      const updated = current + bytesAdded;
      await supabaseAdmin
        .from('workspaces')
        .update({ storage_used_bytes: updated })
        .eq('id', workspaceId);
    }

    // 2. If eventId is provided, also increment event_galleries.storage_used_bytes
    if (eventId) {
      const { data: eg } = await supabaseAdmin
        .from('event_galleries')
        .select('id, storage_used_bytes')
        .eq('id', eventId)
        .maybeSingle();

      if (eg) {
        const currentEg = Number(eg.storage_used_bytes) || 0;
        await supabaseAdmin
          .from('event_galleries')
          .update({ storage_used_bytes: currentEg + bytesAdded })
          .eq('id', eventId);
      }
    }
  } catch (err: any) {
    console.warn('[GalleryStorageQuota] Error incrementing storage usage:', err?.message);
  }
}

/**
 * Accurately decrements storage used for a workspace and its event gallery when photos are deleted.
 * Clamps value at 0 so storage cannot become negative.
 */
export async function decrementWorkspaceStorage(
  workspaceId: string,
  eventId: string | null,
  bytesFreed: number
): Promise<void> {
  if (!workspaceId || bytesFreed <= 0) return;

  try {
    // 1. Decrement on workspace
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('id, storage_used_bytes')
      .eq('id', workspaceId)
      .maybeSingle();

    if (ws) {
      const current = Number(ws.storage_used_bytes) || 0;
      const updated = Math.max(0, current - bytesFreed);
      await supabaseAdmin
        .from('workspaces')
        .update({ storage_used_bytes: updated })
        .eq('id', workspaceId);
    }

    // 2. Decrement on event gallery if applicable
    if (eventId) {
      const { data: eg } = await supabaseAdmin
        .from('event_galleries')
        .select('id, storage_used_bytes')
        .eq('id', eventId)
        .maybeSingle();

      if (eg) {
        const currentEg = Number(eg.storage_used_bytes) || 0;
        const updatedEg = Math.max(0, currentEg - bytesFreed);
        await supabaseAdmin
          .from('event_galleries')
          .update({ storage_used_bytes: updatedEg })
          .eq('id', eventId);
      }
    }
  } catch (err: any) {
    console.warn('[GalleryStorageQuota] Error decrementing storage usage:', err?.message);
  }
}

/**
 * Recalculates exact workspace storage usage by summing size_bytes of all active photos.
 */
export async function recalculateWorkspaceStorage(workspaceId: string): Promise<number> {
  if (!workspaceId) return 0;

  try {
    // Fetch all event galleries belonging to this workspace
    const { data: galleries } = await supabaseAdmin
      .from('event_galleries')
      .select('id')
      .eq('workspace_id', workspaceId);

    const galleryIds = (galleries || []).map((g) => g.id);
    if (galleryIds.length === 0) {
      await resetWorkspaceStorage(workspaceId);
      return 0;
    }

    // Fetch all photos across these galleries
    const { data: photos } = await supabaseAdmin
      .from('gallery_photos')
      .select('gallery_id, size_bytes')
      .in('gallery_id', galleryIds);

    const totalWorkspaceBytes = (photos || []).reduce(
      (sum, p) => sum + (Number(p.size_bytes) || 0),
      0
    );

    // Update workspace record
    await supabaseAdmin
      .from('workspaces')
      .update({ storage_used_bytes: totalWorkspaceBytes })
      .eq('id', workspaceId);

    // Update each gallery record
    const galleryTotals: Record<string, number> = {};
    (photos || []).forEach((p) => {
      galleryTotals[p.gallery_id] = (galleryTotals[p.gallery_id] || 0) + (Number(p.size_bytes) || 0);
    });

    for (const gid of galleryIds) {
      const gBytes = galleryTotals[gid] || 0;
      await supabaseAdmin
        .from('event_galleries')
        .update({ storage_used_bytes: gBytes })
        .eq('id', gid);
    }

    return totalWorkspaceBytes;
  } catch (err: any) {
    console.warn('[GalleryStorageQuota] Error recalculating storage usage:', err?.message);
    return 0;
  }
}

/**
 * Resets workspace storage used bytes to 0.
 */
export async function resetWorkspaceStorage(workspaceId: string): Promise<void> {
  if (!workspaceId) return;
  try {
    await supabaseAdmin
      .from('workspaces')
      .update({ storage_used_bytes: 0 })
      .eq('id', workspaceId);
  } catch (err: any) {
    console.warn('[GalleryStorageQuota] Error resetting storage usage:', err?.message);
  }
}
