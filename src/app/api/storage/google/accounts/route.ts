import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isValidUUID = (val?: string | null) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!isValidUUID(workspaceId) || workspaceId === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: true, accounts: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('storage_drive_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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

    if (!account_email) {
      return NextResponse.json({ success: false, error: 'account_email is required' }, { status: 400 });
    }

    if (!isValidUUID(workspace_id) || workspace_id === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: false, error: 'A valid workspace_id is required' }, { status: 400 });
    }

    const totalBytes = Number(total_storage_gb || 2000) * 1024 * 1024 * 1024;
    const usedBytes = Number(used_storage_gb || 0) * 1024 * 1024 * 1024;

    const driveAccountPayload: any = {
      workspace_id,
      account_email: account_email.trim(),
      account_label: account_label || 'Wedding Deliverables Drive',
      total_storage_bytes: totalBytes,
      used_storage_bytes: usedBytes,
      last_synced_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (body.access_token) driveAccountPayload.access_token = body.access_token;
    if (body.refresh_token) driveAccountPayload.refresh_token = body.refresh_token;

    const { data: insertedAccount, error: dbErr } = await supabaseAdmin
      .from('storage_drive_accounts')
      .upsert([driveAccountPayload], { onConflict: 'workspace_id,account_email' })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({ success: true, account: insertedAccount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }

    let delQuery = supabaseAdmin.from('storage_drive_accounts').delete().eq('id', accountId);
    if (isValidUUID(workspaceId) && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      delQuery = delQuery.eq('workspace_id', workspaceId);
    }
    const { error: delErr } = await delQuery;
    if (delErr) throw delErr;

    await supabaseAdmin.from('storage_indexed_items').delete().eq('drive_account_id', accountId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
