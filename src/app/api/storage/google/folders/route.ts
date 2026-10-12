import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/google-credentials';

export const dynamic = 'force-dynamic';

async function getValidAccessToken(accountId: string) {
  const { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } = getGoogleDriveCredentials();

  const { data: account, error } = await supabaseAdmin
    .from('storage_drive_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error('Google Drive account not found');
  }

  let accessToken = account.access_token;
  const refreshToken = account.refresh_token;
  const expiry = account.token_expiry ? new Date(account.token_expiry).getTime() : 0;
  const isExpired = Date.now() > expiry - 5 * 60 * 1000; // 5 min buffer

  if (isExpired && refreshToken) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
        const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

        await supabaseAdmin
          .from('storage_drive_accounts')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
      }
    } catch (e) {
      console.warn('[GoogleFolders API] Token refresh warning:', e);
    }
  }

  return { accessToken, account };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');
    const parentId = searchParams.get('parent_id') || 'root';
    const searchQuery = searchParams.get('search');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'account_id is required' }, { status: 400 });
    }

    const { accessToken, account } = await getValidAccessToken(accountId);

    if (!accessToken) {
      return NextResponse.json({
        success: true,
        is_direct_linked: true,
        account_email: account.account_email,
        account_label: account.account_label,
        currentFolder: { id: 'root', name: 'Direct Linked Drive' },
        folders: [],
        message: 'Account is linked directly. You can paste the Google Drive folder link or folder name directly.'
      });
    }

    let q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (searchQuery && searchQuery.trim()) {
      const cleanSearch = searchQuery.trim().replace(/'/g, "\\'");
      q = `mimeType = 'application/vnd.google-apps.folder' and name contains '${cleanSearch}' and trashed = false`;
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,webViewLink,createdTime,modifiedTime,quotaBytesUsed)&orderBy=name&pageSize=100`;

    const driveRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok) {
      const errJson = await driveRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errJson.error?.message || 'Failed to list Google Drive folders',
      }, { status: driveRes.status });
    }

    const driveData = await driveRes.json();
    const folders = (driveData.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      sizeBytes: Number(f.quotaBytesUsed) || 0,
    }));

    // If not root, fetch current parent folder metadata
    let currentFolder = { id: parentId, name: parentId === 'root' ? 'My Drive' : 'Folder' };
    if (parentId !== 'root') {
      try {
        const parentMetaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${parentId}?fields=id,name,webViewLink`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (parentMetaRes.ok) {
          const parentMeta = await parentMetaRes.json();
          currentFolder = {
            id: parentMeta.id,
            name: parentMeta.name || 'Folder',
          };
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      account_email: account.account_email,
      account_label: account.account_label,
      currentFolder,
      folders,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, name, parent_id = 'root' } = body;

    if (!account_id || !name) {
      return NextResponse.json({ success: false, error: 'account_id and name are required' }, { status: 400 });
    }

    const { accessToken } = await getValidAccessToken(account_id);

    if (!accessToken) {
      const customId = `fld_${Date.now()}`;
      return NextResponse.json({
        success: true,
        folder: {
          id: customId,
          name: name.trim(),
          webViewLink: `https://drive.google.com/drive/search?q=${encodeURIComponent(name.trim())}`,
        },
        message: 'Folder reference created for direct-linked drive.',
      });
    }

    const folderPayload: any = {
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parent_id && parent_id !== 'root') {
      folderPayload.parents = [parent_id];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderPayload),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errData.error?.message || 'Failed to create folder in Google Drive',
      }, { status: createRes.status });
    }

    const newFolder = await createRes.json();
    return NextResponse.json({
      success: true,
      folder: {
        id: newFolder.id,
        name: newFolder.name,
        webViewLink: newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
