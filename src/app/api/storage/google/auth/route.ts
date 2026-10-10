import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';
  const returnUrl = searchParams.get('return_url') || '/workspace/storage';

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'https');
  const origin = `${proto}://${host}`;

  const clientId = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here')
    ? process.env.GOOGLE_CLIENT_ID
    : '666330539586-q0s8vvr4osdah4e60rd75s3keolfgmc0.apps.googleusercontent.com';

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
  )}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
