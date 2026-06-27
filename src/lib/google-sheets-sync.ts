import { supabaseAdmin } from './supabase';
import { getGoogleCreds } from './google-auth';

export async function syncGoogleSheetData(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  mappings: Record<string, string>
) {
  try {
    const creds = await getGoogleCreds(supabaseAdmin, userId);
    if (!creds) {
      console.warn(`[Sync] No Google credentials found for user ${userId}`);
      return { success: false, error: 'Google Account not connected or credentials expired.' };
    }

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
    const res = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Sync] Google API error for ${sheetName}:`, errText);
      return { success: false, error: `Google API error: ${errText}` };
    }

    const sheetsData = await res.json() as { values?: string[][] };
    const rows = sheetsData.values || [];

    if (rows.length <= 1) {
      return { success: true, count: 0, message: 'No data rows found in this sheet.' };
    }

    // Read the integration config to find last_row_count
    const { data: dbIntegration } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle();

    const config = (dbIntegration?.config as Record<string, any>) || {};
    let lastRowCount = 0;
    const compositeKey = `${spreadsheetId}:${sheetName}`;

    if (config.active_sheets && config.active_sheets[compositeKey]) {
      lastRowCount = config.active_sheets[compositeKey].last_row_count || 0;
    } else if (config.sheets && config.sheets[sheetName]) {
      lastRowCount = config.sheets[sheetName].last_row_count || 0;
    } else {
      lastRowCount = config.last_row_count || 0;
    }

    const headers: string[] = (rows[0] || []).map((h: string) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);
    
    const lastCount = lastRowCount || 1;
    let newRows = dataRows.slice(lastCount - 1);
    if (dataRows.length < lastCount - 1) {
      newRows = dataRows;
    }

    if (newRows.length === 0) {
      return { success: true, count: 0, lastRowCount: rows.length, message: 'No new rows to ingest.' };
    }

    const leadsToInsert: Record<string, any>[] = [];

    for (const row of newRows) {
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
        workspace_id: userId,
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
        console.error('[Sync] Lead insert error:', insertErr);
        return { success: false, error: `Lead insert error: ${insertErr.message}` };
      }
      insertedCount = leadsToInsert.length;
    }

    // Update config last_row_count
    if (config.active_sheets) {
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
      .eq('user_id', userId)
      .eq('provider', 'google');

    return { success: true, count: insertedCount, lastRowCount: rows.length };
  } catch (err: any) {
    console.error(`[Sync] Exception in syncGoogleSheetData for user ${userId}:`, err);
    return { success: false, error: err.message || 'Internal server error' };
  }
}
