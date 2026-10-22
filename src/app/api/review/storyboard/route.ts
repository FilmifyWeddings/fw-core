import { NextRequest, NextResponse } from 'next/server';
import { putReviewObject, getReviewObject } from '@/lib/review/reviewStorage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/storyboard?key=reviews/...
 * Retrieves pre-extracted storyboard JSON frames for instant hover timeline preview.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key required' }, { status: 400 });
    }

    const storyboardKey = `${key.replace(/\.[^.]+$/, '')}_storyboard.json`;
    const jsonStr = await getReviewObject(storyboardKey);

    if (jsonStr) {
      const data = JSON.parse(jsonStr);
      return NextResponse.json({ success: true, frames: data.frames || [] });
    }

    return NextResponse.json({ success: true, frames: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, frames: [] }, { status: 500 });
  }
}

/**
 * POST /api/review/storyboard
 * Saves client-extracted storyboard frames to Backblaze B2 alongside the video object.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storage_key, frames } = body;

    if (!storage_key || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ success: false, error: 'storage_key and frames array required' }, { status: 400 });
    }

    const storyboardKey = `${storage_key.replace(/\.[^.]+$/, '')}_storyboard.json`;
    const payload = JSON.stringify({ frames, generated_at: new Date().toISOString() });

    await putReviewObject(storyboardKey, payload, 'application/json');

    return NextResponse.json({ success: true, count: frames.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
