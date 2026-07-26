import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (isLocal) {
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}`;
  }

  // Canonical HTTPS origin for StudioCore production
  return 'https://studiocore.in';
}

/**
 * GET /api/meta/auth?workspace_id=XXX
 *
 * Canonical Meta OAuth Entry Point.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID || '1488107768502570';
  const baseUrl = getBaseUrl(req);

  // Exact Canonical Redirect URI
  const redirectUri = `${baseUrl}/api/meta/callback`;
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64url');

  const scopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'ads_management',
    'business_management',
    'leads_retrieval',
  ].join(',');

  const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', scopes);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('auth_type', 'rerequest,reauthenticate');
  oauthUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(oauthUrl.toString());
}
