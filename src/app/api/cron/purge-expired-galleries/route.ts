import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteGalleryObjects, deleteGalleryPrefix } from '@/lib/storage/galleryB2Client';
import { resetWorkspaceStorage, decrementWorkspaceStorage } from '@/lib/storage/galleryStorageQuota';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET/POST /api/cron/purge-expired-galleries
 * 
 * Secure automated cron worker executing daily:
 * 1. Identifies galleries and workspaces where status IN ('expired', 'paused') AND expired for >= 180 days (6 months).
 * 2. Recursively batch deletes all files under workspaces/{workspace_id}/events/{event_id}/ in Backblaze B2.
 * 3. Cascade deletes photo, folder, and gallery records from Supabase.
 * 4. Resets/decrements workspace storage quota to 0.
 * 5. Logs permanent purge audit event in gallery_purge_audit_logs.
 */
async function handlePurge(req: NextRequest) {
  try {
    // 1. Verify Authentication / Secret
    const authHeader = req.headers.get('authorization') || '';
    const cronSecretHeader = req.headers.get('x-cron-secret') || '';
    const { searchParams } = new URL(req.url);
    const queryKey = searchParams.get('key') || searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET || process.env.BAILEYS_WEBHOOK_SECRET;

    const tokenFromAuth = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providedSecret = tokenFromAuth || cronSecretHeader || queryKey;

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const auditRecords: any[] = [];
    let totalPurgedFiles = 0;
    let totalFreedBytes = 0;

    // 2. Query Qualifying Expired / Paused Event Galleries
    // Qualifies if: status is 'expired' or 'paused' AND (expired_at <= NOW() - 180 days OR scheduled_purge_at <= NOW())
    const { data: expiredGalleries, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('id, workspace_id, title, status, expired_at, scheduled_purge_at, r2_folder_prefix')
      .or(`status.eq.expired,status.eq.paused`)
      .or(`expired_at.lte.${sixMonthsAgo},scheduled_purge_at.lte.${nowIso}`);

    if (galErr) {
      console.error('[PurgeCron] Error querying expired galleries:', galErr);
    }

    const eligibleGalleries = (expiredGalleries || []).filter((g) => {
      if (g.scheduled_purge_at && new Date(g.scheduled_purge_at).getTime() <= Date.now()) {
        return true;
      }
      if (g.expired_at && new Date(g.expired_at).getTime() <= Date.now() - 180 * 86400000) {
        return true;
      }
      return false;
    });

    for (const gallery of eligibleGalleries) {
      const galleryId = gallery.id;
      const workspaceId = gallery.workspace_id;

      // A. Query all photos belonging to this gallery
      const { data: photos } = await supabaseAdmin
        .from('gallery_photos')
        .select('id, original_key, preview_key, thumbnail_key, thumb_key, size_bytes')
        .eq('gallery_id', galleryId);

      const photoIds = (photos || []).map((p) => p.id);
      const storageKeys = (photos || []).flatMap((p: any) => [
        p.original_key,
        p.preview_key,
        p.thumbnail_key,
        p.thumb_key,
      ]).filter((k): k is string => typeof k === 'string' && k.length > 0);

      const freedBytes = (photos || []).reduce(
        (sum, p: any) => sum + (Number(p.size_bytes) || 0),
        0
      );

      // B. Purge explicit objects from Backblaze B2
      if (storageKeys.length > 0) {
        await deleteGalleryObjects(storageKeys);
      }

      // C. Recursively delete entire prefix from Backblaze B2
      const prefixesToPurge: string[] = [];
      if (workspaceId) {
        prefixesToPurge.push(`workspaces/${workspaceId}/events/${galleryId}/`);
        prefixesToPurge.push(`galleries/${workspaceId}/${galleryId}/`);
      }
      prefixesToPurge.push(`workspaces/default/events/${galleryId}/`);
      prefixesToPurge.push(`galleries/00000000-0000-0000-0000-000000000000/${galleryId}/`);
      prefixesToPurge.push(`events/${galleryId}/`);
      if (gallery.r2_folder_prefix) {
        const p = gallery.r2_folder_prefix.trim();
        if (p) prefixesToPurge.push(p.endsWith('/') ? p : `${p}/`);
      }

      let galleryPurgedFileCount = storageKeys.length;
      for (const prefix of prefixesToPurge) {
        try {
          const res = await deleteGalleryPrefix(prefix);
          galleryPurgedFileCount += res.deleted;
        } catch (prefixErr) {
          console.warn(`[PurgeCron] Note purging prefix ${prefix}:`, prefixErr);
        }
      }

      // D. Cascade delete related records from Supabase
      try {
        if (photoIds.length > 0) {
          await supabaseAdmin.from('photo_faces').delete().in('photo_id', photoIds);
        }
        await supabaseAdmin.from('photo_faces').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('gallery_photos').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('gallery_collections').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('gallery_selections').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('gallery_album_selections').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('gallery_guests').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('event_guest_registrations').delete().eq('gallery_id', galleryId);
        await supabaseAdmin.from('event_galleries').delete().eq('id', galleryId);
      } catch (dbErr) {
        console.warn(`[PurgeCron] Cascade DB cleanup notice for gallery ${galleryId}:`, dbErr);
      }

      // E. Decrement workspace storage quota
      if (workspaceId && freedBytes > 0) {
        await decrementWorkspaceStorage(workspaceId, galleryId, freedBytes);
      }

      totalPurgedFiles += galleryPurgedFileCount;
      totalFreedBytes += freedBytes;

      // F. Record audit event
      const auditItem = {
        workspace_id: workspaceId || null,
        event_id: galleryId,
        gallery_title: gallery.title,
        purged_files_count: galleryPurgedFileCount,
        purged_bytes_freed: freedBytes,
        purged_prefixes: prefixesToPurge,
        reason: '180_day_post_expiry_auto_purge',
        metadata: {
          expired_at: gallery.expired_at,
          scheduled_purge_at: gallery.scheduled_purge_at,
          purged_at: nowIso,
        },
      };

      auditRecords.push(auditItem);

      // Log into Supabase audit table if table exists
      try {
        await supabaseAdmin.from('gallery_purge_audit_logs').insert(auditItem);
      } catch (_) {}
    }

    // 3. Query Entirely Expired / Paused Workspaces (>= 180 days expired)
    const { data: expiredWorkspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, status, expired_at, scheduled_purge_at')
      .or(`status.eq.expired,status.eq.paused`)
      .or(`expired_at.lte.${sixMonthsAgo},scheduled_purge_at.lte.${nowIso}`);

    const eligibleWorkspaces = (expiredWorkspaces || []).filter((w) => {
      if (w.scheduled_purge_at && new Date(w.scheduled_purge_at).getTime() <= Date.now()) {
        return true;
      }
      if (w.expired_at && new Date(w.expired_at).getTime() <= Date.now() - 180 * 86400000) {
        return true;
      }
      return false;
    });

    for (const ws of eligibleWorkspaces) {
      // Recursively delete all objects under workspaces/{workspace_id}/events/ in Backblaze B2
      const wsPrefix = `workspaces/${ws.id}/events/`;
      const legacyWsPrefix = `galleries/${ws.id}/`;
      let wsPurged = 0;

      try {
        const res1 = await deleteGalleryPrefix(wsPrefix);
        const res2 = await deleteGalleryPrefix(legacyWsPrefix);
        wsPurged = res1.deleted + res2.deleted;
      } catch (wsErr) {
        console.warn(`[PurgeCron] Note purging workspace prefix ${wsPrefix}:`, wsErr);
      }

      // Reset workspace storage
      await resetWorkspaceStorage(ws.id);

      const wsAudit = {
        workspace_id: ws.id,
        gallery_title: `Full Workspace Purge: ${ws.name}`,
        purged_files_count: wsPurged,
        purged_prefixes: [wsPrefix, legacyWsPrefix],
        reason: '180_day_workspace_subscription_expiry_purge',
        metadata: {
          expired_at: ws.expired_at,
          scheduled_purge_at: ws.scheduled_purge_at,
          purged_at: nowIso,
        },
      };

      auditRecords.push(wsAudit);
      try {
        await supabaseAdmin.from('gallery_purge_audit_logs').insert(wsAudit);
      } catch (_) {}
    }

    console.log(`[PurgeCron] Auto-purge cycle complete: ${eligibleGalleries.length} galleries, ${eligibleWorkspaces.length} workspaces, ${totalPurgedFiles} files purged, ${totalFreedBytes} bytes freed.`);

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      purgedGalleriesCount: eligibleGalleries.length,
      purgedWorkspacesCount: eligibleWorkspaces.length,
      totalPurgedFiles,
      totalFreedBytes,
      audit: auditRecords,
    });
  } catch (err: any) {
    console.error('[PurgeCron] Exception during auto-purge execution:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handlePurge(req);
}

export async function POST(req: NextRequest) {
  return handlePurge(req);
}
