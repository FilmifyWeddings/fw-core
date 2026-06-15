import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/facebook?workspace_id=XXX
 *
 * Meta OAuth 2.0 ka starting point.
 * Yeh route user ko Facebook ke official OAuth consent screen pe redirect karta hai.
 *
 * Required Permissions (Scopes):
 *   - pages_show_list       → User ki Facebook Pages list dekhne ke liye
 *   - leads_retrieval        → Lead form data access karne ke liye
 *   - pages_read_engagement  → Page engagement data ke liye
 *   - pages_manage_ads       → Lead Ads manage karne ke liye
 *   - ads_management         → Ads account access ke liye
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!appId || appId === 'your_facebook_app_id_here') {
    return NextResponse.json(
      { error: 'FACEBOOK_APP_ID not configured in .env.local' },
      { status: 500 }
    );
  }

  // Callback URL — Meta Console mein bhi yahi register karna hoga
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  // State mein workspace_id encode karo (CSRF protection)
  // Production mein ek random nonce bhi add karein aur session/cookie mein store karein
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64url');

  // Required scopes
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'leads_retrieval',
    'pages_manage_ads',
    'business_management',
  ].join(',');

  // Meta OAuth Dialog URL (v20.0)
  const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', scopes);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');

  // Facebook ke OAuth page pe redirect karo
  return NextResponse.redirect(oauthUrl.toString());
}
