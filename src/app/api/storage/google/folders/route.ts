import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/google-credentials';

export const dynamic = 'force-dynamic';

async function getValidAccessToken(accountId: string, workspaceId?: string | null) {
  const { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } = getGoogleDriveCredentials();

  let query = supabaseAdmin
    .from('storage_drive_accounts')
    .select('*')
    .eq('id', accountId);

  if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data: account, error } = await query.maybeSingle();

  if (error || !account) {
    throw new Error('Google Drive account not found or access denied');
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

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 1000) return `${gb.toFixed(2)} GB`;
  const tb = gb / 1024;
  return `${tb.toFixed(2)} TB`;
}

// In-memory cache for folder real count and sizes to prevent redundant Google Drive sweeps
const folderStatsCache = new Map<string, {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  timestamp: number;
}>();

async function getFolderRealStats(accessToken: string, parentId: string, cacheKey: string) {
  const cached = folderStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120_000) {
    return cached;
  }

  let totalFiles = 0;
  let totalFolders = 0;
  let totalSizeBytes = 0;
  let countToken: string | null = null;
  let pages = 0;

  const countQ = `'${parentId}' in parents and trashed = false`;

  try {
    do {
      let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        countQ
      )}&fields=nextPageToken,files(mimeType,size)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      if (countToken) url += `&pageToken=${encodeURIComponent(countToken)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) break;

      const data = await res.json();
      const items = data.files || [];
      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          totalFolders++;
        } else {
          totalFiles++;
          totalSizeBytes += Number(item.size) || 0;
        }
      }
      countToken = data.nextPageToken || null;
      pages++;
    } while (countToken && pages < 30); // scan up to 30,000 files
  } catch (err) {
    console.warn('[GoogleFolders API] Stats calculation warning:', err);
  }

  const stats = {
    totalFiles,
    totalFolders,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    timestamp: Date.now(),
  };

  folderStatsCache.set(cacheKey, stats);
  return stats;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');
    const parentId = searchParams.get('parent_id') || 'root';
    const searchQuery = searchParams.get('search');
    const workspaceId = searchParams.get('workspace_id');
    const pageToken = searchParams.get('page_token') || searchParams.get('pageToken');
    const checkFolderSize = searchParams.get('check_folder_size') === 'true';
    const targetFolderId = searchParams.get('folder_id') || parentId;

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'account_id is required' }, { status: 400 });
    }

    const { accessToken, account } = await getValidAccessToken(accountId, workspaceId);

    if (!accessToken) {
      return NextResponse.json({
        success: true,
        is_direct_linked: true,
        account_email: account.account_email,
        account_label: account.account_label,
        currentFolder: { id: 'root', name: 'Direct Linked Drive' },
        folders: [],
        files: [],
        nextPageToken: null,
        message: 'Account is linked directly. You can paste the Google Drive folder link or folder name directly.'
      });
    }

    // 1. Dedicated Folder Real Size & Counts Inspection
    if (checkFolderSize) {
      const stats = await getFolderRealStats(accessToken, targetFolderId, `${accountId}_${targetFolderId}`);
      return NextResponse.json({
        success: true,
        folder_id: targetFolderId,
        total_files: stats.totalFiles,
        total_folders: stats.totalFolders,
        total_size_bytes: stats.totalSizeBytes,
        total_size_formatted: stats.totalSizeFormatted,
      });
    }

    // 2. Global Deep Search Query OR Directory Listing Query
    const isGlobalSearch = Boolean(searchQuery && searchQuery.trim());
    let q = `'${parentId}' in parents and trashed = false`;
    if (isGlobalSearch) {
      const cleanSearch = searchQuery!.trim().replace(/'/g, "\\'");
      // Global search across entire Google Drive (subfolders, files, anywhere in drive)
      q = `name contains '${cleanSearch}' and trashed = false`;
    }

    const fetchAll = searchParams.get('fetch_all') === 'true';
    const requestedPageSize = Number(searchParams.get('page_size')) || (fetchAll ? 1000 : 100);

    let allItems: any[] = [];
    let currentToken: string | null = pageToken && pageToken.trim() ? pageToken.trim() : null;
    let nextPageToken: string | null = null;
    let loopCount = 0;

    do {
      let driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,size,createdTime,modifiedTime,quotaBytesUsed,parents)&orderBy=folder,name&pageSize=${requestedPageSize}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      if (currentToken) {
        driveUrl += `&pageToken=${encodeURIComponent(currentToken)}`;
      }

      const driveRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!driveRes.ok) {
        const errJson = await driveRes.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errJson.error?.message || 'Failed to list Google Drive contents',
        }, { status: driveRes.status });
      }

      const driveData = await driveRes.json();
      const pageFiles = driveData.files || [];
      allItems = allItems.concat(pageFiles);
      nextPageToken = driveData.nextPageToken || null;
      currentToken = nextPageToken;
      loopCount++;

      // If fetchAll is requested, keep looping up to 10 pages
    } while (fetchAll && currentToken && loopCount < 10);

    const folders = allItems
      .filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
        sizeBytes: Number(f.quotaBytesUsed || f.size) || 0,
        parentId: f.parents?.[0] || null,
      }));

    const files = allItems
      .filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder')
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbnailLink: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+/, '=s400') : `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        previewUrl: `https://drive.google.com/file/d/${f.id}/preview`,
        sizeBytes: Number(f.size) || 0,
        createdTime: f.createdTime,
        parentId: f.parents?.[0] || null,
        isImage: Boolean(f.mimeType?.startsWith('image/')),
        isVideo: Boolean(f.mimeType?.startsWith('video/')),
        isAudio: Boolean(f.mimeType?.startsWith('audio/')),
      }));

    // If not root, fetch current parent folder metadata
    let currentFolder = { id: parentId, name: parentId === 'root' ? 'My Drive' : 'Folder' };
    if (parentId !== 'root' && !pageToken && !isGlobalSearch) {
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

    // 3. Compute Real Total Counts and Total Size Upfront
    let totalFilesCount = files.length;
    let totalFoldersCount = folders.length;
    let totalSizeBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    let totalSizeFormatted = formatBytes(totalSizeBytes);

    if (!isGlobalSearch) {
      // If there are more than 100 items (nextPageToken exists), calculate full stats for folder
      if (nextPageToken || pageToken) {
        const stats = await getFolderRealStats(accessToken, parentId, `${accountId}_${parentId}`);
        totalFilesCount = stats.totalFiles;
        totalFoldersCount = stats.totalFolders;
        totalSizeBytes = stats.totalSizeBytes;
        totalSizeFormatted = stats.totalSizeFormatted;
      }
    }

    return NextResponse.json({
      success: true,
      account_email: account.account_email,
      account_label: account.account_label,
      currentFolder,
      folders,
      files,
      nextPageToken,
      total_files_count: totalFilesCount,
      total_folders_count: totalFoldersCount,
      total_size_bytes: totalSizeBytes,
      total_size_formatted: totalSizeFormatted,
      is_search_result: isGlobalSearch,
      search_query: isGlobalSearch ? searchQuery!.trim() : undefined,
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
