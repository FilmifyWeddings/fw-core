import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith('https://')) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (host && !isLocal) {
    const cleanHost = host.split(':')[0];
    return `https://${cleanHost}`;
  }

  if (host && isLocal) {
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}`;
  }

  return 'https://studiocore.in';
}

/**
 * GET /api/meta/auth?workspace_id=XXX
 *
 * Meta OAuth Entry Point for Meta Lead Ads with Forced Account Selection.
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
  // CRITICAL FIX: Force Facebook Account selection dialog
  oauthUrl.searchParams.set('auth_type', 'rerequest,reauthenticate');
  oauthUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(oauthUrl.toString());
}
