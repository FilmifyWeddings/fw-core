import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forceWakeQueue } from '@/lib/baileys-serverless';

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
    }

    console.log(`[wake API] Waking queue processor for workspace ${workspaceId}`);
    await forceWakeQueue(supabaseAdmin, workspaceId);

    return NextResponse.json({ success: true, message: 'Queue processor wake triggered.' });
  } catch (err: any) {
    console.error('[wake API error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
