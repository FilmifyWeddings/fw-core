import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = '666330539586-q0s8vvr4osdah4e60rd75s3keolfgmc0.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://studiocore.in/api/storage/google/callback';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect('https://studiocore.in/workspace/data-manager?error=no_code');
    }

    // 1. Exchange Auth Code for Access & Refresh Tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error:', tokenData);
      return NextResponse.redirect('https://studiocore.in/workspace/data-manager?error=token_failed');
    }

    const { access_token, refresh_token } = tokenData;

    // 2. Fetch User Profile (Email)
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userData = await userRes.json();
    const email = userData.email || 'studio.drive@gmail.com';

    // 3. Fetch Drive Storage Usage & Limit
    const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const aboutData = await aboutRes.json();
    const quota = aboutData.storageQuota || {};
    const totalBytes = parseInt(quota.limit || '16106127360', 10); // Default 15 GB
    const usedBytes = parseInt(quota.usage || '0', 10);

    // 4. Save into Supabase Database
    let workspaceId = stateParam && stateParam !== '00000000-0000-0000-0000-000000000000' ? stateParam : null;

    if (!workspaceId) {
      const { data: workspace } = await supabaseAdmin.from('workspaces').select('id').limit(1).maybeSingle();
      workspaceId = workspace?.id || '00000000-0000-0000-0000-000000000000';
    }

    const { data: insertedAccount, error: upsertErr } = await supabaseAdmin.from('storage_drive_accounts').upsert(
      {
        workspace_id: workspaceId,
        account_email: email,
        account_label: userData.name || email.split('@')[0],
        access_token,
        refresh_token: refresh_token || undefined,
        total_storage_bytes: totalBytes,
        used_storage_bytes: usedBytes,
        last_synced_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,account_email' }
    ).select().maybeSingle();

    if (upsertErr) {
      console.error('DB upsert error:', upsertErr);
    }

    return NextResponse.redirect('https://studiocore.in/workspace/data-manager?connected=true');
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect('https://studiocore.in/workspace/data-manager?error=server_error');
  }
}
