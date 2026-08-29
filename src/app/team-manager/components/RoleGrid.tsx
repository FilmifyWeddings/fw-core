'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Layers, Plus, X, Check } from 'lucide-react';
import { WorkspaceCrewRole, fetchWorkspaceCrewRoles, saveWorkspaceCrewRole, getRoleShortCode, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

interface RoleGridProps {
  selectedRoles: string[];
  onToggle: (role: string) => void;
  onAddCustom: (role: string) => void;
}

export default function RoleGrid({ selectedRoles, onToggle, onAddCustom }: RoleGridProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [customRoleCode, setCustomRoleCode] = useState('');
  const [dbRoles, setDbRoles] = useState<WorkspaceCrewRole[]>(DEFAULT_CREW_ROLES);

  useEffect(() => {
    const loadRoles = async () => {
      const fetched = await fetchWorkspaceCrewRoles();
      if (fetched && fetched.length > 0) setDbRoles(fetched);
    };
    loadRoles();
    window.addEventListener('workspace_crew_roles_updated', loadRoles);
    return () => window.removeEventListener('workspace_crew_roles_updated', loadRoles);
  }, []);

  const handleAddRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customRole.trim()) {
      const newRole = customRole.trim();
      const code = customRoleCode.trim() || getRoleShortCode(newRole);
      onAddCustom(newRole);
      await saveWorkspaceCrewRole('', newRole, code);
      setCustomRole('');
      setCustomRoleCode('');
      setShowCustomInput(false);
    }
  };

  // Combine loaded roles (full names and short codes) and selected roles
  const standardRoleNames = dbRoles.map(r => r.name);
  const standardRoleCodes = dbRoles.map(r => r.short_code);
  const allRoles = Array.from(new Set([...standardRoleCodes, ...standardRoleNames, ...selectedRoles]));

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
          <Users className="w-4 h-4 text-[#6C5CE7]" />
          <span className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider">
            Crew Role Placements ({selectedRoles.length} Selected)
          </span>
        </div>

        {/* RENAME & FIX ROLE SELECTION BUTTON (+ Add Role) */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs font-extrabold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-xl cursor-pointer shadow-2xs active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add Role</span>
        </button>
      </div>

      {/* Custom role input form */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 my-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100">
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                placeholder="Enter custom role (e.g. Drone Operator 2)..."
                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-[#6C5CE7] text-[#0B111E] placeholder:text-slate-400"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="bg-[#6C5CE7] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-[#5b4cd1] transition shadow-md shadow-[#6C5CE7]/20 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add & Select
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role buttons grid with instant visual state reflection */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {allRoles.map((role) => {
          const isSelected = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all inline-flex items-center gap-1 cursor-pointer select-none border ${
                isSelected
                  ? 'bg-[#6C5CE7] text-white shadow-xs border-[#6C5CE7] scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 border-slate-200 shadow-2xs'
              }`}
            >
              <span>{role}</span>
              {isSelected ? (
                <Check className="w-2.5 h-2.5 text-white stroke-[3] shrink-0" />
              ) : (
                <Plus className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
