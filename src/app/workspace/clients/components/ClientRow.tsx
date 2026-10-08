'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { WorkspaceClient } from '@/types';
import { type WorkspaceMemberOption } from '@/lib/team-helpers';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';
import { Calendar, UserPlus, Check, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import ClientStatusDropdown from './ClientStatusDropdown';

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
  const pmEmail = member ? (member.email || null) : null;
  const pmPhone = member ? (member.phone || null) : null;

  try {
    const res = await fetch('/api/workspace/sync-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_pm',
        clientId,
        clientName,
        pmId,
        pmName,
        pmEmail,
        pmPhone,
        modules: { clientDirectory: true, bookingsEvents: true, postProduction: true }
      })
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to assign Project Manager');
    }

    window.dispatchEvent(new CustomEvent('client_updated', { detail: { pmId, pmName } }));
    window.dispatchEvent(new CustomEvent('team_events_updated', { detail: { pmId, pmName } }));
    window.dispatchEvent(new CustomEvent('post_production_updated', { detail: { pmId, pmName } }));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sc_booking_sync_event', Date.now().toString());
      } catch (_) {}
    }
  } catch (err) {
    console.error('[handleAssignClientPM] Error:', err);
  }
};

export interface ClientRowProps {
  client: WorkspaceClient;
  onSelectClient?: (client: WorkspaceClient) => void;
  onOpenQuickAssign?: (client: WorkspaceClient) => void;
  onToggleStatus?: (client: WorkspaceClient) => void;
  onStatusChange?: (client: WorkspaceClient, newStatus: 'active' | 'completed') => void;
  onDeleteClient?: (client: WorkspaceClient) => void;
  onRestoreClient?: (client: WorkspaceClient) => void;
}

export const ClientRow: React.FC<ClientRowProps> = ({
  client,
  onSelectClient,
  onOpenQuickAssign,
  onToggleStatus,
  onStatusChange,
  onDeleteClient,
  onRestoreClient,
}) => {
  const ext = parseClientExtended(client);
  const totalPkg = client.total_package_amount || 0;
  const paidAmt = client.paid_amount || 0;
  const dueAmount = Math.max(0, totalPkg - paidAmt);
  const isPaidFull = dueAmount === 0 && totalPkg > 0 && paidAmt > 0;
  const pmName = client.project_manager_name || ext.project_manager_name;

  return (
    <div
      onClick={() => onSelectClient?.(client)}
      className="p-4 rounded-2xl bg-white border border-[#EAE5DA] hover:border-amber-400 hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-12 gap-4 items-center group cursor-pointer"
    >
      {/* Col 1-5: Client Name & Contact */}
      <div className="lg:col-span-5 flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
          {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-800 transition-colors truncate">
            {client.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium truncate">{client.phone}</p>
        </div>
      </div>

      {/* Col 6-7: Event Info */}
      <div className="lg:col-span-2 flex items-center">
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block truncate max-w-full">
          {client.event_type || 'Wedding & Reception'}
        </span>
      </div>

      {/* Col 8-9: Project Manager Badge / Quick Assign */}
      <div className="lg:col-span-2 flex items-center">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenQuickAssign?.(client);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EAE5DA] hover:border-indigo-300 bg-white hover:bg-indigo-50/50 transition-all cursor-pointer shadow-2xs group/pm max-w-full"
          title="Click to Assign or Change Project Manager"
        >
          {pmName ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs shrink-0">
                {pmName.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-black text-slate-900 group-hover/pm:text-indigo-700 truncate max-w-[110px]">
                {pmName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 group-hover/pm:text-indigo-600">
              <UserPlus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600 group-hover/pm:text-indigo-600 whitespace-nowrap">+ Assign PM</span>
            </div>
          )}
        </div>
      </div>

      {/* Col 10-12: Billing & Status */}
      <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3.5 w-full pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
        <div className="text-left lg:text-right space-y-0.5">
          <span className="font-mono font-black text-sm text-slate-900 block">
            ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
          </span>
          <p className="text-[11px] font-bold">
            {isPaidFull ? (
              <span className="text-emerald-600 font-extrabold flex items-center gap-1 lg:justify-end">
                <Check className="w-3 h-3" /> Paid in Full
              </span>
            ) : (
              <span className="text-amber-800">
                Paid: ₹{(client.paid_amount || 0).toLocaleString('en-IN')} • Due: ₹{dueAmount.toLocaleString('en-IN')}
              </span>
            )}
          </p>
        </div>

        {/* Active / Completed Status Dropdown */}
        <ClientStatusDropdown
          status={client.status}
          clientId={client.id}
          onStatusChange={(newStatus) => {
            if (onStatusChange) {
              onStatusChange(client, newStatus);
            } else {
              client.status = newStatus;
            }
          }}
        />

        {/* Soft Delete / Restore Action */}
        {(client.status as string) === 'trash' || (client as any).status === 'trashed' || (client as any).is_deleted === true || (client.notes && typeof client.notes === 'string' && client.notes.includes('[status:trash]')) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRestoreClient?.(client);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] border border-emerald-200 transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
            title="Restore Client"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClient?.(client);
            }}
            className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            title="Move to Trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-400 text-amber-800 group-hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default ClientRow;
