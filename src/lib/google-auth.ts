import { SupabaseClient } from '@supabase/supabase-js';

interface GoogleCreds {
  access_token: string;
  refresh_token?: string;
}

/**
 * Gets active Google OAuth credentials for a workspace.
 * Automatically handles token refresh if necessary.
 */
export async function getGoogleCreds(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<GoogleCreds | null> {
  const { data: creds, error } = await supabaseAdmin
    .from('integration_credentials')
    .select('access_token, refresh_token')
    .eq('user_id', workspaceId)
    .eq('provider', 'google')
    .maybeSingle();

  if (error || !creds || !creds.access_token) {
    return null;
  }

  // Check if token is valid by performing a lightweight call, or if we need to refresh it.
  const isValid = await testToken(creds.access_token);
  if (isValid) {
    return { access_token: creds.access_token, refresh_token: creds.refresh_token || undefined };
  }

  // Token is expired, try to refresh if we have a refresh token
  if (!creds.refresh_token) {
    console.warn('[google-auth] Access token expired and no refresh token available.');
    return null;
  }

  console.log('[google-auth] Access token expired, attempting refresh...');
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[google-auth] Token refresh failed:', errText);
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    if (!newAccessToken) return null;

    // Update credentials in database
    const updatePayload: Record<string, string> = {
      access_token: newAccessToken,
      updated_at: new Date().toISOString(),
    };
    if (data.refresh_token) {
      updatePayload.refresh_token = data.refresh_token;
    }

    await supabaseAdmin
      .from('integration_credentials')
      .update(updatePayload)
      .eq('user_id', workspaceId)
      .eq('provider', 'google');

    console.log('[google-auth] Token refreshed successfully.');
    return {
      access_token: newAccessToken,
      refresh_token: data.refresh_token || creds.refresh_token || undefined,
    };
  } catch (err) {
    console.error('[google-auth] Error refreshing token:', err);
    return null;
  }
}

async function testToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
