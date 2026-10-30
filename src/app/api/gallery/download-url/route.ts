import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl, B2_GALLERY_BUCKET_NAME } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get('key') || searchParams.get('originalKey') || searchParams.get('previewKey');
    const filename = searchParams.get('name') || searchParams.get('filename') || 'photo.jpg';

    if (!rawKey) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    let cleanKey = rawKey.trim();
    if (cleanKey.includes('key=')) {
      const match = cleanKey.match(/[?&]key=([^&]+)/);
      if (match) {
        cleanKey = decodeURIComponent(match[1]);
      }
    }
    cleanKey = cleanKey.replace(/^\/+/, '');

    let safeFilename = filename.replace(/["\r\n]/g, '').trim() || 'photo.jpg';
    if (safeFilename.toLowerCase().endsWith('.webp')) {
      safeFilename = safeFilename.replace(/\.webp$/i, '.jpg');
    }
    const disposition = `attachment; filename="${safeFilename}"`;

    try {
      // Generate 2-hour presigned download URL pointing directly to original object in Backblaze B2
      const downloadUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200, B2_GALLERY_BUCKET_NAME, disposition);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      // Fallback to direct download proxy URL if presigner encounters an issue
      const proxyUrl = `/api/gallery/image?key=${encodeURIComponent(cleanKey)}&download=1&name=${encodeURIComponent(safeFilename)}`;
      return NextResponse.json({ success: true, downloadUrl: proxyUrl });
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

    const rawKey = key || originalKey || previewKey;
    const downloadName = name || filename || 'photo.jpg';

    if (!rawKey) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    let cleanKey = rawKey.trim();
    if (cleanKey.includes('key=')) {
      const match = cleanKey.match(/[?&]key=([^&]+)/);
      if (match) {
        cleanKey = decodeURIComponent(match[1]);
      }
    }
    cleanKey = cleanKey.replace(/^\/+/, '');

    let safeFilename = downloadName.replace(/["\r\n]/g, '').trim() || 'photo.jpg';
    if (safeFilename.toLowerCase().endsWith('.webp')) {
      safeFilename = safeFilename.replace(/\.webp$/i, '.jpg');
    }
    const disposition = `attachment; filename="${safeFilename}"`;

    try {
      const downloadUrl = await getGalleryPresignedDownloadUrl(cleanKey, 7200, B2_GALLERY_BUCKET_NAME, disposition);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      const proxyUrl = `/api/gallery/image?key=${encodeURIComponent(cleanKey)}&download=1&name=${encodeURIComponent(safeFilename)}`;
      return NextResponse.json({ success: true, downloadUrl: proxyUrl });
    }
  } catch (err: any) {
    console.error('Error generating download URL (POST):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
