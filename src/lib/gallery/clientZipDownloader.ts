import JSZip from 'jszip';

export interface PhotoDownloadItem {
  id: string;
  original_key?: string;
  preview_key?: string;
  preview_url: string;
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

/**
 * Client-Side Original Photo ZIP Downloader
 * -------------------------------------------------------------
 * • Fetches high-res original photos directly from Backblaze B2 / CDN
 * • Concurrency pool: 4 parallel streams (maximum throughput without browser throttling)
 * • Zero VPS CPU / RAM load (everything runs client-side in the browser)
 * • Single .zip file output (no popup blocks on iPhone / Android / PC)
 * • Compression: STORE (ultra fast, eliminates unnecessary CPU re-encoding of JPEGs)
 */
export async function downloadPhotosAsZip({
  photos,
  zipFileName = 'Wedding_Photos_Original.zip',
  onProgress,
  signal,
}: {
  photos: PhotoDownloadItem[];
  zipFileName?: string;
  onProgress?: (progress: ZipDownloadProgress) => void;
  signal?: AbortSignal;
}): Promise<{ success: boolean; error?: string }> {
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

    // Concurrency limit: 4 parallel downloads
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
        const cleanName = photo.title
          ? `${photo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`
          : `photo_${String(currentIndex + 1).padStart(3, '0')}_${photo.id.slice(0, 8)}.jpg`;

        onProgress?.({
          current: completed,
          total,
          percent: Math.round((completed / total) * 90),
          status: 'downloading',
          currentFile: cleanName,
        });

        // 1. Get original direct presigned download URL
        let downloadUrl = photo.preview_url;
        try {
          const urlRes = await fetch(
            `/api/gallery/download-url?key=${encodeURIComponent(targetKey)}&name=${encodeURIComponent(cleanName)}`,
            { signal }
          );
          const urlJson = await urlRes.json();
          if (urlJson.success && urlJson.downloadUrl) {
            downloadUrl = urlJson.downloadUrl;
          }
        } catch (_) {}

        // 2. Fetch raw image binary buffer directly from B2 / CDN
        const imgRes = await fetch(downloadUrl, { signal });
        if (!imgRes.ok) {
          throw new Error(`Failed to download photo ${currentIndex + 1} (${imgRes.statusText})`);
        }

        const arrayBuffer = await imgRes.arrayBuffer();

        // 3. Add to ZIP archive
        zip.file(cleanName, arrayBuffer);

        completed++;
        onProgress?.({
          current: completed,
          total,
          percent: Math.round((completed / total) * 90),
          status: 'downloading',
          currentFile: cleanName,
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
      percent: 95,
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
