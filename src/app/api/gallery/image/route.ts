import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

/**
 * Immortal Image Proxy / Redirect Route
 * Generates fresh presigned S3 URLs on the fly for Private Backblaze B2 buckets.
 * Works seamlessly for thumbnails, previews, cover photos, social share cards, and WhatsApp previews!
 */
// In-memory presigned URL cache (50 min TTL) to avoid hammering S3 crypto presigning
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return new NextResponse('Missing image key parameter', { status: 400 });
    }

    // If key is already a full external URL, redirect directly
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return NextResponse.redirect(key, { status: 302 });
    }

    // Clean key
    const cleanKey = key.replace(/^\/+/, '');
    const now = Date.now();

    // Check in-memory cache
    const cached = signedUrlCache.get(cleanKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.redirect(cached.url, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      // Generate 2-hour presigned download URL from Backblaze B2
      const signedUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200);

      // Cache for 50 minutes (3000 seconds)
      signedUrlCache.set(cleanKey, {
        url: signedUrl,
        expiresAt: now + 3000 * 1000,
      });

      // Cleanup cache if it exceeds 5000 items
      if (signedUrlCache.size > 5000) {
        const firstKey = signedUrlCache.keys().next().value;
        if (firstKey) signedUrlCache.delete(firstKey);
      }

      // 307 Temporary Redirect with 1-day browser cache
      return NextResponse.redirect(signedUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (s3Err: any) {
      console.warn(`[GalleryImageProxy] S3 presign failed for key ${cleanKey}:`, s3Err.message);
      return new NextResponse('Image not found', { status: 404 });
    }
  } catch (err: any) {
    console.error('[GalleryImageProxy Exception]:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
