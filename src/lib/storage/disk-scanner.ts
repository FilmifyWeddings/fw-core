/**
 * Browser-Native Physical Hard Disk Scanner
 * Uses the HTML5 showDirectoryPicker Web API to index plugged-in HDDs/SSDs/SD Cards
 * directly in the browser with ZERO software installation required.
 */

export interface ScannedFolderData {
  folderName: string;
  folderPath: string;
  totalSizeBytes: number;
  photoCount: number;
  videoCount: number;
  otherCount: number;
  eventCategory?: 'RAW_PHOTOS' | 'RAW_VIDEOS' | 'SELECTION' | 'EDITS' | 'DELIVERABLES';
  tags?: string[];
  lastModified?: string;
}

export interface DiskScanSummary {
  diskName: string;
  totalSizeBytes: number;
  totalPhotos: number;
  totalVideos: number;
  totalOthers: number;
  folders: ScannedFolderData[];
}

const PHOTO_EXTS = new Set([
  '.cr2', '.cr3', '.nef', '.arw', '.jpg', '.jpeg', '.png', '.dng', '.raw', '.raf', '.orf', '.rw2', '.tif', '.tiff', '.webp'
]);

const VIDEO_EXTS = new Set([
  '.mp4', '.mov', '.mxf', '.braw', '.avi', '.mkv', '.prores', '.crm', '.r3d', '.wmv', '.flv', '.mts', '.m2ts'
]);

/**
 * Detect event category based on folder name keywords
 */
export function detectCategoryFromName(folderName: string): 'RAW_PHOTOS' | 'RAW_VIDEOS' | 'SELECTION' | 'EDITS' | 'DELIVERABLES' {
  const lower = folderName.toLowerCase();
  if (lower.includes('deliverable') || lower.includes('final') || lower.includes('output') || lower.includes('master') || lower.includes('export')) {
    return 'DELIVERABLES';
  }
  if (lower.includes('select') || lower.includes('chosen') || lower.includes('shortlist') || lower.includes('culling')) {
    return 'SELECTION';
  }
  if (lower.includes('edit') || lower.includes('teaser') || lower.includes('trailer') || lower.includes('highlight') || lower.includes('retouch') || lower.includes('psd') || lower.includes('prproj') || lower.includes('drp')) {
    return 'EDITS';
  }
  if (lower.includes('cine') || lower.includes('video') || lower.includes('footage') || lower.includes('drone') || lower.includes('cam') || lower.includes('clip')) {
    return 'RAW_VIDEOS';
  }
  return 'RAW_PHOTOS';
}

/**
 * Recursively scans a local directory handle and gathers photo/video statistics
 */
export async function scanLocalDirectory(
  dirHandle: any,
  currentPath = '',
  maxDepth = 6,
  depth = 0
): Promise<ScannedFolderData[]> {
  if (depth > maxDepth) return [];

  const results: ScannedFolderData[] = [];
  let photoCount = 0;
  let videoCount = 0;
  let otherCount = 0;
  let totalSizeBytes = 0;

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          totalSizeBytes += file.size || 0;
          const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
          if (PHOTO_EXTS.has(ext)) {
            photoCount++;
          } else if (VIDEO_EXTS.has(ext)) {
            videoCount++;
          } else {
            otherCount++;
          }
        } catch (_) {}
      } else if (entry.kind === 'directory') {
        const subDirPath = currentPath ? `${currentPath}/${entry.name}` : `/${entry.name}`;
        const subDirResults = await scanLocalDirectory(
          entry,
          subDirPath,
          maxDepth,
          depth + 1
        );
        results.push(...subDirResults);
      }
    }
  } catch (err) {
    console.warn(`[DiskScanner] Could not read directory ${dirHandle.name}:`, err);
  }

  const folderName = dirHandle.name || 'Root';
  const folderPath = currentPath || `/${folderName}`;
  const eventCategory = detectCategoryFromName(folderName);

  results.unshift({
    folderName,
    folderPath,
    totalSizeBytes,
    photoCount,
    videoCount,
    otherCount,
    eventCategory,
    tags: [eventCategory.toLowerCase().replace('_', ' ')],
    lastModified: new Date().toISOString(),
  });

  return results;
}

/**
 * Prompts user to select a Hard Disk / Folder and performs a full scan
 */
export async function promptAndScanDirectory(): Promise<DiskScanSummary | null> {
  if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
    throw new Error('Your browser does not support the File System Access API. Please use Chrome, Edge, or Brave.');
  }

  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'read',
  });

  if (!dirHandle) return null;

  const folders = await scanLocalDirectory(dirHandle, `/${dirHandle.name}`);
  
  let totalSizeBytes = 0;
  let totalPhotos = 0;
  let totalVideos = 0;
  let totalOthers = 0;

  for (const f of folders) {
    totalSizeBytes += f.totalSizeBytes;
    totalPhotos += f.photoCount;
    totalVideos += f.videoCount;
    totalOthers += f.otherCount;
  }

  return {
    diskName: dirHandle.name,
    totalSizeBytes,
    totalPhotos,
    totalVideos,
    totalOthers,
    folders,
  };
}

/**
 * Helper to format bytes to human-readable size (GB, TB, MB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
