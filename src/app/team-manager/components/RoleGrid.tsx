'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-[#4F5E74] uppercase tracking-wider">
          Role Placements For This Subevent
        </span>
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-[9px] font-bold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" />
          Add Custom Role Requirement
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
                placeholder="e.g. Drone 2, Junior Cine..."
                className="flex-1 bg-[#F8F9FD] border border-[#6C5CE7]/10 px-3 py-1.5 rounded-lg text-[11px] font-semibold focus:outline-none focus:border-[#6C5CE7] transition text-[#0B111E]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="bg-[#6C5CE7] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#5b4cd1] transition"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomRole(''); }}
                className="text-zinc-400 hover:text-zinc-600 transition p-1.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role chip grid */}
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_ROLES.map((role) => {
          const isActive = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                isActive
                  ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/10'
                  : 'bg-white border-zinc-200 text-[#4F5E74] hover:border-[#6C5CE7]/30'
              }`}
            >
              {role}
            </button>
          );
        })}
        {selectedRoles
          .filter(r => !DEFAULT_ROLES.includes(r))
          .map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/10"
            >
              {role}
            </button>
          ))}
      </div>
    </div>
  );
}
