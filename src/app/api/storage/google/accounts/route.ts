import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let query = supabaseAdmin
      .from('storage_drive_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.or(`workspace_id.eq.${workspaceId},workspace_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    let { data, error } = await query;
    if (!data || data.length === 0) {
      const fallback = await supabaseAdmin
        .from('storage_drive_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (fallback.data && fallback.data.length > 0) {
        data = fallback.data;
      }
    }

    if (error && (!data || data.length === 0)) {
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

    const effectiveWs = workspace_id || '00000000-0000-0000-0000-000000000000';
    const totalBytes = (total_storage_gb || 2000) * 1024 * 1024 * 1024;
    const usedBytes = (used_storage_gb || 0) * 1024 * 1024 * 1024;

    const driveAccountPayload = {
      workspace_id: effectiveWs,
      account_email: account_email.trim(),
      account_label: account_label || 'Wedding Deliverables Drive',
      total_storage_bytes: totalBytes,
      used_storage_bytes: usedBytes,
      last_synced_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

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

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }

    await supabaseAdmin.from('storage_drive_accounts').delete().eq('id', accountId);
    await supabaseAdmin.from('storage_indexed_items').delete().eq('drive_account_id', accountId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
