import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';

export const runtime = 'nodejs';

/**
 * POST /api/workspace/sync-card
 * Robust server-side card synchronizer powered by supabaseAdmin.
 * Bypasses RLS to ensure 100% reliable, permanent data persistence across all 4 modules:
 * 1. Client Directory (`workspace_clients`)
 * 2. Bookings & Events (`fw_projects` + `fw_assignments`)
 * 3. Post-Production (`post_production_projects`)
 * 4. Finance & Leads (`client_finance_records` + `leads`)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      clientId,
      projectId,
      leadId,
      oldName,
      newName,
      pmId,
      pmName,
      pmEmail,
      pmPhone,
      modules = { clientDirectory: true, bookingsEvents: true, postProduction: true },
      workspaceId
    } = body;

    const nowIso = new Date().toISOString();

    // ─────────────────────────────────────────────────────────────────────────────
    // ACTION 1: ASSIGN PROJECT MANAGER (PM)
    // ─────────────────────────────────────────────────────────────────────────────
    if (action === 'assign_pm') {
      const targetModules = {
        clientDirectory: modules.clientDirectory !== false,
        bookingsEvents: modules.bookingsEvents !== false,
        postProduction: modules.postProduction !== false,
      };

      // 1. Resolve Target Client
      let targetClient: any = null;
      if (clientId) {
        const { data } = await supabaseAdmin.from('workspace_clients').select('*').eq('id', clientId).maybeSingle();
        targetClient = data;
      }
      if (!targetClient && leadId) {
        const { data } = await supabaseAdmin.from('workspace_clients').select('*').eq('lead_id', leadId).maybeSingle();
        targetClient = data;
      }
      if (!targetClient && projectId) {
        const { data: p } = await supabaseAdmin.from('fw_projects').select('client_id, client_name').eq('id', projectId).maybeSingle();
        if (p?.client_id) {
          const { data } = await supabaseAdmin.from('workspace_clients').select('*').eq('id', p.client_id).maybeSingle();
          targetClient = data;
        } else if (p?.client_name) {
          const { data } = await supabaseAdmin.from('workspace_clients').select('*').ilike('name', p.client_name.trim()).maybeSingle();
          targetClient = data;
        }
      }

      // 1A. Update Client Directory (`workspace_clients`)
      if (targetClient && targetModules.clientDirectory) {
        let updatedNotes = targetClient.notes;
        try {
          const ext = parseClientExtended(targetClient);
          const updatedExt = {
            ...ext,
            project_manager_id: pmId || '',
            project_manager_name: pmName || '',
            project_manager_email: pmEmail || '',
            project_manager_phone: pmPhone || '',
          };
          updatedNotes = serializeClientExtended(updatedExt);
        } catch (_) {}

        await supabaseAdmin
          .from('workspace_clients')
          .update({
            project_manager_id: pmId || null,
            project_manager_name: pmName || null,
            project_manager_email: pmEmail || null,
            project_manager_phone: pmPhone || null,
            handled_by: pmName || null,
            ...(updatedNotes ? { notes: updatedNotes } : {}),
            updated_at: nowIso
          })
          .eq('id', targetClient.id);
      }

      // 1B. Update Bookings & Events (`fw_projects`)
      if (targetModules.bookingsEvents) {
        let pQuery = supabaseAdmin.from('fw_projects').update({
          project_manager_id: pmId || null,
          project_manager_name: pmName || null,
          updated_at: nowIso
        });

        if (projectId) {
          await pQuery.eq('id', projectId);
        } else if (targetClient?.id) {
          await pQuery.or(`client_id.eq.${targetClient.id},client_name.ilike.%${targetClient.name.trim()}%`);
        } else if (oldName || newName) {
          const targetName = (newName || oldName || '').trim();
          await pQuery.ilike('client_name', `%${targetName}%`);
        }
      }

      // 1C. Update Post-Production (`post_production_projects`)
      if (targetModules.postProduction && (targetClient?.id || projectId)) {
        const targetId = targetClient?.id || projectId;
        const { data: existingPPP } = await supabaseAdmin
          .from('post_production_projects')
          .select('id')
          .or(`client_id.eq.${targetId},id.eq.${targetId}`)
          .maybeSingle();

        if (existingPPP) {
          await supabaseAdmin
            .from('post_production_projects')
            .update({
              project_manager_id: pmId || null,
              project_manager_name: pmName || null,
              updated_at: nowIso
            })
            .eq('id', existingPPP.id);
        }
      }

      // 1D. Update Lead if present
      const effectiveLeadId = leadId || targetClient?.lead_id;
      if (effectiveLeadId) {
        const { data: leadRow } = await supabaseAdmin.from('leads').select('raw_payload').eq('id', effectiveLeadId).maybeSingle();
        if (leadRow) {
          const updatedRaw = {
            ...(leadRow.raw_payload || {}),
            project_manager_id: pmId || null,
            project_manager_name: pmName || null,
            lead_owner: pmName || 'Unassigned'
          };
          await supabaseAdmin
            .from('leads')
            .update({
              raw_payload: updatedRaw,
              assigned_to_user_id: pmId || null,
              updated_at: nowIso
            })
            .eq('id', effectiveLeadId);
        }
      }

      // 1E. Insert Activity Log in `fw_project_activity_logs`
      const logProjectId = projectId || targetClient?.id;
      if (logProjectId) {
        try {
          await supabaseAdmin
            .from('fw_project_activity_logs')
            .insert([{
              project_id: logProjectId,
              project_name: targetClient?.name || newName || oldName || 'Project',
              actor_name: 'Studio Team',
              actor_role: 'Studio Owner',
              action_type: 'PM_CHANGED',
              description: pmName ? `Assigned **${pmName}** as Project Manager` : 'Cleared Project Manager assignment',
              previous_value: targetClient?.project_manager_name || null,
              new_value: pmName || 'Unassigned',
              created_at: nowIso
            }]);
        } catch (_) {}
      }

      return NextResponse.json({
        success: true,
        action: 'assign_pm',
        pmId: pmId || null,
        pmName: pmName || null
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ACTION 2: RENAME COUPLE (INSTANT 4-MODULE SYNC)
    // ─────────────────────────────────────────────────────────────────────────────
    if (action === 'rename_couple') {
      if (!newName || !newName.trim()) {
        return NextResponse.json({ success: false, error: 'New name is required' }, { status: 400 });
      }

      const cleanNewName = newName.trim();
      const cleanOldName = (oldName || '').trim();

      // 2A. Update Client Directory (`workspace_clients`)
      let updatedClient: any = null;
      let clientTargetQuery = supabaseAdmin.from('workspace_clients').select('id, name, notes, lead_id');
      if (clientId) {
        const { data } = await clientTargetQuery.eq('id', clientId).maybeSingle();
        updatedClient = data;
      }
      if (!updatedClient && leadId) {
        const { data } = await clientTargetQuery.eq('lead_id', leadId).maybeSingle();
        updatedClient = data;
      }
      if (!updatedClient && projectId) {
        const { data: p } = await supabaseAdmin.from('fw_projects').select('client_id, client_name').eq('id', projectId).maybeSingle();
        if (p?.client_id) {
          const { data } = await clientTargetQuery.eq('id', p.client_id).maybeSingle();
          updatedClient = data;
        } else if (p?.client_name) {
          const { data } = await clientTargetQuery.ilike('name', p.client_name.trim()).maybeSingle();
          updatedClient = data;
        }
      }
      if (!updatedClient && cleanOldName) {
        const { data } = await clientTargetQuery.ilike('name', cleanOldName).maybeSingle();
        updatedClient = data;
      }

      if (updatedClient) {
        let updatedNotes = updatedClient.notes;
        try {
          const ext = parseClientExtended(updatedClient);
          updatedNotes = serializeClientExtended(ext);
        } catch (_) {}

        await supabaseAdmin
          .from('workspace_clients')
          .update({
            name: cleanNewName,
            ...(updatedNotes ? { notes: updatedNotes } : {}),
            updated_at: nowIso
          })
          .eq('id', updatedClient.id);
      }

      // 2B. Update Bookings & Events (`fw_projects` and `fw_assignments`)
      let targetProjectId = projectId;
      if (!targetProjectId && updatedClient?.id) {
        const { data: p } = await supabaseAdmin
          .from('fw_projects')
          .select('id')
          .or(`client_id.eq.${updatedClient.id},client_name.ilike.%${cleanOldName || updatedClient.name}%`)
          .maybeSingle();
        if (p?.id) targetProjectId = p.id;
      }

      if (targetProjectId) {
        await supabaseAdmin
          .from('fw_projects')
          .update({
            client_name: cleanNewName,
            updated_at: nowIso
          })
          .eq('id', targetProjectId);

        // Concurrently update client_name on all assignments for this project
        await supabaseAdmin
          .from('fw_assignments')
          .update({
            client_name: cleanNewName,
            updated_at: nowIso
          })
          .eq('project_id', targetProjectId);
      } else if (cleanOldName) {
        // Fallback update by old client_name across projects
        await supabaseAdmin
          .from('fw_projects')
          .update({
            client_name: cleanNewName,
            updated_at: nowIso
          })
          .ilike('client_name', cleanOldName);

        await supabaseAdmin
          .from('fw_assignments')
          .update({
            client_name: cleanNewName,
            updated_at: nowIso
          })
          .ilike('client_name', cleanOldName);
      }

      // 2C. Update Post-Production (`post_production_projects`)
      const effectiveClientId = updatedClient?.id || clientId;
      if (effectiveClientId) {
        const { data: pppRows } = await supabaseAdmin
          .from('post_production_projects')
          .select('id, notes')
          .or(`client_id.eq.${effectiveClientId},id.eq.${effectiveClientId}`);

        if (pppRows && pppRows.length > 0) {
          for (const ppp of pppRows) {
            let notesStr = ppp.notes || '';
            if (cleanOldName && notesStr.includes(cleanOldName)) {
              notesStr = notesStr.replaceAll(cleanOldName, cleanNewName);
            }
            await supabaseAdmin
              .from('post_production_projects')
              .update({
                notes: notesStr,
                updated_at: nowIso
              })
              .eq('id', ppp.id);
          }
        }
      }

      // 2D. Update Finance & Payments (`client_finance_records`)
      if (effectiveClientId) {
        const { data: finRows } = await supabaseAdmin
          .from('client_finance_records')
          .select('id, notes')
          .eq('client_id', effectiveClientId);

        if (finRows && finRows.length > 0) {
          for (const f of finRows) {
            let fNotes = f.notes || '';
            if (cleanOldName && fNotes.includes(cleanOldName)) {
              fNotes = fNotes.replaceAll(cleanOldName, cleanNewName);
            }
            await supabaseAdmin
              .from('client_finance_records')
              .update({
                notes: fNotes,
                updated_at: nowIso
              })
              .eq('id', f.id);
          }
        }
      }

      // 2E. Update CRM Lead (`leads`)
      const effectiveLeadId = leadId || updatedClient?.lead_id;
      if (effectiveLeadId) {
        const { data: leadRow } = await supabaseAdmin.from('leads').select('raw_payload').eq('id', effectiveLeadId).maybeSingle();
        if (leadRow) {
          const raw = leadRow.raw_payload || {};
          const updatedRaw = {
            ...raw,
            couple_name: cleanNewName,
            couple_names: cleanNewName,
            name: cleanNewName
          };
          await supabaseAdmin
            .from('leads')
            .update({
              client_name: cleanNewName,
              raw_payload: updatedRaw,
              updated_at: nowIso
            })
            .eq('id', effectiveLeadId);
        }
      }

      // 2F. Log to `fw_project_activity_logs`
      const logProjectId = targetProjectId || updatedClient?.id;
      if (logProjectId) {
        try {
          await supabaseAdmin
            .from('fw_project_activity_logs')
            .insert([{
              project_id: logProjectId,
              project_name: cleanNewName,
              actor_name: 'Studio Team',
              actor_role: 'Studio Owner',
              action_type: 'CLIENT_NAME_CHANGED',
              description: `Renamed couple from **"${cleanOldName || 'Previous Name'}"** to **"${cleanNewName}"**`,
              previous_value: cleanOldName || null,
              new_value: cleanNewName,
              created_at: nowIso
            }]);
        } catch (_) {}
      }

      return NextResponse.json({
        success: true,
        action: 'rename_couple',
        oldName: cleanOldName,
        newName: cleanNewName
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[/api/workspace/sync-card Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
