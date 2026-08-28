import { NextRequest, NextResponse } from 'next/server';
import { extractFacesFromImageUrl, extractEmbeddingFromBase64 } from '@/lib/faceAI';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image_url, selfieBase64, image } = body;

    let embedding: number[] = [];

    if (selfieBase64 || image) {
      embedding = await extractEmbeddingFromBase64(selfieBase64 || image);
    } else if (image_url) {
      const faces = await extractFacesFromImageUrl(image_url);
      if (faces.length > 0) {
        embedding = faces[0].embedding;
      }
    }

    if (!embedding || embedding.length === 0) {
      return NextResponse.json({ success: false, error: 'Could not extract face embedding' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      embedding,
      faces: [{ box: { x: 0, y: 0, w: 100, h: 100 }, embedding }],
    });
  } catch (err: any) {
    console.error('Error in /api/ai/extract-faces:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
