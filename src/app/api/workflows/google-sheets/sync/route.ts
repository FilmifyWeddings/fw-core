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

    const creds = await getGoogleCreds(supabaseAdmin, user.id);
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    // Fetch the sheet values from Google Sheets API
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
    const res = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Google API error: ${errText}` }, { status: res.status });
    }

    const sheetsData = await res.json() as { values?: string[][] };
    const rows = sheetsData.values || [];

    if (rows.length <= 1) {
      return NextResponse.json({ success: true, count: 0, message: 'No data rows found in this sheet.' });
    }

    const headers: string[] = (rows[0] || []).map((h: string) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const leadsToInsert: Record<string, any>[] = [];

    for (const row of dataRows) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => { rowObj[h] = row[i] || ''; });

      let nameVal = '';
      let phoneVal = '';
      let emailVal = '';
      const customPayload: Record<string, string> = {};

      Object.entries(mappings).forEach(([field, headerCol]) => {
        const cleanHeader = String(headerCol || '').trim().toLowerCase();
        const matchedVal = rowObj[cleanHeader] || '';
        
        if (field === 'name') {
          nameVal = matchedVal;
        } else if (field === 'phone') {
          phoneVal = matchedVal;
        } else if (field === 'email') {
          emailVal = matchedVal;
        } else {
          customPayload[field] = matchedVal;
        }
      });

      // Fallbacks
      if (!nameVal) {
        nameVal = rowObj['name'] || rowObj['full name'] || rowObj['full_name'] || 
                  rowObj['client name'] || rowObj['lead name'] || `Sheet Lead`;
      }
      if (!phoneVal) {
        phoneVal = rowObj['phone'] || rowObj['mobile'] || rowObj['contact'] || rowObj['phone number'] || '';
      }
      if (!emailVal) {
        emailVal = rowObj['email'] || rowObj['email address'] || '';
      }

      leadsToInsert.push({
        workspace_id: user.id,
        name: nameVal.trim(),
        phone: phoneVal.replace(/[^0-9]/g, ''),
        email: emailVal.trim(),
        source: 'google_sheets',
        status: 'new',
        raw_payload: {
          ...rowObj,
          ...customPayload
        },
      });
    }

    let insertedCount = 0;
    if (leadsToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert(leadsToInsert);

      if (insertErr) {
        return NextResponse.json({ error: `Lead insert error: ${insertErr.message}` }, { status: 500 });
      }
      insertedCount = leadsToInsert.length;
    }

    // Load integration config to update last_row_count
    const { data: dbIntegration } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();

    if (dbIntegration) {
      const config = (dbIntegration.config as Record<string, any>) || {};
      
      // Update active sheets config if present
      if (config.active_sheets) {
        const compositeKey = `${spreadsheetId}:${sheetName}`;
        if (config.active_sheets[compositeKey]) {
          config.active_sheets[compositeKey].last_row_count = rows.length;
        }
      } else if (config.sheets) {
        if (config.sheets[sheetName]) {
          config.sheets[sheetName].last_row_count = rows.length;
        }
      } else {
        config.last_row_count = rows.length;
      }

      await supabaseAdmin
        .from('integration_credentials')
        .update({ config })
        .eq('user_id', user.id)
        .eq('provider', 'google');
    }

    return NextResponse.json({ success: true, count: insertedCount, lastRowCount: rows.length });
  } catch (err: any) {
    console.error('[POST /api/workflows/google-sheets/sync] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
