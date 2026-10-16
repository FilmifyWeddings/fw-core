import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isValidUUID = (val?: string | null) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');

    if (!isValidUUID(workspaceId) || workspaceId === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: true, projects: [] });
    }

    let query = supabaseAdmin
      .from('storage_project_assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('overall_storage_status', status);
    }

    let { data: projects, error } = await query;
    if (error) {
      console.warn('[StorageProjects GET error]:', error.message);
      projects = [];
    }

    // Auto-hydration check: Scan booked leads & fw_projects for this workspace
    try {
      const existingLeadIds = new Set((projects || []).map(p => String(p.lead_id || '')));
      const existingNames = new Set((projects || []).map(p => (p.client_name || '').toLowerCase().trim()));

      // 1. Query leads by status, stage, or client_id
      const { data: bookedLeads } = await supabaseAdmin
        .from('leads')
        .select('id, name, event_date, event_type, workspace_id, client_id, budget, status, stage, stage_id, raw_payload')
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .or('status.eq.booked,status.eq.closed,status.eq.converted,stage.eq.booked,stage_id.eq.booked,status.ilike.%book%,stage.ilike.%book%')
        .order('created_at', { ascending: false })
        .limit(100);

      // 2. Also query leads that have client_id set (converted clients)
      const { data: clientLeads } = await supabaseAdmin
        .from('leads')
        .select('id, name, event_date, event_type, workspace_id, client_id, budget, status, stage, stage_id, raw_payload')
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .not('client_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      // 3. Query Bookings & Events (fw_projects)
      const { data: bookingProjects } = await supabaseAdmin
        .from('fw_projects')
        .select('id, client_name, main_date, main_venue, workspace_id, user_id, client_id, lead_id')
        .or(`workspace_id.eq.${workspaceId},user_id.eq.${workspaceId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      // Merge and deduplicate all candidates
      const allCandidatesMap = new Map<string, any>();
      (bookedLeads || []).forEach(l => allCandidatesMap.set(String(l.id), { ...l, _type: 'lead' }));
      (clientLeads || []).forEach(l => allCandidatesMap.set(String(l.id), { ...l, _type: 'lead' }));

      // Fetch sub-events and assignments for fw_projects
      const fwProjectIds = (bookingProjects || []).map(p => p.id);
      let fwSubEventsMap = new Map<string, any[]>();
      let fwAssignmentsMap = new Map<string, any[]>();

      if (fwProjectIds.length > 0) {
        const { data: fwSubEvents } = await supabaseAdmin
          .from('fw_sub_events')
          .select('id, project_id, event_title, event_date, venue_name, start_time_12h, end_time_12h')
          .in('project_id', fwProjectIds);

        const subEventIds = (fwSubEvents || []).map(se => se.id);
        if (subEventIds.length > 0) {
          const { data: fwAssignments } = await supabaseAdmin
            .from('fw_assignments')
            .select('id, sub_event_id, role, role_code, assigned_member_id, assigned_member_name')
            .in('sub_event_id', subEventIds);

          (fwAssignments || []).forEach(a => {
            const list = fwAssignmentsMap.get(a.sub_event_id) || [];
            list.push(a);
            fwAssignmentsMap.set(a.sub_event_id, list);
          });
        }

        (fwSubEvents || []).forEach(se => {
          const list = fwSubEventsMap.get(se.project_id) || [];
          list.push(se);
          fwSubEventsMap.set(se.project_id, list);
        });
      }

      // Add fw_projects candidates
      (bookingProjects || []).forEach(p => {
        const key = `fw_${p.id}`;
        allCandidatesMap.set(key, { ...p, _type: 'fw_project' });
      });

      const candidates = Array.from(allCandidatesMap.values());

      if (candidates.length > 0) {
        const newlyHydrated: any[] = [];
        for (const item of candidates) {
          const isFw = item._type === 'fw_project';
          const leadId = isFw ? (item.lead_id || `fw_${item.id}`) : String(item.id);
          const rawName = isFw 
            ? (item.client_name || 'Booked Client')
            : (item.raw_payload?.couple_name || item.raw_payload?.couple_names || item.name || 'Booked Client');
          const clientName = String(rawName).trim();
          const cleanNameLower = clientName.toLowerCase();

          // Skip if already in projects list
          if (existingLeadIds.has(leadId) || existingNames.has(cleanNameLower)) continue;

          let subEvents: any[] = [];

          if (isFw) {
            const fwSes = fwSubEventsMap.get(item.id) || [];
            if (fwSes.length > 0) {
              subEvents = fwSes.map((se: any, idx: number) => {
                const rawCrew = fwAssignmentsMap.get(se.id) || [];
                // Strictly exclude Assistant / Lights / Helper roles as requested
                const filteredCrew = rawCrew.filter((cr: any) => {
                  const roleStr = (cr.role || cr.role_code || '').toLowerCase();
                  return !roleStr.includes('assistant') && !roleStr.includes('light') && !roleStr.includes('helper') && !roleStr.includes('driver');
                });

                return {
                  id: se.id || `ev_${idx + 1}_${item.id}`,
                  name: se.event_title || `Event ${idx + 1}`,
                  date: se.event_date || item.main_date || new Date().toISOString().split('T')[0],
                  venue: se.venue_name || item.main_venue || '',
                  crew: filteredCrew.length > 0 ? filteredCrew.map((cr: any, cIdx: number) => ({
                    id: cr.id || `cr_${idx + 1}_${cIdx + 1}`,
                    name: cr.assigned_member_name || `Crew ${cIdx + 1}`,
                    role: cr.role || 'Cinematography / Photography',
                    assigned_card_ids: [],
                    assigned_card_names: [],
                    is_copied: false,
                    copied_at: null,
                    copied_by: null,
                  })) : [
                    {
                      id: `cr_1_${se.id || idx}`,
                      name: 'Lead Photographer',
                      role: 'Traditional Photography',
                      assigned_card_ids: [],
                      assigned_card_names: [],
                      is_copied: false,
                      copied_at: null,
                      copied_by: null,
                    },
                    {
                      id: `cr_2_${se.id || idx}`,
                      name: 'Candid Cinematographer',
                      role: 'Candid Cinematography',
                      assigned_card_ids: [],
                      assigned_card_names: [],
                      is_copied: false,
                      copied_at: null,
                      copied_by: null,
                    }
                  ]
                };
              });
            }
          } else {
            // CRM lead
            const raw = item.raw_payload || {};
            const rawEvents = raw.events || raw.sub_events || [];
            if (rawEvents.length > 0) {
              subEvents = rawEvents.map((ev: any, idx: number) => {
                const rawCrew = ev.crew || ev.team_members || [];
                const filteredCrew = rawCrew.filter((cr: any) => {
                  const roleStr = (cr.role || cr.role_code || '').toLowerCase();
                  return !roleStr.includes('assistant') && !roleStr.includes('light') && !roleStr.includes('helper') && !roleStr.includes('driver');
                });

                return {
                  id: ev.id || `ev_${idx + 1}_${item.id}`,
                  name: ev.name || ev.title || `Event ${idx + 1}`,
                  date: ev.date || item.event_date || new Date().toISOString().split('T')[0],
                  venue: ev.venue || item.location || '',
                  crew: filteredCrew.length > 0 ? filteredCrew.map((cr: any, cIdx: number) => ({
                    id: cr.id || `cr_${idx + 1}_${cIdx + 1}`,
                    name: cr.name || cr.member_name || `Crew ${cIdx + 1}`,
                    role: cr.role || 'Cinematography / Photography',
                    assigned_card_ids: cr.assigned_card_ids || [],
                    assigned_card_names: cr.assigned_card_names || [],
                    is_copied: Boolean(cr.is_copied),
                    copied_at: cr.copied_at || null,
                    copied_by: cr.copied_by || null,
                  })) : [
                    {
                      id: `cr_1_${item.id}_${idx}`,
                      name: 'Lead Photographer',
                      role: 'Traditional Photography',
                      assigned_card_ids: [],
                      assigned_card_names: [],
                      is_copied: false,
                      copied_at: null,
                      copied_by: null,
                    },
                    {
                      id: `cr_2_${item.id}_${idx}`,
                      name: 'Candid Cinematographer',
                      role: 'Candid Cinematography',
                      assigned_card_ids: [],
                      assigned_card_names: [],
                      is_copied: false,
                      copied_at: null,
                      copied_by: null,
                    }
                  ]
                };
              });
            }
          }

          // Fallback if no sub-events found
          if (subEvents.length === 0) {
            subEvents = [
              {
                id: `ev_default_${leadId}`,
                name: (isFw ? item.main_venue : item.event_type) || 'Main Event Photography',
                date: (isFw ? item.main_date : item.event_date) || new Date().toISOString().split('T')[0],
                venue: (isFw ? item.main_venue : (item.raw_payload?.venue || item.raw_payload?.city)) || '',
                crew: [
                  {
                    id: `cr_1_${leadId}`,
                    name: 'Lead Photographer',
                    role: 'Traditional Photography',
                    assigned_card_ids: [],
                    assigned_card_names: [],
                    is_copied: false,
                    copied_at: null,
                    copied_by: null,
                  },
                  {
                    id: `cr_2_${leadId}`,
                    name: 'Candid Cinematographer',
                    role: 'Candid Cinematography',
                    assigned_card_ids: [],
                    assigned_card_names: [],
                    is_copied: false,
                    copied_at: null,
                    copied_by: null,
                  },
                ],
              },
            ];
          }

          const effectiveWs = isValidUUID(item.workspace_id) 
            ? item.workspace_id 
            : (isValidUUID(workspaceId) ? workspaceId : '00000000-0000-0000-0000-000000000000');

          const assetRow = {
            workspace_id: effectiveWs,
            lead_id: leadId,
            client_id: item.client_id || leadId,
            client_name: clientName,
            event_date: (isFw ? item.main_date : item.event_date) || '',
            package_amount: Number(item.budget) || 0,
            booking_status: 'booked',
            sub_events: subEvents,
            assigned_disks: [],
            google_drive_backup: { is_backed_up: false, folders: [] },
            overall_storage_status: 'INGESTING',
          };

          try {
            const { data: inserted } = await supabaseAdmin
              .from('storage_project_assets')
              .upsert(assetRow, { onConflict: 'workspace_id,lead_id' })
              .select()
              .maybeSingle();

            if (inserted) {
              newlyHydrated.push(inserted);
              existingLeadIds.add(leadId);
              existingNames.add(cleanNameLower);
            } else {
              newlyHydrated.push({ ...assetRow, id: `temp_${leadId}` });
            }
          } catch (_) {
            newlyHydrated.push({ ...assetRow, id: `temp_${leadId}` });
          }
        }

        if (newlyHydrated.length > 0) {
          projects = [...(projects || []), ...newlyHydrated];
        }
      }
    } catch (hydrateErr) {
      console.warn('[StorageProjects API] Hydration error handled:', hydrateErr);
    }

    return NextResponse.json({ success: true, projects: projects || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspace_id,
      lead_id,
      client_id,
      client_name,
      event_date,
      package_amount,
      sub_events = [],
      assigned_disks = [],
      google_drive_backup = {},
      overall_storage_status = 'INGESTING',
      notes,
    } = body;

    if (!client_name || !client_name.trim()) {
      return NextResponse.json({ success: false, error: 'client_name is required' }, { status: 400 });
    }

    if (!isValidUUID(workspace_id) || workspace_id === '00000000-0000-0000-0000-000000000000') {
      return NextResponse.json({ success: false, error: 'Valid workspace_id is required' }, { status: 400 });
    }

    const cleanLeadId = lead_id || `manual_${Date.now()}`;

    const projectPayload: any = {
      workspace_id,
      lead_id: cleanLeadId,
      client_id: client_id || null,
      client_name: client_name.trim(),
      event_date: event_date || '',
      package_amount: Number(package_amount) || 0,
      booking_status: 'booked',
      sub_events: sub_events || [],
      assigned_disks: assigned_disks || [],
      google_drive_backup: google_drive_backup || {},
      overall_storage_status: overall_storage_status || 'INGESTING',
      notes: notes || '',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('storage_project_assets')
      .upsert(projectPayload, { onConflict: 'workspace_id,lead_id' })
      .select()
      .single();

    if (error) {
      console.error('[StorageProjects POST DB Error]:', error);
      // Fallback: return the payload with an generated ID so client can render optimistically
      return NextResponse.json({ 
        success: true, 
        project: { ...projectPayload, id: `local_${Date.now()}` },
        warning: error.message 
      });
    }

    return NextResponse.json({ success: true, project: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project asset ID is required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('storage_project_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, project: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await supabaseAdmin.from('storage_project_assets').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
