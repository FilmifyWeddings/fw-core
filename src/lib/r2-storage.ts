import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID || '792dd0aa24514d22b048545492ca10f7';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'ec1e80786b584f299f2b42974ec89d65';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'a9bd9c1dcd6d49686fc0f66d118e802fa142a13b087fc80807ea1d92684f7015';
const bucketName = process.env.R2_BUCKET_NAME || 'studiocore-madia';
const publicUrlBase = process.env.R2_PUBLIC_URL || '';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Uploads a binary buffer directly to Cloudflare R2 object storage
 * and returns the public / streaming URL.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folder = 'moodboards'
): Promise<{ url: string; key: string }> {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedFileName}`;

  const targetBucket = bucketName;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType || 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (err: any) {
    if (err.name === 'NoSuchBucket' || err.message?.includes('bucket does not exist')) {
      // Fallback attempt with alternative spelling
      const altBucket = targetBucket === 'studiocore-media' ? 'studiocore-madia' : 'studiocore-media';
      console.warn(`[R2 Warning]: Bucket ${targetBucket} not found, retrying with ${altBucket}...`);
      await r2.send(
        new PutObjectCommand({
          Bucket: altBucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType || 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } else {
      throw err;
    }
  }

  const publicBase = process.env.R2_PUBLIC_URL || 'https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev';
  const url = `${publicBase.replace(/\/$/, '')}/${key}`;

  return { url, key };
}

/**
 * Deletes an object from Cloudflare R2 given its key or full public URL.
 */
export async function deleteFromR2(keyOrUrl: string): Promise<boolean> {
  try {
    let key = keyOrUrl;
    if (keyOrUrl.startsWith('http')) {
      const urlObj = new URL(keyOrUrl);
      key = urlObj.pathname.replace(/^\/+/, '');
    }

    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error('[R2 Delete Error]:', err);
    return false;
  }
}

/**
 * Normalizes any relative path, key, or proxy URL to the full Cloudflare R2 public CDN URL.
 */
export function getMediaUrl(urlOrPath?: string | null): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('data:')) {
    return urlOrPath;
  }
  const cleanPath = urlOrPath.replace(/^\/+/, '');
  if (cleanPath.startsWith('api/media/r2/')) {
    const key = cleanPath.replace(/^api\/media\/r2\//, '');
    return `https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev/${key}`;
  }
  if (cleanPath.startsWith('moodboards/')) {
    return `https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev/${cleanPath}`;
  }
  return `https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev/moodboards/${cleanPath}`;
}

