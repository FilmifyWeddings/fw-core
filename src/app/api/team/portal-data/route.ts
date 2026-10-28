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

    let activeUser: any = null;
    const { data: { user } } = await supabase.auth.getUser();
    activeUser = user;

    if (!activeUser) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const { data: jwtUser } = await supabaseAdmin.auth.getUser(token);
        if (jwtUser?.user) {
          activeUser = jwtUser.user;
        }
      }
    }

    if (!activeUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = activeUser.id;
    const cleanEmail = (activeUser.email || '').trim().toLowerCase();
    const rawTargetWs = req.nextUrl.searchParams.get('workspace_id') || req.nextUrl.searchParams.get('studio') || null;

    // Resolve studio slug to UUID if needed
    let resolvedWsId: string | null = null;
    if (rawTargetWs && rawTargetWs !== 'all') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTargetWs);
      if (isUuid) {
        resolvedWsId = rawTargetWs;
      } else {
        try {
          const { data: wsRow } = await supabaseAdmin
            .from('workspaces')
            .select('id, owner_id')
            .or(`studio_slug.eq.${rawTargetWs},id.eq.${rawTargetWs}`)
            .limit(1)
            .maybeSingle();

          if (wsRow?.id || wsRow?.owner_id) {
            resolvedWsId = wsRow.id || wsRow.owner_id;
          } else {
            const { data: profRow } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('studio_slug', rawTargetWs)
              .limit(1)
              .maybeSingle();
            if (profRow?.id) {
              resolvedWsId = profRow.id;
            }
          }
        } catch (_) {}
      }
    }

    // 1. Resolve all member IDs across workspace_members and fw_team_members
    const [wmRes, ftmRes] = await Promise.all([
      supabaseAdmin
        .from('workspace_members')
        .select('id, workspace_id, role, primary_role, name, email, phone, primary_type, member_types, default_daily_rate, payout_frequency')
        .or(`user_id.eq.${userId},email.ilike.${cleanEmail}`),
      supabaseAdmin
        .from('fw_team_members')
        .select('id, user_id, workspace_id, role_name, primary_role, name, email, phone_number, primary_type, member_types, default_daily_rate, payout_frequency')
        .or(`user_id.eq.${userId},auth_user_id.eq.${userId},email.ilike.${cleanEmail}`)
    ]);

    const wmList = wmRes.data || [];
    const ftmList = ftmRes.data || [];

    const allMemberIds = Array.from(new Set([
      userId,
      ...wmList.map((m: any) => m.id),
      ...ftmList.map((m: any) => m.id),
    ].filter(Boolean)));

    const memberNames = Array.from(new Set([
      activeUser.user_metadata?.full_name,
      ...wmList.map((m: any) => m.name),
      ...ftmList.map((m: any) => m.name),
    ].filter(Boolean).map((n: string) => n.trim().toLowerCase())));

    // 2. Fetch Assigned Shoots (using existing verified logic)
    let shoots: any[] = [];
    try {
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
            venue_name,
            fw_projects (
              id,
              user_id,
              client_name,
              main_venue,
              main_date
            )
          )
        `)
        .in('assigned_member_id', allMemberIds);

      const ownerIds = Array.from(new Set(
        (asgList || [])
          .map((a: any) => a.fw_sub_events?.fw_projects?.user_id)
          .filter(Boolean)
      ));

      const { data: profiles } = ownerIds.length > 0
        ? await supabaseAdmin
            .from('profiles')
            .select('id, studio_name, meta')
            .in('id', ownerIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      shoots = (asgList || []).map((a: any) => {
        const se = a.fw_sub_events;
        const p = se?.fw_projects;
        const prof = p?.user_id ? profileMap.get(p.user_id) : null;
        const agreed = Number(a.agreed_amount) || 0;
        const paid = Number(a.paid_amount ?? a.advance_amount) || 0;
        const bal = Number(a.balance_amount) != null ? Number(a.balance_amount) : Math.max(0, agreed - paid);

        return {
          assignment_id: a.id,
          sub_event_id: se?.id || '',
          project_id: p?.id || a.project_id || '',
          workspace_id: p?.user_id || '',
          studio_name: prof?.studio_name || prof?.meta?.company_name || 'Studio Partner',
          studio_logo: prof?.meta?.logo_url || null,
          client_name: p?.client_name || 'Wedding Client',
          couple_name: p?.client_name || 'Wedding Couple',
          event_name: se?.event_title || 'Main Shoot',
          event_date: se?.event_date || p?.main_date || '',
          start_time: se?.start_time_12h || '',
          end_time: se?.end_time_12h || '',
          venue_location: se?.venue_name || p?.main_venue || '',
          role_name: a.role_name || 'Crew Member',
          agreed_amount: agreed,
          advance_amount: Number(a.advance_amount) || 0,
          paid_amount: paid,
          balance_amount: bal,
          payment_status: a.payment_status || (bal <= 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'),
          notes: a.notes || '',
        };
      });

      if (resolvedWsId) {
        shoots = shoots.filter((s: any) => String(s.workspace_id) === String(resolvedWsId));
      }
    } catch (shootErr) {
      console.warn('[portal-data] Shoots query note:', shootErr);
    }

    // 3. Fetch Post-Production Deliverables
    let deliverables: any[] = [];
    try {
      const [ppProjectsRes, fwProjectsRes, rawDelivsRes] = await Promise.allSettled([
        (() => {
          let q = supabaseAdmin
            .from('post_production_projects')
            .select('id, workspace_id, client_id, deliverables, is_deleted');
          if (resolvedWsId) {
            q = q.eq('workspace_id', resolvedWsId);
          }
          return q.neq('is_deleted', true);
        })(),
        supabaseAdmin.from('fw_projects').select('id, client_id, client_name'),
        supabaseAdmin.from('post_production_deliverables').select('*').in('assigned_member_id', allMemberIds)
      ]);

      const clientMap = new Map<string, string>();
      if (fwProjectsRes.status === 'fulfilled' && fwProjectsRes.value.data) {
        fwProjectsRes.value.data.forEach((p: any) => {
          if (p.id && p.client_name) clientMap.set(p.id, p.client_name);
          if (p.client_id && p.client_name) clientMap.set(p.client_id, p.client_name);
        });
      }

      const delivMap = new Map<string, any>();
      const memberIdSet = new Set(allMemberIds);

      // A. Process deliverables JSON array from post_production_projects
      if (ppProjectsRes.status === 'fulfilled' && ppProjectsRes.value.data) {
        ppProjectsRes.value.data.forEach((proj: any) => {
          const clientName = clientMap.get(proj.client_id) || clientMap.get(proj.id) || (proj as any).client_name || 'Client Project';
          (proj.deliverables || []).forEach((d: any) => {
            const isAssigned = (d.assigned_member_id && memberIdSet.has(d.assigned_member_id)) ||
              (d.assigned_to && memberNames.some(name => d.assigned_to.toLowerCase().includes(name)));

            if (isAssigned) {
              const rawAgreed = Number(d.agreed_amount) || 0;
              const rawPaid = Number(d.paid_amount) || 0;
              const bal = Math.max(0, rawAgreed - rawPaid);
              const dId = d.id || `deliv_${proj.id}_${Math.random().toString(36).substring(2, 7)}`;

              delivMap.set(dId, {
                id: dId,
                deliverable_id: dId,
                project_id: proj.id,
                workspace_id: proj.workspace_id,
                client_name: clientName,
                member_id: d.assigned_member_id || allMemberIds[0],
                member_name: d.assigned_to || '',
                title: d.title || 'Post-Production Deliverable',
                segment: d.segment || 'Wedding',
                category: d.category || 'Post-Production',
                specs: d.specs || d.count || '',
                status: d.status || 'Upcoming',
                agreed_amount: rawAgreed,
                paid_amount: rawPaid,
                balance_amount: bal,
                payment_status: d.payment_status || (bal === 0 && rawAgreed > 0 ? 'PAID' : rawPaid > 0 ? 'PARTIAL' : 'PENDING'),
                due_date: d.due_date || d.deadline || '',
                notes: d.notes || '',
                drive_links: d.drive_links || [],
                source: 'project'
              });
            }
          });
        });
      }

      // B. Process direct rows from post_production_deliverables
      if (rawDelivsRes.status === 'fulfilled' && rawDelivsRes.value.data) {
        rawDelivsRes.value.data.forEach((d: any) => {
          if (!delivMap.has(d.id)) {
            const clientName = clientMap.get(d.project_id) || 'Client Project';
            const rawAgreed = Number(d.agreed_amount) || 0;
            const rawPaid = Number(d.paid_amount) || 0;
            const bal = Math.max(0, rawAgreed - rawPaid);

            delivMap.set(d.id, {
              id: d.id,
              deliverable_id: d.id,
              project_id: d.project_id,
              workspace_id: d.workspace_id || resolvedWsId || '',
              client_name: clientName,
              member_id: d.assigned_member_id,
              member_name: d.assigned_to || '',
              title: d.title || 'Deliverable',
              segment: d.segment || 'Wedding',
              category: d.category || 'Post-Production',
              specs: d.specs || '',
              status: d.status || 'Upcoming',
              agreed_amount: rawAgreed,
              paid_amount: rawPaid,
              balance_amount: bal,
              payment_status: d.payment_status || (bal === 0 && rawAgreed > 0 ? 'PAID' : rawPaid > 0 ? 'PARTIAL' : 'PENDING'),
              due_date: d.due_date || '',
              notes: d.notes || '',
              drive_links: d.drive_links || [],
              source: 'deliverable'
            });
          }
        });
      }

      deliverables = Array.from(delivMap.values());
    } catch (delivErr) {
      console.warn('[portal-data] Deliverables query note:', delivErr);
    }

    // 4. Fetch Salary Slips and Records
    let salaries: any[] = [];
    try {
      let slipsQuery = supabaseAdmin
        .from('team_salary_slips')
        .select('*')
        .in('member_id', allMemberIds)
        .order('created_at', { ascending: false });

      if (resolvedWsId) {
        slipsQuery = slipsQuery.eq('user_id', resolvedWsId);
      }

      const { data: slips } = await slipsQuery;

      if (slips && slips.length > 0) {
        salaries = slips;
      } else {
        let recsQuery = supabaseAdmin
          .from('team_salary_records')
          .select('*')
          .in('member_id', allMemberIds)
          .order('month_year', { ascending: false });

        if (resolvedWsId) {
          recsQuery = recsQuery.eq('workspace_id', resolvedWsId);
        }

        const { data: recs } = await recsQuery;
        if (recs) salaries = recs;
      }
    } catch (salErr) {
      console.warn('[portal-data] Salaries query note:', salErr);
    }

    // 5. Construct Profile
    const primaryWsMember = wmList[0] || ftmList[0] || null;
    const memberProfile = {
      id: primaryWsMember?.id || allMemberIds[0] || userId,
      name: primaryWsMember?.name || activeUser.user_metadata?.full_name || 'Team Member',
      email: primaryWsMember?.email || cleanEmail,
      phone: primaryWsMember?.phone || primaryWsMember?.phone_number || activeUser.phone || '',
      primary_role: primaryWsMember?.primary_role || primaryWsMember?.role || 'Crew',
      primary_type: primaryWsMember?.primary_type || 'IN_HOUSE',
      default_daily_rate: Number(primaryWsMember?.default_daily_rate || 0),
      payout_frequency: primaryWsMember?.payout_frequency || 'daily',
    };

    return NextResponse.json({
      success: true,
      shoots,
      deliverables,
      salaries,
      memberProfile
    });
  } catch (err: any) {
    console.error('[API /team/portal-data] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
