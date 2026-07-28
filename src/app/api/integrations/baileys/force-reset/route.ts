import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';

    const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/force-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json({ success: false, error: `Worker returned ${res.status}: ${errBody}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, message: data.message || 'Hard reset complete' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Worker unreachable: ${err.message}` }, { status: 502 });
  }
}
