import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, B2_GALLERY_BUCKET_NAME } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const filename = 'StudioCore-Uploader-Setup.exe';
  const key = `downloads/${filename}`;

  try {
    const downloadUrl = await getGalleryPresignedDownloadUrl(
      key,
      3600,
      B2_GALLERY_BUCKET_NAME,
      `attachment; filename="${filename}"`
    );
    return NextResponse.redirect(downloadUrl);
  } catch (err: any) {
    console.error(`Error generating uploader download URL for ${filename}, falling back to local static:`, err);
    return NextResponse.redirect(new URL(`/downloads/${filename}`, req.url));
  }
}
