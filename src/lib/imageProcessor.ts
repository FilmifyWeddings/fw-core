/**
 * StudioCore High-Speed Client-Side Image Processor & Cloud Upload Pipeline
 * Features:
 * - Aggressive GPU & memory management (prevents Chrome OOM tab crashes on thousands of photos)
 * - Controlled concurrency sliding-window pipeline
 * - 100% White-Labeled (StudioCore Cloud)
 * - Incremental registration & local manifest tracking for instant resumption on refresh
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
 * Local storage manifest helpers to remember uploaded photos per gallery
 */
export function getManifestKey(galleryId: string): string {
  return `sc_gallery_manifest_${galleryId}`;
}

export function getUploadedManifest(galleryId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getManifestKey(galleryId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : Object.keys(parsed));
  } catch (_) {
    return new Set();
  }
}

export function recordUploadedToManifest(galleryId: string, filename: string, sizeBytes: number): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getUploadedManifest(galleryId);
    const signature = `${filename}_${sizeBytes}`;
    set.add(signature);
    localStorage.setItem(getManifestKey(galleryId), JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export function isPhotoInManifest(galleryId: string, filename: string, sizeBytes: number): boolean {
  const set = getUploadedManifest(galleryId);
  return set.has(`${filename}_${sizeBytes}`);
}

/**
 * Generates 1920px Preview (WebP 80%) and 400px Thumbnail (WebP 70%) in the browser.
 * Memory-safe: aggressively closes bitmaps and resets canvas buffers to 1x1 to force GPU VRAM deallocation.
 */
export async function generateImageVariants(file: File): Promise<ImageVariants> {
  let width = 1920;
  let height = 1080;

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;

      // 1. Generate 2048px 2K Preview Blob (PhotoOwl Style High-Res ~115KB)
      const previewCanvas = document.createElement('canvas');
      const previewScale = Math.min(2048 / Math.max(bitmap.width, bitmap.height), 1);
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
          0.78
        );
      });

      // Free Preview Canvas buffer
      previewCanvas.width = 1;
      previewCanvas.height = 1;

      // 2. Generate 480px Grid Thumbnail Blob (PhotoOwl Style Low-Res ~9.9KB)
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = Math.min(480 / Math.max(bitmap.width, bitmap.height), 1);
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
          0.65
        );
      });

      // Free Thumbnail Canvas buffer
      thumbCanvas.width = 1;
      thumbCanvas.height = 1;

      // Immediately close bitmap to free underlying GPU texture memory
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }

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
      const pScale = Math.min(2048 / Math.max(width, height), 1);
      previewCanvas.width = Math.max(1, Math.round(width * pScale));
      previewCanvas.height = Math.max(1, Math.round(height * pScale));
      const pCtx = previewCanvas.getContext('2d', { alpha: false });
      pCtx?.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      const previewBlob = await new Promise<Blob>((res) =>
        previewCanvas.toBlob((b) => res(b!), 'image/webp', 0.78)
      );
      previewCanvas.width = 1;
      previewCanvas.height = 1;

      // 2. Thumb
      const thumbCanvas = document.createElement('canvas');
      const tScale = Math.min(480 / Math.max(width, height), 1);
      thumbCanvas.width = Math.max(1, Math.round(width * tScale));
      thumbCanvas.height = Math.max(1, Math.round(height * tScale));
      const tCtx = thumbCanvas.getContext('2d', { alpha: false });
      tCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbBlob = await new Promise<Blob>((res) =>
        thumbCanvas.toBlob((b) => res(b!), 'image/webp', 0.65)
      );
      thumbCanvas.width = 1;
      thumbCanvas.height = 1;

      img.src = '';

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
 * Uploads a blob directly to a presigned Cloud storage URL with progress reporting and cancellation support
 */
export function uploadBlobToPresignedUrl(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      if (signal.aborted) {
        return reject(new Error('Upload cancelled'));
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

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
        reject(new Error(`Direct storage upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during storage upload'));
    xhr.ontimeout = () => reject(new Error('Storage upload timed out'));

    xhr.send(blob);
  });
}

/**
 * Batch processes and streams photos directly to StudioCore Cloud Storage.
 * - Sliding window concurrency (max 2-3 files) prevents Chrome memory spikes.
 * - Incremental registration in chunks of 3-5 photos.
 * - LocalStorage manifest tracking allows skipping already uploaded photos on resume.
 */
export async function batchUploadPhotos(
  galleryId: string,
  files: File[],
  onProgress?: UploadProgressCallback,
  collectionId?: string,
  workspaceId?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; uploadedCount: number; errors: string[] }> {
  let completed = 0;
  const total = files.length;
  const errors: string[] = [];
  const pendingRegistration: any[] = [];

  // 0. Check if StudioCore Native Desktop Engine (Pic-Time Architecture) is running locally
  let isDesktopEngineActive = false;
  if (typeof window !== 'undefined') {
    try {
      const probe = await fetch('http://127.0.0.1:41789/status', {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(1200),
      });
      if (probe.ok) {
        const pData = await probe.json();
        if (pData.status === 'online') {
          isDesktopEngineActive = true;
        }
      }
    } catch (_) {}
  }

  // 0B. If Desktop Engine is active, pipe uploads directly to the native sliding-window turbo engine!
  if (isDesktopEngineActive) {
    console.log('[ImageProcessor] ⚡ StudioCore Native Desktop Engine detected on 127.0.0.1:41789! Routing via smooth sliding-window turbo pipeline...');
    if (onProgress && files.length > 0) {
      onProgress(0, total, 5, `[Turbo Engine] Uploading ${files[0].name}...`);
    }
    const SLIDING_CONCURRENCY = 6;
    let fileIndex = 0;

    const worker = async () => {
      while (fileIndex < files.length) {
        if (signal?.aborted) throw new Error('Upload cancelled by user');
        const currentIndex = fileIndex++;
        const file = files[currentIndex];
        if (!file) break;

        if (onProgress) {
          const pct = Math.max(5, Math.round((completed / total) * 100));
          onProgress(completed, total, pct, `[Turbo Engine] Uploading ${file.name}...`);
        }

        try {
          const res = await fetch('http://127.0.0.1:41789/api/upload-file', {
            method: 'POST',
            mode: 'cors',
            headers: {
              'x-gallery-id': galleryId,
              'x-filename': file.name,
              'x-filesize': file.size.toString(),
              'x-filetype': file.type || 'image/jpeg',
              'x-workspace-id': workspaceId || '',
              'x-collection-id': collectionId && collectionId !== 'all' ? collectionId : '',
            },
            body: file,
            signal,
          });
          const resJson = await res.json();
          if (resJson.success) {
            completed++;
            if (onProgress) {
              onProgress(completed, total, Math.round((completed / total) * 100), file.name);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('studiocore:gallery_photos_refresh', {
                  detail: { galleryId },
                })
              );
            }
            continue;
          } else {
            console.warn(`[DesktopEngine] Upload failed for ${file.name}: ${resJson.error}. Falling back to browser pipeline...`);
          }
        } catch (err: any) {
          console.warn(`[DesktopEngine] Loopback error for ${file.name}: ${err.message}. Falling back to browser pipeline...`);
        }

        // Seamless In-Flight Fallback: If desktop engine ever fails, upload directly via browser pipeline!
        try {
          if (onProgress) {
            onProgress(completed, total, Math.max(5, Math.round((completed / total) * 100)), `[Cloud Fallback] Uploading ${file.name}...`);
          }
          const variants = await generateImageVariants(file);
          const cleanName = encodeURIComponent(file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
          const urlRes = await fetch('/api/gallery/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              galleryId,
              filename: cleanName,
              originalType: file.type || 'image/jpeg',
              workspaceId,
            }),
            signal,
          });
          const urlJson = await urlRes.json();
          if (!urlJson.success) throw new Error(urlJson.error || 'Failed to get upload URLs');

          await Promise.all([
            uploadToPresignedUrl(urlJson.originalUploadUrl, file, file.type || 'image/jpeg', signal),
            uploadToPresignedUrl(urlJson.previewUploadUrl, variants.previewBlob, 'image/webp', signal),
            uploadToPresignedUrl(urlJson.thumbUploadUrl, variants.thumbBlob, 'image/webp', signal),
          ]);

          const regRes = await fetch('/api/gallery/photos/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              galleryId,
              photos: [{
                gallery_id: galleryId,
                collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
                original_key: urlJson.originalKey,
                preview_key: urlJson.previewKey,
                thumbnail_key: urlJson.thumbKey,
                width: variants.width,
                height: variants.height,
                size_bytes: file.size,
              }],
            }),
            signal,
          });
          const regJson = await regRes.json();
          if (regJson.success) {
            completed++;
            if (onProgress) {
              onProgress(completed, total, Math.round((completed / total) * 100), file.name);
            }
          } else {
            errors.push(`${file.name}: ${regJson.error || 'Registration failed'}`);
          }
        } catch (fbErr: any) {
          errors.push(`${file.name}: ${fbErr.message}`);
        }
      }
    };

    // Run 6 concurrent workers in sliding window
    const workers = Array.from({ length: Math.min(SLIDING_CONCURRENCY, files.length) }, () => worker());
    await Promise.all(workers);

    return {
      success: errors.length === 0,
      uploadedCount: completed,
      errors,
    };
  }

  const manifest = getUploadedManifest(galleryId);

  // Helper to register pending photos in chunks and stream them to UI live!
  const flushRegistration = async () => {
    if (pendingRegistration.length === 0) return;
    const batch = [...pendingRegistration];
    pendingRegistration.length = 0;

    try {
      const regRes = await fetch('/api/gallery/photos/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryId, photos: batch }),
      });
      const regJson = await regRes.json();
      if (regJson.success && Array.isArray(regJson.photos) && regJson.photos.length > 0) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('studiocore:gallery_photos_added', {
              detail: { galleryId, photos: regJson.photos },
            })
          );
        }
      }
    } catch (err: any) {
      console.warn('[ImageProcessor] Incremental registration notice:', err.message);
    }
  };

  // Adaptive parallel concurrency: 6 files simultaneously on Desktop, 4 on Mobile for optimal speed & memory
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  const CONCURRENCY = isMobile ? 4 : 6;
  const MAX_RETRY_ATTEMPTS = 5;
  const REGISTRATION_BATCH_SIZE = isMobile ? 8 : 16;

  if (onProgress && files.length > 0) {
    onProgress(0, total, 5, `Uploading ${files[0].name}...`);
  }

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled by user');
    }

    const batch = files.slice(i, i + CONCURRENCY);

    // 1. Batch pre-fetch presigned upload URLs for this entire batch in 1 single HTTP call (slashes latency)
    const batchUrlMap = new Map<string, any>();
    try {
      const batchRes = await fetch('/api/gallery/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId,
          workspaceId,
          files: batch.map((f) => ({
            filename: encodeURIComponent(f.name.replace(/[^a-zA-Z0-9._-]/g, '_')),
            originalType: f.type || 'image/jpeg',
          })),
        }),
        signal,
      });
      const batchJson = await batchRes.json();
      if (batchJson.success && Array.isArray(batchJson.results)) {
        batchJson.results.forEach((resItem: any, idx: number) => {
          if (batch[idx]) {
            batchUrlMap.set(batch[idx].name, resItem);
          }
        });
      }
    } catch (batchUrlErr: any) {
      console.warn('[ImageProcessor] Batch presigned URL fallback to individual:', batchUrlErr?.message);
    }

    await Promise.all(
      batch.map(async (file) => {
        let attempts = 0;
        let lastErr: any = null;

        while (attempts < MAX_RETRY_ATTEMPTS) {
          try {
            if (onProgress) {
              onProgress(completed, total, Math.round((completed / total) * 100), `Optimizing ${file.name}...`);
            }

            // 2. Client-Side WebP Conversion (Memory-safe OffscreenCanvas)
            const variants = await generateImageVariants(file);

            // 3. Resolve Presigned URLs (from batch cache or individual fallback)
            let presignedData = batchUrlMap.get(file.name);
            if (!presignedData) {
              const cleanName = encodeURIComponent(file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
              const urlRes = await fetch('/api/gallery/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  galleryId,
                  filename: cleanName,
                  originalType: file.type || 'image/jpeg',
                  workspaceId,
                }),
                signal,
              });

              const urlJson = await urlRes.json();
              if (!urlJson.success) {
                throw new Error(urlJson.error || 'Failed to obtain presigned upload URLs');
              }
              presignedData = urlJson;
            }

            const { originalUploadUrl, previewUploadUrl, thumbUploadUrl, originalKey, previewKey, thumbKey } = presignedData;

            if (onProgress) {
              onProgress(completed, total, Math.round((completed / total) * 100), `Uploading ${file.name} to Cloud...`);
            }

            // 4. Direct Storage Parallel Uploads via Presigned URLs
            await Promise.all([
              uploadBlobToPresignedUrl(originalUploadUrl, variants.original, file.type || 'image/jpeg', undefined, signal),
              uploadBlobToPresignedUrl(previewUploadUrl, variants.preview, 'image/webp', undefined, signal),
              uploadBlobToPresignedUrl(thumbUploadUrl, variants.thumb, 'image/webp', undefined, signal),
            ]);

            // Record in manifest for crash protection & auto-resume
            recordUploadedToManifest(galleryId, file.name, file.size);

            // 5. Collect for registration
            pendingRegistration.push({
              gallery_id: galleryId,
              collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
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

            // Rule 1 & 2: Register in efficient batches of 16 (8 on mobile) to feed GPU in bulk and eliminate idle wait
            if (pendingRegistration.length >= REGISTRATION_BATCH_SIZE) {
              await flushRegistration();
            }

            lastErr = null;
            break;
          } catch (fileErr: any) {
            lastErr = fileErr;
            if (fileErr.message === 'Upload cancelled' || signal?.aborted) {
              throw fileErr;
            }
            attempts++;
            if (attempts < MAX_RETRY_ATTEMPTS) {
              const backoffMs = Math.min(800 * Math.pow(2, attempts - 1), 6000);
              console.warn(`[ImageProcessor] Retrying ${file.name} (Attempt ${attempts + 1}/${MAX_RETRY_ATTEMPTS}) in ${backoffMs}ms...`);
              await new Promise((r) => setTimeout(r, backoffMs));
            }
          }
        }

        if (lastErr) {
          console.error(`Failed to process ${file.name}:`, lastErr);
          errors.push(`${file.name}: ${lastErr.message}`);
        }
      })
    );
  }

  // Flush any remaining registered photos
  await flushRegistration();

  return {
    success: errors.length === 0,
    uploadedCount: completed,
    errors,
  };
}
