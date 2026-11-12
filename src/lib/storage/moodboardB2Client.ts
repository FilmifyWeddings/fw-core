import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

// Backblaze B2 Configuration for Client Moodboards
// Prioritizes dedicated B2_MOODBOARD_* env vars and cleanly falls back to existing workspace B2_GALLERY_* / B2_* credentials.
export const B2_MOODBOARD_ENDPOINT =
  clean(process.env.B2_MOODBOARD_ENDPOINT) ||
  clean(process.env.B2_GALLERY_ENDPOINT) ||
  clean(process.env.B2_ENDPOINT) ||
  'https://s3.eu-central-003.backblazeb2.com';

export const B2_MOODBOARD_REGION =
  clean(process.env.B2_MOODBOARD_REGION) ||
  clean(process.env.B2_GALLERY_REGION) ||
  clean(process.env.B2_REGION) ||
  'eu-central-003';

export const B2_MOODBOARD_ACCESS_KEY_ID =
  clean(process.env.B2_MOODBOARD_ACCESS_KEY_ID) ||
  clean(process.env.B2_GALLERY_ACCESS_KEY_ID) ||
  clean(process.env.B2_ACCESS_KEY_ID) ||
  '';

export const B2_MOODBOARD_SECRET_ACCESS_KEY =
  clean(process.env.B2_MOODBOARD_SECRET_ACCESS_KEY) ||
  clean(process.env.B2_GALLERY_SECRET_ACCESS_KEY) ||
  clean(process.env.B2_SECRET_ACCESS_KEY) ||
  '';

export const B2_MOODBOARD_BUCKET_NAME =
  clean(process.env.B2_MOODBOARD_BUCKET_NAME) ||
  clean(process.env.B2_GALLERY_BUCKET_NAME) ||
  'studiocore-gallery';

export const B2_MOODBOARD_CDN_URL =
  clean(process.env.NEXT_PUBLIC_B2_MOODBOARD_CDN_URL) || '';

let _moodboardB2Client: S3Client | null = null;

export function getMoodboardB2Client(): S3Client {
  if (!_moodboardB2Client) {
    _moodboardB2Client = new S3Client({
      endpoint: B2_MOODBOARD_ENDPOINT,
      region: B2_MOODBOARD_REGION,
      credentials: {
        accessKeyId: B2_MOODBOARD_ACCESS_KEY_ID,
        secretAccessKey: B2_MOODBOARD_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return _moodboardB2Client;
}

export function hasMoodboardB2Credentials(): boolean {
  return Boolean(B2_MOODBOARD_ACCESS_KEY_ID && B2_MOODBOARD_SECRET_ACCESS_KEY && B2_MOODBOARD_BUCKET_NAME);
}

const sanitizePathSegment = (value: string | undefined | null, fallback: string): string => {
  if (!value || typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || fallback;
};

/**
 * Generates an isolated per-workspace, per-client Backblaze B2 object key in WebP format:
 * moodboards/{workspaceId}/{clientId}/{token}/{section}/{timestamp}-{rand}.webp
 */
export function buildMoodboardB2Key(opts: {
  workspaceId?: string | null;
  clientId?: string | null;
  token?: string | null;
  section?: string | null;
}): string {
  const safeWs = sanitizePathSegment(opts.workspaceId, 'shared');
  const safeClient = sanitizePathSegment(opts.clientId, 'general');
  const safeToken = sanitizePathSegment(opts.token, 'mb');
  const safeSection = sanitizePathSegment(opts.section, 'photos');
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `moodboards/${safeWs}/${safeClient}/${safeToken}/${safeSection}/${ts}-${rand}.webp`;
}

export function isR2MoodboardUrl(urlOrKey?: string | null): boolean {
  if (!urlOrKey || typeof urlOrKey !== 'string') return false;
  const val = urlOrKey.trim().toLowerCase();
  return (
    val.includes('/api/media/r2/') ||
    val.includes('.r2.dev/') ||
    val.includes('r2.cloudflarestorage.com/')
  );
}

export function extractMoodboardB2Key(urlOrKey?: string | null): string | null {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  let raw = urlOrKey.trim();
  if (!raw || isR2MoodboardUrl(raw)) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      raw = parsed.pathname;
    } catch {
      return null;
    }
  }

  raw = raw.split('?')[0].split('#')[0].replace(/^\/+/, '');

  if (raw.startsWith('api/media/moodboard/')) {
    return decodeURIComponent(raw.slice('api/media/moodboard/'.length));
  }

  const bucketPrefix = `${B2_MOODBOARD_BUCKET_NAME}/`;
  if (raw.startsWith(bucketPrefix)) {
    raw = raw.slice(bucketPrefix.length);
  }

  if (raw.startsWith('moodboards/')) {
    return decodeURIComponent(raw);
  }

  return null;
}

export function isMoodboardB2Url(urlOrKey?: string | null): boolean {
  return extractMoodboardB2Key(urlOrKey) !== null;
}

export async function uploadMoodboardToB2(
  fileBuffer: Buffer,
  opts: {
    workspaceId?: string | null;
    clientId?: string | null;
    token?: string | null;
    section?: string | null;
    contentType?: string;
    cacheControl?: string;
  }
): Promise<{ url: string; key: string; bucket: string }> {
  if (!hasMoodboardB2Credentials()) {
    throw new Error(
      'Backblaze B2 credentials are missing. Configure B2_MOODBOARD_ACCESS_KEY_ID / B2_MOODBOARD_SECRET_ACCESS_KEY (or B2_GALLERY_ACCESS_KEY_ID / B2_GALLERY_SECRET_ACCESS_KEY) in environment variables.'
    );
  }

  const key = buildMoodboardB2Key({
    workspaceId: opts.workspaceId,
    clientId: opts.clientId,
    token: opts.token,
    section: opts.section,
  });

  const client = getMoodboardB2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: B2_MOODBOARD_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: opts.contentType || 'image/webp',
      CacheControl: opts.cacheControl || 'public, max-age=31536000, immutable',
    })
  );

  return {
    url: `/api/media/moodboard/${key}`,
    key,
    bucket: B2_MOODBOARD_BUCKET_NAME,
  };
}

export async function getMoodboardFromB2(
  key: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!hasMoodboardB2Credentials() || !key) return null;
  const cleanKey = key.replace(/^\/+/, '');
  if (!cleanKey.startsWith('moodboards/') || cleanKey.includes('..')) {
    return null;
  }

  try {
    const client = getMoodboardB2Client();
    const res = await client.send(
      new GetObjectCommand({
        Bucket: B2_MOODBOARD_BUCKET_NAME,
        Key: cleanKey,
      })
    );
    if (!res.Body) return null;
    const byteArray = await (res.Body as any).transformToByteArray();
    return {
      buffer: Buffer.from(byteArray),
      contentType: res.ContentType || (cleanKey.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
    };
  } catch (err: any) {
    if (err?.name !== 'NoSuchKey' && err?.$metadata?.httpStatusCode !== 404) {
      console.warn(`[MoodboardB2] GetObject failed for ${cleanKey}:`, err?.message || err);
    }
    return null;
  }
}

export async function deleteMoodboardFromB2(keyOrUrl: string): Promise<boolean> {
  const key = extractMoodboardB2Key(keyOrUrl);
  if (!key || !hasMoodboardB2Credentials()) return false;

  const client = getMoodboardB2Client();

  try {
    // Version-aware permanent purge so Backblaze B2 does not retain hidden object versions
    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;
    let deletedAny = false;

    do {
      const listed = await client.send(
        new ListObjectVersionsCommand({
          Bucket: B2_MOODBOARD_BUCKET_NAME,
          Prefix: key,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
          MaxKeys: 100,
        })
      );

      const exactVersions: Array<{ Key: string; VersionId?: string }> = [];
      (listed.Versions || []).forEach((v) => {
        if (v.Key === key) exactVersions.push({ Key: v.Key, VersionId: v.VersionId });
      });
      (listed.DeleteMarkers || []).forEach((m) => {
        if (m.Key === key) exactVersions.push({ Key: m.Key, VersionId: m.VersionId });
      });

      if (exactVersions.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: B2_MOODBOARD_BUCKET_NAME,
            Delete: { Objects: exactVersions, Quiet: true },
          })
        );
        deletedAny = true;
      }

      if (listed.IsTruncated && (listed.NextKeyMarker || '') <= key) {
        keyMarker = listed.NextKeyMarker;
        versionIdMarker = listed.NextVersionIdMarker;
      } else {
        keyMarker = undefined;
      }
    } while (keyMarker);

    if (!deletedAny) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: B2_MOODBOARD_BUCKET_NAME,
          Key: key,
        })
      );
    }
    return true;
  } catch (err: any) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: B2_MOODBOARD_BUCKET_NAME,
          Key: key,
        })
      );
      return true;
    } catch (fallbackErr: any) {
      console.error(`[MoodboardB2] Delete error for ${key}:`, fallbackErr?.message || err?.message);
      return false;
    }
  }
}

/**
 * Extracts all stored media URLs from a client_moodboards row for cleanup on moodboard deletion.
 */
export function extractAllMoodboardMediaUrls(mb: any): string[] {
  if (!mb || typeof mb !== 'object') return [];
  const urls = new Set<string>();

  const addIfMedia = (val: any) => {
    if (typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!trimmed) return;
    if (isMoodboardB2Url(trimmed) || isR2MoodboardUrl(trimmed)) {
      urls.add(trimmed);
    }
  };

  if (Array.isArray(mb.couple_photos)) {
    mb.couple_photos.forEach((p: any) => addIfMedia(typeof p === 'string' ? p : p?.url));
  }
  if (Array.isArray(mb.close_family_photos)) {
    mb.close_family_photos.forEach((f: any) => addIfMedia(typeof f === 'string' ? f : f?.url));
  }
  if (Array.isArray(mb.shoot_places)) {
    mb.shoot_places.forEach((p: any) => {
      addIfMedia(p?.couple_photo_url);
      addIfMedia(p?.bride_photo_url);
      addIfMedia(p?.groom_photo_url);
    });
  }
  const itinerary = Array.isArray(mb.itinerary_schedule)
    ? mb.itinerary_schedule
    : Array.isArray(mb.event_itinerary)
    ? mb.event_itinerary
    : [];
  itinerary.forEach((it: any) => {
    addIfMedia(it?.bride_outfit_url);
    addIfMedia(it?.groom_outfit_url);
  });
  const refs = Array.isArray(mb.photo_references)
    ? mb.photo_references
    : Array.isArray(mb.inspiration_links)
    ? mb.inspiration_links
    : [];
  refs.forEach((r: any) => addIfMedia(typeof r === 'string' ? r : r?.url));

  return Array.from(urls);
}
