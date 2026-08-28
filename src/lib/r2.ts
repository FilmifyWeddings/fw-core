import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '792dd0aa24514d22b048545492ca10f7';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'ec1e80786b584f299f2b42974ec89d65';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'a9bd9c1dcd6d49686fc0f66d118e802fa142a13b087fc80807ea1d92684f7015';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'studiocore-madia';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-f09dec7674714bbca24a6462b8f8a1a6.r2.dev';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate Presigned Upload URL for direct client-to-R2 upload
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate Presigned Download URL for high-res original download
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 7200): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get direct public / CDN URL for an R2 key (WebP preview or thumbnail)
 */
export function getR2PublicUrl(key: string): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const base = R2_PUBLIC_URL.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${base}/${cleanKey}`;
}
