import { NextRequest, NextResponse } from 'next/server';

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

  // Resolve redirect URI: explicit env var > request host. Never fallback to localhost.
  // GOOGLE_REDIRECT_URI must be registered in Google Cloud Console → Credentials → Authorized redirect URIs.
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
    || `${req.nextUrl.origin}/api/auth/google/callback`;

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
