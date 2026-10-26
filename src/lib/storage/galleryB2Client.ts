import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
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

/**
 * Singleton Backblaze B2 S3 Client
 */
export const galleryB2Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * Generates a presigned upload URL for direct browser-to-B2 PUT requests.
 */
export async function getGalleryPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
    ContentType: contentType,
  });

  return getSignedUrl(galleryB2Client, command, { expiresIn });
}

/**
 * Generates a presigned download URL for a file in the gallery B2 bucket.
 */
export async function getGalleryPresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
  bucketName = B2_GALLERY_BUCKET_NAME,
  responseContentDisposition?: string
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, '');
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cleanKey,
    ResponseContentDisposition: responseContentDisposition,
  });

  return getSignedUrl(galleryB2Client, command, { expiresIn });
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
    const byteArray = await (response.Body as any).transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err: any) {
    console.warn(`[GalleryStorage] getGalleryObjectBuffer failed for key ${key}:`, err.message);
    return null;
  }
}

/**
 * Converts a storage key into a public CDN URL or direct URL.
 */
export function getGalleryPublicUrl(
  key: string,
  bucketName = B2_GALLERY_BUCKET_NAME
): string {
  if (!key) return '';
  const cleanKey = key.replace(/^\/+/, '');

  if (B2_GALLERY_CDN_URL) {
    const base = B2_GALLERY_CDN_URL.replace(/\/+$/, '');
    return `${base}/${cleanKey}`;
  }

  const endpointBase = B2_ENDPOINT.replace(/\/+$/, '');
  return `${endpointBase}/${bucketName}/${cleanKey}`;
}

/**
 * Ensures CORS is configured on the gallery bucket so web browsers can upload directly.
 */
export async function ensureGalleryCors(bucketName = B2_GALLERY_BUCKET_NAME): Promise<void> {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    });
    await galleryB2Client.send(command);
  } catch (err: any) {
    console.warn('[GalleryB2] Notice configuring CORS on bucket:', err.message);
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
  keys: string[],
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
 * Permanently deletes all objects and all object versions/delete markers under a given directory prefix in Backblaze B2.
 * Uses ListObjectVersionsCommand to ensure 100% permanent wipeout (no hidden versions, no delete markers, no asterisk * in B2 console).
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

  // Attempt Version-Aware Deletion first (erases all underlying versions and delete markers)
  try {
    let keyMarker: string | undefined = undefined;
    let versionIdMarker: string | undefined = undefined;

    do {
      const listVersionsCmd = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: targetPrefix,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
        MaxKeys: 1000,
      });

      const listRes = await galleryB2Client.send(listVersionsCmd);
      const objectsToDelete: Array<{ Key: string; VersionId?: string }> = [];

      (listRes.Versions || []).forEach((v) => {
        if (v.Key) objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId });
      });

      (listRes.DeleteMarkers || []).forEach((m) => {
        if (m.Key) objectsToDelete.push({ Key: m.Key, VersionId: m.VersionId });
      });

      if (objectsToDelete.length > 0) {
        for (let i = 0; i < objectsToDelete.length; i += 1000) {
          const chunk = objectsToDelete.slice(i, i + 1000);
          try {
            const delCmd = new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: chunk,
                Quiet: true,
              },
            });
            const delRes = await galleryB2Client.send(delCmd);
            const errCount = delRes.Errors?.length || 0;
            totalErrors += errCount;
            totalDeleted += (chunk.length - errCount);
          } catch (chunkErr: any) {
            console.warn('[GalleryB2] Chunk version delete error:', chunkErr.message);
            totalErrors += chunk.length;
          }
        }
      }

      if (listRes.IsTruncated) {
        keyMarker = listRes.NextKeyMarker;
        versionIdMarker = listRes.NextVersionIdMarker;
      } else {
        keyMarker = undefined;
      }
    } while (keyMarker);

    console.log(`[GalleryB2] deleteGalleryPrefix("${targetPrefix}") permanently wiped ${totalDeleted} versions/markers (${totalErrors} errors).`);
    return { deleted: totalDeleted, errors: totalErrors };
  } catch (versionListErr: any) {
    console.warn(`[GalleryB2] ListObjectVersions fallback to ListObjectsV2 for ${targetPrefix}:`, versionListErr.message);
  }

  // Fallback to standard ListObjectsV2Command if bucket does not support version listing
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
