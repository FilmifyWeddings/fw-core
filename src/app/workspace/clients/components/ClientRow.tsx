'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { WorkspaceClient } from '@/types';
import { type WorkspaceMemberOption } from '@/lib/team-helpers';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';
import { Calendar, UserPlus, Check, ChevronRight } from 'lucide-react';

/**
 * ⚡ Bidirectional PM Assignment for Client Directory
 * Updates workspace_clients and concurrently dual-syncs to fw_projects
 */
export const handleAssignClientPM = async (
  clientId: string,
  clientName: string,
  member: WorkspaceMemberOption | any | null
) => {
  const pmId = member ? member.id : null;
  const pmName = member ? member.name : null;

  // 1. Update Client Directory (both direct columns and extended notes for maximum compatibility)
  try {
    const { data: existingClient } = await supabase
      .from('workspace_clients')
      .select('id, notes')
      .eq('id', clientId)
      .maybeSingle();

    let updatedNotes = existingClient?.notes;
    if (existingClient) {
      try {
        const ext = parseClientExtended(existingClient as any);
        const updatedExt = {
          ...ext,
          project_manager_id: pmId || '',
          project_manager_name: pmName || '',
          project_manager_email: member?.email || '',
          project_manager_phone: member?.phone || '',
        };
        updatedNotes = serializeClientExtended(updatedExt);
      } catch (e) {
        console.warn('[handleAssignClientPM] Extended parse warning:', e);
      }
    }

    const { error: cErr } = await supabase
      .from('workspace_clients')
      .update({
        project_manager_id: pmId,
        project_manager_name: pmName,
        project_manager_email: member ? (member.email || null) : null,
        project_manager_phone: member ? (member.phone || null) : null,
        ...(updatedNotes !== undefined ? { notes: updatedNotes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (cErr && updatedNotes) {
      // Fallback update if direct column is not yet present in schema
      await supabase
        .from('workspace_clients')
        .update({
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);
    }
  } catch (err) {
    console.error('[handleAssignClientPM] Error updating workspace_clients:', err);
  }

  // 2. Direct dual-sync to fw_projects
  try {
    const { error: projErr } = await supabase
      .from('fw_projects')
      .update({
        project_manager_id: pmId,
        project_manager_name: pmName,
        updated_at: new Date().toISOString(),
      })
      .or(`client_id.eq.${clientId},client_name.ilike.${clientName.trim()}`);

    if (projErr) {
      // Fallback if client_id column is not yet present on fw_projects
      await supabase
        .from('fw_projects')
        .update({
          project_manager_id: pmId,
          project_manager_name: pmName,
          updated_at: new Date().toISOString(),
        })
        .ilike('client_name', clientName.trim());
    }
  } catch {
    await supabase
      .from('fw_projects')
      .update({
        project_manager_id: pmId,
        project_manager_name: pmName,
        updated_at: new Date().toISOString(),
      })
      .ilike('client_name', clientName.trim());
  }
};

export interface ClientRowProps {
  client: WorkspaceClient;
  onSelectClient?: (client: WorkspaceClient) => void;
  onOpenQuickAssign?: (client: WorkspaceClient) => void;
}

export const ClientRow: React.FC<ClientRowProps> = ({
  client,
  onSelectClient,
  onOpenQuickAssign,
}) => {
  const ext = parseClientExtended(client);
  const dueAmount = Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0));
  const isPaidFull = dueAmount === 0 && (client.total_package_amount || 0) > 0;
  const pmName = client.project_manager_name || ext.project_manager_name;

  return (
    <div
      onClick={() => onSelectClient?.(client)}
      className="p-4 rounded-2xl bg-white border border-[#EAE5DA] hover:border-amber-400 hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group cursor-pointer"
    >
      {/* Left: Client Name & Contact */}
      <div className="flex items-center gap-3.5 min-w-[240px]">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
          {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-800 transition-colors">
            {client.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{client.phone}</p>
        </div>
      </div>

      {/* Center: Event Info */}
      <div className="flex items-center gap-4 text-xs min-w-[180px]">
        <div className="space-y-1">
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
            {client.event_type}
          </span>
          <p className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            {client.event_date
              ? new Date(client.event_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Date not set'}
          </p>
        </div>
      </div>

      {/* Project Manager Badge / Quick Assign */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpenQuickAssign?.(client);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EAE5DA] hover:border-indigo-300 bg-white hover:bg-indigo-50/50 transition-all cursor-pointer shadow-2xs group/pm shrink-0"
        title="Click to Assign or Change Project Manager"
      >
        {pmName ? (
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {pmName.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block leading-tight">
                PM Assigned
              </span>
              <span className="text-xs font-black text-slate-900 group-hover/pm:text-indigo-700">
                {pmName}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 group-hover/pm:text-indigo-600">
            <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-600 group-hover/pm:text-indigo-600">+ Assign PM</span>
          </div>
        )}
      </div>

      {/* Right: Billing & Status */}
      <div className="flex items-center justify-between lg:justify-end gap-6 ml-auto w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
        <div className="text-right space-y-0.5">
          <span className="font-mono font-black text-sm text-slate-900 block">
            ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
          </span>
          <p className="text-[11px] font-bold">
            {isPaidFull ? (
              <span className="text-emerald-600 font-extrabold flex items-center gap-1 justify-end">
                <Check className="w-3 h-3" /> Paid in Full
              </span>
            ) : (
              <span className="text-amber-800">
                Paid: ₹{(client.paid_amount || 0).toLocaleString('en-IN')} • Due: ₹{dueAmount.toLocaleString('en-IN')}
              </span>
            )}
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
            client.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {client.status === 'completed' ? 'Completed' : 'Active'}
        </span>

        <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-400 text-amber-800 group-hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default ClientRow;
