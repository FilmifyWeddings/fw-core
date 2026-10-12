import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getGoogleCreds } from '@/lib/google-auth';

export const maxDuration = 30;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creds = await getGoogleCreds(supabaseAdmin, user.id, 'google_contacts');
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    let token = creds.access_token;

    // Call Google People API to list contact groups
    let res = await fetch('https://people.googleapis.com/v1/contactGroups?pageSize=100', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If 401, force-refresh token and retry once
    if (res.status === 401) {
      console.log('[Google Contacts Labels] Token expired (401), attempting force refresh...');
      const refreshed = await getGoogleCreds(supabaseAdmin, user.id, 'google_contacts', true);
      if (refreshed?.access_token) {
        token = refreshed.access_token;
        res = await fetch('https://people.googleapis.com/v1/contactGroups?pageSize=100', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Google Contacts Labels] List API error:', errText);
      if (errText.includes('SERVICE_DISABLED') || errText.includes('People API has not been used')) {
        return NextResponse.json({
          error: 'Google People API is currently disabled in your Google Cloud Console. Please enable it by visiting: https://console.developers.google.com/apis/api/people.googleapis.com/overview?project=666330539586',
          enableUrl: 'https://console.developers.google.com/apis/api/people.googleapis.com/overview?project=666330539586',
          isServiceDisabled: true,
        }, { status: 403 });
      }
      return NextResponse.json({ error: `Google API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const groups = (data.contactGroups || [])
      .filter((g: any) => g.groupType === 'USER_CONTACT_GROUP')
      .map((g: any) => ({
        id: g.resourceName,
        name: g.name,
        memberCount: g.memberCount || 0,
      }));

    return NextResponse.json({ success: true, labels: groups });
  } catch (err: any) {
    console.error('[GET /api/workflows/google-contacts/labels] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Label name is required' }, { status: 400 });
    }

    const creds = await getGoogleCreds(supabaseAdmin, user.id, 'google_contacts');
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    let token = creds.access_token;

    // Call Google People API to create contact group
    let res = await fetch('https://people.googleapis.com/v1/contactGroups', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactGroup: {
          name: name.trim(),
        },
      }),
    });

    if (res.status === 401) {
      console.log('[Google Contacts Labels] Token expired on create (401), attempting force refresh...');
      const refreshed = await getGoogleCreds(supabaseAdmin, user.id, 'google_contacts', true);
      if (refreshed?.access_token) {
        token = refreshed.access_token;
        res = await fetch('https://people.googleapis.com/v1/contactGroups', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactGroup: {
              name: name.trim(),
            },
          }),
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Google Contacts Labels] Create API error:', errText);
      if (errText.includes('SERVICE_DISABLED') || errText.includes('People API has not been used')) {
        return NextResponse.json({
          error: 'Google People API is currently disabled in your Google Cloud Console. Please enable it by visiting: https://console.developers.google.com/apis/api/people.googleapis.com/overview?project=666330539586',
          enableUrl: 'https://console.developers.google.com/apis/api/people.googleapis.com/overview?project=666330539586',
          isServiceDisabled: true,
        }, { status: 403 });
      }
      return NextResponse.json({ error: `Google API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const createdGroup = {
      id: data.resourceName,
      name: data.name,
      memberCount: 0,
    };

    return NextResponse.json({ success: true, label: createdGroup });
  } catch (err: any) {
    console.error('[POST /api/workflows/google-contacts/labels] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
