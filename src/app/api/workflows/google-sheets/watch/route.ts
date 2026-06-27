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

    const { spreadsheetId } = await req.json();
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
    }

    const creds = await getGoogleCreds(supabaseAdmin, user.id);
    if (!creds) {
      return NextResponse.json({ error: 'Google Account not connected or credentials expired.' }, { status: 400 });
    }

    // Determine public webhook address
    const origin = req.nextUrl.origin;
    // Standard webhook URL that Google will notify
    const webhookAddress = `${origin}/api/webhooks/google-sheets`;

    // Unique channel ID for the watch subscription
    const channelId = `watch_${spreadsheetId}_${user.id.slice(0, 8)}`;

    console.log(`[Watch Setup] Registering watch channel for file: ${spreadsheetId}, User: ${user.id}, Address: ${webhookAddress}`);

    // Call Google Drive API watch endpoint
    const watchUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/watch`;
    const res = await fetch(watchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookAddress,
        token: user.id, // Pass userId as token for secure verification on callback
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Watch Setup] Google watch API call failed:`, errText);
      
      // If it fails because the domain isn't registered, log it but let configuration save succeed
      return NextResponse.json({
        success: false,
        error: `Google API watch registration failed: ${errText}`,
        message: 'Domain verification required in Google Cloud Console to receive live push notifications.'
      }, { status: res.status });
    }

    const watchData = await res.json() as { id: string; resourceId: string; expiration: string };
    console.log(`[Watch Setup] Successfully registered watch. ID: ${watchData.id}, Expiration: ${watchData.expiration}`);

    // Save watch subscription information in database integration configuration
    const { data: dbIntegration } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();

    if (dbIntegration) {
      const config = (dbIntegration.config as Record<string, any>) || {};
      if (!config.watch_channels) {
        config.watch_channels = {};
      }
      config.watch_channels[spreadsheetId] = {
        channel_id: watchData.id,
        resource_id: watchData.resourceId,
        expiration: watchData.expiration,
        registered_at: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('integration_credentials')
        .update({ config })
        .eq('user_id', user.id)
        .eq('provider', 'google');
    }

    return NextResponse.json({
      success: true,
      channelId: watchData.id,
      expiration: watchData.expiration,
    });
  } catch (err: any) {
    console.error('[POST /api/workflows/google-sheets/watch] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
