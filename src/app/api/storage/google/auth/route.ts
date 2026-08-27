import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/storage/google/callback`;

    if (!clientId) {
      const mockRedirect = `${redirectUri}?code=mock_google_code_sample`;
      return NextResponse.redirect(mockRedirect);
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      scopes
    )}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to start Google Drive auth' }, { status: 500 });
  }
}
