import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, B2_GALLERY_BUCKET_NAME } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const downloadUrl = await getGalleryPresignedDownloadUrl(
      'downloads/StudioCore-Uploader.exe',
      3600,
      B2_GALLERY_BUCKET_NAME,
      'attachment; filename="StudioCore-Uploader.exe"'
    );
    return NextResponse.redirect(downloadUrl);
  } catch (err: any) {
    console.error('Error generating uploader download URL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
