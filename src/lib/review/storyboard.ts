/**
 * StudioCore Video Review - Instant Storyboard & Hover Scrubbing Engine
 * Extracts lightweight thumbnail frames across the video for 0ms millisecond hover preview.
 */

export interface StoryboardFrame {
  time: number;
  dataUrl: string;
}

export interface StoryboardResult {
  coverThumbnail: string;
  frames: StoryboardFrame[];
  duration: number;
}

/**
 * Super-fast cover thumbnail extraction (~30-50ms)
 * Captures 1 frame immediately so video upload can start without any delay.
 */
export async function extractFastThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve('');
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve('');
    }, 1200);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          cleanup();
          return resolve(dataUrl);
        } catch (_) {}
      }
      cleanup();
      resolve('');
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve('');
    };
  });
}

/**
 * Extract thumbnail frames directly from local File blob in the browser.
 */
export async function extractClientStoryboard(file: File, frameCount = 20): Promise<StoryboardResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({ coverThumbnail: '', frames: [], duration: 0 });
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');

    const frames: StoryboardFrame[] = [];
    let coverThumbnail = '';

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        coverThumbnail: coverThumbnail || frames[0]?.dataUrl || '',
        frames,
        duration: video.duration || 0,
      });
    }, 4000);

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      const step = duration / Math.max(1, frameCount - 1);
      const targetTimes: number[] = [];

      for (let i = 0; i < frameCount; i++) {
        targetTimes.push(Math.min(duration - 0.05, i * step));
      }

      for (let i = 0; i < targetTimes.length; i++) {
        const t = targetTimes[i];
        await new Promise<void>((resSeek) => {
          let seekTimeout: any = null;

          const onSeeked = () => {
            clearTimeout(seekTimeout);
            video.removeEventListener('seeked', onSeeked);

            if (ctx) {
              try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Ultra compact JPEG at 0.5 quality (~1.5 KB per frame)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                frames.push({ time: t, dataUrl });

                if (i === 1 || (!coverThumbnail && i === 0)) {
                  coverThumbnail = dataUrl;
                }
              } catch (_) {}
            }
            resSeek();
          };

          seekTimeout = setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            resSeek();
          }, 250);

          video.addEventListener('seeked', onSeeked);
          video.currentTime = t;
        });
      }

      clearTimeout(timeout);
      cleanup();
      resolve({
        coverThumbnail: coverThumbnail || frames[0]?.dataUrl || '',
        frames,
        duration,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({ coverThumbnail: '', frames: [], duration: 0 });
    };
  });
}

// Global in-memory cache for loaded storyboards
const inMemoryStoryboardCache: Record<string, StoryboardFrame[]> = {};

/**
 * Cache storyboard in memory + sessionStorage
 */
export function cacheStoryboard(key: string, frames: StoryboardFrame[]) {
  if (!key || !frames || frames.length === 0) return;
  inMemoryStoryboardCache[key] = frames;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(`sc_sb_${key}`, JSON.stringify(frames));
    }
  } catch (_) {}
}

/**
 * Retrieve storyboard from memory or sessionStorage
 */
export function getCachedStoryboard(key: string): StoryboardFrame[] | null {
  if (!key) return null;
  if (inMemoryStoryboardCache[key]) {
    return inMemoryStoryboardCache[key];
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem(`sc_sb_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryStoryboardCache[key] = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * 0ms Millisecond Nearest Frame Lookup
 */
export function findNearestStoryboardFrame(
  targetTime: number,
  frames: StoryboardFrame[]
): string | null {
  if (!frames || frames.length === 0) return null;
  if (frames.length === 1) return frames[0].dataUrl;

  let closest = frames[0];
  let minDiff = Math.abs(targetTime - closest.time);

  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs(targetTime - frames[i].time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frames[i];
    }
  }

  return closest.dataUrl;
}
