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
        <span className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider">
          Role Placements For This Subevent
        </span>
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs font-extrabold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
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
                className="flex-1 bg-white border-2 border-slate-200 px-3 py-1.5 rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#6C5CE7] transition text-slate-900 shadow-2xs"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="bg-[#6C5CE7] text-white text-xs font-black px-4 py-1.5 rounded-xl hover:bg-[#5b4cd1] transition shadow-xs cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomRole(''); }}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role chip grid */}
      <div className="flex flex-wrap gap-2">
        {DEFAULT_ROLES.map((role) => {
          const isActive = selectedRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30 scale-105'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:text-indigo-600 shadow-2xs'
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
