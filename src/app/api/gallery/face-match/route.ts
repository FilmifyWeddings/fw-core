import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/gallery/match-face';
  return fetch(url.toString(), {
    method: 'POST',
    headers: req.headers,
    body: await req.text(),
  });
}
