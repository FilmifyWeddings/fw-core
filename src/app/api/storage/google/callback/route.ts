import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '666330539586-q0s8vvr4osdah4e60rd75s3keolfgmc0.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'https');
  const origin = `${proto}://${host}`;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(`${origin}/workspace/data-manager?error=no_code`);
    }

    // Decode state
    let workspaceId = '00000000-0000-0000-0000-000000000000';
    if (stateParam) {
      try {
        if (stateParam.startsWith('{') || stateParam.length > 40) {
          const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
          workspaceId = decoded.workspace_id || workspaceId;
        } else {
          workspaceId = stateParam;
        }
      } catch (_) {
        workspaceId = stateParam;
      }
    }

    if (!workspaceId || workspaceId === '00000000-0000-0000-0000-000000000000') {
      const { data: workspace } = await supabaseAdmin.from('workspaces').select('id').limit(1).maybeSingle();
      if (workspace?.id) workspaceId = workspace.id;
    }

    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${origin}/api/storage/google/callback`;

    // 1. Exchange Auth Code for Access & Refresh Tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error:', tokenData);
      return NextResponse.redirect(`${origin}/workspace/data-manager?error=token_failed`);
    }

    const { access_token, refresh_token } = tokenData;

    // 2. Fetch User Profile (Email)
    let email = 'studio.drive@gmail.com';
    let userName = 'Google Drive';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        email = userData.email || email;
        userName = userData.name || email.split('@')[0];
      }
    } catch (e) {
      console.warn('Google userinfo fetch failed:', e);
    }

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
    const { error: upsertErr } = await supabaseAdmin.from('storage_drive_accounts').upsert(
      {
        workspace_id: workspaceId,
        account_email: email,
        account_label: userName,
        access_token,
        refresh_token: refresh_token || undefined,
        total_storage_bytes: totalBytes,
        used_storage_bytes: usedBytes,
        last_synced_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,account_email' }
    );

    if (upsertErr) {
      console.error('DB upsert error:', upsertErr);
    }

    return NextResponse.redirect(`${origin}/workspace/data-manager?connected=true&email=${encodeURIComponent(email)}`);
  } catch (err: any) {
    console.error('Callback error:', err);
    return NextResponse.redirect(`${origin}/workspace/data-manager?error=server_error`);
  }
}
