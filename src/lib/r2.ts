import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '792dd0aa24514d22b048545492ca10f7';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'ec1e80786b584f299f2b42974ec89d65';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'a9bd9c1dcd6d49686fc0f66d118e802fa142a13b087fc80807ea1d92684f7015';

export const GALLERY_BUCKET_NAME = process.env.R2_GALLERY_BUCKET_NAME || 'studiocore-gallery';
export const R2_GALLERY_BUCKET_NAME = GALLERY_BUCKET_NAME;
export const CRM_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'studiocore-madia';
export const R2_BUCKET_NAME = GALLERY_BUCKET_NAME;
export const NEXT_PUBLIC_R2_GALLERY_CDN_URL = process.env.NEXT_PUBLIC_R2_GALLERY_CDN_URL || 'https://pub-fdc2498fa52b42cdb2890a14906b1b66.r2.dev';
export const R2_PUBLIC_URL = NEXT_PUBLIC_R2_GALLERY_CDN_URL;

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
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucketName = R2_GALLERY_BUCKET_NAME
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate Presigned Download URL for high-res original download
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 7200,
  bucketName = R2_GALLERY_BUCKET_NAME
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get direct public / CDN URL for a gallery R2 key (WebP preview, thumbnail, or original)
 */
export function getPublicGalleryUrl(key: string): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const base = (process.env.NEXT_PUBLIC_R2_GALLERY_CDN_URL || 'https://pub-fdc2498fa52b42cdb2890a14906b1b66.r2.dev').replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${base}/${cleanKey}`;
}

/**
 * Alias for backward compatibility
 */
export const getR2PublicUrl = getPublicGalleryUrl;

