/**
 * Storage adapter - completely migrated from Cloudflare R2 to Backblaze B2.
 * All functions re-routed to galleryB2Client for 100% backward compatibility.
 */
import {
  galleryB2Client,
  B2_GALLERY_BUCKET_NAME,
  B2_GALLERY_CDN_URL,
  getGalleryPresignedUploadUrl,
  getGalleryPresignedDownloadUrl,
  getGalleryPublicUrl,
  ensureGalleryCors,
} from '@/lib/storage/galleryB2Client';

export const GALLERY_BUCKET_NAME = B2_GALLERY_BUCKET_NAME;
export const R2_GALLERY_BUCKET_NAME = B2_GALLERY_BUCKET_NAME;
export const CRM_BUCKET_NAME = B2_GALLERY_BUCKET_NAME;
export const R2_BUCKET_NAME = B2_GALLERY_BUCKET_NAME;
export const GALLERY_CDN_URL = B2_GALLERY_CDN_URL;
export const NEXT_PUBLIC_R2_GALLERY_CDN_URL = B2_GALLERY_CDN_URL;
export const R2_PUBLIC_URL = B2_GALLERY_CDN_URL;

// Re-export S3 client pointing to Backblaze B2
export const r2Client = galleryB2Client;

/**
 * Generate Presigned Upload URL for direct client-to-storage upload (Backblaze B2)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<string> {
  return getGalleryPresignedUploadUrl(key, contentType, expiresIn, bucketName);
}

/**
 * Generate Presigned Download URL for high-res original download (Backblaze B2)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 7200,
  bucketName = B2_GALLERY_BUCKET_NAME
): Promise<string> {
  return getGalleryPresignedDownloadUrl(key, expiresIn, bucketName);
}

/**
 * Get direct public / CDN URL for a gallery key (WebP preview, thumbnail, or original)
 */
export function getPublicGalleryUrl(key: string, bucketName = B2_GALLERY_BUCKET_NAME): string {
  return getGalleryPublicUrl(key, bucketName);
}

/**
 * Alias for backward compatibility
 */
export const getR2PublicUrl = getPublicGalleryUrl;

export { ensureGalleryCors };
