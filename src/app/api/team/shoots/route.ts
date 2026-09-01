import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      // Fallback check authorization header
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const { data: jwtUser } = await supabaseAdmin.auth.getUser(token);
        if (jwtUser?.user) {
          return fetchShootsForUser(jwtUser.user.id, jwtUser.user.email || '');
        }
      }
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return fetchShootsForUser(user.id, user.email || '');
  } catch (err: any) {
    console.error('[API /team/shoots] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function fetchShootsForUser(userId: string, email: string) {
  try {
    const { data: shoots, error: rpcErr } = await supabaseAdmin.rpc('get_team_member_dashboard_shoots', {
      p_user_id: userId,
      p_email: email,
    });

    if (rpcErr) {
      console.warn('[API /team/shoots] RPC notice, falling back to direct query:', rpcErr.message);
      // Fallback direct query
      const { data: teamRecs } = await supabaseAdmin
        .from('fw_team_members')
        .select('id')
        .or(`auth_user_id.eq.${userId},email.ilike.${email}`);

      const memberIds = Array.from(new Set([userId, ...(teamRecs || []).map((t: any) => t.id)]));

      const { data: asgList } = await supabaseAdmin
        .from('fw_assignments')
        .select(`
          id,
          sub_event_id,
          project_id,
          role_name,
          agreed_amount,
          advance_amount,
          paid_amount,
          balance_amount,
          payment_status,
          notes,
          fw_sub_events (
            id,
            event_title,
            event_date,
            start_time_12h,
            end_time_12h,
            venue,
            location,
            fw_projects (
              id,
              user_id,
              client_name,
              couple_name,
              venue_location
            )
          )
        `)
        .in('assigned_member_id', memberIds);

      const mapped = (asgList || []).map((a: any) => {
        const se = a.fw_sub_events;
        const p = se?.fw_projects;
        return {
          assignment_id: a.id,
          sub_event_id: se?.id || '',
          project_id: p?.id || '',
          workspace_id: p?.user_id || '',
          studio_name: 'StudioCore Studio',
          client_name: p?.client_name || 'Client',
          couple_name: p?.couple_name || p?.client_name || 'Wedding Couple',
          event_name: se?.event_title || 'Wedding Event',
          event_date: se?.event_date || 'TBD',
          start_time: se?.start_time_12h || '09:00 AM',
          end_time: se?.end_time_12h || '06:00 PM',
          venue_location: se?.venue || se?.location || p?.venue_location || 'Venue TBA',
          role_name: a.role_name || 'Crew Member',
          agreed_amount: Number(a.agreed_amount) || 0,
          advance_amount: Number(a.advance_amount) || 0,
          paid_amount: Number(a.paid_amount) || 0,
          balance_amount: Number(a.balance_amount) || 0,
          payment_status: a.payment_status || 'pending',
          notes: a.notes || '',
        };
      });

      return NextResponse.json({ success: true, shoots: mapped });
    }

    return NextResponse.json({ success: true, shoots: shoots || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
