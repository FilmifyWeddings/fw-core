import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('storage_project_assets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.or(`workspace_id.eq.${workspaceId},workspace_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    if (status && status !== 'ALL') {
      query = query.eq('overall_storage_status', status);
    }

    let { data: projects, error } = await query;

    // Fallback: If no storage project assets exist yet, automatically hydrate from booked leads!
    if (!projects || projects.length === 0) {
      try {
        let leadsQuery = supabaseAdmin
          .from('leads')
          .select('id, name, event_date, event_type, workspace_id, client_id, budget, raw_payload')
          .or('stage.eq.booked,stage.eq.converted,stage.eq.closed')
          .order('created_at', { ascending: false })
          .limit(50);

        if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
          leadsQuery = leadsQuery.eq('workspace_id', workspaceId);
        }

        const { data: bookedLeads } = await leadsQuery;
        if (bookedLeads && bookedLeads.length > 0) {
          const autoHydrated: any[] = [];
          for (const lead of bookedLeads) {
            const raw = lead.raw_payload || {};
            const subEvents = raw.events || raw.sub_events || [
              {
                id: `ev_default_${lead.id}`,
                name: lead.event_type || 'Main Event',
                date: lead.event_date || new Date().toISOString().split('T')[0],
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
                    name: 'Candid Photographer',
                    role: 'Candid Photography',
                    assigned_card_ids: [],
                    assigned_card_names: [],
                    is_copied: false,
                    copied_at: null,
                    copied_by: null,
                  },
                ],
              },
            ];

            const assetRow = {
              workspace_id: lead.workspace_id || workspaceId || '00000000-0000-0000-0000-000000000000',
              lead_id: lead.id,
              client_id: lead.client_id || lead.id,
              client_name: lead.name || 'Valued Client',
              event_date: lead.event_date || '',
              package_amount: Number(lead.budget) || 0,
              booking_status: 'booked',
              sub_events: subEvents,
              assigned_disks: [],
              google_drive_backup: {},
              overall_storage_status: 'INGESTING',
            };

            // Attempt safe upsert
            const { data: inserted } = await supabaseAdmin
              .from('storage_project_assets')
              .upsert(assetRow, { onConflict: 'workspace_id,lead_id' })
              .select()
              .maybeSingle();

            if (inserted) autoHydrated.push(inserted);
            else autoHydrated.push({ ...assetRow, id: `temp_${lead.id}` });
          }

          if (autoHydrated.length > 0) {
            projects = autoHydrated;
          }
        }
      } catch (hydrateErr) {
        console.warn('[StorageProjects API] Hydration error handled:', hydrateErr);
      }
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

    const effectiveWs = workspace_id || '00000000-0000-0000-0000-000000000000';
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

    if (error) throw error;
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

    const { error } = await supabaseAdmin
      .from('storage_project_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Project storage card deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
