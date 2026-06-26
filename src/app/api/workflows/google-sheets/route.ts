import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getGoogleCreds } from '@/lib/google-auth';

export const maxDuration = 30;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
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

    const creds = await getGoogleCreds(supabaseAdmin, user.id);
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    // Query Google Drive for Spreadsheets
    const driveUrl = "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)&pageSize=100";
    const res = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Google API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ spreadsheets: data.files || [] });
  } catch (err: any) {
    console.error('[GET /api/workflows/google-sheets] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
