import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'moodboards';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate mime type (allow images, pdfs, videos if needed)
    const mimeType = file.type || 'image/webp';
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/') && mimeType !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only images, videos, and PDFs are supported.' }, { status: 400 });
    }

    // Limit file size to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || `photo_${Date.now()}.jpg`;

    const { url, key } = await uploadToR2(buffer, fileName, mimeType, folder);

    return NextResponse.json({
      success: true,
      url,
      key,
      name: fileName,
      size: file.size,
      mimeType,
    });
  } catch (error: any) {
    console.error('[R2 Upload API Error]:', error);
    return NextResponse.json({ error: error.message || 'Upload to R2 failed' }, { status: 500 });
  }
}
