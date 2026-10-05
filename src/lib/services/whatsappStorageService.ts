import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { whatsappB2Client, B2_WHATSAPP_BUCKET } from '@/lib/storage/whatsappB2Client';
import { supabaseAdmin } from '@/lib/supabase';

export const WORKSPACE_STORAGE_QUOTA_MB = 500;
export const WORKSPACE_STORAGE_QUOTA_BYTES = WORKSPACE_STORAGE_QUOTA_MB * 1024 * 1024; // 524,288,000 bytes
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds (7 days)

export interface UploadWhatsAppFileParams {
  workspaceId: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  mediaCategory?: 'quotation' | 'invoice' | 'flyer' | 'image' | 'document' | string;
  metadata?: Record<string, unknown>;
}

export interface UploadWhatsAppFileResult {
  permanentUrl: string;
  signedUrl: string;
  fileKey: string;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
}

/**
 * Resolves user UUID or workspace UUID to the effective active workspace UUID.
 */
export async function resolveEffectiveWorkspaceId(idOrUserId: string): Promise<string> {
  if (!idOrUserId || idOrUserId === '00000000-0000-0000-0000-000000000000') return idOrUserId;

  try {
    // 1. Direct workspace check
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('id', idOrUserId)
      .maybeSingle();

    if (ws?.id) return ws.id;

    // 2. Member lookup if user_id was passed
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', idOrUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (member?.workspace_id) return member.workspace_id;
  } catch (err) {
    console.warn('[WhatsAppStorage] resolveEffectiveWorkspaceId error:', err);
  }

  return idOrUserId;
}

/**
 * Generates a permanent application proxy URL for lifetime access to media in the private B2 bucket.
 * Defaults to relative path `/api/media/...` so it never breaks across localhost, staging, or production domains.
 */
export function getPermanentMediaUrl(fileKey: string, absolute = false): string {
  const cleanKey = fileKey.replace(/^\/+/, '');
  if (!absolute) {
    return `/api/media/${cleanKey}`;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${baseUrl}/api/media/${cleanKey}`;
}

/**
 * Checks workspace storage usage against the 500 MB quota
 */
export async function checkWorkspaceStorageQuota(
  workspaceId: string,
  additionalBytes: number = 0
): Promise<{
  allowed: boolean;
  usedBytes: number;
  usedMb: number;
  quotaBytes: number;
  quotaMb: number;
  filesCount: number;
  usagePercentage: number;
}> {
  let usedBytes = 0;
  let filesCount = 0;
  const effectiveWsId = await resolveEffectiveWorkspaceId(workspaceId);

  try {
    // 1. Try querying the database view first
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('vw_workspace_whatsapp_storage_usage')
      .select('total_files, total_bytes, total_mb, usage_percent')
      .eq('workspace_id', effectiveWsId)
      .maybeSingle();

    if (!viewError && viewData) {
      usedBytes = Number(viewData.total_bytes || 0);
      filesCount = Number(viewData.total_files || 0);
    } else {
      // 2. Fallback: Query fw_whatsapp_media_files directly if view is not yet applied
      const { data: rawFiles, error: rawError } = await supabaseAdmin
        .from('fw_whatsapp_media_files')
        .select('file_size_bytes')
        .eq('workspace_id', effectiveWsId);

      if (!rawError && rawFiles && rawFiles.length > 0) {
        usedBytes = rawFiles.reduce((acc, f) => acc + Number(f.file_size_bytes || 0), 0);
        filesCount = rawFiles.length;
      }
    }
  } catch (err) {
    console.warn('[WhatsAppStorage] Warning checking storage quota:', err);
  }

  const isAllowed = usedBytes + additionalBytes <= WORKSPACE_STORAGE_QUOTA_BYTES;
  const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
  const usagePercentage = Math.min(100, Math.round(((usedBytes / WORKSPACE_STORAGE_QUOTA_BYTES) * 100) * 10) / 10);

  return {
    allowed: isAllowed,
    usedBytes,
    usedMb,
    quotaBytes: WORKSPACE_STORAGE_QUOTA_BYTES,
    quotaMb: WORKSPACE_STORAGE_QUOTA_MB,
    filesCount,
    usagePercentage,
  };
}

/**
 * Uploads WhatsApp media to Backblaze B2 Private Bucket and returns a 7-day Pre-signed URL.
 * 
 * - Enforces 500 MB storage quota per workspace
 * - Compresses images using sharp (WebP, quality 85)
 * - Keeps original stream/buffer for PDFs and other documents
 * - Uploads to B2 via PutObjectCommand
 * - Generates 7-day Pre-signed URL (604800 seconds)
 * - Logs entry in fw_whatsapp_media_files table
 */
export async function uploadWhatsAppFileAndGetSignedUrl({
  workspaceId,
  buffer,
  fileName,
  mimeType,
  mediaCategory = 'document',
  metadata = {},
}: UploadWhatsAppFileParams): Promise<UploadWhatsAppFileResult> {
  if (!workspaceId) {
    throw new Error('[WhatsAppStorage] workspaceId is required');
  }
  if (!buffer || buffer.length === 0) {
    throw new Error('[WhatsAppStorage] File buffer is empty');
  }

  let uploadBuffer: Buffer = buffer;
  let uploadMimeType: string = mimeType || 'application/octet-stream';
  let uploadFileName: string = fileName || 'whatsapp-media';

  // 1. Image Optimization: Compress to WebP (quality 85) for images ONLY.
  // CRITICAL: DO NOT run sharp on videos, PDFs, or documents!
  const isImage = uploadMimeType.startsWith('image/') && uploadMimeType !== 'image/gif';
  const isVideoOrDoc = 
    uploadMimeType.startsWith('video/') || 
    uploadMimeType === 'application/pdf' || 
    uploadFileName.match(/\.(mp4|m4v|mov|avi|mkv|webm|pdf|doc|docx|xls|xlsx|txt)$/i);

  if (isImage && !isVideoOrDoc) {
    try {
      uploadBuffer = await sharp(buffer)
        .rotate()
        .webp({ quality: 85 })
        .toBuffer();
      uploadMimeType = 'image/webp';
      if (!uploadFileName.toLowerCase().endsWith('.webp')) {
        uploadFileName = uploadFileName.replace(/\.[^.]+$/, '') + '.webp';
      }
    } catch (compressErr) {
      console.warn('[WhatsAppStorage] Sharp compression failed, retaining original image:', compressErr);
    }
  }

  // 2. Check 500 MB storage quota
  const quotaCheck = await checkWorkspaceStorageQuota(workspaceId, uploadBuffer.length);
  if (!quotaCheck.allowed) {
    const fileMb = (uploadBuffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Workspace WhatsApp storage quota exceeded: Currently using ${quotaCheck.usedMb} MB of ${quotaCheck.quotaMb} MB limit. ` +
      `Cannot upload ${uploadFileName} (${fileMb} MB). Please delete old media files or upgrade storage.`
    );
  }

  // 3. Generate clean unique key for multi-tenant isolation
  const sanitizedFileName = uploadFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folderCategory = mediaCategory === 'template' ? 'templates' : mediaCategory;
  const fileKey = `${workspaceId}/whatsapp/${folderCategory}/${Date.now()}_${sanitizedFileName}`;

  // 4. Upload to Backblaze B2 S3
  await whatsappB2Client.send(
    new PutObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
      Body: uploadBuffer,
      ContentType: uploadMimeType,
      ContentLength: uploadBuffer.length,
      Metadata: {
        workspace_id: workspaceId,
        media_category: mediaCategory,
        original_name: encodeURIComponent(fileName),
      },
    })
  );

  // 5. Generate Lifetime Permanent Proxy URL & Pre-signed URL fallback
  const permanentUrl = getPermanentMediaUrl(fileKey);
  const signedUrl = await getSignedUrl(
    whatsappB2Client,
    new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
    }),
    { expiresIn: DEFAULT_SIGNED_URL_EXPIRY_SECONDS }
  );

  // 6. Log entry into Supabase database (fw_whatsapp_media_files)
  try {
    const { error: insertErr } = await supabaseAdmin.from('fw_whatsapp_media_files').insert({
      workspace_id: workspaceId,
      file_key: fileKey,
      file_name: uploadFileName,
      file_size_bytes: uploadBuffer.length,
      mime_type: uploadMimeType,
      media_category: mediaCategory,
    });
    if (insertErr) {
      console.error('[WhatsAppStorage] Error inserting media file into Supabase:', insertErr);
    } else {
      console.log('[WhatsAppStorage] ✅ Logged file to fw_whatsapp_media_files:', fileKey);
    }
  } catch (dbErr) {
    console.warn('[WhatsAppStorage] Exception saving media file record in Supabase:', dbErr);
  }

  return {
    permanentUrl,
    signedUrl,
    fileKey,
    fileSizeBytes: uploadBuffer.length,
    mimeType: uploadMimeType,
    fileName: uploadFileName,
  };
}

/**
 * Regenerates a fresh 7-day signed URL for an existing file in B2
 */
export async function getWhatsAppFileSignedUrl(
  fileKey: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  return await getSignedUrl(
    whatsappB2Client,
    new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
    }),
    { expiresIn: expiresInSeconds }
  );
}

/**
 * Permanently deletes a file and all its versions from Backblaze B2 and removes its database entry
 */
export async function deleteWhatsAppFile(
  workspaceId: string,
  fileKey: string
): Promise<boolean> {
  const effectiveWsId = await resolveEffectiveWorkspaceId(workspaceId);
  const cleanKey = fileKey.replace(/^\/?api\/media\//, '').replace(/^\/+/, '');

  try {
    // List all versions and delete markers for this exact key
    const versionsRes = await whatsappB2Client.send(
      new ListObjectVersionsCommand({
        Bucket: B2_WHATSAPP_BUCKET,
        Prefix: cleanKey,
      })
    );

    const objectsToDelete: { Key: string; VersionId?: string }[] = [];
    if (versionsRes.Versions) {
      versionsRes.Versions.filter(v => v.Key === cleanKey).forEach(v => {
        objectsToDelete.push({ Key: v.Key!, VersionId: v.VersionId });
      });
    }
    if (versionsRes.DeleteMarkers) {
      versionsRes.DeleteMarkers.filter(d => d.Key === cleanKey).forEach(d => {
        objectsToDelete.push({ Key: d.Key!, VersionId: d.VersionId });
      });
    }

    if (objectsToDelete.length > 0) {
      await whatsappB2Client.send(
        new DeleteObjectsCommand({
          Bucket: B2_WHATSAPP_BUCKET,
          Delete: {
            Objects: objectsToDelete,
            Quiet: true,
          },
        })
      );
      console.log(`[WhatsAppStorage] Permanently purged ${objectsToDelete.length} versions/markers for:`, cleanKey);
    } else {
      await whatsappB2Client.send(
        new DeleteObjectCommand({
          Bucket: B2_WHATSAPP_BUCKET,
          Key: cleanKey,
        })
      );
    }
  } catch (s3Err) {
    console.warn('[WhatsAppStorage] B2 DeleteObject warning:', s3Err);
  }

  try {
    await supabaseAdmin
      .from('fw_whatsapp_media_files')
      .delete()
      .or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.${workspaceId}`)
      .eq('file_key', cleanKey);

    return true;
  } catch (err) {
    console.error('[WhatsAppStorage] Failed to delete file:', err);
    return false;
  }
}

/**
 * Retrieves storage usage summary for a workspace
 */
export async function getWorkspaceWhatsAppStorageUsage(workspaceId: string) {
  return await checkWorkspaceStorageQuota(workspaceId, 0);
}

/**
 * Convenient alias for uploadWhatsAppFileAndGetSignedUrl
 */
export const uploadWhatsAppAttachment = uploadWhatsAppFileAndGetSignedUrl;

/**
 * Resolves any media URL, proxy URL (/api/media/...), or B2 file key to a direct Backblaze S3 pre-signed URL.
 * Valid for 2 hours (7200 seconds).
 * Ensures Baileys worker downloads directly from Backblaze B2 cloud storage without 404 or localhost dependency.
 */
export async function getDirectB2FetchUrl(fileKeyOrUrl: string): Promise<string> {
  if (!fileKeyOrUrl || typeof fileKeyOrUrl !== 'string') return '';

  let fileKey = fileKeyOrUrl.trim();

  // If it's already a direct S3 Backblaze presigned URL, return as is
  if (fileKey.includes('backblazeb2.com') && fileKey.includes('X-Amz-Signature')) {
    return fileKey;
  }

  // If it's a proxy URL like http://localhost:3000/api/media/... or https://studiocore.in/api/media/... or /api/media/...
  if (fileKey.includes('/api/media/')) {
    fileKey = fileKey.split('/api/media/')[1];
  }

  // Clean key and decode URI components
  fileKey = decodeURIComponent(fileKey).replace(/^\/+/, '');

  // If after extracting, it's an external HTTP/HTTPS URL (not B2 proxy), return as-is
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKeyOrUrl;
  }

  // Generate a fresh 2-hour pre-signed URL directly from Backblaze B2
  try {
    const command = new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
    });
    return await getSignedUrl(whatsappB2Client, command, { expiresIn: 7200 });
  } catch (err) {
    console.error('[WhatsAppStorage] Error generating direct B2 fetch URL for key:', fileKey, err);
    return fileKeyOrUrl;
  }
}

/**
 * Reconciles Backblaze B2 bucket objects with Supabase database.
 * If any file was deleted directly from B2 Cloud Storage, this purges its entry
 * from fw_whatsapp_media_files and detaches it from any referencing templates.
 * Also synchronizes any live B2 files into fw_whatsapp_media_files.
 */
export async function syncB2WithDatabase(workspaceId: string): Promise<{ deletedCount: number; addedCount: number }> {
  if (!workspaceId) return { deletedCount: 0, addedCount: 0 };
  const effectiveWsId = await resolveEffectiveWorkspaceId(workspaceId);

  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: B2_WHATSAPP_BUCKET,
      Prefix: `${effectiveWsId}/`,
    });
    const b2Res = await whatsappB2Client.send(listCmd);
    const b2Contents = b2Res.Contents || [];
    const existingB2Keys = new Set(b2Contents.map(o => o.Key).filter(Boolean));

    // Get all records in fw_whatsapp_media_files for this workspace
    const { data: dbFiles } = await supabaseAdmin
      .from('fw_whatsapp_media_files')
      .select('id, file_key, file_name')
      .eq('workspace_id', effectiveWsId);

    const dbFileKeys = new Set((dbFiles || []).map(f => f.file_key).filter(Boolean));

    // 1. Purge DB records for objects deleted in B2
    const orphanedIds: string[] = [];
    const orphanedKeys: string[] = [];
    if (dbFiles) {
      for (const f of dbFiles) {
        if (f.file_key && !existingB2Keys.has(f.file_key)) {
          orphanedIds.push(f.id);
          orphanedKeys.push(f.file_key);
        }
      }
    }

    if (orphanedIds.length > 0) {
      console.log(`[B2Sync] Removing ${orphanedIds.length} files from DB that were deleted in B2 bucket:`, orphanedKeys);
      await supabaseAdmin
        .from('fw_whatsapp_media_files')
        .delete()
        .in('id', orphanedIds);

      // Also detach from templates
      const { data: templates } = await supabaseAdmin
        .from('whatsapp_templates')
        .select('id, payload')
        .eq('workspace_id', effectiveWsId);

      if (templates && templates.length > 0) {
        for (const t of templates) {
          const payload = t.payload || {};
          const tplKey = payload.mediaFileKey || (payload.mediaUrl?.includes('/api/media/') ? payload.mediaUrl.split('/api/media/')[1] : null);
          if (tplKey && orphanedKeys.includes(tplKey)) {
            const updatedPayload = {
              ...payload,
              mediaUrl: '',
              mediaFileKey: '',
              mediaMime: '',
              mediaFileName: '',
              mediaFileSize: null,
            };
            await supabaseAdmin
              .from('whatsapp_templates')
              .update({ payload: updatedPayload, updated_at: new Date().toISOString() })
              .eq('id', t.id);
          }
        }
      }
    }

    // 2. Add any live B2 files missing from fw_whatsapp_media_files
    let addedCount = 0;
    for (const b2Obj of b2Contents) {
      if (b2Obj.Key && !dbFileKeys.has(b2Obj.Key)) {
        const parts = b2Obj.Key.split('/');
        const fullFileName = parts[parts.length - 1];
        const cleanFileName = fullFileName.replace(/^\d+_/, '');
        let mimeType = 'application/octet-stream';
        if (cleanFileName.endsWith('.webp')) mimeType = 'image/webp';
        else if (cleanFileName.endsWith('.jpg') || cleanFileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (cleanFileName.endsWith('.png')) mimeType = 'image/png';
        else if (cleanFileName.endsWith('.mp4')) mimeType = 'video/mp4';
        else if (cleanFileName.endsWith('.pdf')) mimeType = 'application/pdf';

        await supabaseAdmin.from('fw_whatsapp_media_files').insert({
          workspace_id: effectiveWsId,
          file_key: b2Obj.Key,
          file_name: cleanFileName,
          file_size_bytes: b2Obj.Size || 0,
          mime_type: mimeType,
          media_category: 'template',
          created_at: b2Obj.LastModified ? b2Obj.LastModified.toISOString() : new Date().toISOString(),
        });
        addedCount++;
      }
    }

    return { deletedCount: orphanedIds.length, addedCount };
  } catch (err) {
    console.warn('[B2Sync] Reconcile warning:', err);
    return { deletedCount: 0, addedCount: 0 };
  }
}
