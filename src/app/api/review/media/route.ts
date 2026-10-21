import { NextRequest, NextResponse } from 'next/server';
import { getReviewPresignedDownloadUrl, deleteReviewObject } from '@/lib/review/reviewStorage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/media?key=reviews/...
 * Generates an authorized presigned stream URL for private Backblaze B2 files with 206 Partial Content support.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return new NextResponse('Key is required', { status: 400 });
    }

    const signedUrl = await getReviewPresignedDownloadUrl(key, 86400);

    if (signedUrl && signedUrl.startsWith('http')) {
      return NextResponse.redirect(signedUrl, { status: 307 });
    }

    return new NextResponse('Media stream not found', { status: 404 });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
