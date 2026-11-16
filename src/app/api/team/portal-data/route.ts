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
      const todayDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const { data: asgList } = await supabaseAdmin
        .from('fw_assignments')
        .select(`
          id,
          sub_event_id,
          project_id,
          role_name,
          required_role,
          role,
          agreed_amount,
          advance_amount,
          paid_amount,
          balance_amount,
          payment_status,
          status,
          notes,
          fw_sub_events (
            id,
            event_title,
            event_date,
            start_time_12h,
            end_time_12h,
            venue_name,
            status,
            fw_projects (
              id,
              user_id,
              workspace_id,
              client_name,
              main_venue,
              main_date,
              status
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

        const shootDate = se?.event_date || p?.main_date || '';
        const isPast = Boolean(shootDate && shootDate !== 'TBD' && shootDate < todayDateStr);
        const isCompleted = (a.status || se?.status || p?.status || '').toLowerCase() === 'completed' || isPast;
        const shootStatus = isCompleted ? 'COMPLETED' : (shootDate === todayDateStr ? 'TODAY' : 'UPCOMING');

        // Real assigned role from studio owner (required_role, role_name, or role)
        const realRole = a.required_role || a.role_name || a.role || (a as any).assigned_role || 'Crew Member';

        return {
          assignment_id: a.id,
          sub_event_id: se?.id || '',
          project_id: p?.id || a.project_id || '',
          workspace_id: p?.workspace_id || p?.user_id || '',
          project_owner_id: p?.user_id || '',
          studio_name: prof?.studio_name || prof?.meta?.company_name || 'Studio Partner',
          studio_logo: prof?.meta?.logo_url || null,
          client_name: p?.client_name || 'Wedding Client',
          couple_name: p?.client_name || 'Wedding Couple',
          event_name: se?.event_title || 'Main Shoot',
          event_date: shootDate,
          start_time: se?.start_time_12h || '',
          end_time: se?.end_time_12h || '',
          venue_location: se?.venue_name || p?.main_venue || '',
          role_name: realRole,
          agreed_amount: agreed,
          advance_amount: Number(a.advance_amount) || 0,
          paid_amount: paid,
          balance_amount: bal,
          payment_status: a.payment_status || (bal <= 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'),
          shoot_status: shootStatus,
          notes: a.notes || '',
        };
      });

      if (resolvedWsId) {
        shoots = shoots.filter((s: any) => 
          String(s.workspace_id) === String(resolvedWsId) || 
          String(s.project_owner_id) === String(resolvedWsId)
        );
      }
    } catch (shootErr) {
      console.warn('[portal-data] Shoots query note:', shootErr);
    }

    // 3. Fetch Post-Production Deliverables (High-Speed Targeted Queries with True Client Name)
    let deliverables: any[] = [];
    try {
      // First fetch only the projects & deliverables relevant to this workspace/member
      const [ppProjectsRes, rawDelivsRes] = await Promise.allSettled([
        (() => {
          let q = supabaseAdmin
            .from('post_production_projects')
            .select('id, workspace_id, user_id, client_id, client_name, couple_name, project_name, title, deliverables, editor_id, assigned_editor_id, assigned_to, is_deleted');
          if (resolvedWsId) {
            q = q.or(`workspace_id.eq.${resolvedWsId},user_id.eq.${resolvedWsId}`);
          } else {
            // Scope to known member workspaces to avoid full table scan
            const knownWsIds = Array.from(new Set([
              ...wmList.map((m: any) => m.workspace_id),
              ...ftmList.map((m: any) => m.workspace_id),
            ].filter(Boolean)));
            if (knownWsIds.length > 0) {
              q = q.in('workspace_id', knownWsIds);
            }
          }
          return q.neq('is_deleted', true).limit(100);
        })(),
        (() => {
          let q = supabaseAdmin
            .from('post_production_deliverables')
            .select('*');
          if (allMemberIds.length > 0) {
            q = q.or(`assigned_member_id.in.(${allMemberIds.join(',')}),user_id.in.(${allMemberIds.join(',')})`);
          }
          if (resolvedWsId) {
            q = q.or(`workspace_id.eq.${resolvedWsId},user_id.eq.${resolvedWsId}`);
          }
          return q.limit(100);
        })()
      ]);

      // Collect only the project/client IDs that are actually referenced
      const referencedProjIds = new Set<string>();
      if (ppProjectsRes.status === 'fulfilled' && ppProjectsRes.value.data) {
        ppProjectsRes.value.data.forEach((p: any) => {
          if (p.id) referencedProjIds.add(p.id);
          if (p.client_id) referencedProjIds.add(p.client_id);
        });
      }
      if (rawDelivsRes.status === 'fulfilled' && rawDelivsRes.value.data) {
        rawDelivsRes.value.data.forEach((d: any) => {
          if (d.project_id) referencedProjIds.add(d.project_id);
        });
      }

      // ⚡ Resolve True Client Names from fw_projects, workspace_clients, and leads
      const clientMap = new Map<string, string>();
      if (referencedProjIds.size > 0) {
        const idList = Array.from(referencedProjIds);
        const [fwMatch, clientsMatch, leadsMatch] = await Promise.all([
          supabaseAdmin.from('fw_projects').select('id, client_id, client_name').in('id', idList),
          supabaseAdmin.from('workspace_clients').select('id, name').in('id', idList),
          supabaseAdmin.from('leads').select('id, name, client_name, couple_names, raw_payload').in('id', idList)
        ]);

        if (fwMatch.data) {
          fwMatch.data.forEach((p: any) => {
            if (p.id && p.client_name) clientMap.set(p.id, p.client_name);
            if (p.client_id && p.client_name) clientMap.set(p.client_id, p.client_name);
          });
        }
        if (clientsMatch.data) {
          clientsMatch.data.forEach((c: any) => {
            if (c.id && c.name) clientMap.set(c.id, c.name);
          });
        }
        if (leadsMatch.data) {
          leadsMatch.data.forEach((l: any) => {
            const lName = l.raw_payload?.couple_name || l.couple_names || l.client_name || l.name;
            if (l.id && lName) clientMap.set(l.id, lName);
          });
        }
      }

      const delivMap = new Map<string, any>();
      const memberIdSet = new Set(allMemberIds);

      // A. Process deliverables JSON array from post_production_projects
      if (ppProjectsRes.status === 'fulfilled' && ppProjectsRes.value.data) {
        ppProjectsRes.value.data.forEach((proj: any) => {
          const clientName = clientMap.get(proj.client_id) || 
            clientMap.get(proj.id) || 
            proj.client_name || 
            proj.couple_name || 
            proj.project_name || 
            proj.title || 
            'Wedding Project';

          (proj.deliverables || []).forEach((d: any) => {
            const isAssigned = (d.assigned_member_id && memberIdSet.has(d.assigned_member_id)) ||
              (d.member_id && memberIdSet.has(d.member_id)) ||
              (d.partner_id && memberIdSet.has(d.partner_id)) ||
              (d.assigned_to && memberNames.some(name => d.assigned_to.toLowerCase().includes(name))) ||
              (d.assigned_member_name && memberNames.some(name => d.assigned_member_name.toLowerCase().includes(name))) ||
              (proj.editor_id && memberIdSet.has(proj.editor_id)) ||
              (proj.assigned_editor_id && memberIdSet.has(proj.assigned_editor_id)) ||
              (proj.assigned_to && memberNames.some(name => proj.assigned_to.toLowerCase().includes(name)));

            if (isAssigned) {
              const rawAgreed = Number(d.agreed_amount) || 0;
              const rawPaid = Number(d.paid_amount) || 0;
              const bal = Math.max(0, rawAgreed - rawPaid);
              const dId = d.id || `deliv_${proj.id}_${Math.random().toString(36).substring(2, 7)}`;

              delivMap.set(dId, {
                id: dId,
                deliverable_id: dId,
                project_id: proj.id,
                workspace_id: proj.workspace_id || proj.user_id,
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
            const clientName = clientMap.get(d.project_id) || d.client_name || 'Wedding Project';
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

    // 5. Fetch Today's Attendance & Personal Punch Link
    let todayAttendance: any = null;
    let attendanceDirectUrl: string | null = null;
    let attendanceToken: string | null = null;

    try {
      const todayDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const [attRecRes, attLinkRes] = await Promise.all([
        supabaseAdmin
          .from('attendance_records')
          .select('*')
          .in('member_id', allMemberIds)
          .eq('date', todayDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('attendance_member_links')
          .select('secure_token')
          .in('member_id', allMemberIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      let link = attLinkRes.data;

      // Auto-generate link if absent
      if (!link && allMemberIds.length > 0) {
        const primaryMemId = allMemberIds[0];
        const targetWs = resolvedWsId || wmList[0]?.workspace_id || ftmList[0]?.workspace_id || userId;
        const secureToken = `att_${primaryMemId.slice(0, 6)}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        try {
          const { data: newLink } = await supabaseAdmin
            .from('attendance_member_links')
            .insert([{
              user_id: targetWs,
              workspace_id: targetWs,
              member_id: primaryMemId,
              secure_token: secureToken,
              is_active: true,
            }])
            .select('secure_token')
            .maybeSingle();
          if (newLink) link = newLink;
        } catch (_) {}
      }

      if (link?.secure_token) {
        attendanceToken = link.secure_token;
        attendanceDirectUrl = `/attendance/${link.secure_token}`;
      }

      const rec = attRecRes.data;
      if (rec) {
        todayAttendance = {
          id: rec.id,
          date: rec.date,
          punch_in_time: rec.punch_in_time || rec.check_in_time || null,
          punch_out_time: rec.punch_out_time || rec.check_out_time || null,
          status: rec.status || 'present',
          punch_in_photo: rec.punch_in_photo || rec.photo_url || rec.selfie_url || rec.check_in_photo || null,
          punch_out_photo: rec.punch_out_photo || rec.check_out_photo || rec.check_out_selfie_url || null,
          duration_minutes: rec.duration_minutes || rec.work_duration_minutes || rec.total_work_minutes || null,
          location_address: rec.location_address || rec.location_name || rec.punch_in_address || null,
          punch_in_lat: rec.punch_in_lat || rec.check_in_lat || null,
          punch_in_lng: rec.punch_in_lng || rec.check_in_lng || null,
        };
      }
    } catch (attErr) {
      console.warn('[portal-data] Attendance query note:', attErr);
    }

    // 6. Construct Profile
    const matchingWsMember = resolvedWsId
      ? wmList.find((m: any) => String(m.workspace_id) === String(resolvedWsId)) ||
        ftmList.find((m: any) => String(m.workspace_id) === String(resolvedWsId) || String(m.user_id) === String(resolvedWsId))
      : null;
    const primaryWsMember = matchingWsMember || wmList[0] || ftmList[0] || null;

    const rawType = primaryWsMember?.primary_type || 
      (Array.isArray(primaryWsMember?.member_types) && primaryWsMember.member_types[0]) || 
      'FREELANCER';
    const isInHouse = Boolean(rawType && ['in_house', 'in-house', 'inhouse'].includes(String(rawType).toLowerCase()));
    const showAttendance = Boolean(isInHouse && (attendanceDirectUrl || todayAttendance));

    const memberProfile = {
      id: primaryWsMember?.id || allMemberIds[0] || userId,
      name: primaryWsMember?.name || activeUser.user_metadata?.full_name || 'Team Member',
      email: primaryWsMember?.email || cleanEmail,
      phone: primaryWsMember?.phone || primaryWsMember?.phone_number || activeUser.phone || '',
      primary_role: primaryWsMember?.primary_role || primaryWsMember?.role || (primaryWsMember as any)?.role_name || 'Crew',
      primary_type: rawType,
      isInHouse,
      showAttendance,
      default_daily_rate: Number(primaryWsMember?.default_daily_rate || 0),
      payout_frequency: primaryWsMember?.payout_frequency || 'daily',
    };

    return NextResponse.json({
      success: true,
      shoots,
      deliverables,
      salaries,
      memberProfile,
      todayAttendance,
      attendanceDirectUrl,
      attendanceToken
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
      }
    });
  } catch (err: any) {
    console.error('[API /team/portal-data] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
