import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
}> {
  let usedBytes = 0;

  try {
    // 1. Try querying the database view first
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('vw_workspace_whatsapp_storage_usage')
      .select('total_bytes, total_mb')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!viewError && viewData) {
      usedBytes = Number(viewData.total_bytes || 0);
    } else {
      // 2. Fallback: Query fw_whatsapp_media_files directly if view is not yet applied
      const { data: rawFiles, error: rawError } = await supabaseAdmin
        .from('fw_whatsapp_media_files')
        .select('file_size_bytes')
        .eq('workspace_id', workspaceId);

      if (!rawError && rawFiles && rawFiles.length > 0) {
        usedBytes = rawFiles.reduce((acc, f) => acc + Number(f.file_size_bytes || 0), 0);
      }
    }
  } catch (err) {
    console.warn('[WhatsAppStorage] Warning checking storage quota:', err);
  }

  const isAllowed = usedBytes + additionalBytes <= WORKSPACE_STORAGE_QUOTA_BYTES;
  const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;

  return {
    allowed: isAllowed,
    usedBytes,
    usedMb,
    quotaBytes: WORKSPACE_STORAGE_QUOTA_BYTES,
    quotaMb: WORKSPACE_STORAGE_QUOTA_MB,
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

  // 1. Image Optimization: Compress to JPEG (quality 85, progressive) for 100% WhatsApp mobile compatibility
  if (uploadMimeType.startsWith('image/') && uploadMimeType !== 'image/gif') {
    try {
      uploadBuffer = await sharp(buffer)
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      uploadMimeType = 'image/jpeg';
      if (!uploadFileName.toLowerCase().endsWith('.jpg') && !uploadFileName.toLowerCase().endsWith('.jpeg')) {
        uploadFileName = uploadFileName.replace(/\.[^.]+$/, '') + '.jpg';
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
    await supabaseAdmin.from('fw_whatsapp_media_files').insert({
      workspace_id: workspaceId,
      file_key: fileKey,
      file_name: uploadFileName,
      file_size_bytes: uploadBuffer.length,
      mime_type: uploadMimeType,
      media_category: mediaCategory,
      signed_url: permanentUrl || signedUrl,
      expires_at: null, // Lifetime permanent access via secure proxy
      b2_bucket: B2_WHATSAPP_BUCKET,
      metadata: {
        ...metadata,
        permanent_url: permanentUrl,
        presigned_url: signedUrl,
        original_name: fileName,
        compressed_with_sharp: uploadMimeType === 'image/webp',
      },
    });
  } catch (dbErr) {
    console.warn('[WhatsAppStorage] Error saving media file record in Supabase:', dbErr);
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
 * Deletes a file from Backblaze B2 and removes its database entry
 */
export async function deleteWhatsAppFile(
  workspaceId: string,
  fileKey: string
): Promise<boolean> {
  try {
    await whatsappB2Client.send(
      new DeleteObjectCommand({
        Bucket: B2_WHATSAPP_BUCKET,
        Key: fileKey,
      })
    );

    await supabaseAdmin
      .from('fw_whatsapp_media_files')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('file_key', fileKey);

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
