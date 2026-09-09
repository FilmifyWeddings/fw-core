'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FWProject, FWTeamMember } from '@/types';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';
import { ChevronDown, Search, UserCheck, Users, Calendar, MapPin } from 'lucide-react';

/**
 * ⚡ Bidirectional PM Assignment for Bookings & Events
 * Updates fw_projects and concurrently pushes to workspace_clients
 */
export const handleUpdateBookingPM = async (
  projectId: string,
  clientId: string | null,
  clientName: string,
  member: any | null
) => {
  const pmId = member ? member.id : null;
  const pmName = member ? member.name : null;

  // 1. Update Project in fw_projects
  try {
    await supabase
      .from('fw_projects')
      .update({
        project_manager_id: pmId,
        project_manager_name: pmName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  } catch (err) {
    console.error('[handleUpdateBookingPM] Error updating fw_projects:', err);
  }

  // 2. Dual-sync to Client Directory (workspace_clients)
  try {
    let clientQuery = supabase.from('workspace_clients').select('id, name, notes');
    if (clientId) {
      clientQuery = clientQuery.eq('id', clientId);
    } else if (clientName) {
      clientQuery = clientQuery.ilike('name', clientName.trim());
    }
    const { data: matchedClients } = await clientQuery;

    if (matchedClients && matchedClients.length > 0) {
      for (const c of matchedClients) {
        let updatedNotes = c.notes;
        try {
          const ext = parseClientExtended(c as any);
          const updatedExt = {
            ...ext,
            project_manager_id: pmId || '',
            project_manager_name: pmName || '',
          };
          updatedNotes = serializeClientExtended(updatedExt);
        } catch (e) {}

        const { error: cErr } = await supabase
          .from('workspace_clients')
          .update({
            project_manager_id: pmId,
            project_manager_name: pmName,
            notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id);

        if (cErr) {
          await supabase
            .from('workspace_clients')
            .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
            .eq('id', c.id);
        }
      }
    } else {
      if (clientId) {
        await supabase
          .from('workspace_clients')
          .update({
            project_manager_id: pmId,
            project_manager_name: pmName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId);
      } else if (clientName) {
        await supabase
          .from('workspace_clients')
          .update({
            project_manager_id: pmId,
            project_manager_name: pmName,
            updated_at: new Date().toISOString(),
          })
          .ilike('name', clientName.trim());
      }
    }
  } catch (syncErr) {
    console.warn('[handleUpdateBookingPM] Dual-sync to workspace_clients error:', syncErr);
  }
};

export interface ProjectBookingCardProps {
  project: FWProject;
  teamMembers: FWTeamMember[];
  onPMChange?: (projectId: string, memberId: string | null, memberName: string | null) => void;
}

export const ProjectBookingCard: React.FC<ProjectBookingCardProps> = ({
  project,
  teamMembers,
  onPMChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleSelect = async (member: FWTeamMember | null) => {
    setDropdownOpen(false);
    setSearch('');
    const mId = member ? member.id : null;
    const mName = member ? member.name : null;
    if (onPMChange) {
      onPMChange(project.id, mId, mName);
    }
    await handleUpdateBookingPM(project.id, project.client_id || null, project.client_name, member);
  };

  const filteredMembers = teamMembers.filter((m) =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.primary_role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer group"
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">PM:</span>
        {project.project_manager_name ? (
          <span className="font-extrabold text-amber-950 max-w-[130px] truncate">
            {project.project_manager_name}
          </span>
        ) : (
          <span className="text-amber-700/80 italic font-semibold">Assign PM</span>
        )}
        <ChevronDown className="w-3 h-3 text-amber-700 group-hover:translate-y-0.5 transition-transform" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 z-[9999] w-64 max-h-80 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-slate-800">
          <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span>Assign Project Manager</span>
            {project.project_manager_name && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-rose-500 hover:underline cursor-pointer font-bold"
              >
                Clear PM
              </button>
            )}
          </div>

          <div className="relative px-1 pt-1 pb-0.5">
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredMembers.map((m) => {
              const isSelected = project.project_manager_id === m.id || project.project_manager_name === m.name;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold leading-tight truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight truncate">{m.primary_role || 'Crew'}</p>
                    </div>
                  </div>
                  {isSelected && <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBookingCard;
