import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncGoogleSheetData } from '@/lib/google-sheets-sync';

export const maxDuration = 60; // Webhook sync can process multiple worksheets
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const headers = req.headers;
    const channelId = headers.get('x-goog-channel-id');
    const resourceId = headers.get('x-goog-resource-id'); // Spreadsheet File ID
    const resourceState = headers.get('x-goog-resource-state'); // 'sync' or 'update'
    const channelToken = headers.get('x-goog-channel-token'); // Stores our user_id

    console.log(`[Google Sheets Webhook] Received notification. Channel: ${channelId}, File: ${resourceId}, State: ${resourceState}, User: ${channelToken}`);

    // Google sends a 'sync' state event when registering the watch channel
    if (resourceState === 'sync') {
      console.log(`[Google Sheets Webhook] Watch channel verified successfully.`);
      return new NextResponse('OK', { status: 200 });
    }

    if (resourceState !== 'update') {
      return new NextResponse('Ignored state', { status: 200 });
    }

    if (!channelToken || !resourceId) {
      console.error(`[Google Sheets Webhook] Missing channel token (userId) or resourceId (spreadsheetId)`);
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const userId = channelToken;

    // Fetch integration configurations for this user
    const { data: creds, error: dbError } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle();

    if (dbError || !creds) {
      console.error(`[Google Sheets Webhook] Failed to fetch credentials for user ${userId}:`, dbError);
      return new NextResponse('User credentials not found', { status: 404 });
    }

    const config = creds.config as Record<string, any> || {};
    const activeSheets = config.active_sheets || {};

    // Find all worksheets registered under this spreadsheet that are enabled
    const sheetsToSync = Object.values(activeSheets).filter(
      (sheet: any) => sheet.spreadsheet_id === resourceId && sheet.enabled
    );

    if (sheetsToSync.length === 0) {
      console.log(`[Google Sheets Webhook] No active worksheet syncs found for Spreadsheet ID: ${resourceId}`);
      return new NextResponse('No active sheets to sync', { status: 200 });
    }

    console.log(`[Google Sheets Webhook] Triggering sync for ${sheetsToSync.length} active worksheet(s)...`);

    const syncResults = [];
    for (const sheet of sheetsToSync as any[]) {
      console.log(`[Google Sheets Webhook] Ingesting sheet: ${sheet.sheet_name}`);
      const res = await syncGoogleSheetData(userId, sheet.spreadsheet_id, sheet.sheet_name, sheet.mappings);
      syncResults.push({
        sheetName: sheet.sheet_name,
        success: res.success,
        count: res.success ? res.count : 0,
        error: res.success ? null : res.error,
      });
    }

    console.log(`[Google Sheets Webhook] Sync results:`, JSON.stringify(syncResults));

    return NextResponse.json({
      success: true,
      message: 'Synchronization triggered successfully via Google Drive Webhook.',
      results: syncResults,
    });
  } catch (err: any) {
    console.error(`[Google Sheets Webhook] Exception error:`, err);
    return new NextResponse(err.message || 'Internal server error', { status: 500 });
  }
}
