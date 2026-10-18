import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalKey, previewKey } = body;

    const targetKey = originalKey || previewKey;
    if (!targetKey) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    try {
      // Generate 2-hour presigned download URL from Backblaze B2
      const downloadUrl = await getGalleryPresignedDownloadUrl(targetKey, 7200);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      // Fallback to direct public URL if presigner encounters an issue
      const publicUrl = getGalleryPublicUrl(targetKey);
      return NextResponse.json({ success: true, downloadUrl: publicUrl });
    }
  } catch (err: any) {
    console.error('Error generating download URL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
