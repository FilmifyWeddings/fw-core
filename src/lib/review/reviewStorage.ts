import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

// S3 / Backblaze B2 / Cloudflare R2 Configuration for Video Review Storage
export const REVIEW_B2_ENDPOINT = 
  clean(process.env.B2_REVIEW_ENDPOINT) || 
  clean(process.env.B2_GALLERY_ENDPOINT) || 
  clean(process.env.B2_ENDPOINT) || 
  'https://s3.eu-central-003.backblazeb2.com';

export const REVIEW_B2_REGION = 
  clean(process.env.B2_REVIEW_REGION) || 
  clean(process.env.B2_GALLERY_REGION) || 
  clean(process.env.B2_REGION) || 
  'eu-central-003';

export const REVIEW_B2_ACCESS_KEY_ID = 
  clean(process.env.B2_REVIEW_ACCESS_KEY_ID) || 
  clean(process.env.B2_GALLERY_ACCESS_KEY_ID) || 
  clean(process.env.B2_ACCESS_KEY_ID) || 
  '';

export const REVIEW_B2_SECRET_ACCESS_KEY = 
  clean(process.env.B2_REVIEW_SECRET_ACCESS_KEY) || 
  clean(process.env.B2_GALLERY_SECRET_ACCESS_KEY) || 
  clean(process.env.B2_SECRET_ACCESS_KEY) || 
  '';

export const REVIEW_BUCKET_NAME = 
  clean(process.env.B2_REVIEW_BUCKET_NAME) || 
  clean(process.env.B2_GALLERY_BUCKET_NAME) || 
  'studiocore-review';

export const REVIEW_CDN_URL = 
  clean(process.env.NEXT_PUBLIC_REVIEW_CDN_URL) || 
  clean(process.env.NEXT_PUBLIC_B2_GALLERY_CDN_URL) || 
  '';

export const reviewS3Client = new S3Client({
  endpoint: REVIEW_B2_ENDPOINT,
  region: REVIEW_B2_REGION,
  credentials: {
    accessKeyId: REVIEW_B2_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: REVIEW_B2_SECRET_ACCESS_KEY || 'placeholder',
  },
});

/**
 * Generate Presigned Upload URL for direct client-to-storage video upload (PUT)
 */
export async function getReviewPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucketName = REVIEW_BUCKET_NAME
): Promise<string> {
  try {
    if (!REVIEW_B2_ACCESS_KEY_ID || !REVIEW_B2_SECRET_ACCESS_KEY) {
      // Fallback API route if S3 credentials are not yet configured
      return `/api/review/upload?key=${encodeURIComponent(key)}`;
    }
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(reviewS3Client, command, { expiresIn });
  } catch (err) {
    console.warn('[Review Storage] Presigned upload fallback:', err);
    return `/api/review/upload?key=${encodeURIComponent(key)}`;
  }
}

/**
 * Generate Presigned Download URL for high-res original video download
 */
export async function getReviewPresignedDownloadUrl(
  key: string,
  expiresIn = 7200,
  bucketName = REVIEW_BUCKET_NAME
): Promise<string> {
  try {
    if (!REVIEW_B2_ACCESS_KEY_ID || !REVIEW_B2_SECRET_ACCESS_KEY) {
      return `/api/review/media?key=${encodeURIComponent(key)}`;
    }
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(reviewS3Client, command, { expiresIn });
  } catch (err) {
    return `/api/review/media?key=${encodeURIComponent(key)}`;
  }
}

/**
 * Delete video object from storage bucket
 */
export async function deleteReviewObject(key: string, bucketName = REVIEW_BUCKET_NAME): Promise<boolean> {
  try {
    if (!REVIEW_B2_ACCESS_KEY_ID || !REVIEW_B2_SECRET_ACCESS_KEY) return true;
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await reviewS3Client.send(command);
    return true;
  } catch (err) {
    console.error('[Review Storage] Delete failed:', err);
    return false;
  }
}
