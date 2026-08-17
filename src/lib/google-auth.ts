import { SupabaseClient } from '@supabase/supabase-js';

interface GoogleCreds {
  access_token: string;
  refresh_token?: string;
  id?: string;
  provider?: string;
}

/**
 * Gets active Google OAuth credentials for a workspace.
 * Supports isolated providers (google_contacts, google_sheets, google_calendar) with fallback to legacy 'google'.
 * Automatically handles token refresh if necessary.
 */
export async function getGoogleCreds(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  providerName: 'google_contacts' | 'google_sheets' | 'google_calendar' | string = 'google_contacts'
): Promise<GoogleCreds | null> {
  // Query specific provider first, fallback to legacy 'google'
  const { data: credsList, error } = await supabaseAdmin
    .from('integration_credentials')
    .select('id, access_token, refresh_token, provider, status')
    .eq('user_id', workspaceId)
    .in('provider', [providerName, 'google'])
    .eq('status', 'connected')
    .order('updated_at', { ascending: false });

  if (error || !credsList || credsList.length === 0) {
    return null;
  }

  // Find exact provider match first, else use first item
  const creds = credsList.find(c => c.provider === providerName) || credsList[0];
  if (!creds || !creds.access_token) {
    return null;
  }

  // Check if token is valid by performing a lightweight call, or if we need to refresh it.
  const isValid = await testToken(creds.access_token);
  if (isValid) {
    return { 
      access_token: creds.access_token, 
      refresh_token: creds.refresh_token || undefined,
      id: creds.id,
      provider: creds.provider
    };
  }

  // Token is expired, try to refresh if we have a refresh token
  if (!creds.refresh_token) {
    console.warn(`[google-auth] Access token expired for ${creds.provider} and no refresh token available.`);
    return null;
  }

  console.log(`[google-auth] Access token expired for ${creds.provider}, attempting refresh...`);
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

    // Update credentials in database targeting this exact row ID
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
      .eq('id', creds.id);

    console.log(`[google-auth] Token refreshed successfully for ${creds.provider}.`);
    return {
      access_token: newAccessToken,
      refresh_token: data.refresh_token || creds.refresh_token || undefined,
      id: creds.id,
      provider: creds.provider
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
