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

    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const sheetName = searchParams.get('sheetName');

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json({ error: 'Missing spreadsheetId or sheetName parameters' }, { status: 400 });
    }

    const creds = await getGoogleCreds(supabaseAdmin, user.id);
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    // Fetch the first row of the sheet to read the headers (e.g. A1:Z1)
    const range = `${sheetName}!A1:Z1`;
    const rangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await fetch(rangeUrl, {
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Google API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const rows = data.values || [];
    const headers = rows[0] || [];

    // Filter out empty headers and map them
    const columns = headers
      .map((header: string, index: number) => ({
        index,
        name: header.trim(),
      }))
      .filter((col: any) => col.name.length > 0);

    return NextResponse.json({ columns });
  } catch (err: any) {
    console.error('[GET /api/workflows/google-sheets/columns] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
