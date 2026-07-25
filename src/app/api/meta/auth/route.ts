import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https');

  if (host) {
    return `${proto}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://143.244.133.235.nip.io:3000'
  );
}

/**
 * GET /api/meta/auth?workspace_id=XXX
 *
 * Meta OAuth 2.0 Entry Point.
 * Requests all required enterprise permissions for Meta Lead Ads integration.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID;
  const baseUrl = getBaseUrl(req);

  if (!appId || appId === 'your_facebook_app_id_here') {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_FACEBOOK_APP_ID / FACEBOOK_APP_ID is missing in environment variables.' },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/meta/callback`;
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64url');

  // Full Enterprise Required Permissions Scope
  const scopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'ads_management',
    'business_management',
    'leads_retrieval',
    'pages_manage_ads',
  ].join(',');

  const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', scopes);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(oauthUrl.toString());
}
