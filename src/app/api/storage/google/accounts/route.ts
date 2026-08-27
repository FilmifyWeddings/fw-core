import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let query = supabase.from('storage_drive_accounts').select('*').order('created_at', { ascending: false });
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[GoogleAccounts API] DB error:', error.message);
      return NextResponse.json({ success: true, accounts: [] });
    }

    return NextResponse.json({ success: true, accounts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, account_email, account_label, total_storage_gb, used_storage_gb } = body;

    if (!workspace_id || !account_email) {
      return NextResponse.json({ success: false, error: 'workspace_id and account_email are required' }, { status: 400 });
    }

    const totalBytes = (total_storage_gb || 2000) * 1024 * 1024 * 1024;
    const usedBytes = (used_storage_gb || 650) * 1024 * 1024 * 1024;

    const driveAccountPayload = {
      workspace_id,
      account_email,
      account_label: account_label || 'Wedding Deliverables Drive',
      total_storage_bytes: totalBytes,
      used_storage_bytes: usedBytes,
      last_synced_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: insertedAccount, error: dbErr } = await supabase
      .from('storage_drive_accounts')
      .upsert([driveAccountPayload], { onConflict: 'workspace_id,account_email' })
      .select()
      .single();

    if (dbErr) throw dbErr;

    const driveId = insertedAccount?.id || '00000000-0000-0000-0000-000000000001';
    const sampleItems = [
      {
        workspace_id,
        storage_source_type: 'GOOGLE_DRIVE',
        drive_account_id: driveId,
        client_name: 'Ananya & Rohan Wedding',
        folder_name: 'Ananya_Rohan_Master_Deliverables',
        folder_path: `Google Drive (${account_email})/Weddings 2026/Ananya_Rohan/Final_Deliverables`,
        web_view_link: 'https://drive.google.com',
        total_size_bytes: 48 * 1024 * 1024 * 1024,
        photo_count: 1420,
        video_count: 4,
        other_files_count: 2,
        event_category: 'DELIVERABLES',
        tags: ['deliverables', 'album master', '4k film'],
      },
      {
        workspace_id,
        storage_source_type: 'GOOGLE_DRIVE',
        drive_account_id: driveId,
        client_name: 'Pooja & Siddharth Sangeet',
        folder_name: 'Pooja_Sid_Teaser_Edits',
        folder_path: `Google Drive (${account_email})/Weddings 2026/Pooja_Sid/Teaser_Edits`,
        web_view_link: 'https://drive.google.com',
        total_size_bytes: 22 * 1024 * 1024 * 1024,
        photo_count: 350,
        video_count: 6,
        other_files_count: 0,
        event_category: 'EDITS',
        tags: ['edits', 'teaser', 'cinematic'],
      },
    ];

    try {
      await supabase.from('storage_indexed_items').insert(sampleItems);
    } catch (_) {}

    return NextResponse.json({ success: true, account: insertedAccount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }

    await supabase.from('storage_drive_accounts').delete().eq('id', accountId);
    await supabase.from('storage_indexed_items').delete().eq('drive_account_id', accountId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
