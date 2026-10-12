import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveCredentials } from '@/lib/google-credentials';

import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isValidUUID = (val?: string | null) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawWsId = searchParams.get('workspace_id');
  const returnUrl = searchParams.get('return_url') || '/workspace/storage';

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'https');
  const origin = `${proto}://${host}`;

  let workspaceId = isValidUUID(rawWsId) && rawWsId !== '00000000-0000-0000-0000-000000000000' ? rawWsId : null;

  if (!workspaceId) {
    const token = req.cookies.get('sb-access-token')?.value;
    if (token) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user?.id) {
          const { data: ws } = await supabaseAdmin
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)
            .maybeSingle();
          if (ws?.id) workspaceId = ws.id;
        }
      } catch (_) {}
    }
  }

  if (!workspaceId) {
    return NextResponse.redirect(`${origin}${returnUrl}?error=workspace_required`);
  }

  const { clientId } = getGoogleDriveCredentials();

  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${origin}/api/storage/google/callback`;

  const state = Buffer.from(
    JSON.stringify({
      workspace_id: workspaceId,
      return_url: returnUrl,
    })
  ).toString('base64url');

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=select_account%20consent&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
