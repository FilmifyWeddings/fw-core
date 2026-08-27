import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/r2-storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams?.key || [];
    const key = decodeURIComponent(keyArray.join('/'));

    if (!key) {
      return NextResponse.json({ error: 'Missing object key' }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || 'studiocore-madia';

    let s3Response;
    try {
      s3Response = await r2.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        // Try fallback bucket if needed
        const altBucket = bucketName === 'studiocore-media' ? 'studiocore-madia' : 'studiocore-media';
        try {
          s3Response = await r2.send(
            new GetObjectCommand({
              Bucket: altBucket,
              Key: key,
            })
          );
        } catch {
          return NextResponse.json({ error: 'Object not found' }, { status: 404 });
        }
      } else {
        throw err;
      }
    }

    if (!s3Response || !s3Response.Body) {
      return NextResponse.json({ error: 'Empty object stream' }, { status: 404 });
    }

    const byteArray = await (s3Response.Body as any).transformToByteArray();
    const contentType = s3Response.ContentType || 'image/webp';
    const cacheControl = 'public, max-age=31536000, immutable';

    return new NextResponse(byteArray, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': byteArray.length.toString(),
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: any) {
    console.error('[R2 Media Streaming Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to stream media' }, { status: 500 });
  }
}
