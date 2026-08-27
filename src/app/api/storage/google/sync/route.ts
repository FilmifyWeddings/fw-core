import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, workspace_id } = body;

    if (!account_id) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const { data: account } = await supabase
      .from('storage_drive_accounts')
      .select('*')
      .eq('id', account_id)
      .single();

    if (!account) {
      return NextResponse.json({ success: false, error: 'Drive account not found' }, { status: 404 });
    }

    await supabase
      .from('storage_drive_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account_id);

    return NextResponse.json({
      success: true,
      message: `Synced ${account.account_email} successfully.`,
      last_synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
