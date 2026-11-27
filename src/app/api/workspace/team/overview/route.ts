import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { getSwrCached } from '@/lib/server-swr-cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/team/overview?workspace_id=...
 * Ultra-fast server-aggregated Team & Partners directory + Crew Payment Overview.
 * Replaces 6+ sequential client Supabase queries with 1 single <1ms SWR-cached payload.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');
    const bypass = searchParams.get('fresh') === '1';

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    const { data: payload, cacheStatus } = await getSwrCached(
      `team_overview_v2_${effectiveWsId}`,
      effectiveWsId,
      async () => {
        // 1. Fetch members, rates, permissions, and security settings in parallel
        const [wsMembersRes, fwMembersRes, ratesRes, permsRes, finSettingsRes] = await Promise.all([
          supabaseAdmin
            .from('workspace_members')
            .select('id, workspace_id, user_id, role, email, phone, name, avatar_url, primary_role, roles, status, member_types, primary_type, default_daily_rate, default_currency, payout_frequency, auth_user_id, created_at')
            .eq('workspace_id', effectiveWsId)
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('fw_team_members')
            .select('id, user_id, name, primary_role, roles, phone_number, country_code, email, avatar_url, is_active, daily_rate, monthly_salary, default_daily_rate, default_currency, payout_frequency, member_types, primary_type, auth_user_id, created_at')
            .eq('user_id', effectiveWsId),
          supabaseAdmin
            .from('workspace_team_member_rates')
            .select('team_member_id, default_daily_rate, payout_frequency')
            .eq('workspace_id', effectiveWsId),
          supabaseAdmin
            .from('studio_member_permissions')
            .select('*')
            .eq('owner_id', effectiveWsId),
          supabaseAdmin
            .from('workspace_finance_settings')
            .select('id, custom_data')
            .or(`user_id.eq.${effectiveWsId},workspace_id.eq.${effectiveWsId}`)
            .limit(1)
            .maybeSingle(),
        ]);

        const rateMap: Record<string, { rate: number; frequency: string }> = {};
        for (const r of ratesRes.data || []) {
          if (r.team_member_id) {
            rateMap[r.team_member_id] = {
              rate: Number(r.default_daily_rate || 0),
              frequency: r.payout_frequency || 'daily',
            };
          }
        }

        const permMap = new Map<string, any>();
        for (const p of permsRes.data || []) {
          if (p.member_id) permMap.set(p.member_id, p);
        }

        const combinedMembers: any[] = [];
        for (const m of wsMembersRes.data || []) {
          const r = rateMap[m.id];
          combinedMembers.push({
            id: m.id,
            name: m.name || 'Team Member',
            email: m.email || '',
            phone: m.phone || '',
            primary_role: m.primary_role || 'FREELANCER',
            roles: Array.isArray(m.roles) && m.roles.length > 0 ? m.roles : [m.primary_role || 'FREELANCER'],
            member_types: Array.isArray(m.member_types) && m.member_types.length > 0 ? m.member_types : [m.primary_type || 'IN_HOUSE'],
            primary_type: m.primary_type || 'IN_HOUSE',
            avatar_url: m.avatar_url || '',
            status: m.status || 'ACTIVE',
            default_daily_rate: r ? r.rate : Number(m.default_daily_rate || 0),
            payout_frequency: r?.frequency || m.payout_frequency || 'daily',
            default_currency: m.default_currency || 'INR',
            permissions: permMap.get(m.id) || undefined,
          });
        }

        for (const f of fwMembersRes.data || []) {
          const matched = combinedMembers.find(
            (c) =>
              c.id === f.id ||
              (f.email && c.email && c.email.trim().toLowerCase() === f.email.trim().toLowerCase()) ||
              (f.name && c.name && c.name.trim().toLowerCase() === f.name.trim().toLowerCase())
          );
          const r = rateMap[f.id];
          const fRate = r ? r.rate : Number(f.default_daily_rate || f.daily_rate || f.monthly_salary || 0);
          const fFreq = r?.frequency || f.payout_frequency || 'daily';
          if (matched) {
            if ((!matched.default_daily_rate || matched.default_daily_rate === 0) && fRate > 0) {
              matched.default_daily_rate = fRate;
            }
            if (fFreq === 'monthly') matched.payout_frequency = 'monthly';
            if (!matched.phone && f.phone_number) {
              matched.phone = `${f.country_code || '+91'} ${f.phone_number}`;
            }
          } else {
            combinedMembers.push({
              id: f.id,
              name: f.name || 'Team Member',
              email: f.email || '',
              phone: f.phone_number ? `${f.country_code || '+91'} ${f.phone_number}` : '',
              primary_role: f.primary_role || 'Crew',
              roles: Array.isArray(f.roles) && f.roles.length > 0 ? f.roles : [f.primary_role || 'Crew'],
              member_types: Array.isArray(f.member_types) && f.member_types.length > 0 ? f.member_types : [f.primary_type || 'IN_HOUSE'],
              primary_type: f.primary_type || 'IN_HOUSE',
              avatar_url: f.avatar_url || '',
              status: 'ACTIVE',
              default_daily_rate: fRate,
              payout_frequency: fFreq,
              default_currency: f.default_currency || 'INR',
              permissions: permMap.get(f.id) || undefined,
            });
          }
        }

        const uniqueIds = Array.from(new Set(combinedMembers.map((m) => m.id).filter(Boolean)));
        const summaryMap: Record<string, any> = {};
        const records: any[] = [];
        const nameToIdMap = new Map<string, string>();
        const memberNameById = new Map<string, string>();

        for (const m of combinedMembers) {
          summaryMap[m.id] = {
            member_id: m.id,
            total_agreed: 0,
            total_paid: 0,
            total_balance: 0,
            active_events_count: 0,
            paid_events_count: 0,
            pending_events_count: 0,
          };
          if (m.name) {
            nameToIdMap.set(m.name.trim().toLowerCase(), m.id);
            memberNameById.set(m.id, m.name);
          }
        }

        if (uniqueIds.length > 0) {
          // 2. Fetch all financial records in parallel using supabaseAdmin
          const [assignRes, payoutRes, salRes, slipRes, ppRes, partnerRes] = await Promise.allSettled([
            supabaseAdmin
              .from('fw_assignments')
              .select('id, project_id, sub_event_id, assigned_member_id, assigned_member_name, agreed_amount, advance_amount, paid_amount, balance_amount, payment_status, sub_event_date, sub_event_name, created_at, updated_at')
              .eq('user_id', effectiveWsId),
            supabaseAdmin
              .from('team_event_payouts')
              .select('id, member_id, member_name, agreed_amount, paid_amount, balance_amount, status, event_date, payment_date, sub_event_id, notes, created_at, updated_at')
              .eq('user_id', effectiveWsId),
            supabaseAdmin
              .from('team_salary_records')
              .select('id, member_id, member_name, net_payable, paid_amount, payment_status, month_year, paid_date, created_at')
              .eq('workspace_id', effectiveWsId),
            supabaseAdmin
              .from('team_salary_slips')
              .select('id, member_id, month_year, payout_date, net_paid, status, created_at')
              .eq('user_id', effectiveWsId),
            supabaseAdmin
              .from('post_production_projects')
              .select('id, workspace_id, client_id, deliverables, is_deleted, created_at')
              .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`)
              .neq('is_deleted', true),
            supabaseAdmin
              .from('partner_album_orders')
              .select('id, partner_id, client_name, total_amount, paid_amount, order_date, created_at')
              .in('partner_id', uniqueIds),
          ]);

          const assignments = assignRes.status === 'fulfilled' && assignRes.value.data ? assignRes.value.data : [];
          const payouts = payoutRes.status === 'fulfilled' && payoutRes.value.data ? payoutRes.value.data : [];
          const salaries = salRes.status === 'fulfilled' && salRes.value.data ? salRes.value.data : [];
          const slips = slipRes.status === 'fulfilled' && slipRes.value.data ? slipRes.value.data : [];
          const ppList = ppRes.status === 'fulfilled' && ppRes.value.data ? ppRes.value.data : [];
          const partnerOrders = partnerRes.status === 'fulfilled' && partnerRes.value.data ? partnerRes.value.data : [];

          const seenSubByMember = new Map<string, Set<string>>();
          const resolveMid = (id?: string | null, name?: string | null) => {
            if (id && summaryMap[id]) return id;
            if (name) {
              const m = nameToIdMap.get(name.trim().toLowerCase());
              if (m && summaryMap[m]) return m;
            }
            return null;
          };

          // Index payouts by (member_id + sub_event_id) to prefer accurate payment_date/paid_amount
          const payoutBySub = new Map<string, any>();
          for (const p of payouts) {
            const mid = resolveMid(p.member_id, p.member_name);
            if (!mid) continue;
            if (p.sub_event_id) {
              payoutBySub.set(`${mid}_${p.sub_event_id}`, p);
            }
          }

          for (const row of assignments) {
            const mid = resolveMid(row.assigned_member_id, row.assigned_member_name);
            if (!mid) continue;
            if (row.sub_event_id) {
              if (!seenSubByMember.has(mid)) seenSubByMember.set(mid, new Set());
              if (seenSubByMember.get(mid)!.has(row.sub_event_id)) continue;
              seenSubByMember.get(mid)!.add(row.sub_event_id);
            }
            const linkedPayout = row.sub_event_id ? payoutBySub.get(`${mid}_${row.sub_event_id}`) : null;
            const agreed = Math.max(Number(row.agreed_amount) || 0, Number(linkedPayout?.agreed_amount) || 0);
            const paid = Math.max(
              Number(row.paid_amount ?? row.advance_amount) || 0,
              Number(linkedPayout?.paid_amount) || 0
            );
            const bal = Math.max(0, agreed - paid);
            const evDate = String(row.sub_event_date || linkedPayout?.event_date || row.created_at || '').split('T')[0];
            const payDate = String(linkedPayout?.payment_date || (paid > 0 ? (linkedPayout?.updated_at || row.updated_at || evDate) : '')).split('T')[0];

            summaryMap[mid].total_agreed += agreed;
            summaryMap[mid].total_paid += paid;
            summaryMap[mid].total_balance += bal;
            summaryMap[mid].active_events_count += 1;
            if (bal <= 0 && agreed > 0) summaryMap[mid].paid_events_count += 1;
            else if (bal > 0) summaryMap[mid].pending_events_count += 1;

            records.push({
              id: row.id,
              member_id: mid,
              member_name: memberNameById.get(mid) || row.assigned_member_name || 'Crew',
              title: row.sub_event_name || 'Shoot Assignment',
              date: evDate,
              payment_date: payDate,
              agreed_amount: agreed,
              paid_amount: paid,
              balance_amount: bal,
              source: 'assignment',
              tranches: Array.isArray(linkedPayout?.tranches) ? linkedPayout.tranches : [],
            });
          }

          for (const p of payouts) {
            const mid = resolveMid(p.member_id, p.member_name);
            if (!mid) continue;
            if (p.sub_event_id && seenSubByMember.get(mid)?.has(p.sub_event_id)) continue;
            const agreed = Number(p.agreed_amount) || 0;
            const paid = Number(p.paid_amount) || 0;
            const bal = Math.max(0, agreed - paid);
            const evDate = String(p.event_date || p.created_at || '').split('T')[0];
            const payDate = String(p.payment_date || (paid > 0 ? (p.updated_at || evDate) : '')).split('T')[0];

            summaryMap[mid].total_agreed += agreed;
            summaryMap[mid].total_paid += paid;
            summaryMap[mid].total_balance += bal;
            summaryMap[mid].active_events_count += 1;
            if (bal <= 0 && agreed > 0) summaryMap[mid].paid_events_count += 1;
            else if (bal > 0) summaryMap[mid].pending_events_count += 1;

            records.push({
              id: p.id,
              member_id: mid,
              member_name: memberNameById.get(mid) || p.member_name || 'Crew',
              title: p.notes || 'Event Payout',
              date: evDate,
              payment_date: payDate,
              agreed_amount: agreed,
              paid_amount: paid,
              balance_amount: bal,
              source: 'payout',
              tranches: Array.isArray(p.tranches) ? p.tranches : [],
            });
          }

          const seenSalMonths = new Set<string>();
          for (const s of salaries) {
            const mid = resolveMid(s.member_id, s.member_name);
            if (!mid) continue;
            if (s.month_year) seenSalMonths.add(`${mid}_${s.month_year}`);
            const agreed = Number(s.net_payable) || 0;
            const paid = Number(s.paid_amount) || 0;
            const bal = Math.max(0, agreed - paid);
            const dStr = String(s.paid_date || (s.month_year ? `${s.month_year}-01` : s.created_at) || '').split('T')[0];

            summaryMap[mid].total_agreed += agreed;
            summaryMap[mid].total_paid += paid;
            summaryMap[mid].total_balance += bal;

            records.push({
              id: s.id,
              member_id: mid,
              member_name: memberNameById.get(mid) || s.member_name || 'Staff',
              title: `Salary (${s.month_year || 'Monthly'})`,
              date: dStr,
              payment_date: paid > 0 ? dStr : '',
              agreed_amount: agreed,
              paid_amount: paid,
              balance_amount: bal,
              source: 'salary',
            });
          }

          for (const sl of slips) {
            const mid = resolveMid(sl.member_id, null);
            if (!mid) continue;
            if (sl.month_year && seenSalMonths.has(`${mid}_${sl.month_year}`)) continue;
            const paid = Number(sl.net_paid) || 0;
            const dStr = String(sl.payout_date || (sl.month_year ? `${sl.month_year}-01` : sl.created_at) || '').split('T')[0];

            summaryMap[mid].total_agreed += paid;
            summaryMap[mid].total_paid += paid;

            records.push({
              id: sl.id,
              member_id: mid,
              member_name: memberNameById.get(mid) || 'Staff',
              title: `Salary Slip (${sl.month_year || 'Monthly'})`,
              date: dStr,
              payment_date: paid > 0 ? dStr : '',
              agreed_amount: paid,
              paid_amount: paid,
              balance_amount: 0,
              source: 'salary_slip',
            });
          }

          for (const pp of ppList) {
            const delivs = Array.isArray(pp.deliverables) ? pp.deliverables : [];
            for (const d of delivs) {
              const mid = resolveMid(d.assigned_member_id || d.editor_id || d.partner_id, d.assigned_to || d.editor_name || d.partner_name);
              if (!mid) continue;
              const agreed = Number(d.agreed_amount || d.cost || 0);
              const paid = Number(d.paid_amount || 0);
              if (agreed <= 0 && paid <= 0) continue;
              const bal = Math.max(0, agreed - paid);
              const dStr = String(d.paid_date || d.due_date || pp.created_at || '').split('T')[0];

              summaryMap[mid].total_agreed += agreed;
              summaryMap[mid].total_paid += paid;
              summaryMap[mid].total_balance += bal;

              records.push({
                id: `${pp.id}_${d.id || d.title}`,
                member_id: mid,
                member_name: memberNameById.get(mid) || 'Editor/Partner',
                title: `${d.client_name || 'Post-Prod'} — ${d.title || 'Deliverable'}`,
                date: dStr,
                payment_date: paid > 0 ? dStr : '',
                agreed_amount: agreed,
                paid_amount: paid,
                balance_amount: bal,
                source: 'post_production',
              });
            }
          }

          for (const po of partnerOrders) {
            const mid = resolveMid(po.partner_id, null);
            if (!mid) continue;
            const agreed = Number(po.total_amount) || 0;
            const paid = Number(po.paid_amount) || 0;
            const bal = Math.max(0, agreed - paid);
            const dStr = String(po.order_date || po.created_at || '').split('T')[0];

            summaryMap[mid].total_agreed += agreed;
            summaryMap[mid].total_paid += paid;
            summaryMap[mid].total_balance += bal;

            records.push({
              id: po.id,
              member_id: mid,
              member_name: memberNameById.get(mid) || 'Partner',
              title: `${po.client_name || 'Album'} Order`,
              date: dStr,
              payment_date: paid > 0 ? dStr : '',
              agreed_amount: agreed,
              paid_amount: paid,
              balance_amount: bal,
              source: 'partner_order',
            });
          }
        }

        const teamSec = (finSettingsRes.data?.custom_data as any)?.team_security || {};
        const hiddenMemberIds: string[] = Array.isArray(teamSec.hidden_member_ids) ? teamSec.hidden_member_ids : [];
        const hasPin = Boolean(teamSec.pin_hash);

        return {
          success: true,
          workspace_id: effectiveWsId,
          members: combinedMembers,
          summaryMap,
          records,
          hiddenMemberIds,
          hasPin,
        };
      },
      { freshMs: 15_000, staleMs: 180_000, bypass }
    );

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': cacheStatus,
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=120',
      },
    });
  } catch (err: any) {
    console.error('[API /api/workspace/team/overview GET] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to load team overview' }, { status: 500 });
  }
}