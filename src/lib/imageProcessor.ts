/**
 * High-Speed Client-Side WebP Compression & Direct Cloudflare R2 Pipeline
 */

export interface ImageVariants {
  original: File;
  preview: Blob;
  thumb: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  filename: string;
}

export interface UploadProgressCallback {
  (current: number, total: number, percentage: number, currentFileName: string): void;
}

/**
 * Generates 1920px Preview (WebP 80%) and 400px Thumbnail (WebP 70%) in the browser
 */
export async function generateImageVariants(file: File): Promise<ImageVariants> {
  let width = 1920;
  let height = 1080;

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;

      // 1. Generate 1920px Preview Blob (WebP 80% quality ~200KB)
      const previewCanvas = document.createElement('canvas');
      const previewScale = Math.min(1920 / Math.max(bitmap.width, bitmap.height), 1);
      previewCanvas.width = Math.max(1, Math.round(bitmap.width * previewScale));
      previewCanvas.height = Math.max(1, Math.round(bitmap.height * previewScale));
      const pCtx = previewCanvas.getContext('2d', { alpha: false });
      if (pCtx) {
        pCtx.imageSmoothingEnabled = true;
        pCtx.imageSmoothingQuality = 'high';
        pCtx.drawImage(bitmap, 0, 0, previewCanvas.width, previewCanvas.height);
      }
      const previewBlob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Preview conversion failed'))),
          'image/webp',
          0.8
        );
      });

      // 2. Generate 400px Grid Thumbnail Blob (WebP 70% quality ~30KB)
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = Math.min(400 / Math.max(bitmap.width, bitmap.height), 1);
      thumbCanvas.width = Math.max(1, Math.round(bitmap.width * thumbScale));
      thumbCanvas.height = Math.max(1, Math.round(bitmap.height * thumbScale));
      const tCtx = thumbCanvas.getContext('2d', { alpha: false });
      if (tCtx) {
        tCtx.imageSmoothingEnabled = true;
        tCtx.imageSmoothingQuality = 'medium';
        tCtx.drawImage(bitmap, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbBlob = await new Promise<Blob>((resolve, reject) => {
        thumbCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Thumbnail conversion failed'))),
          'image/webp',
          0.7
        );
      });

      bitmap.close?.();

      return {
        original: file,
        preview: previewBlob,
        thumb: thumbBlob,
        width,
        height,
        sizeBytes: file.size,
        filename: file.name.replace(/\.[^/.]+$/, ''),
      };
    }
  } catch (bitmapErr) {
    console.warn('[ImageProcessor] createImageBitmap fallback to Image element:', bitmapErr);
  }

  // Fallback using HTML Image element
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;

      // 1. Preview
      const previewCanvas = document.createElement('canvas');
      const pScale = Math.min(1920 / Math.max(width, height), 1);
      previewCanvas.width = Math.max(1, Math.round(width * pScale));
      previewCanvas.height = Math.max(1, Math.round(height * pScale));
      const pCtx = previewCanvas.getContext('2d', { alpha: false });
      pCtx?.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      const previewBlob = await new Promise<Blob>((res) =>
        previewCanvas.toBlob((b) => res(b!), 'image/webp', 0.8)
      );

      // 2. Thumb
      const thumbCanvas = document.createElement('canvas');
      const tScale = Math.min(400 / Math.max(width, height), 1);
      thumbCanvas.width = Math.max(1, Math.round(width * tScale));
      thumbCanvas.height = Math.max(1, Math.round(height * tScale));
      const tCtx = thumbCanvas.getContext('2d', { alpha: false });
      tCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbBlob = await new Promise<Blob>((res) =>
        thumbCanvas.toBlob((b) => res(b!), 'image/webp', 0.7)
      );

      resolve({
        original: file,
        preview: previewBlob,
        thumb: thumbBlob,
        width,
        height,
        sizeBytes: file.size,
        filename: file.name.replace(/\.[^/.]+$/, ''),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };

    img.src = url;
  });
}

/**
 * Uploads a blob directly to a presigned Cloudflare R2 URL
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
        reject(new Error(`Direct R2 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during R2 upload'));
    xhr.ontimeout = () => reject(new Error('R2 upload timed out'));

    xhr.send(blob);
  });
}

/**
 * Batch processes and uploads photos directly to Cloudflare R2
 */
export async function batchUploadPhotos(
  galleryId: string,
  files: File[],
  onProgress?: UploadProgressCallback,
  collectionId?: string
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

          // 1. High-Speed Client-Side WebP Conversion
          const variants = await generateImageVariants(file);

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

          // 3. Direct S3/R2 Parallel Uploads
          await Promise.all([
            uploadBlobToPresignedUrl(originalUploadUrl, variants.original, file.type || 'image/jpeg'),
            uploadBlobToPresignedUrl(previewUploadUrl, variants.preview, 'image/webp'),
            uploadBlobToPresignedUrl(thumbUploadUrl, variants.thumb, 'image/webp'),
          ]);

          // 4. Collect for registration
          registeredPhotos.push({
            gallery_id: galleryId,
            collection_id: collectionId || null,
            original_key: originalKey,
            preview_key: previewKey,
            thumbnail_key: thumbKey,
            width: variants.width,
            height: variants.height,
            size_bytes: variants.sizeBytes,
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

  // 5. Batch Register photos into database and trigger background face indexing
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
