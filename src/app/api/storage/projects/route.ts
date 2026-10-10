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

    let query = supabaseAdmin
      .from('storage_project_assets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (isValidUUID(workspaceId) && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.or(`workspace_id.eq.${workspaceId},workspace_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    if (status && status !== 'ALL') {
      query = query.eq('overall_storage_status', status);
    }

    let { data: projects, error } = await query;
    if (error) {
      console.warn('[StorageProjects GET error]:', error.message);
      projects = [];
    }

    // Auto-hydration check: Scan booked leads and ensure every booked lead has a storage project asset card
    try {
      const existingLeadIds = new Set((projects || []).map(p => String(p.lead_id)));

      // 1. Query leads by status or booked keywords
      let leadsQuery = supabaseAdmin
        .from('leads')
        .select('id, name, event_date, event_type, workspace_id, client_id, budget, status, raw_payload')
        .or('status.eq.booked,status.eq.closed,status.eq.converted,status.ilike.%book%,status.ilike.%close%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (isValidUUID(workspaceId) && workspaceId !== '00000000-0000-0000-0000-000000000000') {
        leadsQuery = leadsQuery.or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);
      }

      const { data: bookedLeadsByStatus } = await leadsQuery;

      // 2. Query leads that have client_id set (converted/booked leads)
      let clientsLeadsQuery = supabaseAdmin
        .from('leads')
        .select('id, name, event_date, event_type, workspace_id, client_id, budget, status, raw_payload')
        .not('client_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (isValidUUID(workspaceId) && workspaceId !== '00000000-0000-0000-0000-000000000000') {
        clientsLeadsQuery = clientsLeadsQuery.or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`);
      }

      const { data: bookedLeadsByClient } = await clientsLeadsQuery;

      // Merge and deduplicate booked leads
      const allBookedLeadsMap = new Map<string, any>();
      (bookedLeadsByStatus || []).forEach(l => allBookedLeadsMap.set(l.id, l));
      (bookedLeadsByClient || []).forEach(l => allBookedLeadsMap.set(l.id, l));
      const bookedLeads = Array.from(allBookedLeadsMap.values());

      if (bookedLeads.length > 0) {
        const newlyHydrated: any[] = [];
        for (const lead of bookedLeads) {
          if (existingLeadIds.has(String(lead.id))) continue;

          const raw = lead.raw_payload || {};
          const coupleName = raw.couple_name 
            || raw.couple_names 
            || lead.name 
            || 'Valued Client';

          const rawEvents = raw.events || raw.sub_events || [];
          const subEvents = rawEvents.length > 0 ? rawEvents.map((ev: any, idx: number) => ({
            id: ev.id || `ev_${idx + 1}_${lead.id}`,
            name: ev.name || ev.title || `Event ${idx + 1}`,
            date: ev.date || lead.event_date || new Date().toISOString().split('T')[0],
            venue: ev.venue || lead.location || '',
            crew: (ev.crew || ev.team_members || []).map((cr: any, cIdx: number) => ({
              id: cr.id || `cr_${idx + 1}_${cIdx + 1}`,
              name: cr.name || cr.member_name || `Crew ${cIdx + 1}`,
              role: cr.role || 'Cinematography / Photography',
              assigned_card_ids: cr.assigned_card_ids || [],
              assigned_card_names: cr.assigned_card_names || [],
              is_copied: Boolean(cr.is_copied),
              copied_at: cr.copied_at || null,
              copied_by: cr.copied_by || null,
            }))
          })) : [
            {
              id: `ev_default_${lead.id}`,
              name: lead.event_type || 'Main Event Photography',
              date: lead.event_date || new Date().toISOString().split('T')[0],
              venue: raw.venue || raw.city || '',
              crew: [
                {
                  id: `cr_1_${lead.id}`,
                  name: 'Lead Photographer',
                  role: 'Traditional Photography',
                  assigned_card_ids: [],
                  assigned_card_names: [],
                  is_copied: false,
                  copied_at: null,
                  copied_by: null,
                },
                {
                  id: `cr_2_${lead.id}`,
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

          const effectiveWs = isValidUUID(lead.workspace_id) 
            ? lead.workspace_id 
            : (isValidUUID(workspaceId) ? workspaceId : '00000000-0000-0000-0000-000000000000');

          const assetRow = {
            workspace_id: effectiveWs,
            lead_id: lead.id,
            client_id: lead.client_id || lead.id,
            client_name: coupleName.trim(),
            event_date: lead.event_date || '',
            package_amount: Number(lead.budget) || 0,
            booking_status: 'booked',
            sub_events: subEvents,
            assigned_disks: [],
            google_drive_backup: {},
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
            } else {
              newlyHydrated.push({ ...assetRow, id: `temp_${lead.id}` });
            }
          } catch (_) {
            newlyHydrated.push({ ...assetRow, id: `temp_${lead.id}` });
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

    const effectiveWs = isValidUUID(workspace_id) ? workspace_id : '00000000-0000-0000-0000-000000000000';
    const cleanLeadId = lead_id || `manual_${Date.now()}`;

    const projectPayload: any = {
      workspace_id: effectiveWs,
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
