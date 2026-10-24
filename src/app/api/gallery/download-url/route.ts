import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || searchParams.get('originalKey') || searchParams.get('previewKey');
    const filename = searchParams.get('name') || searchParams.get('filename') || 'photo.jpg';

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    try {
      // Generate 2-hour presigned download URL with Content-Disposition attachment header
      const downloadUrl = await getGalleryPresignedDownloadUrl(key, 7200, undefined, filename);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      // Fallback to direct public URL if presigner encounters an issue
      const publicUrl = getGalleryPublicUrl(key);
      return NextResponse.json({ success: true, downloadUrl: publicUrl });
    }
  } catch (err: any) {
    console.error('Error generating download URL (GET):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalKey, previewKey, key, name, filename } = body;

    const targetKey = key || originalKey || previewKey;
    const downloadName = name || filename || 'photo.jpg';

    if (!targetKey) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    try {
      // Generate 2-hour presigned download URL with Content-Disposition attachment header
      const downloadUrl = await getGalleryPresignedDownloadUrl(targetKey, 7200, undefined, downloadName);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      // Fallback to direct public URL if presigner encounters an issue
      const publicUrl = getGalleryPublicUrl(targetKey);
      return NextResponse.json({ success: true, downloadUrl: publicUrl });
    }
  } catch (err: any) {
    console.error('Error generating download URL (POST):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
