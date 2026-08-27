import { NextRequest, NextResponse } from 'next/server';
import { r2 } from '@/lib/r2-storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyArray } = await params;
    const key = keyArray.join('/');

    if (!key) {
      return NextResponse.json({ error: 'Missing object key' }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || 'studiocore-madia';

    try {
      const response = await r2.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );

      const stream = response.Body as any;
      const contentType = response.ContentType || 'image/webp';
      const cacheControl = response.CacheControl || 'public, max-age=31536000, immutable';

      return new NextResponse(stream, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          ...(response.ContentLength ? { 'Content-Length': response.ContentLength.toString() } : {}),
        },
      });
    } catch (s3Error: any) {
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ error: 'Object not found' }, { status: 404 });
      }
      throw s3Error;
    }
  } catch (error: any) {
    console.error('[R2 Media Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch media' }, { status: 500 });
  }
}
