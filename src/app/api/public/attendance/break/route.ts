import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, breakType } = body; // action: 'start' | 'end'

    if (!token || !token.trim()) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Resolve member link
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('attendance_member_links')
      .select('id, user_id, workspace_id, member_id, is_active')
      .eq('secure_token', token.trim())
      .maybeSingle();

    if (linkErr || !link || !link.is_active) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 2. Fetch today's record
    const { data: record } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('member_id', link.member_id)
      .eq('date', todayDate)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ error: 'Must check in before taking a break' }, { status: 400 });
    }

    const nowTime = new Date();

    if (action === 'start') {
      // Start a new break
      const { data: newBreak, error: bErr } = await supabaseAdmin
        .from('attendance_breaks')
        .insert([{
          attendance_record_id: record.id,
          user_id: link.user_id,
          workspace_id: link.workspace_id,
          member_id: link.member_id,
          break_start: nowTime.toISOString(),
          break_type: breakType || 'lunch'
        }])
        .select()
        .single();

      if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
      return NextResponse.json({ success: true, activeBreak: newBreak });
    } else {
      // End currently open break
      const { data: openBreak } = await supabaseAdmin
        .from('attendance_breaks')
        .select('*')
        .eq('attendance_record_id', record.id)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!openBreak) {
        return NextResponse.json({ error: 'No active break found to end' }, { status: 404 });
      }

      const bStart = new Date(openBreak.break_start).getTime();
      const bEnd = nowTime.getTime();
      const diffMin = Math.max(0, Math.round((bEnd - bStart) / 60000));

      const { data: closedBreak } = await supabaseAdmin
        .from('attendance_breaks')
        .update({
          break_end: nowTime.toISOString(),
          duration_minutes: diffMin
        })
        .eq('id', openBreak.id)
        .select()
        .single();

      return NextResponse.json({ success: true, closedBreak, durationMinutes: diffMin });
    }

  } catch (err: any) {
    console.error('Break error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
