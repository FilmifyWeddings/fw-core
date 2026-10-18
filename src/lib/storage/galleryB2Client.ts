import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

// Backblaze B2 Configuration for Galleries
export const B2_ENDPOINT = clean(process.env.B2_GALLERY_ENDPOINT) || clean(process.env.B2_ENDPOINT) || 'https://s3.eu-central-003.backblazeb2.com';
export const B2_REGION = clean(process.env.B2_GALLERY_REGION) || clean(process.env.B2_REGION) || 'eu-central-003';
export const B2_ACCESS_KEY_ID = clean(process.env.B2_GALLERY_ACCESS_KEY_ID) || clean(process.env.B2_ACCESS_KEY_ID) || '';
export const B2_SECRET_ACCESS_KEY = clean(process.env.B2_GALLERY_SECRET_ACCESS_KEY) || clean(process.env.B2_SECRET_ACCESS_KEY) || '';

// Dedicated Gallery Bucket Name (user provides, fallback to WhatsApp bucket or default)
export const B2_GALLERY_BUCKET_NAME = clean(process.env.B2_GALLERY_BUCKET_NAME) || clean(process.env.B2_WHATSAPP_BUCKET_NAME) || 'studiocore-galleries';

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
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(galleryB2Client, command, { expiresIn });
}

/**
 * Get direct public / CDN URL for a gallery photo (WebP preview, thumbnail, or cover)
 */
export function getGalleryPublicUrl(key: string, bucketName = B2_GALLERY_BUCKET_NAME): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const cleanKey = key.replace(/^\/+/, '');

  // 1. If custom CDN URL configured, use that
  if (B2_GALLERY_CDN_URL) {
    const base = B2_GALLERY_CDN_URL.replace(/\/+$/, '');
    return `${base}/${cleanKey}`;
  }

  // 2. Direct S3 URL on Backblaze B2
  return `https://${bucketName}.s3.${B2_REGION}.backblazeb2.com/${cleanKey}`;
}

/**
 * Automatically configure required CORS rules on the B2 gallery bucket
 * Allows web browsers to perform direct PUT uploads and GET downloads.
 */
export async function ensureGalleryCors(bucketName = B2_GALLERY_BUCKET_NAME): Promise<{ success: boolean; error?: string }> {
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
    return { success: true };
  } catch (err: any) {
    console.warn('[GalleryB2] Note on CORS configuration:', err.message);
    return { success: false, error: err.message };
  }
}
