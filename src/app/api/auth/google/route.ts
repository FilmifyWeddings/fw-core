import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/google?workspace_id=XXX
 *
 * Google OAuth 2.0 initiation.
 * Redirects the user to Google's consent screen.
 *
 * CRITICAL: GOOGLE_REDIRECT_URI must be set in .env.local / Vercel env vars.
 * It must be the EXACT URI registered in Google Cloud Console:
 *   https://console.cloud.google.com/apis/credentials
 * Example: https://yourdomain.com/api/auth/google/callback
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === 'your_google_client_id_here') {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  // ── Redirect URI: hardcoded env var ONLY — no dynamic fallback ─────────────
  // The redirect_uri sent to Google MUST match the token exchange redirect_uri
  // EXACTLY (character-for-character). Dynamic resolution via req.nextUrl.origin
  // or Host headers breaks in production behind proxies/CDNs/serverless gateways.
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!redirectUri || !redirectUri.startsWith('https://')) {
    console.error(
      '[Google OAuth] GOOGLE_REDIRECT_URI is missing or invalid. ' +
      'Set it to the EXACT URI registered in Google Cloud Console. ' +
      `Got: "${redirectUri ?? '(undefined)'}"`
    );
    return NextResponse.json(
      {
        error: 'GOOGLE_REDIRECT_URI is not configured. Set it in .env.local to the exact URI registered in Google Cloud Console (e.g. https://yourdomain.com/api/auth/google/callback).',
      },
      { status: 500 }
    );
  }

  console.log('[Google OAuth] Initiating flow. redirect_uri:', redirectUri);

  // Encode state as base64url
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64url');

  // Scopes needed: Drive (read spreadsheets), Sheets (read/write), Contacts (create)
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/contacts',
  ].join(' ');

  // Build Google OAuth Authorize URL
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthUrl.searchParams.set('client_id', clientId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', scopes);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('access_type', 'offline');
  oauthUrl.searchParams.set('prompt', 'consent'); // Force consent screen to always obtain refresh_token

  return NextResponse.redirect(oauthUrl.toString());
}
