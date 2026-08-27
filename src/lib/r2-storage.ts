import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID || '792dd0aa24514d22b048545492ca10f7';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'ec1e80786b584f299f2b42974ec89d65';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'a9bd9c1dcd6d49686fc0f66d118e802fa142a13b087fc80807ea1d92684f7015';
const bucketName = process.env.R2_BUCKET_NAME || 'studiocore-media';
const publicUrlBase = process.env.R2_PUBLIC_URL || 'https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev';

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
 * and returns the public CDN URL.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folder = 'moodboards'
): Promise<{ url: string; key: string }> {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${sanitizedFileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType || 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  const cleanBase = publicUrlBase.replace(/\/$/, '');
  const url = `${cleanBase}/${key}`;

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
