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
      const code = (customRoleCode.trim() || getRoleShortCode(newRole, dbRoles)).toUpperCase();
      onAddCustom(newRole);
      const saved = await saveWorkspaceCrewRole('', newRole, code);
      if (saved) {
        setDbRoles(prev => [...prev.filter(r => r.name.toLowerCase() !== newRole.toLowerCase()), saved]);
      }
      setCustomRole('');
      setCustomRoleCode('');
      setShowCustomInput(false);
    }
  };

  // Build authoritative list of roles from Settings + any already selected custom role
  const displayItems = dbRoles.map(r => ({
    name: r.name,
    code: r.short_code || getRoleShortCode(r.name, dbRoles)
  }));

  // Ensure any selected roles not in dbRoles are also displayed
  selectedRoles.forEach(sel => {
    const exists = displayItems.some(d => d.name.toLowerCase() === sel.toLowerCase() || d.code.toLowerCase() === sel.toLowerCase());
    if (!exists) {
      displayItems.push({
        name: sel,
        code: getRoleShortCode(sel, dbRoles)
      });
    }
  });

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
          <Users className="w-4 h-4 text-[#6C5CE7]" />
          <span className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider">
            Crew Role Placements ({selectedRoles.length} Selected)
          </span>
        </div>

        {/* Add Role Button */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs font-extrabold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-xl cursor-pointer shadow-2xs active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add Role</span>
        </button>
      </div>

      {/* Custom role input form with Role Name AND Short Form inputs */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-2 my-2 bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200 shadow-sm">
              <input
                type="text"
                value={customRole}
                onChange={(e) => {
                  setCustomRole(e.target.value);
                  if (!customRoleCode) setCustomRoleCode(getRoleShortCode(e.target.value, dbRoles));
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                placeholder="Role Name (e.g. Drone Pilot)..."
                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-[#6C5CE7] text-[#0B111E] placeholder:text-slate-400"
                autoFocus
              />
              <input
                type="text"
                value={customRoleCode}
                onChange={(e) => setCustomRoleCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                placeholder="Short Form (e.g. DP)..."
                className="w-full sm:w-32 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black uppercase text-indigo-600 focus:outline-none focus:border-[#6C5CE7] placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="bg-[#6C5CE7] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-[#5b4cd1] transition shadow-md shadow-[#6C5CE7]/20 flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Role</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role buttons grid showing Short Form with Full Name in Tooltip */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {displayItems.map((item) => {
          const isSelected = selectedRoles.some(r => r.toLowerCase() === item.name.toLowerCase() || r.toLowerCase() === item.code.toLowerCase());
          return (
            <button
              key={`${item.name}-${item.code}`}
              type="button"
              title={`${item.name} (${item.code})`}
              onClick={() => onToggle(item.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer select-none border group/pill ${
                isSelected
                  ? 'bg-[#6C5CE7] text-white shadow-xs border-[#6C5CE7] scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 border-slate-200 shadow-2xs'
              }`}
            >
              <span className={`font-black text-xs ${isSelected ? 'text-white' : 'text-indigo-600'}`}>{item.code}</span>
              {isSelected ? (
                <Check className="w-3 h-3 text-white stroke-[3] shrink-0" />
              ) : (
                <Plus className="w-3 h-3 text-slate-400 group-hover/pill:text-indigo-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
