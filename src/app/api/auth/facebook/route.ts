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
 * GET /api/auth/facebook?workspace_id=XXX
 *
 * Meta OAuth 2.0 Entry Point with Forced Account Selection.
 * Forces Facebook to prompt account choice and re-authenticate without silently reusing active sessions.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID;
  const baseUrl = getBaseUrl(req);

  if (!appId || appId === 'your_facebook_app_id_here') {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_FACEBOOK_APP_ID or FACEBOOK_APP_ID not configured in environment variables.' },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64url');

  const scopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'leads_retrieval',
    'pages_manage_metadata',
    'ads_management',
    'ads_read',
  ].join(',');

  const oauthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', scopes);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');
  // CRITICAL FIX: Force account selection & re-authentication to prevent silent session reuse across workspaces
  oauthUrl.searchParams.set('auth_type', 'rerequest,reauthenticate');
  oauthUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(oauthUrl.toString());
}
