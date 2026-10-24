import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
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
 * Permanently delete one or more objects from Backblaze B2 storage bucket
 * Purges original_key, preview_key, and thumbnail_key to free up storage space and eliminate charges.
 */
export async function deleteGalleryObjects(
  keys: (string | null | undefined)[],
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<{ deleted: number; errors: number }> {
  const validKeys = Array.from(
    new Set(
      keys
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map((k) => k.replace(/^\/+/, '').split('?')[0].split('#')[0].trim())
        .map((k) => {
          if (k.startsWith('http://') || k.startsWith('https://')) {
            try {
              const parsed = new URL(k);
              return parsed.pathname.replace(/^\/+/, '');
            } catch (_) {
              return k;
            }
          }
          return k;
        })
        .filter((k) => k.length > 0)
    )
  );

  if (validKeys.length === 0) return { deleted: 0, errors: 0 };

  let deleted = 0;
  let errors = 0;

  // Process concurrent deletions in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < validKeys.length; i += BATCH_SIZE) {
    const chunk = validKeys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (key) => {
        try {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          });
          await galleryB2Client.send(command);
          deleted++;
        } catch (err: any) {
          console.warn(`[GalleryB2] Failed to delete object ${key}:`, err.message);
          errors++;
        }
      })
    );
  }

  return { deleted, errors };
}
