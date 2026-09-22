'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Plus, Minus, Trash2, Sparkles, Check } from 'lucide-react';
import { WorkspaceCrewRole, saveWorkspaceCrewRole, getRoleShortCode, DEFAULT_CREW_ROLES, parseRoleAndNumber, formatRoleWithNumber } from '@/lib/workspace-settings';
import { useWorkspaceData } from '@/context/WorkspaceDataContext';

interface RoleGridProps {
  selectedRoles: string[];
  onToggle?: (role: string) => void;
  onIncrement?: (role: string) => void;
  onDecrement?: (role: string) => void;
  onRemoveAll?: (role: string) => void;
  onAddCustom: (role: string) => void;
}

// Maps short codes or raw names to clean, readable full names
const getReadableRoleName = (rawName: string, code: string): string => {
  const { baseRole, number } = parseRoleAndNumber(rawName);
  const clean = baseRole.trim();
  const upper = clean.toUpperCase();
  const upperCode = (code || '').toUpperCase();

  let readable = clean;
  if (upper === 'CV' || upperCode === 'CV' || clean.toLowerCase() === 'cinematic') readable = 'Cinematographer';
  else if (upper === 'CP' || upperCode === 'CP') readable = 'Candid Photographer';
  else if (upper === 'TP' || upperCode === 'TP') readable = 'Traditional Photographer';
  else if (upper === 'TV' || upperCode === 'TV') readable = 'Traditional Videographer';
  else if (upper === 'DP' || upperCode === 'DP') readable = 'Drone Pilot';
  else if (upper === 'AS' || upperCode === 'AS' || upper === 'AST') readable = 'Assistant';
  else if (upper === 'RC' || upperCode === 'RC') readable = 'Reels Creator';
  else if (upper === 'TM' || upperCode === 'TM') readable = 'Team Manager';
  else if (upper === 'SP' || upperCode === 'SP') readable = 'Sales Person';
  else if (upper === 'P' || upper === 'PH' || upperCode === 'P' || upperCode === 'PH') readable = 'Photographer';
  else if (upper === 'PM' || upperCode === 'PM') readable = 'Project Manager';
  else if (upper === 'FP' || upperCode === 'FP') readable = 'Family Photographer';
  else if (upper === 'LS' || upperCode === 'LS') readable = 'Live Streaming';
  else if (upper === 'CRW') readable = 'Crew Member';
  else if (clean.length > 2) readable = clean;
  else readable = clean || code;

  return formatRoleWithNumber(readable, number);
};

export default function RoleGrid({
  selectedRoles,
  onToggle,
  onIncrement,
  onDecrement,
  onRemoveAll,
  onAddCustom
}: RoleGridProps) {
  const { crewRoles } = useWorkspaceData();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [customRoleCode, setCustomRoleCode] = useState('');
  const [dbRoles, setDbRoles] = useState<WorkspaceCrewRole[]>(() => {
    if (crewRoles && crewRoles.length > 0) return crewRoles;
    return DEFAULT_CREW_ROLES;
  });

  useEffect(() => {
    if (crewRoles && crewRoles.length > 0) {
      setDbRoles(crewRoles);
    }
  }, [crewRoles]);

  const handleIncrement = (roleName: string) => {
    if (onIncrement) {
      onIncrement(roleName);
    } else if (onToggle) {
      onToggle(roleName);
    }
  };

  const handleDecrement = (roleName: string) => {
    if (onDecrement) {
      onDecrement(roleName);
    } else if (onToggle) {
      onToggle(roleName);
    }
  };

  const handleRemoveAll = (roleName: string) => {
    if (onRemoveAll) {
      onRemoveAll(roleName);
    } else {
      const count = getItemCount({ name: roleName, code: getRoleShortCode(roleName, dbRoles) });
      for (let i = 0; i < count; i++) {
        handleDecrement(roleName);
      }
    }
  };

  const handleAddRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customRole.trim()) {
      const newRole = customRole.trim();
      const code = (customRoleCode.trim() || getRoleShortCode(newRole, dbRoles)).toUpperCase();
      onAddCustom(newRole);
      handleIncrement(newRole);
      const saved = await saveWorkspaceCrewRole('', newRole, code);
      if (saved) {
        setDbRoles(prev => [...prev.filter(r => r.name.toLowerCase() !== newRole.toLowerCase()), saved]);
      }
      setCustomRole('');
      setCustomRoleCode('');
      setShowCustomInput(false);
    }
  };

  // Build authoritative list of roles (deduplicated by both canonical name and short code)
  const seenKeys = new Set<string>();
  const displayItems: Array<{ name: string; code: string }> = [];

  const addDisplayItem = (name: string, rawCode?: string) => {
    const { baseRole } = parseRoleAndNumber(name);
    const cleanName = baseRole.trim();
    if (!cleanName) return;
    const cleanCode = (rawCode || getRoleShortCode(cleanName, dbRoles)).trim().toUpperCase();

    const nameKey = cleanName.toLowerCase();
    const codeKey = cleanCode.toLowerCase();

    // Prevent duplicate pills (e.g. if both 'CV' and 'Cinematographer' exist)
    if (seenKeys.has(nameKey) || seenKeys.has(codeKey)) {
      return;
    }

    seenKeys.add(nameKey);
    seenKeys.add(codeKey);
    displayItems.push({
      name: cleanName,
      code: cleanCode
    });
  };

  dbRoles.forEach(r => {
    addDisplayItem(r.name, r.short_code);
  });

  // Ensure any selected roles not in dbRoles are also included
  selectedRoles.forEach(sel => {
    addDisplayItem(sel);
  });

  // Count instances for an item (matching name or short code across base roles)
  const getItemCount = (item: { name: string; code: string }): number => {
    const targetName = item.name.trim().toLowerCase();
    const targetCode = item.code.trim().toLowerCase();
    return selectedRoles.filter(r => {
      const { baseRole } = parseRoleAndNumber(r);
      const rClean = baseRole.trim().toLowerCase();
      if (!rClean) return false;
      if (rClean === targetName || rClean === targetCode) return true;
      const rCode = getRoleShortCode(rClean, dbRoles).toLowerCase();
      return rCode === targetCode;
    }).length;
  };

  // Partition into Active (Allocated) and Available to add
  const activeItems: Array<{ name: string; code: string; readableName: string; count: number }> = [];
  const availableItems: Array<{ name: string; code: string; readableName: string }> = [];

  displayItems.forEach(item => {
    const count = getItemCount(item);
    const readableName = getReadableRoleName(item.name, item.code);
    if (count > 0) {
      activeItems.push({ ...item, readableName, count });
    } else {
      availableItems.push({ ...item, readableName });
    }
  });

  return (
    <div className="space-y-2.5 pt-2">
      {/* Header bar with total slot count */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7]">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-black text-[#0B111E] uppercase tracking-wider">
            Crew Role Placements
          </span>
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#6C5CE7] text-white shadow-2xs">
            {selectedRoles.length} {selectedRoles.length === 1 ? 'Slot' : 'Slots'} Selected
          </span>
        </div>

        {/* Add Custom Role Button */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs font-extrabold text-[#6C5CE7] hover:text-[#5b4cd1] transition flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-xl cursor-pointer shadow-2xs active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Custom Role</span>
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
                <span>Save & Add</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: ALLOCATED CREW CARDS (Active Requirements) */}
      {activeItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
          {activeItems.map((item) => (
            <div
              key={`${item.name}-${item.code}`}
              className="flex items-center justify-between bg-white border border-indigo-200/90 hover:border-[#6C5CE7] rounded-xl px-3 py-2 shadow-2xs transition-all group"
            >
              {/* Left: Role Name & Code badge */}
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="font-mono font-black text-[10px] bg-indigo-50 text-[#6C5CE7] border border-indigo-200/80 px-1.5 py-0.5 rounded-md uppercase shrink-0">
                  {item.code}
                </span>
                <span className="font-extrabold text-xs text-slate-900 truncate leading-tight" title={item.readableName}>
                  {item.readableName}
                </span>
              </div>

              {/* Right: Stepper [-] count [+] and Trash */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-slate-100/90 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleDecrement(item.name)}
                    title={`Remove 1 ${item.readableName}`}
                    aria-label={`Decrease ${item.readableName}`}
                    className="w-5.5 h-5.5 flex items-center justify-center rounded-md bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200/60 shadow-2xs transition active:scale-90 cursor-pointer"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>

                  <span className="w-6 text-center font-black text-xs text-indigo-950 select-none">
                    {item.count}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleIncrement(item.name)}
                    title={`Add another ${item.readableName}`}
                    aria-label={`Increase ${item.readableName}`}
                    className="w-5.5 h-5.5 flex items-center justify-center rounded-md bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white shadow-2xs transition active:scale-90 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAll(item.name)}
                  title={`Remove all ${item.readableName} slots`}
                  aria-label={`Delete ${item.readableName}`}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-90 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-2.5 px-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-center">
          <p className="text-xs font-semibold text-amber-900">
            No crew roles allocated yet. Click any role below to add to this event.
          </p>
        </div>
      )}

      {/* SECTION 2: AVAILABLE ROLES TO ADD */}
      {availableItems.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Available Roles to Add:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableItems.map((item) => (
              <button
                key={`${item.name}-${item.code}`}
                type="button"
                onClick={() => handleIncrement(item.name)}
                title={`Add ${item.readableName}`}
                className="px-2.5 py-1 rounded-xl text-xs font-bold border border-dashed border-slate-300 bg-white hover:bg-indigo-50/80 hover:border-indigo-400 hover:text-indigo-950 text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs group active:scale-95"
              >
                <Plus className="w-3 h-3 text-indigo-500 group-hover:scale-125 transition-transform" />
                <span>{item.readableName}</span>
                <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 font-mono">
                  {item.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
