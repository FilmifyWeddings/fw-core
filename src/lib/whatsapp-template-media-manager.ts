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
 * Calculates current storage consumed by workspace from vw_workspace_whatsapp_storage_usage / fw_whatsapp_media_files.
 */
export async function getWhatsAppTemplateStorageUsage(
  workspaceId: string,
  client: SupabaseClient = supabase
): Promise<StorageQuotaStats> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Primary: Query Backblaze B2 quota view
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

      return {
        totalBytes,
        totalMB,
        maxMB: 500,
        usagePercentage,
        filesCount,
      };
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

      return {
        totalBytes,
        totalMB,
        maxMB: 500,
        usagePercentage,
        filesCount: b2Files.length,
      };
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
      return { totalBytes, totalMB, maxMB: 500, usagePercentage, filesCount };
    }

    return {
      totalBytes: 0,
      totalMB: 0,
      maxMB: 500,
      usagePercentage: 0,
      filesCount: 0,
    };
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
      };
    });
  } catch (err) {
    console.warn('[listWhatsAppTemplateMediaFiles] Error:', err);
    return [];
  }
}

/**
 * Instantly deletes a media file from Backblaze B2, fw_whatsapp_media_files, and legacy storage.
 */
export async function deleteWhatsAppTemplateMediaFile(
  workspaceId: string,
  fileName: string,
  client: SupabaseClient = supabase
): Promise<boolean> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Delete from Backblaze B2 via API
    try {
      await fetch(`/api/whatsapp/templates/upload?workspaceId=${folderPath}&fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
    } catch (apiErr) {
      console.warn('[deleteWhatsAppTemplateMediaFile] API delete warning:', apiErr);
    }

    // 2. Delete from Supabase Storage if legacy file exists
    await client.storage
      .from('whatsapp_templates_media')
      .remove([`${folderPath}/${fileName}`]);

    // 3. Delete from DB records
    await client
      .from('fw_whatsapp_media_files')
      .delete()
      .eq('workspace_id', folderPath)
      .eq('file_name', fileName);

    await client
      .from('user_gallery_images')
      .delete()
      .eq('workspace_id', folderPath)
      .eq('file_name', fileName)
      .eq('source_module', 'whatsapp_templates');

    // Broadcast instant update custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wa_template_media_updated'));
    }

    return true;
  } catch (err) {
    console.error('[deleteWhatsAppTemplateMediaFile] Exception:', err);
    return false;
  }
}
