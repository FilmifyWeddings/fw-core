/**
 * High-Speed Client-Side Image Compressor & Direct R2 Uploader
 */

export interface ProcessedPhotoVariants {
  file: File;
  originalBlob: Blob;
  previewBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  filename: string;
}

export interface UploadProgressCallback {
  (current: number, total: number, percentage: number, currentFileName: string): void;
}

/**
 * Compresses an image file in the browser to WebP at specified max dimension & quality
 */
export async function createWebPVariant(
  file: File,
  maxDimension: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            reject(new Error('Canvas toBlob conversion failed'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for client-side processing'));
    };

    img.src = url;
  });
}

/**
 * Processes a single photo into original, preview, and thumbnail variants
 */
export async function processPhotoFile(file: File): Promise<ProcessedPhotoVariants> {
  const [preview, thumb] = await Promise.all([
    createWebPVariant(file, 1920, 0.82),
    createWebPVariant(file, 400, 0.70),
  ]);

  return {
    file,
    originalBlob: file,
    previewBlob: preview.blob,
    thumbBlob: thumb.blob,
    width: preview.width,
    height: preview.height,
    sizeBytes: file.size,
    filename: file.name.replace(/\.[^/.]+$/, ''),
  };
}

/**
 * Uploads a blob to a presigned S3/R2 URL with progress tracking
 */
export function uploadBlobToPresignedUrl(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Direct R2 upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during R2 upload'));
    xhr.ontimeout = () => reject(new Error('R2 upload timed out'));

    xhr.send(blob);
  });
}

/**
 * Batch processes and uploads a queue of photos directly to Cloudflare R2
 */
export async function batchUploadPhotos(
  galleryId: string,
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<{ success: boolean; uploadedCount: number; errors: string[] }> {
  let completed = 0;
  const total = files.length;
  const errors: string[] = [];
  const registeredPhotos: any[] = [];

  // Process in concurrent batches of 4
  const CONCURRENCY = 4;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        try {
          if (onProgress) {
            onProgress(completed, total, Math.round((completed / total) * 100), `Optimizing ${file.name}...`);
          }

          // 1. Client-Side WebP Conversion
          const processed = await processPhotoFile(file);

          // 2. Fetch Presigned URLs from API
          const cleanName = encodeURIComponent(file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
          const urlRes = await fetch('/api/gallery/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              galleryId,
              filename: cleanName,
              originalType: file.type || 'image/jpeg',
            }),
          });

          const urlJson = await urlRes.json();
          if (!urlJson.success) {
            throw new Error(urlJson.error || 'Failed to obtain presigned upload URLs');
          }

          const { originalUploadUrl, previewUploadUrl, thumbUploadUrl, originalKey, previewKey, thumbKey } = urlJson;

          if (onProgress) {
            onProgress(completed, total, Math.round((completed / total) * 100), `Uploading ${file.name} to R2...`);
          }

          // 3. Direct R2 Parallel Uploads
          await Promise.all([
            uploadBlobToPresignedUrl(originalUploadUrl, processed.originalBlob, file.type || 'image/jpeg'),
            uploadBlobToPresignedUrl(previewUploadUrl, processed.previewBlob, 'image/webp'),
            uploadBlobToPresignedUrl(thumbUploadUrl, processed.thumbBlob, 'image/webp'),
          ]);

          // 4. Collect for registration
          registeredPhotos.push({
            gallery_id: galleryId,
            original_key: originalKey,
            preview_key: previewKey,
            thumbnail_key: thumbKey,
            width: processed.width,
            height: processed.height,
            size_bytes: processed.sizeBytes,
          });

          completed++;
          if (onProgress) {
            onProgress(completed, total, Math.round((completed / total) * 100), file.name);
          }
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          errors.push(`${file.name}: ${err.message}`);
        }
      })
    );
  }

  // 5. Batch Register photos into database and trigger face indexing
  if (registeredPhotos.length > 0) {
    try {
      await fetch('/api/gallery/photos/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryId, photos: registeredPhotos }),
      });
    } catch (err) {
      console.error('Failed to register photos in database:', err);
    }
  }

  return {
    success: errors.length === 0,
    uploadedCount: completed,
    errors,
  };
}
