import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (isLocal) {
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}`;
  }

  return 'https://studiocore.in';
}

/**
 * GET /api/auth/facebook/callback
 * Canonical Redirect Alias: Redirects all incoming code exchanges directly to single production callback /api/meta/callback.
 */
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const { search } = new URL(req.url);

  const targetUrl = `${baseUrl}/api/meta/callback${search}`;
  console.log(`[Meta Callback Alias] Redirecting legacy callback hit to canonical route: ${targetUrl}`);

  return NextResponse.redirect(targetUrl);
}
