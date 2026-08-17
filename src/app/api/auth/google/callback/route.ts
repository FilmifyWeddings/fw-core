import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  const closeWindowWithHTML = (success: boolean, message: string) => {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication - StudioCore</title>
          <style>
            body {
              background-color: #f8f9fa;
              color: #18181b;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #ffffff;
              border: 1px solid #e4e4e7;
              padding: 32px 24px;
              border-radius: 20px;
              text-align: center;
              max-width: 320px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.06);
            }
            .icon {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              font-size: 22px;
              background: ${success ? '#ecfdf5' : '#fff1f2'};
              color: ${success ? '#059669' : '#e11d48'};
            }
            h3 { color: #09090b; margin: 0 0 8px; font-size: 17px; font-weight: 700; }
            p { color: #71717a; font-size: 13px; line-height: 1.5; margin: 0 0 16px; }
            button {
              background: #09090b;
              border: none;
              color: white;
              font-weight: 600;
              font-size: 12px;
              padding: 10px 20px;
              border-radius: 10px;
              cursor: pointer;
              transition: opacity 0.2s;
            }
            button:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">${success ? '✓' : '✕'}</div>
            <h3>${success ? 'Connected Successfully!' : 'Authentication Failed'}</h3>
            <p>${message}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            try {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_CALLBACK', 
                success: ${success}, 
                message: "${message}" 
              }, "*");
              setTimeout(() => { window.close(); }, 1500);
            } catch (e) {
              console.error(e);
            }
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  };

  if (error) {
    console.warn('[Google OAuth Callback] User cancelled or error:', error);
    return closeWindowWithHTML(false, `Authentication failed: ${error}`);
  }

  if (!code || !state) {
    return closeWindowWithHTML(false, 'Missing authorization code or state');
  }

  // Decode State
  let workspaceId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
    workspaceId = decoded.workspace_id;
    if (!workspaceId) throw new Error('workspace_id missing in state');
  } catch (err: any) {
    console.error('[Google OAuth Callback] State decode error:', err.message);
    return closeWindowWithHTML(false, 'State verification failed');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || clientId === 'your_google_client_id_here') {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    if (!clientSecret || clientSecret === 'your_google_client_secret_here') {
      throw new Error('GOOGLE_CLIENT_SECRET is not configured');
    }

    // ── Redirect URI: Reads env var first, then dynamically falls back ────────
    let redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
      const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'https');
      redirectUri = `${proto}://${host}/api/auth/google/callback`;
    }

    if (!redirectUri || !redirectUri.startsWith('http')) {
      throw new Error('Invalid Google Redirect URI configuration.');
    }

    console.log('[Google Callback] Exchanging code. redirect_uri:', redirectUri);

    // Exchange Authorization Code for Access & Refresh Tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokenData = await res.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) throw new Error('Access token not found in response');

    // Fetch Google User Profile (Email, Name, Picture)
    let connectedEmail = '';
    let connectedName = '';
    let connectedPicture = '';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        connectedEmail = userInfo.email || '';
        connectedName = userInfo.name || '';
        connectedPicture = userInfo.picture || '';
      }
    } catch (e) {
      console.warn('[Google Callback] Failed to fetch profile userinfo:', e);
    }

    // Save tokens in database (upsert with preserving old refresh token if missing)
    const updatePayload: Record<string, any> = {
      access_token: accessToken,
      status: 'connected',
      updated_at: new Date().toISOString(),
    };
    if (refreshToken) {
      updatePayload.refresh_token = refreshToken;
    }
    if (connectedEmail) {
      updatePayload.account_id = connectedEmail;
    }

    const { data: existing } = await supabaseAdmin
      .from('integration_credentials')
      .select('id, config, metadata')
      .eq('user_id', workspaceId)
      .eq('provider', 'google')
      .maybeSingle();

    const existingConfig = (existing?.config as Record<string, any>) || {};
    const existingMetadata = (existing?.metadata as Record<string, any>) || {};

    updatePayload.config = {
      ...existingConfig,
      connected_email: connectedEmail || existingConfig.connected_email,
      connected_name: connectedName || existingConfig.connected_name,
      connected_picture: connectedPicture || existingConfig.connected_picture,
      connected_at: new Date().toISOString(),
    };

    updatePayload.metadata = {
      ...existingMetadata,
      email: connectedEmail || existingMetadata.email,
      name: connectedName || existingMetadata.name,
      picture: connectedPicture || existingMetadata.picture,
    };

    if (existing) {
      const { error: dbErr } = await supabaseAdmin
        .from('integration_credentials')
        .update(updatePayload)
        .eq('id', existing.id);
      if (dbErr) throw dbErr;
    } else {
      const { error: dbErr } = await supabaseAdmin
        .from('integration_credentials')
        .insert({
          user_id: workspaceId,
          provider: 'google',
          ...updatePayload,
          refresh_token: refreshToken || null,
        });
      if (dbErr) throw dbErr;
    }

    // Log live activity event
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'google_oauth_connected',
      message: `Google Account (${connectedEmail || 'connected'}) linked successfully. People & Contacts API active.`,
    });

    return closeWindowWithHTML(true, 'Google Account linked successfully! This window will close shortly.');
  } catch (err: any) {
    console.error('[Google OAuth Callback] Error:', err.message);
    return closeWindowWithHTML(false, err.message || 'Token exchange request failed');
  }
}
