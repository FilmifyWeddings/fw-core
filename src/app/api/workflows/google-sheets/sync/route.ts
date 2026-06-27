import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getGoogleCreds } from '@/lib/google-auth';
import { syncGoogleSheetData } from '@/lib/google-sheets-sync';

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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, sheetName, mappings } = await req.json();
    if (!spreadsheetId || !sheetName || !mappings) {
      return NextResponse.json({ error: 'Missing spreadsheetId, sheetName, or mappings' }, { status: 400 });
    }

    const result = await syncGoogleSheetData(user.id, spreadsheetId, sheetName, mappings);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      lastRowCount: result.lastRowCount
    });
  } catch (err: any) {
    console.error('[POST /api/workflows/google-sheets/sync] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
