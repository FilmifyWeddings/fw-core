'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, UserPlus } from 'lucide-react';

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

  const handleAddRole = () => {
    if (customRole.trim()) {
      onAddCustom(customRole.trim());
      setCustomRole('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider">
          Role Placements For This Subevent
        </span>

        {/* ADD SLOTS ICON BUTTON */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs font-extrabold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg cursor-pointer shadow-2xs hover:bg-indigo-100/80 active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add Slots</span>
        </button>
      </div>

      {/* Custom role input */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                placeholder="Enter custom role (e.g. Drone Operator 2)..."
                className="flex-1 bg-[#F8F9FD] border border-[#6C5CE7]/10 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#6C5CE7] text-[#0B111E]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="bg-[#6C5CE7] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5b4cd1] transition"
              >
                Add Role Slot
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role buttons grid */}
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_ROLES.map((role) => {
          const isSelected = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-[#6C5CE7] text-white shadow-sm shadow-[#6C5CE7]/20 border border-[#6C5CE7]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{role}</span>
              {isSelected && <X className="w-3 h-3 text-white/80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
