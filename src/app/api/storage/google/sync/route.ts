import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/google-credentials';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const { data: account, error: accErr } = await supabaseAdmin
      .from('storage_drive_accounts')
      .select('*')
      .eq('id', account_id)
      .maybeSingle();

    if (!account || accErr) {
      return NextResponse.json({ success: false, error: 'Drive account not found' }, { status: 404 });
    }

    let accessToken = account.access_token;
    const refreshToken = account.refresh_token;
    const { clientId, clientSecret } = getGoogleDriveCredentials();

    // Check if token needs refresh
    const expiry = account.token_expiry ? new Date(account.token_expiry).getTime() : 0;
    const isExpired = Date.now() > expiry - 5 * 60 * 1000;

    if ((isExpired || !accessToken) && refreshToken) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
          await supabaseAdmin
            .from('storage_drive_accounts')
            .update({
              access_token: accessToken,
              token_expiry: newExpiry,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);
        }
      } catch (refErr) {
        console.warn('[Sync API] Token refresh warning:', refErr);
      }
    }

    let totalStorageBytes = account.total_storage_bytes || (2000 * 1024 * 1024 * 1024);
    let usedStorageBytes = account.used_storage_bytes || 0;

    // Fetch quota from Google Drive API
    if (accessToken) {
      try {
        const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          const quota = aboutData.storageQuota;
          if (quota) {
            if (quota.limit) {
              const parsed = parseInt(String(quota.limit), 10);
              if (!isNaN(parsed) && parsed > 0) totalStorageBytes = parsed;
            }
            if (quota.usage) {
              const parsed = parseInt(String(quota.usage), 10);
              if (!isNaN(parsed) && parsed >= 0) usedStorageBytes = parsed;
            }
          }
        }
      } catch (aboutErr) {
        console.warn('[Sync API] Quota fetch error:', aboutErr);
      }
    }

    const { data: updatedAccount } = await supabaseAdmin
      .from('storage_drive_accounts')
      .update({
        total_storage_bytes: totalStorageBytes,
        used_storage_bytes: usedStorageBytes,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account_id)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: `Synced ${account.account_email} successfully.`,
      account: updatedAccount,
      last_synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
