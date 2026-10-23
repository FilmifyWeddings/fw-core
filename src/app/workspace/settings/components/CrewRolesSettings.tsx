'use client';

import React, { useState } from 'react';
import { 
  Users, Plus, Pencil, Trash2, Loader2, Sparkles, Lock, X
} from 'lucide-react';
import { 
  WorkspaceCrewRole, 
  getRoleShortCode, 
  saveWorkspaceCrewRole, 
  updateWorkspaceCrewRole, 
  deleteWorkspaceCrewRole,
  isCoreDefaultRole 
} from '@/lib/workspace-settings';

interface CrewRolesSettingsProps {
  workspaceId: string;
  crewRoles: WorkspaceCrewRole[];
  loading: boolean;
  onRolesChange: (roles: WorkspaceCrewRole[]) => void;
  onShowToast: (message: string) => void;
}

// Defensive helper for default roles
const checkIsCoreDefault = (roleName?: string | null): boolean => {
  if (!roleName) return false;
  try {
    if (typeof isCoreDefaultRole === 'function') {
      return isCoreDefaultRole(roleName);
    }
  } catch (_) {}
  const clean = roleName.trim().toLowerCase();
  return [
    'sales person',
    'salesperson',
    'team manager',
    'traditional photographer',
    'traditional videographer',
    'candid photographer',
    'cinematographer',
    'family photographer',
    'assistant',
  ].includes(clean);
};

export default function CrewRolesSettings({
  workspaceId,
  crewRoles,
  loading,
  onRolesChange,
  onShowToast,
}: CrewRolesSettingsProps) {
  const [roleSearch, setRoleSearch] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingCrewRole, setEditingCrewRole] = useState<WorkspaceCrewRole | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('');

  // Handle Add Role
  const handleAddRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRoleName.trim() || isSubmitting) return;

    const cleanName = newRoleName.trim();
    const cleanCode = (newRoleCode.trim() || getRoleShortCode(cleanName)).toUpperCase();

    if (crewRoles.some(r => r.name.toLowerCase() === cleanName.toLowerCase())) {
      onShowToast(`Crew Role "${cleanName}" already exists!`);
      return;
    }
    if (crewRoles.some(r => r.short_code.toUpperCase() === cleanCode)) {
      onShowToast(`Short code "${cleanCode}" is already in use by role "${crewRoles.find(r => r.short_code.toUpperCase() === cleanCode)?.name}"!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await saveWorkspaceCrewRole(workspaceId, cleanName, cleanCode, 'Crew');
      if (created) {
        onRolesChange([...crewRoles.filter(r => r.name.toLowerCase() !== cleanName.toLowerCase()), created]);
        setNewRoleName('');
        setNewRoleCode('');
        onShowToast(`Crew Role "${cleanName} (${cleanCode})" added & synced!`);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to add role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Role
  const handleUpdateRole = async () => {
    if (!editingCrewRole || !editRoleName.trim()) return;
    const cleanName = editRoleName.trim();
    const cleanCode = (editRoleCode.trim() || getRoleShortCode(cleanName)).toUpperCase();

    if (editingCrewRole.is_default || checkIsCoreDefault(editingCrewRole.name)) {
      onShowToast(`"${editingCrewRole.name}" is a core permanent studio role and cannot be modified.`);
      setEditingCrewRole(null);
      return;
    }

    if (crewRoles.some(r => r.id !== editingCrewRole.id && r.name.toLowerCase() === cleanName.toLowerCase())) {
      onShowToast(`Another crew role named "${cleanName}" already exists!`);
      return;
    }
    if (crewRoles.some(r => r.id !== editingCrewRole.id && r.short_code.toUpperCase() === cleanCode)) {
      onShowToast(`Short code "${cleanCode}" is already in use by role "${crewRoles.find(r => r.id !== editingCrewRole.id && r.short_code.toUpperCase() === cleanCode)?.name}"!`);
      return;
    }

    try {
      const updated = await updateWorkspaceCrewRole(editingCrewRole.id, cleanName, cleanCode, editingCrewRole.category, workspaceId);
      if (updated) {
        onRolesChange(crewRoles.map(r => r.id === editingCrewRole.id ? updated : r));
        onShowToast(`Role updated to "${cleanName} (${cleanCode})"`);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update role');
    } finally {
      setEditingCrewRole(null);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async (item: WorkspaceCrewRole) => {
    if (item.is_default || checkIsCoreDefault(item.name)) {
      onShowToast(`"${item.name}" is a core permanent studio role and cannot be deleted.`);
      return;
    }

    if (!confirm(`Delete crew role "${item.name}"?`)) return;

    try {
      const success = await deleteWorkspaceCrewRole(item.id, workspaceId);
      if (success) {
        onRolesChange(crewRoles.filter(r => r.id !== item.id));
        onShowToast(`Crew role "${item.name}" removed`);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete role');
    }
  };

  // Core Default Lineup in exact requested order
  const getLineupIndex = (name: string): number => {
    const clean = name.toLowerCase().trim();
    if (clean === 'sales person' || clean === 'salesperson') return 0;
    if (clean === 'team manager') return 1;
    if (clean === 'traditional photographer') return 2;
    if (clean === 'traditional videographer') return 3;
    if (clean === 'candid photographer') return 4;
    if (clean === 'cinematographer') return 5;
    if (clean === 'family photographer') return 6;
    if (clean === 'assistant') return 7;
    return -1;
  };

  const uniqueRolesMap = new Map<string, WorkspaceCrewRole>();
  for (const r of crewRoles) {
    const k = r.name.toLowerCase().trim();
    if (!uniqueRolesMap.has(k)) {
      uniqueRolesMap.set(k, r);
    }
  }

  const sortedRoles = Array.from(uniqueRolesMap.values()).sort((a, b) => {
    const aIdx = getLineupIndex(a.name);
    const bIdx = getLineupIndex(b.name);

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return (a.display_order || 0) - (b.display_order || 0);
  });

  const filteredRoles = sortedRoles.filter(r => 
    r.name.toLowerCase().includes(roleSearch.toLowerCase()) || 
    r.short_code.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="bg-[#FFFDF9] dark:bg-[#181614] border border-[#EAE5DA] dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DA] dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-stone-100">
              Crew Roles &amp; Short Codes Settings
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-stone-400">
              Configure crew roles with standardized short codes (SP, TM, TP, TV, CP, CV, FP, AS) for shoot rosters &amp; lead owners.
            </p>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search roles or codes..."
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs font-medium text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <Users className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Add New Crew Role Form */}
      <form onSubmit={handleAddRole} className="p-4 bg-[#FAF8F5] dark:bg-stone-900/60 border border-[#EAE5DA] dark:border-stone-800 rounded-2xl space-y-3">
        <h4 className="text-xs font-black text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          + Add New Crew Role &amp; Short Code
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Full Role Name (e.g. Drone Pilot, Jimmy Jib Operator)..."
            value={newRoleName}
            onChange={e => {
              setNewRoleName(e.target.value);
              if (!newRoleCode) setNewRoleCode(getRoleShortCode(e.target.value));
            }}
            className="sm:col-span-2 px-3.5 py-2 bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs font-bold text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Short Code (e.g. DP)..."
              value={newRoleCode}
              onChange={e => setNewRoleCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs font-black text-amber-700 dark:text-amber-400 uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={!newRoleName.trim() || isSubmitting}
            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>
      </form>

      {/* Crew Roles List - Divided into 2 spacious columns with single-line role names */}
      {loading && crewRoles.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span className="text-xs font-bold">Loading crew roles from database...</span>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-8 text-xs font-bold text-slate-400 bg-amber-50/30 dark:bg-stone-900/30 rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800">
          No crew roles matching search. Click &quot;+ Add Role&quot; above to create a crew role.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {filteredRoles.map((item) => {
            const isSalesPerson = item.name.toLowerCase().trim() === 'sales person' || item.name.toLowerCase().trim() === 'salesperson' || item.short_code.toUpperCase() === 'SP';
            const isDefault = Boolean(item.is_default || checkIsCoreDefault(item.name));

            return (
              <div
                key={item.id}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border shadow-2xs transition group min-h-[64px] ${
                  isSalesPerson
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 hover:border-amber-400'
                    : 'bg-white dark:bg-stone-900 border-[#EAE5DA] dark:border-stone-800 hover:border-amber-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Left: Code Box + Full Name on ONE single line */}
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                  <div
                    className={`w-9 h-9 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border shadow-2xs ${
                      isSalesPerson
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {item.short_code}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span 
                      className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-stone-100 block truncate whitespace-nowrap tracking-tight"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* Right: Default badge OR Action Buttons */}
                <div className="shrink-0 flex items-center">
                  {isDefault ? (
                    <span
                      title="Core default studio role (Permanent)"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 shadow-2xs"
                    >
                      <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span>Default</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCrewRole(item);
                          setEditRoleName(item.name);
                          setEditRoleCode(item.short_code);
                        }}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 rounded-lg transition cursor-pointer shadow-2xs"
                        title="Edit Role & Code"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(item)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 rounded-lg transition cursor-pointer shadow-2xs"
                        title={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Crew Role Modal */}
      {editingCrewRole && (
        <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFDF9] dark:bg-[#181614] rounded-2xl p-5 max-w-sm w-full border border-[#EAE5DA] dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-stone-100">Edit Crew Role</h3>
              <button
                type="button"
                onClick={() => setEditingCrewRole(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 block mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={e => setEditRoleName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs font-bold text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 block mb-1">
                  Short Code
                </label>
                <input
                  type="text"
                  value={editRoleCode}
                  onChange={e => setEditRoleCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-xs font-black text-amber-700 dark:text-amber-400 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCrewRole(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
