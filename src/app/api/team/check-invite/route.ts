import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email || !email.includes('@')) {
      return NextResponse.json({ is_invited: false });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Call RPC or fallback query
    const { data: inviteData, error: rpcErr } = await supabaseAdmin.rpc('check_freelancer_invite_status', {
      p_email: cleanEmail,
    });

    if (!rpcErr && inviteData) {
      return NextResponse.json(inviteData);
    }

    // Direct query fallback
    const { data: tmList } = await supabaseAdmin
      .from('fw_team_members')
      .select('name, user_id')
      .ilike('email', cleanEmail);

    if (tmList && tmList.length > 0) {
      const memberName = tmList[0].name || 'Crew Member';
      return NextResponse.json({
        is_invited: true,
        member_name: memberName,
        studios: ['Studio Partner'],
      });
    }

    return NextResponse.json({ is_invited: false });
  } catch (err: any) {
    return NextResponse.json({ is_invited: false, error: err.message });
  }
}
