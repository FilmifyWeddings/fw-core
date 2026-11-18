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
      // Build candidate keys to handle any path format variation (gallery vs workspaces vs galleries, thumb vs thumbs)
      const candidates: string[] = [];

      if (cleanKey.startsWith('gallery/')) {
        candidates.push(cleanKey.replace(/^gallery\//, 'workspaces/'));
        candidates.push(cleanKey.replace(/^gallery\//, 'galleries/'));
      } else if (cleanKey.startsWith('workspaces/')) {
        candidates.push(cleanKey.replace(/^workspaces\//, 'gallery/'));
        candidates.push(cleanKey.replace(/^workspaces\//, 'galleries/'));
      } else if (cleanKey.startsWith('galleries/')) {
        candidates.push(cleanKey.replace(/^galleries\//, 'gallery/'));
        candidates.push(cleanKey.replace(/^galleries\//, 'workspaces/'));
      }

      const withVariations = [cleanKey, ...candidates];
      for (const k of withVariations) {
        if (k.includes('/thumb/')) {
          candidates.push(k.replace('/thumb/', '/thumbs/'));
          candidates.push(k.replace('/thumb/', '/preview/'));
          candidates.push(k.replace('/thumb/', '/previews/'));
        }
        if (k.includes('/thumbs/')) {
          candidates.push(k.replace('/thumbs/', '/thumb/'));
          candidates.push(k.replace('/thumbs/', '/previews/'));
          candidates.push(k.replace('/thumbs/', '/preview/'));
        }
        if (k.includes('/preview/')) {
          candidates.push(k.replace('/preview/', '/previews/'));
          candidates.push(k.replace('/preview/', '/thumb/'));
          candidates.push(k.replace('/preview/', '/thumbs/'));
        }
        if (k.includes('/previews/')) {
          candidates.push(k.replace('/previews/', '/preview/'));
          candidates.push(k.replace('/previews/', '/thumbs/'));
          candidates.push(k.replace('/previews/', '/thumb/'));
        }
      }

      for (const altKey of candidates) {
        try {
          s3Response = await fetchS3Object(altKey);
          if (s3Response && s3Response.Body) break;
        } catch (_) {}
      }
    }

    // Fallback: If direct stream not possible, fallback to presigned URL
    if (!s3Response || !s3Response.Body) {
      try {
        const signedUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200);
        return NextResponse.redirect(signedUrl, { status: 307 });
      } catch (_) {
        return new NextResponse('Image not found', { status: 404 });
      }
    }

    const isDownload = searchParams.get('download') === '1';
    const reqFormat = searchParams.get('format')?.toLowerCase();
    const shouldConvertToJpg = isDownload || reqFormat === 'jpg' || reqFormat === 'jpeg';

    // Convert S3 stream to standard buffer / web stream for NextResponse
    let responseBody: any;
    try {
      if (typeof (s3Response.Body as any).transformToByteArray === 'function') {
        const bytes = await (s3Response.Body as any).transformToByteArray();
        responseBody = Buffer.from(bytes);
      } else if (typeof (s3Response.Body as any).transformToWebStream === 'function') {
        responseBody = (s3Response.Body as any).transformToWebStream();
      } else {
        const { Readable } = await import('stream');
        responseBody = (Readable as any).toWeb(s3Response.Body as any);
      }
    } catch (_) {
      const signedUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200);
      return NextResponse.redirect(signedUrl, { status: 307 });
    }

    let contentType = s3Response.ContentType || (cleanKey.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

    // On-the-fly True JPG Transcoding (Preserves 100% original high resolution and sharpness)
    if (shouldConvertToJpg) {
      try {
        const sharp = (await import('sharp')).default;
        let inputBuffer: Buffer;
        if (responseBody instanceof Buffer) {
          inputBuffer = responseBody;
        } else if (responseBody instanceof Uint8Array) {
          inputBuffer = Buffer.from(responseBody);
        } else {
          const chunks: Buffer[] = [];
          for await (const chunk of responseBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          inputBuffer = Buffer.concat(chunks);
        }

        // Convert to high-quality JPEG (Full 4:4:4 chroma subsampling for crisp details)
        const jpegBuffer = await sharp(inputBuffer)
          .jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true })
          .toBuffer();

        responseBody = jpegBuffer;
        contentType = 'image/jpeg';
      } catch (sharpErr) {
        console.warn('Sharp JPEG transcoding fallback:', sharpErr);
      }
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (responseBody instanceof Buffer) {
      headers.set('Content-Length', String(responseBody.length));
    } else if (s3Response.ContentLength) {
      headers.set('Content-Length', String(s3Response.ContentLength));
    }

    if (isDownload) {
      let downloadFilename = searchParams.get('name') || cleanKey.split('/').pop() || 'photo.jpg';
      if (shouldConvertToJpg) {
        downloadFilename = downloadFilename.replace(/\.webp$/i, '.jpg');
        if (!downloadFilename.toLowerCase().endsWith('.jpg') && !downloadFilename.toLowerCase().endsWith('.jpeg')) {
          downloadFilename += '.jpg';
        }
      }
      const safeFilename = downloadFilename.replace(/["\r\n]/g, '').trim();
      headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    } else {
      // 1-Year Cloudflare Edge Cache + Browser Cache
      headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    }
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    if (s3Response.ETag) {
      headers.set('ETag', s3Response.ETag);
    }

    return new NextResponse(responseBody, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Image Proxy Error:', err);
    return new NextResponse('Internal Image Error', { status: 500 });
  }
}
