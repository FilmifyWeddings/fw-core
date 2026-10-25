import JSZip from 'jszip';

export interface PhotoDownloadItem {
  id: string;
  original_key?: string;
  preview_key?: string;
  preview_url: string;
  collection_id?: string | null;
  collection_name?: string | null;
  original_name?: string;
  file_name?: string;
  name?: string;
  title?: string;
  [key: string]: any;
}

export interface ZipDownloadProgress {
  current: number;
  total: number;
  percent: number;
  status: 'fetching_urls' | 'downloading' | 'compressing' | 'saving' | 'done' | 'aborted';
  currentFile?: string;
}

export interface DownloadPhotosAsZipOptions {
  photos: PhotoDownloadItem[];
  zipFileName?: string;
  rootFolderName?: string;
  collectionsMap?: Record<string, string>;
  onProgress?: (progress: ZipDownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Cleanly extracts the original camera/upload filename from photo metadata or original_key.
 * Strips timestamp and random hashes generated during upload (e.g. 1729864912345_ab12c_DSC0942.jpg -> DSC0942.jpg)
 */
export function extractOriginalFileName(photo: PhotoDownloadItem, fallbackIndex: number = 0): string {
  if (photo.original_name) return photo.original_name;
  if (photo.file_name) return photo.file_name;
  if (photo.name && !photo.name.includes('/')) return photo.name;
  if (photo.title) return `${photo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;

  const targetKey = photo.original_key || photo.preview_key;
  if (targetKey) {
    const parts = targetKey.split('/');
    const lastPart = parts[parts.length - 1];
    // Regex matching {timestamp}_{randomSuffix}_{actualFileName}.ext
    const match = lastPart.match(/^\d+_[a-z0-9]+_(.+)$/i);
    if (match && match[1]) {
      return match[1];
    }
    return lastPart;
  }

  return `photo_${String(fallbackIndex + 1).padStart(3, '0')}.jpg`;
}

/**
 * Client-Side Original Photo ZIP Downloader with Category Subfolders
 * -------------------------------------------------------------
 * • Preserves original resolution and original filename
 * • Organizes photos into subfolders by sub-event / category
 * • Zero VPS CPU / RAM load (runs entirely client-side via JSZip)
 * • 4 parallel worker streams for maximum download speed
 * • Compression: STORE (instant lossless archiving without CPU re-encoding)
 */
export async function downloadPhotosAsZip({
  photos,
  zipFileName = 'Wedding_Photos.zip',
  rootFolderName = 'Wedding Photos',
  collectionsMap = {},
  onProgress,
  signal,
}: DownloadPhotosAsZipOptions): Promise<{ success: boolean; error?: string }> {
  if (!photos || photos.length === 0) {
    return { success: false, error: 'No photos selected to download.' };
  }

  const zip = new JSZip();
  const total = photos.length;
  let completed = 0;

  try {
    onProgress?.({
      current: 0,
      total,
      percent: 0,
      status: 'downloading',
      currentFile: 'Starting download...',
    });

    const safeRoot = (rootFolderName || 'Photos').replace(/[\\/:*?"<>|]/g, '_').trim();
    const usedPaths = new Set<string>();

    // Concurrency limit: 4 parallel streams
    const CONCURRENCY = 4;
    let index = 0;

    const worker = async () => {
      while (index < photos.length) {
        if (signal?.aborted) {
          throw new Error('Download aborted by user.');
        }

        const currentIndex = index++;
        const photo = photos[currentIndex];
        const targetKey = photo.original_key || photo.preview_key || photo.preview_url;

        // Resolve category folder
        let categoryName = 'All Photos';
        if (photo.collection_id && collectionsMap[photo.collection_id]) {
          categoryName = collectionsMap[photo.collection_id];
        } else if (photo.collection_name) {
          categoryName = photo.collection_name;
        }

        const safeCategory = categoryName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const originalName = extractOriginalFileName(photo, currentIndex);

        // Ensure unique filename inside folder in case duplicates exist
        let uniqueFileName = originalName;
        let candidatePath = `${safeRoot}/${safeCategory}/${uniqueFileName}`;
        let dupCounter = 1;

        while (usedPaths.has(candidatePath)) {
          const dotIdx = originalName.lastIndexOf('.');
          if (dotIdx > 0) {
            const base = originalName.substring(0, dotIdx);
            const ext = originalName.substring(dotIdx);
            uniqueFileName = `${base}_(${dupCounter})${ext}`;
          } else {
            uniqueFileName = `${originalName}_(${dupCounter})`;
          }
          candidatePath = `${safeRoot}/${safeCategory}/${uniqueFileName}`;
          dupCounter++;
        }
        usedPaths.add(candidatePath);

        onProgress?.({
          current: completed,
          total,
          percent: Math.round((completed / total) * 90),
          status: 'downloading',
          currentFile: uniqueFileName,
        });

        // 1. Fetch direct signed download URL for original full-quality photo
        let downloadUrl = photo.preview_url;
        try {
          const urlRes = await fetch(
            `/api/gallery/download-url?key=${encodeURIComponent(targetKey)}&name=${encodeURIComponent(uniqueFileName)}`,
            { signal }
          );
          const urlJson = await urlRes.json();
          if (urlJson.success && urlJson.downloadUrl) {
            downloadUrl = urlJson.downloadUrl;
          }
        } catch (_) {}

        // 2. Fetch raw original binary data from B2 / Cloudflare CDN
        const imgRes = await fetch(downloadUrl, { signal });
        if (!imgRes.ok) {
          throw new Error(`Failed to download photo ${currentIndex + 1} (${imgRes.statusText})`);
        }

        const arrayBuffer = await imgRes.arrayBuffer();

        // 3. Add to ZIP archive under root folder / category folder / original filename
        zip.file(candidatePath, arrayBuffer);

        completed++;
        onProgress?.({
          current: completed,
          total,
          percent: Math.round((completed / total) * 90),
          status: 'downloading',
          currentFile: uniqueFileName,
        });
      }
    };

    // Run parallel workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, photos.length) }, () => worker());
    await Promise.all(workers);

    if (signal?.aborted) {
      onProgress?.({ current: completed, total, percent: 0, status: 'aborted' });
      return { success: false, error: 'Download cancelled.' };
    }

    // 4. Generate ZIP archive blob
    onProgress?.({
      current: completed,
      total,
      percent: 94,
      status: 'compressing',
      currentFile: 'Packaging ZIP file...',
    });

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'STORE', // Instant, lossless for already compressed JPEGs
      },
      (metadata) => {
        const zipPercent = 90 + Math.round((metadata.percent / 100) * 8);
        onProgress?.({
          current: completed,
          total,
          percent: zipPercent,
          status: 'compressing',
          currentFile: `Packing archive... ${Math.round(metadata.percent)}%`,
        });
      }
    );

    // 5. Trigger Single File Download on Client Device
    onProgress?.({
      current: total,
      total,
      percent: 100,
      status: 'saving',
      currentFile: 'Saving to your device...',
    });

    const cleanZipName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`;
    const objectUrl = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', cleanZipName);
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 15000);

    onProgress?.({
      current: total,
      total,
      percent: 100,
      status: 'done',
      currentFile: 'Complete!',
    });

    return { success: true };
  } catch (err: any) {
    if (signal?.aborted || err.message?.includes('aborted')) {
      onProgress?.({ current: completed, total, percent: 0, status: 'aborted' });
      return { success: false, error: 'Download cancelled.' };
    }
    console.error('[ClientZipDownloader] Exception:', err);
    return { success: false, error: err.message || 'Failed to generate ZIP archive.' };
  }
}
