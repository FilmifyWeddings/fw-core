import { NextRequest, NextResponse } from 'next/server';
import { getMoodboardFromB2 } from '@/lib/storage/moodboardB2Client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> | { key: string[] } }
) {
  try {
    const resolved = await params;
    const segments = Array.isArray(resolved?.key) ? resolved.key : [];
    const objectKey = segments.map((s) => decodeURIComponent(s)).join('/').replace(/^\/+/, '');

    if (!objectKey || objectKey.includes('..') || !objectKey.startsWith('moodboards/')) {
      return NextResponse.json({ error: 'Forbidden media path' }, { status: 403 });
    }

    const result = await getMoodboardFromB2(objectKey);
    if (!result) {
      return NextResponse.json({ error: 'Moodboard media not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType || 'image/webp',
        'Content-Length': String(result.buffer.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (err: any) {
    console.error('[Moodboard B2 Media Proxy Error]:', err);
    return NextResponse.json({ error: 'Failed to load moodboard image' }, { status: 500 });
  }
}
