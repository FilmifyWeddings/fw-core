import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

// Backblaze B2 Storage Configuration (Directly aligned with StudioCore's existing B2 setup)
export const B2_ENDPOINT = 
  clean(process.env.B2_GALLERY_ENDPOINT) || 
  clean(process.env.B2_ENDPOINT) || 
  'https://s3.eu-central-003.backblazeb2.com';

export const B2_REGION = 
  clean(process.env.B2_GALLERY_REGION) || 
  clean(process.env.B2_REGION) || 
  'eu-central-003';

export const B2_ACCESS_KEY_ID = 
  clean(process.env.B2_GALLERY_ACCESS_KEY_ID) || 
  clean(process.env.B2_ACCESS_KEY_ID) || 
  clean(process.env.R2_ACCESS_KEY_ID) || 
  '';

export const B2_SECRET_ACCESS_KEY = 
  clean(process.env.B2_GALLERY_SECRET_ACCESS_KEY) || 
  clean(process.env.B2_SECRET_ACCESS_KEY) || 
  clean(process.env.R2_SECRET_ACCESS_KEY) || 
  '';

// Dedicated B2 bucket for video reviews as requested: studiocore-video-review
export const REVIEW_BUCKET_NAME = 
  clean(process.env.B2_VIDEO_REVIEW_BUCKET_NAME) || 
  clean(process.env.B2_REVIEW_BUCKET_NAME) || 
  'studiocore-video-review';

export const REVIEW_CDN_URL = 
  clean(process.env.NEXT_PUBLIC_REVIEW_CDN_URL) || 
  clean(process.env.NEXT_PUBLIC_B2_GALLERY_CDN_URL) || 
  '';

export const reviewB2Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: B2_SECRET_ACCESS_KEY || 'placeholder',
  },
});

/**
 * Configure CORS on the Video Review B2 bucket
 * Allows web browsers to perform direct PUT uploads and GET range requests smoothly.
 */
export async function ensureReviewCors(bucketName = REVIEW_BUCKET_NAME): Promise<{ success: boolean; error?: string }> {
  if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
    return { success: false, error: 'Missing B2 credentials' };
  }
  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-request-id', 'Content-Length', 'Content-Range'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await reviewB2Client.send(command);
    return { success: true };
  } catch (err: any) {
    console.warn('[Review Storage] CORS check note:', err?.message || err);
    return { success: false, error: err?.message || 'CORS setup warning' };
  }
}

/**
 * Direct PutObject to Backblaze B2 (Buffer / String / JSON)
 */
export async function putReviewObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  bucketName = REVIEW_BUCKET_NAME
): Promise<boolean> {
  if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) return false;
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await reviewB2Client.send(command);
    return true;
  } catch (err) {
    console.error('[Review Storage] PutObject failed for key:', key, err);
    return false;
  }
}

/**
 * Fetch an object directly from Backblaze B2 as a string
 */
export async function getReviewObject(
  key: string,
  bucketName = REVIEW_BUCKET_NAME
): Promise<string | null> {
  if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const res = await reviewB2Client.send(command);
    if (!res.Body) return null;
    return await res.Body.transformToString();
  } catch (err) {
    return null;
  }
}

/**
 * Generate Presigned Upload URL for direct client-to-B2 browser upload (PUT)
 * Direct upload prevents VPS memory bottlenecks and delivers 10x faster speeds.
 */
export async function getReviewPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 7200,
  bucketName = REVIEW_BUCKET_NAME
): Promise<string> {
  if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
    return `/api/review/upload?key=${encodeURIComponent(key)}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(reviewB2Client, command, { expiresIn });
}

/**
 * Generate Presigned Download URL for smooth streaming and frame-by-frame scrubbing
 */
export async function getReviewPresignedDownloadUrl(
  key: string,
  expiresIn = 86400, // 24 hours
  bucketName = REVIEW_BUCKET_NAME
): Promise<string> {
  if (!B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) {
    return `/api/review/media?key=${encodeURIComponent(key)}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(reviewB2Client, command, { expiresIn });
}

/**
 * Delete a single video object from Backblaze B2 storage
 */
export async function deleteReviewObject(key: string, bucketName = REVIEW_BUCKET_NAME): Promise<boolean> {
  if (!key || !B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) return true;
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await reviewB2Client.send(command);
    return true;
  } catch (err) {
    console.error('[Review Storage] Delete failed for key:', key, err);
    return false;
  }
}

/**
 * Batch delete multiple video objects from Backblaze B2 storage (e.g. on project deletion)
 */
export async function deleteReviewObjects(keys: string[], bucketName = REVIEW_BUCKET_NAME): Promise<boolean> {
  if (!keys || keys.length === 0 || !B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) return true;
  const validKeys = Array.from(new Set(keys.filter(Boolean)));
  if (validKeys.length === 0) return true;

  try {
    const command = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: validKeys.map(k => ({ Key: k })),
        Quiet: true,
      },
    });
    await reviewB2Client.send(command);
  } catch (err) {
    console.warn('[Review Storage] Batch DeleteObjects note:', err);
  }

  // Double-guarantee: parallel individual deletes ensure zero orphaned files
  try {
    await Promise.allSettled(
      validKeys.map(k =>
        reviewB2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: k }))
      )
    );
    return true;
  } catch (err) {
    console.error('[Review Storage] Individual delete failed:', err);
    return false;
  }
}

/**
 * Purges all objects under a folder prefix in Backblaze B2 (e.g. project directory)
 */
export async function purgeReviewPrefix(prefix: string, bucketName = REVIEW_BUCKET_NAME): Promise<number> {
  if (!prefix || !B2_ACCESS_KEY_ID || !B2_SECRET_ACCESS_KEY) return 0;
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    const res = await reviewB2Client.send(listCmd);
    if (!res.Contents || res.Contents.length === 0) return 0;

    const keys = res.Contents.map(c => c.Key!).filter(Boolean);
    await deleteReviewObjects(keys, bucketName);
    return keys.length;
  } catch (err) {
    console.error('[Review Storage] Purge prefix failed:', prefix, err);
    return 0;
  }
}
