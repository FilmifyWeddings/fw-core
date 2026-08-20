import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, leave_type, start_date, end_date, reason } = body;

    if (!token || !start_date || !end_date || !reason) {
      return NextResponse.json({ error: 'Missing required leave fields' }, { status: 400 });
    }

    // 1. Resolve token
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('attendance_member_links')
      .select('id, user_id, workspace_id, member_id, is_active')
      .eq('secure_token', token.trim())
      .maybeSingle();

    if (linkErr || !link || !link.is_active) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    // 2. Insert leave request
    const payload = {
      user_id: link.user_id,
      workspace_id: link.workspace_id,
      member_id: link.member_id,
      leave_type: leave_type || 'casual',
      start_date,
      end_date,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('attendance_leave_requests')
      .insert([payload])
      .select('id')
      .single();

    if (insertErr) {
      console.error('Leave insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leaveId: inserted?.id,
      message: 'Leave application submitted successfully for review'
    });
  } catch (err: any) {
    console.error('Attendance leave API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
