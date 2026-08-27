import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';
    const redirectUri = `${baseUrl}/api/storage/google/callback`;

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      const mockRedirect = `${baseUrl}/api/storage/google/callback?code=mock_google_code_sample&state=${encodeURIComponent(workspaceId)}`;
      return NextResponse.redirect(mockRedirect);
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(workspaceId)}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to start Google Drive auth' }, { status: 500 });
  }
}
