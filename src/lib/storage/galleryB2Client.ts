import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

// Backblaze B2 Configuration for Galleries
export const B2_ENDPOINT = clean(process.env.B2_GALLERY_ENDPOINT) || clean(process.env.B2_ENDPOINT) || 'https://s3.eu-central-003.backblazeb2.com';
export const B2_REGION = clean(process.env.B2_GALLERY_REGION) || clean(process.env.B2_REGION) || 'eu-central-003';
export const B2_ACCESS_KEY_ID = clean(process.env.B2_GALLERY_ACCESS_KEY_ID) || clean(process.env.B2_ACCESS_KEY_ID) || '';
export const B2_SECRET_ACCESS_KEY = clean(process.env.B2_GALLERY_SECRET_ACCESS_KEY) || clean(process.env.B2_SECRET_ACCESS_KEY) || '';

// Dedicated Gallery Bucket Name (default to studiocore-gallery)
export const B2_GALLERY_BUCKET_NAME = clean(process.env.B2_GALLERY_BUCKET_NAME) || 'studiocore-gallery';

// Optional Custom CDN Domain (e.g., https://gallery-cdn.studiocore.in)
export const B2_GALLERY_CDN_URL = clean(process.env.NEXT_PUBLIC_B2_GALLERY_CDN_URL) || clean(process.env.NEXT_PUBLIC_R2_GALLERY_CDN_URL) || '';

export const galleryB2Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate Presigned Upload URL for direct client-to-B2 browser upload (PUT)
 */
export async function getGalleryPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(galleryB2Client, command, { expiresIn });
}

/**
 * Generate Presigned Download URL for high-res original download
 */
export async function getGalleryPresignedDownloadUrl(
  key: string,
  expiresIn = 7200,
  bucketName = B2_GALLERY_BUCKET_NAME,
  filename?: string
): Promise<string> {
  const cleanFilename = filename ? filename.replace(/["\r\n]/g, '') : null;
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ...(cleanFilename ? { ResponseContentDisposition: `attachment; filename="${cleanFilename}"` } : {}),
  });

  return await getSignedUrl(galleryB2Client, command, { expiresIn });
}

/**
 * Retrieve raw file buffer directly from storage bucket using S3 GetObjectCommand
 */
export async function getGalleryObjectBuffer(
  key: string,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<Buffer | null> {
  try {
    const cleanKey = key.replace(/^\/+/, '');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });
    const response = await galleryB2Client.send(command);
    if (!response.Body) return null;
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err: any) {
    console.warn(`[GalleryStorage] getGalleryObjectBuffer failed for key ${key}:`, err.message);
    return null;
  }
}

/**
 * Get direct public / CDN URL for a gallery photo (WebP preview, thumbnail, or cover)
 * 100% White-Labeled: Routes through /api/gallery/image for private bucket security and clean URLs
 */
export function getGalleryPublicUrl(key: string, bucketName = B2_GALLERY_BUCKET_NAME): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const cleanKey = key.replace(/^\/+/, '');

  // 1. If custom CDN URL configured (and not the non-existent gallery-cdn.studiocore.in), use that
  if (B2_GALLERY_CDN_URL && !B2_GALLERY_CDN_URL.includes('gallery-cdn.studiocore.in')) {
    const base = B2_GALLERY_CDN_URL.replace(/\/+$/, '');
    return `${base}/${cleanKey}`;
  }

  // 2. 100% White-Labeled Native Image Proxy (presigned redirect with browser caching)
  return `/api/gallery/image?key=${encodeURIComponent(cleanKey)}`;
}

let corsEnsured = false;

/**
 * Automatically configure required CORS rules on the B2 gallery bucket
 * Allows web browsers to perform direct PUT uploads and GET downloads.
 */
export async function ensureGalleryCors(bucketName = B2_GALLERY_BUCKET_NAME): Promise<{ success: boolean; error?: string }> {
  if (corsEnsured) return { success: true };
  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-request-id'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await galleryB2Client.send(command);
    corsEnsured = true;
    return { success: true };
  } catch (err: any) {
    console.warn('[GalleryB2] Note on CORS configuration:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Normalizes any storage reference into a clean relative S3 Key for Backblaze B2.
 * Supports:
 * - Direct S3 keys: "events/123/original/abc.jpg"
 * - Absolute CDN URLs: "https://gallery-cdn.studiocore.in/events/123/original/abc.jpg"
 * - Direct S3 endpoint URLs: "https://s3.eu-central-003.backblazeb2.com/studiocore-gallery/events/..."
 * - Proxy / image API URLs: "/api/gallery/image?key=events%2F123%2Fpreviews%2Fabc.webp#dx=50"
 * - Keys with hash fragments (#dx=..., #face_ai=...) or query parameters (?v=...)
 */
export function normalizeStorageKey(rawKey: string | null | undefined, bucketName = B2_GALLERY_BUCKET_NAME): string | null {
  if (!rawKey || typeof rawKey !== 'string') return null;
  let key = rawKey.trim();
  if (!key) return null;

  // 1. If it's a URL with query param ?key= (e.g. /api/gallery/image?key=...), extract the key
  if (key.includes('?key=') || key.includes('&key=')) {
    try {
      const dummyUrl = key.startsWith('http')
        ? new URL(key)
        : new URL(`http://dummy.local/${key.replace(/^\/+/, '')}`);
      const extracted = dummyUrl.searchParams.get('key');
      if (extracted) {
        key = decodeURIComponent(extracted).trim();
      }
    } catch (_) {}
  }

  // 2. Remove hash fragments like #dx=50&dy=50 or #face_ai=true
  key = key.split('#')[0].trim();

  // 3. Remove query parameters like ?t=123
  key = key.split('?')[0].trim();

  // 4. If it's a full HTTP/HTTPS URL, extract pathname
  if (key.startsWith('http://') || key.startsWith('https://')) {
    try {
      const parsed = new URL(key);
      key = parsed.pathname;
    } catch (_) {}
  }

  // 5. Remove leading and trailing slashes
  key = key.replace(/^\/+|\/+$/g, '');

  // 6. If pathname includes the bucket name at the start (e.g. studiocore-gallery/events/...), strip bucket name
  if (bucketName && key.startsWith(`${bucketName}/`)) {
    key = key.substring(bucketName.length + 1).replace(/^\/+/, '');
  }

  return key.length > 0 ? key : null;
}

/**
 * Permanently delete one or more objects from Backblaze B2 storage bucket in high-speed batches.
 * Purges original_key, preview_key, and thumbnail_key to free up storage space and eliminate charges.
 */
export async function deleteGalleryObjects(
  keys: (string | null | undefined)[],
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<{ deleted: number; errors: number }> {
  const validKeys = Array.from(
    new Set(
      keys
        .map((k) => normalizeStorageKey(k, bucketName))
        .filter((k): k is string => typeof k === 'string' && k.length > 0)
    )
  );

  if (validKeys.length === 0) return { deleted: 0, errors: 0 };

  let deleted = 0;
  let errors = 0;

  // Process deletions in batches of up to 1,000 objects per S3 call (AWS S3 & B2 standard limit)
  const BATCH_SIZE = 1000;
  for (let i = 0; i < validKeys.length; i += BATCH_SIZE) {
    const chunk = validKeys.slice(i, i + BATCH_SIZE);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      const response = await galleryB2Client.send(command);
      const batchErrors = response.Errors?.length || 0;
      errors += batchErrors;
      deleted += (chunk.length - batchErrors);
    } catch (batchErr: any) {
      console.warn('[GalleryB2] DeleteObjectsCommand batch failed, falling back to individual deletes:', batchErr.message);
      // Fallback to individual deletes if batch fails
      await Promise.all(
        chunk.map(async (key) => {
          try {
            const singleCmd = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            });
            await galleryB2Client.send(singleCmd);
            deleted++;
          } catch (err: any) {
            console.warn(`[GalleryB2] Failed to delete object ${key}:`, err.message);
            errors++;
          }
        })
      );
    }
  }

  console.log(`[GalleryB2] deleteGalleryObjects purged ${deleted} objects (${errors} errors).`);
  return { deleted, errors };
}

/**
 * Permanently deletes all objects under a given directory prefix in Backblaze B2.
 * Ideal for purging entire deleted galleries (e.g. "galleries/{workspace_id}/{gallery_id}/" or "events/{gallery_id}/").
 */
export async function deleteGalleryPrefix(
  prefix: string,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<{ deleted: number; errors: number }> {
  const cleanPrefix = normalizeStorageKey(prefix, bucketName);
  if (!cleanPrefix) return { deleted: 0, errors: 0 };

  // Ensure trailing slash for prefix matching unless it already ends with one
  const targetPrefix = cleanPrefix.endsWith('/') ? cleanPrefix : `${cleanPrefix}/`;

  let totalDeleted = 0;
  let totalErrors = 0;
  let continuationToken: string | undefined = undefined;

  do {
    try {
      const listCmd = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: targetPrefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const listRes = await galleryB2Client.send(listCmd);
      const objects = listRes.Contents || [];

      if (objects.length > 0) {
        const keysToDelete = objects
          .map((o) => o.Key)
          .filter((k): k is string => typeof k === 'string' && k.length > 0);

        const purgeRes = await deleteGalleryObjects(keysToDelete, bucketName);
        totalDeleted += purgeRes.deleted;
        totalErrors += purgeRes.errors;
      }

      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } catch (err: any) {
      console.error(`[GalleryB2] Error listing prefix ${targetPrefix}:`, err.message);
      totalErrors++;
      break;
    }
  } while (continuationToken);

  console.log(`[GalleryB2] deleteGalleryPrefix("${targetPrefix}") purged ${totalDeleted} files (${totalErrors} errors).`);
  return { deleted: totalDeleted, errors: totalErrors };
}
