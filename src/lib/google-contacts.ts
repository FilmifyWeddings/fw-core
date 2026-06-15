import { Lead } from '@/types';
import { supabaseAdmin } from './supabase';

interface GoogleContactPayload {
  names: Array<{ givenName: string }>;
  phoneNumbers: Array<{ value: string; type: string }>;
  emails: Array<{ value: string; type: string }>;
  biographies: Array<{ value: string; contentType: string }>;
  userDefined: Array<{ key: string; value: string }>;
}

/**
 * Refreshes the Google OAuth token using the saved refresh token.
 */
async function refreshGoogleAccessToken(
  profileId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Google client credentials missing in environment variables');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google token refresh failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    if (newAccessToken) {
      // Save new access token back to Supabase
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          google_access_token: newAccessToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (error) {
        console.error('Error saving refreshed Google token to profiles:', error);
      }
      return newAccessToken;
    }
  } catch (err) {
    console.error('Google Refresh Token error:', err);
  }

  return null;
}

/**
 * Syncs a lead to Google Contacts using Google People API.
 * This runs in a non-blocking mode.
 */
export async function syncLeadToGoogleContacts(
  workspaceId: string,
  lead: Lead
): Promise<boolean> {
  try {
    // 1. Fetch workspace credentials
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('google_access_token, google_refresh_token, workspace_name')
      .eq('id', workspaceId)
      .single();

    if (profileErr || !profile) {
      throw new Error(`Failed to fetch workspace profile: ${profileErr?.message || 'Not found'}`);
    }

    const { google_access_token, google_refresh_token } = profile;

    if (!google_access_token && !google_refresh_token) {
      // Not configured. Log and skip.
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        lead_id: lead.id,
        event_type: 'sync_google_skipped',
        message: 'Google Contacts Sync skipped: OAuth credentials not configured.',
        metadata: { info: 'Authorize Google account in Settings to enable sync.' },
      });
      return false;
    }

    let token = google_access_token;

    // 2. Prepare payload
    const contactPayload: GoogleContactPayload = {
      names: [{ givenName: lead.name || `Lead ${lead.phone}` }],
      phoneNumbers: [{ value: lead.phone, type: 'mobile' }],
      emails: lead.email ? [{ value: lead.email, type: 'work' }] : [],
      biographies: [
        {
          value: `Lead Score: ${lead.score}\nReason: ${lead.score_reason || 'N/A'}\nSource: ${lead.source}\nVenue: ${lead.raw_payload.venue || 'N/A'}\nBudget: ${lead.raw_payload.budget || 'N/A'}`,
          contentType: 'TEXT_PLAIN',
        },
      ],
      userDefined: [
        { key: 'LeadScore', value: lead.score },
        { key: 'Source', value: lead.source },
      ],
    };

    // Helper to send creation request
    const createContact = async (accessToken: string) => {
      return fetch('https://people.googleapis.com/v1/people:createContact', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactPayload),
      });
    };

    let response = await createContact(token || '');

    // 3. Handle token expiry (401)
    if (response.status === 401 && google_refresh_token) {
      console.log('Google Access Token expired. Retrying with refreshed token...');
      const refreshedToken = await refreshGoogleAccessToken(workspaceId, google_refresh_token);
      if (refreshedToken) {
        token = refreshedToken;
        response = await createContact(token);
      }
    }

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(`Google People API error: ${response.status} - ${errMsg}`);
    }

    const result = await response.json();

    // 4. Create live logs on success
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      event_type: 'sync_google_success',
      message: `Successfully synced lead "${lead.name || lead.phone}" as a Google Contact.`,
      metadata: { googleContactId: result.resourceName },
    });

    return true;
  } catch (err: any) {
    console.error('syncLeadToGoogleContacts error:', err);

    // Write failure log
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      event_type: 'sync_google_failed',
      message: `Google Contacts Sync failed: ${err.message || err}`,
      metadata: { error: String(err) },
    });

    return false;
  }
}
