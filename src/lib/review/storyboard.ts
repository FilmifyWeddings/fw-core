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
 * Extract 25-30 thumbnail frames directly from local File blob in the browser.
 * Extremely fast (~300-500ms total) because reads from local memory without network latency.
 */
export async function extractClientStoryboard(file: File, frameCount = 25): Promise<StoryboardResult> {
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

    // Safety timeout: If browser cannot decode in 5 seconds, resolve gracefully with whatever frames gathered
    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        coverThumbnail: coverThumbnail || frames[0]?.dataUrl || '',
        frames,
        duration: video.duration || 0,
      });
    }, 5000);

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
          }, 300);

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

/**
 * In-memory & SessionStorage fast cache for instant 0ms hover frame lookups
 */
const inMemoryStoryboardCache: Record<string, StoryboardFrame[]> = {};

export function cacheStoryboard(key: string, frames: StoryboardFrame[]) {
  if (!key || !frames || frames.length === 0) return;
  inMemoryStoryboardCache[key] = frames;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`sc_sb_${key}`, JSON.stringify(frames));
    } catch (_) {}
  }
}

export function getCachedStoryboard(key: string): StoryboardFrame[] | null {
  if (!key) return null;
  if (inMemoryStoryboardCache[key]) return inMemoryStoryboardCache[key];

  if (typeof window !== 'undefined') {
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
