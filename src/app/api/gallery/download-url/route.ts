import { NextRequest, NextResponse } from 'next/server';
import { getPresignedDownloadUrl, getR2PublicUrl } from '@/lib/r2';

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
      const downloadUrl = await getPresignedDownloadUrl(targetKey, 7200);
      return NextResponse.json({ success: true, downloadUrl });
    } catch (s3Err) {
      // Fallback to direct public CDN url if presigner has an issue
      const publicUrl = getR2PublicUrl(targetKey);
      return NextResponse.json({ success: true, downloadUrl: publicUrl });
    }
  } catch (err: any) {
    console.error('Error generating download URL:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
