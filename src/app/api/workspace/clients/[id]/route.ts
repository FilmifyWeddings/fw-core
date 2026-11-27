import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { parseQuotationDeliverables } from '@/lib/services/postProductionSyncService';
import { DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';
import { loadClientQuotationsFast, normalizeNameKey } from '@/lib/client-quotations-loader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/clients/[id]?workspace_id=...
 * Enterprise-grade single client workspace endpoint.
 * Bypasses client-side RLS blockers using supabaseAdmin with strict meta-auth verification.
 * Hydrates client details + quotation versions + fw_project/sub-events/assignments + post production
 * + finance + moodboards + tasks + team members + crew roles in one authenticated response.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientIdOrCode = resolvedParams?.id;
    if (!clientIdOrCode) {
      return NextResponse.json({ error: 'Missing client identifier' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    // 1. Fetch client by id or by notes client_code matching
    let foundClient: any = null;

    const { data: directClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientIdOrCode)
      .maybeSingle();

    if (directClient) {
      foundClient = directClient;
    } else {
      const { data: wsClients } = await supabaseAdmin
        .from('workspace_clients')
        .select('*')
        .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`);

      if (wsClients && wsClients.length > 0) {
        foundClient = wsClients.find((c: any) => {
          if (c.id === clientIdOrCode) return true;
          if (c.notes && typeof c.notes === 'string') {
            const match = c.notes.match(/\[code:([^\]]+)\]/i);
            if (match && match[1].toLowerCase() === clientIdOrCode.toLowerCase()) return true;
          }
          return false;
        });
      }
    }

    if (!foundClient) {
      return NextResponse.json({ error: 'Client record not found in workspace' }, { status: 404 });
    }

    // 2. Strict Workspace Scoping Guard
    const clientWsId = foundClient.workspace_id || foundClient.user_id || effectiveWsId;
    if (clientWsId && clientWsId !== effectiveWsId && auth.workspaceId !== clientWsId) {
      const crossAuth = await verifyMetaAuth(req, clientWsId);
      if (!crossAuth.authorized) {
        return NextResponse.json({ error: 'Access denied to this client record' }, { status: 403 });
      }
    }

    // 3. Build fw_projects matching OR filter using immediate client metadata
    const initialLeadId: string | null = foundClient.lead_id || null;
    const fwProjectOrParts = [`client_id.eq.${foundClient.id}`];
    if (initialLeadId && initialLeadId !== foundClient.id) {
      fwProjectOrParts.push(`lead_id.eq.${initialLeadId}`);
    }
    if (foundClient.name && String(foundClient.name).trim()) {
      const escapedName = String(foundClient.name).trim().replace(/[,%()]/g, ' ');
      if (escapedName) {
        fwProjectOrParts.push(`client_name.ilike.%${escapedName}%`);
      }
    }

    // 4. Parallel Fetch of Quotations + All Sub-Modules with supabaseAdmin
    const [
      quotationsBundle,
      postProdRes,
      financeRes,
      moodboardsRes,
      tasksRes,
      fwTeamMembersRes,
      wsMembersRes,
      wsRatesRes,
      fwProjectsRes,
      crewRolesRes,
    ] = await Promise.all([
      // A. Fast Quotation Loader (eliminates 300-row raw_payload scan & slims content_json)
      loadClientQuotationsFast(foundClient, clientWsId),

      // B. Post Production Project
      supabaseAdmin
        .from('post_production_projects')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // C. Client Finance Record
      supabaseAdmin
        .from('client_finance_records')
        .select('*')
        .eq('client_id', foundClient.id)
        .maybeSingle(),

      // D. Moodboards
      supabaseAdmin
        .from('client_moodboards')
        .select('*')
        .eq('client_id', foundClient.id)
        .order('created_at', { ascending: true }),

      // E. Tasks (Live fw_tasks scoped to client or linked lead)
      supabaseAdmin
        .from('fw_tasks')
        .select('*')
        .or(`client_id.eq.${foundClient.id}${initialLeadId ? `,client_id.eq.${initialLeadId}` : ''}`)
        .eq('is_trashed', false)
        .order('created_at', { ascending: false }),

      // F. Full Team Members (with avatars & rates matching Booking Events)
      supabaseAdmin
        .from('fw_team_members')
        .select('*')
        .or(`user_id.eq.${clientWsId},user_id.eq.${effectiveWsId}`)
        .order('name', { ascending: true }),

      // G. Workspace Members (joined users & avatars)
      supabaseAdmin
        .from('workspace_members')
        .select('*')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`),

      // H. Custom Team Member Rates
      supabaseAdmin
        .from('workspace_team_member_rates')
        .select('team_member_id, daily_rate')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`),

      // I. Bookings Events Project + Sub-Events + Assignments
      supabaseAdmin
        .from('fw_projects')
        .select(`
          *,
          fw_sub_events (
            *,
            fw_assignments (*)
          )
        `)
        .or(fwProjectOrParts.join(','))
        .neq('status', 'trash')
        .order('created_at', { ascending: false }),

      // J. Workspace Crew Roles (short codes for crew badges)
      supabaseAdmin
        .from('master_crew_roles')
        .select('*')
        .or(`workspace_id.eq.${clientWsId},workspace_id.eq.${effectiveWsId}`)
        .order('created_at', { ascending: true }),
    ]);

    const { quotationDocs, resolvedLeadId, resolvedLeadRow } = quotationsBundle;

    // 6. Hydrate Post Production Project
    let resolvedPostProdProject: any = postProdRes.data || null;
    const projectTargetIds = [
      foundClient.id,
      resolvedLeadId,
      resolvedPostProdProject?.id,
      resolvedPostProdProject?.project_id,
    ].filter(Boolean);

    let resolvedDeliverables: any[] = Array.isArray(resolvedPostProdProject?.deliverables)
      ? resolvedPostProdProject.deliverables
      : [];
    if (projectTargetIds.length > 0) {
      const { data: delivRows } = await supabaseAdmin
        .from('post_production_deliverables')
        .select('*')
        .in('project_id', projectTargetIds)
        .order('created_at', { ascending: true });
      if (delivRows && delivRows.length > 0) {
        resolvedDeliverables = delivRows;
      }
    }

    let enabledSegments: string[] = ['Wedding'];
    if (projectTargetIds.length > 0) {
      const { data: cfg } = await supabaseAdmin
        .from('post_production_project_config')
        .select('enabled_segments')
        .in('project_id', projectTargetIds)
        .maybeSingle();
      if (cfg?.enabled_segments && Array.isArray(cfg.enabled_segments)) {
        enabledSegments = cfg.enabled_segments;
      }
    }

    const finalQuoteDoc =
      quotationDocs.find((q: any) => q.is_final === true || q.content_json?.is_final === true) || quotationDocs[0];
    if (resolvedDeliverables.length === 0 && finalQuoteDoc) {
      try {
        const parsed = parseQuotationDeliverables(finalQuoteDoc);
        if (parsed?.deliverables?.length > 0) {
          resolvedDeliverables = parsed.deliverables;
          if (parsed.enabledSegments?.length > 0) {
            enabledSegments = parsed.enabledSegments;
          }
        }
      } catch (_) {}
    }

    if (resolvedPostProdProject || resolvedDeliverables.length > 0) {
      resolvedPostProdProject = {
        ...(resolvedPostProdProject || {}),
        id: resolvedPostProdProject?.id || `pp_${foundClient.id}`,
        client_id: foundClient.id,
        workspace_id: foundClient.workspace_id,
        deliverables: resolvedDeliverables,
        enabled_segments: enabledSegments,
      };
    }

    // 7. Merge Team Members + Workspace Members + Rates cleanly (matching team-manager/page.tsx)
    const ratesMap = new Map<string, number>();
    (wsRatesRes.data || []).forEach((r: any) => {
      if (r?.team_member_id) ratesMap.set(r.team_member_id, Number(r.daily_rate) || 0);
    });

    const cleanNormName = (str?: string | null) =>
      String(str || '')
        .replace(/\s*\([^)]*\)/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const combinedMembersMap = new Map<string, any>();
    (wsMembersRes.data || []).forEach((m: any) => {
      if (m.status === 'REVOKED' || m.status === 'INACTIVE') return;
      const calcRate = ratesMap.has(m.id)
        ? ratesMap.get(m.id)!
        : Number(m.default_daily_rate) || Number(m.daily_rate) || 0;

      const normMName = cleanNormName(m.name);
      const mEmailNorm = m.email ? String(m.email).trim().toLowerCase() : '';
      const existingEntry = Array.from(combinedMembersMap.values()).find((cm: any) => {
        const normCmName = cleanNormName(cm.name);
        return (
          (mEmailNorm && cm.email && String(cm.email).trim().toLowerCase() === mEmailNorm) ||
          (normMName && normCmName && normMName === normCmName)
        );
      });

      if (existingEntry) {
        if (!existingEntry.avatar_url && m.avatar_url) existingEntry.avatar_url = m.avatar_url;
        if (!existingEntry.phone && m.phone) {
          existingEntry.phone = m.phone;
          existingEntry.phone_number = m.phone;
        }
        if (m.role === 'owner' && existingEntry.role !== 'owner') {
          existingEntry.role = 'owner';
          existingEntry.primary_role = 'Studio Owner';
        }
        return;
      }

      const mapped = {
        id: m.id,
        user_id: m.workspace_id || clientWsId,
        auth_user_id: m.auth_user_id || m.user_id || null,
        name: m.name || 'Team Member',
        email: m.email || '',
        phone: m.phone || '',
        phone_number: m.phone || '',
        country_code: m.country_code || '+91',
        role: m.primary_role || m.role || 'Crew',
        primary_role: m.primary_role || m.role || 'Crew',
        roles: Array.isArray(m.roles) ? m.roles : [m.primary_role || m.role || 'Crew'],
        avatar_url: m.avatar_url || '',
        primary_type: m.primary_type || 'IN_HOUSE',
        member_types:
          Array.isArray(m.member_types) && m.member_types.length > 0
            ? m.member_types
            : [m.primary_type || 'IN_HOUSE'],
        default_daily_rate: calcRate,
        default_currency: m.default_currency || 'INR',
        is_active: m.status === 'ACTIVE' || m.status === undefined,
      };
      combinedMembersMap.set(String(m.id), mapped);
    });

    (fwTeamMembersRes.data || []).forEach((f: any) => {
      const calcRate = ratesMap.has(f.id) ? ratesMap.get(f.id)! : Number(f.default_daily_rate) || 0;
      const normFName = cleanNormName(f.name);
      const fEmailNorm = f.email ? String(f.email).trim().toLowerCase() : '';

      const existingEntry =
        combinedMembersMap.get(String(f.id)) ||
        Array.from(combinedMembersMap.values()).find(
          (cm) => {
            const normCmName = cleanNormName(cm.name);
            return (
              (fEmailNorm && cm.email && String(cm.email).trim().toLowerCase() === fEmailNorm) ||
              (normFName && normCmName && normFName === normCmName)
            );
          }
        );

      if (existingEntry) {
        if (!existingEntry.avatar_url && f.avatar_url) existingEntry.avatar_url = f.avatar_url;
        if (!existingEntry.default_daily_rate && calcRate > 0) existingEntry.default_daily_rate = calcRate;
        if (!existingEntry.phone_number && f.phone_number) {
          existingEntry.phone_number = f.phone_number;
          existingEntry.phone = f.phone_number;
        }
        if (!existingEntry.primary_role && f.primary_role) {
          existingEntry.primary_role = f.primary_role;
          existingEntry.role = f.primary_role;
        }
      } else {
        combinedMembersMap.set(String(f.id), {
          ...f,
          role: f.primary_role || '',
          phone: f.phone_number || '',
          phone_number: f.phone_number || '',
          primary_type: f.primary_type || 'FREELANCER',
          member_types:
            Array.isArray(f.member_types) && f.member_types.length > 0
              ? f.member_types
              : [f.primary_type || 'FREELANCER'],
          default_daily_rate: calcRate,
          default_currency: f.default_currency || 'INR',
          is_active: f.is_active !== false,
        });
      }
    });

    const mappedTeamMembers = Array.from(combinedMembersMap.values()).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );

    // 8. Pick Best Matching fw_projects Record & Hydrate Sub-Events / Assignments
    const clientNameNorm = normalizeNameKey(foundClient.name);
    const candidateProjects: any[] = (fwProjectsRes.data || []).filter((p: any) => {
      if (p.client_id && p.client_id === foundClient.id) return true;
      if (resolvedLeadId && p.lead_id && p.lead_id === resolvedLeadId) return true;
      if (clientNameNorm && normalizeNameKey(p.client_name) === clientNameNorm) return true;
      return false;
    });

    const scoreProject = (p: any): number => {
      let score = 0;
      if (p.client_id === foundClient.id) score += 1000;
      if (resolvedLeadId && p.lead_id === resolvedLeadId) score += 500;
      if (clientNameNorm && normalizeNameKey(p.client_name) === clientNameNorm) score += 200;
      if (p.user_id === clientWsId || p.user_id === effectiveWsId) score += 100;
      const subs = Array.isArray(p.fw_sub_events) ? p.fw_sub_events : [];
      if (subs.length > 0) score += 50;
      subs.forEach((se: any) => {
        score += (Array.isArray(se.fw_assignments) ? se.fw_assignments.length : 0) * 10;
        score += (Array.isArray(se.roles) ? se.roles.length : 0) * 5;
      });
      return score;
    };

    const matchedFwProjectRaw =
      candidateProjects.length > 0
        ? [...candidateProjects].sort((a, b) => scoreProject(b) - scoreProject(a))[0]
        : null;

    // Extract fallback crew roles per ceremony from Final Quotation (when fw_sub_events.roles is empty)
    const fallbackCeremonyRoles: Array<{ normTitle: string; roles: string[] }> = [];
    const expandReqsToRoles = (reqs: any): string[] => {
      if (!Array.isArray(reqs)) return [];
      const out: string[] = [];
      reqs.forEach((r: any) => {
        if (!r) return;
        const rName = typeof r === 'string' ? r.trim() : String(r.name || r.role || '').trim();
        if (!rName) return;
        const qty = Math.max(1, Number(typeof r === 'object' ? (r.qty ?? r.quantity ?? r.count ?? 1) : 1) || 1);
        for (let k = 0; k < qty; k++) out.push(rName);
      });
      return out;
    };
    if (finalQuoteDoc?.content_json) {
      const quoteItems = finalQuoteDoc.content_json?.functionsPage?.items;
      if (Array.isArray(quoteItems)) {
        quoteItems.forEach((item: any) => {
          const roles = expandReqsToRoles(item?.requirements);
          const normTitle = normalizeNameKey(item?.name || '');
          if (normTitle && roles.length > 0) {
            fallbackCeremonyRoles.push({ normTitle, roles });
          }
        });
      }
      const shoot = finalQuoteDoc.content_json?.shootDetails;
      if (shoot && shoot.crewText) {
        const shootRoles = String(shoot.crewText).split(/[,+\n]/).map((s) => s.trim()).filter(Boolean);
        const shootNorm = normalizeNameKey(shoot.heading || 'Pre-Wedding Shoot');
        if (shootNorm && shootRoles.length > 0) {
          fallbackCeremonyRoles.push({ normTitle: shootNorm, roles: shootRoles });
        }
      }
    }

    let hydratedFwProject: any = null;
    if (matchedFwProjectRaw) {
      const seenSubEvents = new Set<string>();
      const rawSortedForDedup = [...(matchedFwProjectRaw.fw_sub_events || [])].sort(
        (a: any, b: any) => (b.fw_assignments?.length || 0) - (a.fw_assignments?.length || 0)
      );

      const cleanSubEvents = rawSortedForDedup
        .filter((se: any) => {
          const normTitle = (se.event_title || se.name || '').trim().toLowerCase();
          const dateStr = se.event_date || '';
          const key = `${normTitle}_${dateStr}`;
          if (seenSubEvents.has(key)) return false;
          seenSubEvents.add(key);
          return true;
        })
        .sort((a: any, b: any) => {
          const aTbd = Boolean(a.is_date_tbd) || !a.event_date || String(a.event_date).toLowerCase().includes('tbd') || isNaN(new Date(a.event_date).getTime());
          const bTbd = Boolean(b.is_date_tbd) || !b.event_date || String(b.event_date).toLowerCase().includes('tbd') || isNaN(new Date(b.event_date).getTime());
          if (aTbd && !bTbd) return -1;
          if (!aTbd && bTbd) return 1;
          if (!aTbd && !bTbd) {
            const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
            if (diff !== 0) return diff;
          }
          return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
        })
        .map((se: any) => {
          const mappedAssignments = (se.fw_assignments || []).map((a: any) => {
            const cleanAssigneeName = String(
              a.assigned_member_name || a.clean_name || a.member_name || (a.fw_team_members as any)?.name || ''
            )
              .trim()
              .toLowerCase();
            const isPlaceholder =
              !cleanAssigneeName ||
              ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(cleanAssigneeName) ||
              cleanAssigneeName.startsWith('not fixed');

            const matchedMem =
              a.fw_team_members ||
              mappedTeamMembers.find(
                (m) =>
                  (a.assigned_member_id &&
                    (m.id === a.assigned_member_id || (m as any).auth_user_id === a.assigned_member_id)) ||
                  (!isPlaceholder && String(m.name || '').trim().toLowerCase() === cleanAssigneeName)
              ) ||
              null;

            return {
              ...a,
              fw_team_members: matchedMem || a.fw_team_members || null,
            };
          });

          let resolvedRoles = Array.isArray(se.roles) ? se.roles : [];
          if (resolvedRoles.length === 0 && mappedAssignments.length === 0) {
            const seNorm = normalizeNameKey(se.event_title || se.name || '');
            const matchedFallback = fallbackCeremonyRoles.find(
              (fc) => fc.normTitle === seNorm || (seNorm && (fc.normTitle.includes(seNorm) || seNorm.includes(fc.normTitle)))
            );
            if (matchedFallback && matchedFallback.roles.length > 0) {
              resolvedRoles = matchedFallback.roles;
            }
          }

          return {
            ...se,
            roles: resolvedRoles,
            fw_assignments: mappedAssignments,
          };
        });

      hydratedFwProject = {
        ...matchedFwProjectRaw,
        client_id: matchedFwProjectRaw.client_id || foundClient.id,
        project_manager_id: matchedFwProjectRaw.project_manager_id || foundClient.project_manager_id || null,
        project_manager_name: matchedFwProjectRaw.project_manager_name || foundClient.project_manager_name || null,
        fw_sub_events: cleanSubEvents,
      };
    }

    const crewRoles =
      Array.isArray(crewRolesRes.data) && crewRolesRes.data.length > 0
        ? crewRolesRes.data
        : DEFAULT_CREW_ROLES;

    return NextResponse.json({
      success: true,
      client: {
        ...foundClient,
        lead_id: foundClient.lead_id || resolvedLeadId || null,
        linkedLeadId: resolvedLeadId || foundClient.lead_id || null,
      },
      quotationDocs,
      fwProject: hydratedFwProject,
      crewRoles,
      postProductionProject: resolvedPostProdProject,
      financeRecord: financeRes.data || null,
      moodboards: moodboardsRes.data || [],
      tasks: tasksRes.data || [],
      teamMembers: mappedTeamMembers,
    });
  } catch (err: any) {
    console.error('[API /api/workspace/clients/[id] GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/workspace/clients/[id]?workspace_id=...
 * Enterprise-grade updater for client details, finance, and assignments.
 * Executes using supabaseAdmin to guarantee zero RLS failures for authorized team members.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientId = resolvedParams?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Missing client identifier' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    const body = await req.json().catch(() => ({}));

    const { data: existingClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (body.clientUpdate) {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      const allowedFields = [
        'name',
        'phone',
        'email',
        'event_type',
        'event_date',
        'status',
        'project_manager_id',
        'project_manager_name',
        'project_manager_email',
        'project_manager_phone',
        'notes',
        'total_package_amount',
        'paid_amount',
        'handled_by',
        'custom_data',
      ];

      for (const field of allowedFields) {
        if (body.clientUpdate[field] !== undefined) {
          updatePayload[field] = body.clientUpdate[field];
        }
      }

      const { error: clientUpdateError } = await supabaseAdmin
        .from('workspace_clients')
        .update(updatePayload)
        .eq('id', clientId);

      if (clientUpdateError) {
        console.error('[API /api/workspace/clients/[id] PATCH] Error updating client:', clientUpdateError);
        return NextResponse.json({ success: false, error: clientUpdateError.message }, { status: 500 });
      }
    }

    if (body.financeUpdate) {
      const finPayload = {
        ...body.financeUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('client_finance_records').upsert(finPayload, { onConflict: 'client_id' });
    }

    if (body.postProdUpdate) {
      const ppPayload = {
        ...body.postProdUpdate,
        client_id: clientId,
        workspace_id: existingClient.workspace_id || effectiveWsId,
        user_id: existingClient.user_id || effectiveWsId,
        updated_at: new Date().toISOString(),
      };

      await supabaseAdmin.from('post_production_projects').upsert(ppPayload, { onConflict: 'client_id' });
    }

    return NextResponse.json({ success: true, message: 'Client workspace updated successfully' });
  } catch (err: any) {
    console.error('[API /api/workspace/clients/[id] PATCH] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
