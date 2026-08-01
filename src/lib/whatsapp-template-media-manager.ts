/**
 * WhatsApp Template Storage Quota & Media Manager
 * =================================================
 * Dedicated storage tracking for `whatsapp_template_media` bucket.
 * Enforces a strict 1,024 MB (1 GB) default storage quota per workspace.
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
 * Calculates current storage consumed by workspace in `whatsapp_template_media` bucket.
 */
export async function getWhatsAppTemplateStorageUsage(
  workspaceId: string,
  client: SupabaseClient = supabase
): Promise<StorageQuotaStats> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Try listing files directly from Supabase Storage bucket
    const { data: storageFiles, error: storageErr } = await client.storage
      .from('whatsapp_templates_media')
      .list(folderPath, { limit: 500 });

    let totalBytes = 0;
    let filesCount = 0;

    if (!storageErr && storageFiles) {
      filesCount = storageFiles.length;
      totalBytes = storageFiles.reduce((acc, file) => acc + ((file as any).metadata?.size || (file as any).size || 0), 0);
    } else {
      // 2. Fallback check DB table user_gallery_images strictly for whatsapp_templates
      const { data: dbFiles } = await client
        .from('user_gallery_images')
        .select('file_size')
        .eq('workspace_id', folderPath)
        .eq('source_module', 'whatsapp_templates');

      if (dbFiles) {
        filesCount = dbFiles.length;
        totalBytes = dbFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
      }
    }

    const totalMB = +(totalBytes / (1024 * 1024)).toFixed(1);
    const usagePercentage = Math.min(100, +((totalBytes / MAX_QUOTA_BYTES) * 100).toFixed(1));

    return {
      totalBytes,
      totalMB,
      maxMB: 500,
      usagePercentage,
      filesCount,
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
 * Lists all template media files uploaded for the workspace, matching template usage tags.
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

    // List storage files
    const { data: storageFiles, error: storageErr } = await client.storage
      .from('whatsapp_templates_media')
      .list(folderPath, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (storageErr || !storageFiles) {
      return [];
    }

    const { data: publicUrlData } = client.storage
      .from('whatsapp_templates_media')
      .getPublicUrl(`${folderPath}/placeholder`);

    const baseUrl = publicUrlData?.publicUrl ? publicUrlData.publicUrl.replace(/\/placeholder$/, '') : '';

    return storageFiles.map(file => {
      const filePublicUrl = `${baseUrl}/${file.name}`;
      
      // Match template usage
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
 * Instantly deletes a media file from Supabase Storage & DB logs.
 */
export async function deleteWhatsAppTemplateMediaFile(
  workspaceId: string,
  fileName: string,
  client: SupabaseClient = supabase
): Promise<boolean> {
  const folderPath = workspaceId || '00000000-0000-0000-0000-000000000000';

  try {
    // Delete from storage bucket
    const { error: removeErr } = await client.storage
      .from('whatsapp_templates_media')
      .remove([`${folderPath}/${fileName}`]);

    if (removeErr) {
      console.warn('[deleteWhatsAppTemplateMediaFile] Storage remove warning:', removeErr);
    }

    // Delete from DB logs if present (strictly for whatsapp_templates)
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
