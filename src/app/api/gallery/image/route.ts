import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

/**
 * Immortal Image Proxy / Redirect Route
 * Generates fresh presigned S3 URLs on the fly for Private Backblaze B2 buckets.
 * Works seamlessly for thumbnails, previews, cover photos, social share cards, and WhatsApp previews!
 */
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

    try {
      // Generate 2-hour presigned download URL from Backblaze B2
      const signedUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200);

      // 307 Temporary Redirect with 1-hour browser cache
      return NextResponse.redirect(signedUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    } catch (s3Err) {
      console.warn('[GalleryImageProxy] S3 presign failed, falling back to public URL:', s3Err);
      const fallbackUrl = getGalleryPublicUrl(cleanKey);
      return NextResponse.redirect(fallbackUrl, { status: 307 });
    }
  } catch (err: any) {
    console.error('[GalleryImageProxy Exception]:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
