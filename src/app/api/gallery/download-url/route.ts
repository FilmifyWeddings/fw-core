import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPresignedDownloadUrl, getGalleryPublicUrl, B2_GALLERY_BUCKET_NAME } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Prefer previewKey (Web-Sharp Only), gracefully falling back to key or legacy originalKey
    const rawKey = searchParams.get('previewKey') || searchParams.get('key') || searchParams.get('originalKey');
    const filename = searchParams.get('name') || searchParams.get('filename') || 'photo.webp';

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
    safeFilename = safeFilename.replace(/\.webp$/i, '.jpg');
    if (!safeFilename.toLowerCase().endsWith('.jpg') && !safeFilename.toLowerCase().endsWith('.jpeg')) {
      safeFilename = `${safeFilename}.jpg`;
    }

    // Direct high-speed JPG streaming download URL (High resolution, 95% quality, full sharpness)
    const downloadUrl = `/api/gallery/image?key=${encodeURIComponent(cleanKey)}&download=1&format=jpg&name=${encodeURIComponent(safeFilename)}`;
    return NextResponse.json({ success: true, downloadUrl });
  } catch (err: any) {
    console.error('Error generating download URL (GET):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalKey, previewKey, key, name, filename } = body;

    // Prefer previewKey (Web-Sharp Only pipeline), falling back gracefully
    const rawKey = previewKey || key || originalKey;
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
    safeFilename = safeFilename.replace(/\.webp$/i, '.jpg');
    if (!safeFilename.toLowerCase().endsWith('.jpg') && !safeFilename.toLowerCase().endsWith('.jpeg')) {
      safeFilename = `${safeFilename}.jpg`;
    }

    // Direct high-speed JPG streaming download URL
    const downloadUrl = `/api/gallery/image?key=${encodeURIComponent(cleanKey)}&download=1&format=jpg&name=${encodeURIComponent(safeFilename)}`;
    return NextResponse.json({ success: true, downloadUrl });
  } catch (err: any) {
    console.error('Error generating download URL (POST):', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
