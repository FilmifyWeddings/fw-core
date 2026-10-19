import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { galleryB2Client, B2_GALLERY_BUCKET_NAME, getGalleryPresignedDownloadUrl } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

/**
 * Immortal High-Performance Image Streaming Reverse-Proxy
 * Streams image bytes directly to the browser (Status 200 OK) with 1-Year Cloudflare Edge Caching.
 * Eliminates 307 redirects, DNS blocking, CORS issues, and ISP timeouts!
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get('key');

    if (!rawKey) {
      return new NextResponse('Missing image key parameter', { status: 400 });
    }

    // If key is already a full external URL, redirect directly
    if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
      return NextResponse.redirect(rawKey, { status: 302 });
    }

    // Clean and decode key
    let cleanKey = rawKey.replace(/^\/+/, '');
    try {
      cleanKey = decodeURIComponent(cleanKey);
    } catch (_) {}

    // Strip any fragment/hash
    const hashIdx = cleanKey.indexOf('#');
    if (hashIdx !== -1) {
      cleanKey = cleanKey.substring(0, hashIdx);
    }

    // Fetch S3 object helper
    const fetchS3Object = async (targetKey: string) => {
      const cmd = new GetObjectCommand({
        Bucket: B2_GALLERY_BUCKET_NAME,
        Key: targetKey,
      });
      return await galleryB2Client.send(cmd);
    };

    let s3Response;
    try {
      s3Response = await fetchS3Object(cleanKey);
    } catch (err: any) {
      // Fallback 1: If thumbs/ missing, try previews/
      if (cleanKey.includes('/thumbs/')) {
        const altKey = cleanKey.replace('/thumbs/', '/previews/');
        try {
          s3Response = await fetchS3Object(altKey);
        } catch (_) {}
      }
      // Fallback 2: If previews/ missing, try thumbs/
      if (!s3Response && cleanKey.includes('/previews/')) {
        const altKey = cleanKey.replace('/previews/', '/thumbs/');
        try {
          s3Response = await fetchS3Object(altKey);
        } catch (_) {}
      }
    }

    // Fallback 3: If direct stream not possible, fallback to presigned URL
    if (!s3Response || !s3Response.Body) {
      try {
        const signedUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200);
        return NextResponse.redirect(signedUrl, { status: 307 });
      } catch (_) {
        return new NextResponse('Image not found', { status: 404 });
      }
    }

    const contentType = s3Response.ContentType || (cleanKey.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    const contentLength = s3Response.ContentLength;

    // Convert S3 stream to standard WebStream for NextResponse
    const stream = (s3Response.Body as any).transformToWebStream();

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', String(contentLength));
    }
    // 1-Year Cloudflare Edge Cache + Browser Cache
    headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    if (s3Response.ETag) {
      headers.set('ETag', s3Response.ETag);
    }

    return new NextResponse(stream, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('[GalleryImageProxy Exception]:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
