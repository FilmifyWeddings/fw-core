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
