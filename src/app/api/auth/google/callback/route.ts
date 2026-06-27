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
          <title>Google Authentication</title>
          <style>
            body {
              background-color: #070708;
              color: white;
              font-family: sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #0d0d0e;
              border: 1px solid #1f1f23;
              padding: 24px;
              border-radius: 16px;
              text-align: center;
              max-width: 320px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            h3 { color: ${success ? '#10b981' : '#f43f5e'}; margin-top: 0; }
            p { color: #a1a1aa; font-size: 13px; line-height: 1.5; }
            button {
              background: #f97316;
              border: none;
              color: black;
              font-weight: bold;
              padding: 8px 16px;
              border-radius: 8px;
              cursor: pointer;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>${success ? 'Connected!' : 'Error'}</h3>
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

    // ── Redirect URI: MUST match the initiation route EXACTLY ────────────────
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!redirectUri || !redirectUri.startsWith('https://')) {
      throw new Error(
        'GOOGLE_REDIRECT_URI is not configured. ' +
        'Set it in .env.local to the exact URI registered in Google Cloud Console ' +
        '(e.g. https://yourdomain.com/api/auth/google/callback). ' +
        `Got: "${redirectUri ?? '(undefined)'}"`
      );
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

    // Save tokens in database (upsert with preserving old refresh token if missing)
    const updatePayload: Record<string, any> = {
      access_token: accessToken,
      status: 'connected',
      updated_at: new Date().toISOString(),
    };
    if (refreshToken) {
      updatePayload.refresh_token = refreshToken;
    }

    const { data: existing } = await supabaseAdmin
      .from('integration_credentials')
      .select('id')
      .eq('user_id', workspaceId)
      .eq('provider', 'google')
      .maybeSingle();

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
      message: 'Google Workspace account connected successfully. Sheets and Drive APIs active.',
    });

    return closeWindowWithHTML(true, 'Google Account linked successfully! This window will close shortly.');
  } catch (err: any) {
    console.error('[Google OAuth Callback] Error:', err.message);
    return closeWindowWithHTML(false, err.message || 'Token exchange request failed');
  }
}
