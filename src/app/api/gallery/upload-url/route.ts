import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, GALLERY_BUCKET_NAME } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { galleryId, filename, originalType = 'image/jpeg' } = body;

    if (!galleryId || !filename) {
      return NextResponse.json({ success: false, error: 'Missing galleryId or filename' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

    const originalKey = `events/${galleryId}/original/${timestamp}_${randomSuffix}_${baseName}.jpg`;
    const previewKey = `events/${galleryId}/previews/${timestamp}_${randomSuffix}_${baseName}.webp`;
    const thumbKey = `events/${galleryId}/thumbs/${timestamp}_${randomSuffix}_${baseName}.webp`;

    const [originalUploadUrl, previewUploadUrl, thumbUploadUrl] = await Promise.all([
      getPresignedUploadUrl(originalKey, originalType, 3600, GALLERY_BUCKET_NAME),
      getPresignedUploadUrl(previewKey, 'image/webp', 3600, GALLERY_BUCKET_NAME),
      getPresignedUploadUrl(thumbKey, 'image/webp', 3600, GALLERY_BUCKET_NAME),
    ]);

    return NextResponse.json({
      success: true,
      originalKey,
      previewKey,
      thumbKey,
      originalUploadUrl,
      previewUploadUrl,
      thumbUploadUrl,
    });
  } catch (err: any) {
    console.error('Error generating presigned upload URLs:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to generate upload URLs' }, { status: 500 });
  }
}
