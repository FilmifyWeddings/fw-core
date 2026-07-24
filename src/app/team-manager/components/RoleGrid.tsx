'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Layers, Plus, X, Check } from 'lucide-react';

const DEFAULT_ROLES = [
  'TM', 'Ass', 'TP', 'TV', 'CP', 'CV', 'Dron', 'Makeup Art',
  'Cine 2', 'Candid 2', 'Face AI', 'Social Media', 'Reel',
  'Family Photographer', 'CV 2nd Gim', '2 Ass', 'Live Camera',
];

interface RoleGridProps {
  selectedRoles: string[];
  onToggle: (role: string) => void;
  onAddCustom: (role: string) => void;
}

export default function RoleGrid({ selectedRoles, onToggle, onAddCustom }: RoleGridProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRole, setCustomRole] = useState('');

  const handleAddRole = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customRole.trim()) {
      const newRole = customRole.trim();
      onAddCustom(newRole);
      setCustomRole('');
      setShowCustomInput(false);
    }
  };

  // Combine default roles and any custom selected roles to ensure 100% visible pills
  const allRoles = Array.from(new Set([...DEFAULT_ROLES, ...selectedRoles]));

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
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/25 border-2 border-[#6C5CE7] scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90 shadow-2xs'
              }`}
            >
              <span>{role}</span>
              {isSelected ? (
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              ) : (
                <Plus className="w-3 h-3 text-slate-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
