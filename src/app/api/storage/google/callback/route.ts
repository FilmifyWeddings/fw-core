import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/google-credentials';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } = getGoogleDriveCredentials();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'https');
  const origin = `${proto}://${host}`;

  let returnPath = '/workspace/storage';

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const oauthError = searchParams.get('error');

    // Decode state
    let workspaceId = '00000000-0000-0000-0000-000000000000';
    let integrationType: string | null = null;
    if (stateParam) {
      try {
        if (stateParam.startsWith('{') || stateParam.length > 40) {
          const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
          workspaceId = decoded.workspace_id || workspaceId;
          if (decoded.return_url) returnPath = decoded.return_url;
          if (decoded.integration_type) integrationType = decoded.integration_type;
        } else {
          workspaceId = stateParam;
        }
      } catch (_) {
        workspaceId = stateParam;
      }
    }

    if (oauthError) {
      console.warn('[Google Drive Callback] OAuth error from Google:', oauthError);
      return NextResponse.redirect(`${origin}${returnPath}?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${origin}${returnPath}?error=no_code`);
    }

    const isValidUUID = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    let effectiveWs: string | null = isValidUUID(workspaceId) && workspaceId !== '00000000-0000-0000-0000-000000000000' ? workspaceId : null;

    if (!effectiveWs) {
      const token = req.cookies.get('sb-access-token')?.value;
      if (token) {
        try {
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user?.id) {
            const { data: ws } = await supabaseAdmin
              .from('workspaces')
              .select('id')
              .eq('owner_id', user.id)
              .limit(1)
              .maybeSingle();
            if (ws?.id) effectiveWs = ws.id;
          }
        } catch (_) {}
      }
    }

    if (!effectiveWs) {
      console.warn('[Google Drive Callback] Missing valid workspace_id in callback state');
      return NextResponse.redirect(`${origin}${returnPath}?error=workspace_missing`);
    }

    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${origin}/api/storage/google/callback`;

    // 1. Exchange Auth Code for Access & Refresh Tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[Google Drive Callback] Token exchange error:', tokenData);
      const reason = tokenData.error || 'token_failed';
      // Redirect strictly back to /workspace/storage with helpful parameters
      return NextResponse.redirect(`${origin}${returnPath}?error=token_failed&reason=${encodeURIComponent(reason)}&google_connect=manual`);
    }

    const { access_token, refresh_token } = tokenData;

    // 2. Fetch User Profile (Email, Name, Picture)
    let email = 'studio.drive@gmail.com';
    let userName = 'Google Drive';
    let userPicture = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        email = userData.email || email;
        userName = userData.name || email.split('@')[0];
        userPicture = userData.picture || '';
      }
    } catch (e) {
      console.warn('Google userinfo fetch failed:', e);
    }

    // ── STRICT ISOLATION GUARD: INTEGRATION FLOW (Google Contacts / Sheets / Calendar) ──
    // If this request came from Google Contacts / Sheets integration, save into integration_credentials
    // and NEVER pollute storage_drive_accounts!
    if (integrationType && integrationType.startsWith('google_')) {
      const niceTitle = integrationType === 'google_contacts' ? 'Google Contacts' :
                        integrationType === 'google_sheets' ? 'Google Sheets' :
                        integrationType === 'google_calendar' ? 'Google Calendar' : 'Google Integration';

      const updatePayload: Record<string, any> = {
        access_token,
        status: 'connected',
        updated_at: new Date().toISOString(),
        config: {
          connected_email: email,
          connected_name: userName,
          connected_picture: userPicture,
          connected_at: new Date().toISOString(),
        },
        metadata: {
          email,
          name: userName,
          picture: userPicture,
        }
      };
      if (refresh_token) {
        updatePayload.refresh_token = refresh_token;
      }

      // Check for existing integration record for this workspace
      const { data: existingCred } = await supabaseAdmin
        .from('integration_credentials')
        .select('id, config, metadata')
        .eq('user_id', effectiveWs)
        .eq('provider', integrationType)
        .maybeSingle();

      if (existingCred) {
        const existingConfig = (existingCred.config as Record<string, any>) || {};
        const existingMetadata = (existingCred.metadata as Record<string, any>) || {};
        updatePayload.config = {
          ...existingConfig,
          ...updatePayload.config,
        };
        updatePayload.metadata = {
          ...existingMetadata,
          ...updatePayload.metadata,
        };
        await supabaseAdmin
          .from('integration_credentials')
          .update(updatePayload)
          .eq('id', existingCred.id);
      } else {
        await supabaseAdmin
          .from('integration_credentials')
          .insert({
            user_id: effectiveWs,
            provider: integrationType,
            ...updatePayload,
          });
      }

      // Audit log in live_logs
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: effectiveWs,
        event_type: `${integrationType}_connected`,
        message: `Google Account (${email}) linked successfully for ${niceTitle}.`,
      });

      const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${niceTitle} Connected - StudioCore</title>
  <style>
    body { background-color: #f8f9fa; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #ffffff; border: 1px solid #e4e4e7; padding: 32px 24px; border-radius: 20px; text-align: center; max-width: 340px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .icon { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 22px; background: #ecfdf5; color: #059669; font-weight: bold; }
    h3 { color: #09090b; margin: 0 0 8px; font-size: 17px; font-weight: 700; }
    p { color: #71717a; font-size: 13px; line-height: 1.5; margin: 0 0 16px; word-break: break-all; }
    button { background: #09090b; border: none; color: white; font-weight: 600; font-size: 12px; padding: 10px 20px; border-radius: 10px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h3>Connected Successfully!</h3>
    <p>${niceTitle} is now active for <strong>${email}</strong>.</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_CALLBACK',
          success: true,
          message: "${niceTitle} connected successfully!"
        }, "*");
      }
    } catch(e) { console.error(e); }
    setTimeout(() => { window.close(); }, 1200);
  </script>
</body>
</html>`;

      return new NextResponse(popupHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── STUDIO STORAGE FLOW (Pure Google Drive Accounts) ──
    // 3. Fetch Drive Storage Usage & Limit
    let totalBytes = 15 * 1024 * 1024 * 1024;
    let usedBytes = 0;
    try {
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        const quota = aboutData.storageQuota || {};
        if (quota.limit) {
          const parsed = parseInt(String(quota.limit), 10);
          if (!isNaN(parsed) && parsed > 0) totalBytes = parsed;
        }
        if (quota.usage) {
          const parsed = parseInt(String(quota.usage), 10);
          if (!isNaN(parsed) && parsed >= 0) usedBytes = parsed;
        }
      }
    } catch (e) {
      console.warn('Google drive about fetch failed:', e);
    }

    // 4. Save into Supabase Database
    const drivePayload: any = {
      workspace_id: effectiveWs,
      account_email: email,
      account_label: userName,
      access_token,
      total_storage_bytes: totalBytes,
      used_storage_bytes: usedBytes,
      last_synced_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (refresh_token) {
      drivePayload.refresh_token = refresh_token;
    }

    const { error: upsertErr } = await supabaseAdmin.from('storage_drive_accounts').upsert(
      drivePayload,
      { onConflict: 'workspace_id,account_email' }
    );

    if (upsertErr) {
      console.error('[Google Drive Callback] DB upsert error:', upsertErr);
    }

    const targetRedirectUrl = `${origin}${returnPath}?connected=true&email=${encodeURIComponent(email)}`;
    const htmlResponse = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="2;url=${targetRedirectUrl}" />
  <title>Google Drive Connected</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #faf9f6; color: #1e293b;">
  <div style="text-align: center; padding: 28px; background: white; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); max-width: 400px;">
    <div style="font-size: 36px; margin-bottom: 12px;">🎉</div>
    <h2 style="font-size: 18px; margin: 0 0 8px; font-weight: 800; color: #0f172a;">Connected to Google Drive!</h2>
    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px; font-weight: 600;">${email}</p>
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Returning to Studio Storage Hub...</p>
  </div>
  <script>
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'GOOGLE_DRIVE_CONNECTED', email: '${email}' }, '*');
      } catch(e) {}
      setTimeout(() => {
        try { window.close(); } catch(e) {}
      }, 700);
    } else {
      window.location.href = '${targetRedirectUrl}';
    }
  </script>
</body>
</html>`;

    return new NextResponse(htmlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[Google Drive Callback] Exception:', err);
    return NextResponse.redirect(`${origin}${returnPath}?error=server_error`);
  }
}
