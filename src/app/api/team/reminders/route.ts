import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    let query = supabaseAdmin
      .from('post_production_reminders')
      .select('*')
      .neq('status', 'completed')
      .order('reminder_at', { ascending: true });

    if (workspaceId) {
      query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[team/reminders] fetch error:', error);
      return NextResponse.json({ success: false, reminders: [] });
    }

    return NextResponse.json({ success: true, reminders: data || [] });
  } catch (err: any) {
    console.error('[team/reminders] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reminderId, status = 'completed' } = body;

    if (!reminderId) {
      return NextResponse.json({ success: false, error: 'reminderId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('post_production_reminders')
      .update({
        status: status,
      })
      .eq('id', reminderId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[team/reminders] update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reminder: data });
  } catch (err: any) {
    console.error('[team/reminders] PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
