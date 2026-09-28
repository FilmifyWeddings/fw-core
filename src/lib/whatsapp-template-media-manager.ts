/**
 * WhatsApp Template Storage Quota & Media Manager
 * =================================================
 * Dedicated storage tracking for Backblaze B2 private bucket & fw_whatsapp_media_files.
 * Enforces a strict 500 MB storage quota per workspace.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface WhatsAppMediaFile {
  name: string;
  url: string;
  size: number;
  created_at: string;
  mime_type?: string;
  usedInTemplates: string[];
  fileKey?: string;
}

export interface StorageQuotaStats {
  totalBytes: number;
  totalMB: number;
  maxMB: number;
  usagePercentage: number;
  filesCount: number;
}

const MAX_QUOTA_BYTES = 500 * 1024 * 1024; // Strictly 500 MB Limit

/**
 * Returns cached storage stats from sessionStorage/localStorage if available to avoid 0 MB flicker
 */
export function getCachedWhatsAppTemplateStorageUsage(workspaceId?: string): StorageQuotaStats | null {
  if (typeof window === 'undefined') return null;
  try {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      const raw = sessionStorage.getItem(`wa_storage_stats_${workspaceId}`) || localStorage.getItem(`wa_storage_stats_${workspaceId}`);
      if (raw) return JSON.parse(raw);
    }
    const latest = sessionStorage.getItem('wa_storage_stats_latest') || localStorage.getItem('wa_storage_stats_latest');
    if (latest) return JSON.parse(latest);
  } catch {}
  return null;
}

/**
 * Calculates current storage consumed by workspace from vw_workspace_whatsapp_storage_usage / fw_whatsapp_media_files.
 * In the browser, queries the server admin API (/api/whatsapp/templates/upload) to avoid RLS auth race conditions.
 */
export async function getWhatsAppTemplateStorageUsage(
  workspaceId: string,
  client: SupabaseClient = supabase
): Promise<StorageQuotaStats> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  // Helper to persist stats in both workspace key and latest global key
  const cacheStats = (s: StorageQuotaStats) => {
    try {
      if (typeof window !== 'undefined') {
        const str = JSON.stringify(s);
        if (folderPath && folderPath !== '00000000-0000-0000-0000-000000000000') {
          sessionStorage.setItem(`wa_storage_stats_${folderPath}`, str);
          localStorage.setItem(`wa_storage_stats_${folderPath}`, str);
        }
        sessionStorage.setItem('wa_storage_stats_latest', str);
        localStorage.setItem('wa_storage_stats_latest', str);
      }
    } catch {}
  };

  // 1. Primary in browser: Fetch from server API with service_role privileges
  if (typeof window !== 'undefined' && folderPath && folderPath !== '00000000-0000-0000-0000-000000000000') {
    try {
      const res = await fetch(`/api/whatsapp/templates/upload?workspaceId=${encodeURIComponent(folderPath)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const stats: StorageQuotaStats = {
            totalBytes: Number(data.usedBytes || 0),
            totalMB: Number(data.usedMb || 0),
            maxMB: Number(data.quotaMb || 500),
            usagePercentage: Number(data.usagePercentage || 0),
            filesCount: Number(data.filesCount || 0),
          };
          cacheStats(stats);
          return stats;
        }
      }
    } catch (apiErr) {
      console.warn('[getWhatsAppTemplateStorageUsage] API fetch failed, falling back to direct db:', apiErr);
    }
  }

  try {
    // 2. Query Backblaze B2 quota view
    const { data: viewData, error: viewErr } = await client
      .from('vw_workspace_whatsapp_storage_usage')
      .select('total_files, total_bytes, total_mb, usage_percent')
      .eq('workspace_id', folderPath)
      .maybeSingle();

    if (!viewErr && viewData) {
      const totalBytes = Number(viewData.total_bytes || 0);
      const totalMB = Number(viewData.total_mb || 0);
      const usagePercentage = Math.min(100, Number(viewData.usage_percent || 0));
      const filesCount = Number(viewData.total_files || 0);

      const stats: StorageQuotaStats = {
        totalBytes,
        totalMB,
        maxMB: 500,
        usagePercentage,
        filesCount,
      };
      cacheStats(stats);
      return stats;
    }

    // 2. Query fw_whatsapp_media_files directly if view is empty or pending
    const { data: b2Files, error: b2Err } = await client
      .from('fw_whatsapp_media_files')
      .select('file_size_bytes')
      .eq('workspace_id', folderPath);

    if (!b2Err && b2Files && b2Files.length > 0) {
      const totalBytes = b2Files.reduce((acc, f) => acc + Number(f.file_size_bytes || 0), 0);
      const totalMB = +(totalBytes / (1024 * 1024)).toFixed(1);
      const usagePercentage = Math.min(100, +((totalBytes / MAX_QUOTA_BYTES) * 100).toFixed(1));

      const stats: StorageQuotaStats = {
        totalBytes,
        totalMB,
        maxMB: 500,
        usagePercentage,
        filesCount: b2Files.length,
      };
      cacheStats(stats);
      return stats;
    }

    // 3. Fallback: legacy storage bucket check if no B2 files found
    const { data: storageFiles } = await client.storage
      .from('whatsapp_templates_media')
      .list(folderPath, { limit: 500 });

    if (storageFiles && storageFiles.length > 0) {
      const filesCount = storageFiles.length;
      const totalBytes = storageFiles.reduce((acc, file) => acc + ((file as any).metadata?.size || (file as any).size || 0), 0);
      const totalMB = +(totalBytes / (1024 * 1024)).toFixed(1);
      const usagePercentage = Math.min(100, +((totalBytes / MAX_QUOTA_BYTES) * 100).toFixed(1));
      const stats: StorageQuotaStats = { totalBytes, totalMB, maxMB: 500, usagePercentage, filesCount };
      cacheStats(stats);
      return stats;
    }

    const emptyStats: StorageQuotaStats = {
      totalBytes: 0,
      totalMB: 0,
      maxMB: 500,
      usagePercentage: 0,
      filesCount: 0,
    };
    cacheStats(emptyStats);
    return emptyStats;
  } catch (err) {
    console.warn('[getWhatsAppTemplateStorageUsage] Error:', err);
    return {
      totalBytes: 0,
      totalMB: 0,
      maxMB: 500,
      usagePercentage: 0,
      filesCount: 0,
    };
  }
}

/**
 * Non-blocking Upload Quota Guard Check.
 * Returns { allowed: false, message: '...' } if new file exceeds 500MB limit.
 */
export async function checkWhatsAppStorageQuotaGuard(
  workspaceId: string,
  newFileSizeBytes: number,
  client: SupabaseClient = supabase
): Promise<{ allowed: boolean; message?: string }> {
  const currentStats = await getWhatsAppTemplateStorageUsage(workspaceId, client);
  const projectedBytes = currentStats.totalBytes + newFileSizeBytes;

  if (projectedBytes > MAX_QUOTA_BYTES) {
    return {
      allowed: false,
      message: 'Storage Quota Exceeded (500 MB Limit Reached). Please upgrade your plan or delete existing media to continue uploading.',
    };
  }

  return { allowed: true };
}

/**
 * Lists all template media files uploaded for the workspace from Backblaze B2 (fw_whatsapp_media_files),
 * mapping template usage tags and permanent proxy URLs.
 */
export async function listWhatsAppTemplateMediaFiles(
  workspaceId: string,
  client: SupabaseClient = supabase
): Promise<WhatsAppMediaFile[]> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // Fetch template records to map media usage
    const { data: templates } = await client
      .from('whatsapp_templates')
      .select('name, payload')
      .eq('workspace_id', folderPath);

    const { data: tenantTemplates } = await client
      .from('tenant_whatsapp_templates')
      .select('template_name, media_url_payload, payload_json')
      .eq('tenant_id', folderPath);

    // 1. Primary: Fetch Backblaze B2 files from fw_whatsapp_media_files
    const { data: b2Files, error: b2Err } = await client
      .from('fw_whatsapp_media_files')
      .select('*')
      .eq('workspace_id', folderPath)
      .order('created_at', { ascending: false });

    if (!b2Err && b2Files && b2Files.length > 0) {
      return b2Files.map(f => {
        const proxyUrl = f.file_key ? `/api/media/${f.file_key}` : (f.signed_url || '');
        const usedInTemplates: string[] = [];

        if (templates) {
          templates.forEach(t => {
            const payloadStr = JSON.stringify(t.payload || {});
            if (payloadStr.includes(f.file_name) || (proxyUrl && payloadStr.includes(proxyUrl)) || (f.file_key && payloadStr.includes(f.file_key))) {
              if (!usedInTemplates.includes(t.name)) usedInTemplates.push(t.name);
            }
          });
        }

        if (tenantTemplates) {
          tenantTemplates.forEach(t => {
            const payloadStr = JSON.stringify(t.payload_json || {}) + (t.media_url_payload || '');
            if (payloadStr.includes(f.file_name) || (proxyUrl && payloadStr.includes(proxyUrl)) || (f.file_key && payloadStr.includes(f.file_key))) {
              if (!usedInTemplates.includes(t.template_name)) usedInTemplates.push(t.template_name);
            }
          });
        }

        return {
          name: f.file_name,
          url: proxyUrl,
          size: Number(f.file_size_bytes || 0),
          created_at: f.created_at || new Date().toISOString(),
          mime_type: f.mime_type,
          usedInTemplates,
          fileKey: f.file_key,
        };
      });
    }

    // 2. Fallback: Legacy Supabase Storage bucket
    const { data: storageFiles, error: storageErr } = await client.storage
      .from('whatsapp_templates_media')
      .list(folderPath, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (storageErr || !storageFiles || storageFiles.length === 0) {
      return [];
    }

    const { data: publicUrlData } = client.storage
      .from('whatsapp_templates_media')
      .getPublicUrl(`${folderPath}/placeholder`);

    const baseUrl = publicUrlData?.publicUrl ? publicUrlData.publicUrl.replace(/\/placeholder$/, '') : '';

    return storageFiles.map(file => {
      const filePublicUrl = `${baseUrl}/${file.name}`;
      const usedInTemplates: string[] = [];
      if (templates) {
        templates.forEach(t => {
          const payloadStr = JSON.stringify(t.payload || {});
          if (payloadStr.includes(file.name) || payloadStr.includes(filePublicUrl)) {
            usedInTemplates.push(t.name);
          }
        });
      }

      return {
        name: file.name,
        url: filePublicUrl,
        size: (file as any).metadata?.size || (file as any).size || 0,
        created_at: file.created_at || new Date().toISOString(),
        mime_type: file.metadata?.mimetype || (file.name.match(/\.(mp4|webm|mov)$/i) ? 'video/mp4' : 'image/webp'),
        usedInTemplates,
        fileKey: `${folderPath}/${file.name}`,
      };
    });
  } catch (err) {
    console.warn('[listWhatsAppTemplateMediaFiles] Error:', err);
    return [];
  }
}

/**
 * Instantly deletes a media file permanently from Backblaze B2 bucket, fw_whatsapp_media_files,
 * and detaches it from any referencing whatsapp_templates.
 */
export async function deleteWhatsAppTemplateMediaFile(
  workspaceId: string,
  fileName: string,
  fileKey?: string,
  client: SupabaseClient = supabase
): Promise<boolean> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Delete from Backblaze B2 & Supabase using delete-media API
    try {
      await fetch('/api/whatsapp/templates/delete-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: folderPath,
          fileKey: fileKey || '',
          fileName: fileName || '',
        }),
      });
    } catch (apiErr) {
      console.warn('[deleteWhatsAppTemplateMediaFile] API delete warning:', apiErr);
    }

    // 2. Also ensure legacy storage bucket clean up if applicable
    try {
      await client.storage
        .from('whatsapp_templates_media')
        .remove([`${folderPath}/${fileName}`]);
    } catch {}

    // Invalidate local session storage cache
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`wa_storage_stats_${folderPath}`);
        sessionStorage.removeItem('wa_storage_stats_latest');
        localStorage.removeItem('wa_storage_stats_latest');
      } catch {}
      window.dispatchEvent(new CustomEvent('wa_template_media_updated'));
    }

    return true;
  } catch (err) {
    console.error('[deleteWhatsAppTemplateMediaFile] Exception:', err);
    return false;
  }
}
