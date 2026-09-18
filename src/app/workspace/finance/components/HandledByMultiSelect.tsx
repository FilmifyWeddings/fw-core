'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Check, X, Search, ChevronDown, UserCheck, ShieldCheck, 
  Crown, Sparkles, UserX, AlertCircle
} from 'lucide-react';

export interface FinanceTeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  primary_role?: string;
  finance_access?: string;
  isOwner?: boolean;
}

interface HandledByMultiSelectProps {
  value: string; // e.g. "Sushant Nawale, Priya Desai" or "Unassigned"
  onChange: (newValue: string) => void;
  financeMembers: FinanceTeamMember[];
  onAddNewMember?: (name: string) => void;
}

export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const t = name.trim().toLowerCase();
  if (!t) return true;
  return (
    t === 'team member' ||
    t === 'freelancer' ||
    t === 'crew' ||
    t === 'staff' ||
    t === 'unassigned' ||
    t === 'partner' ||
    t === 'lead photo' ||
    t === 'lead editor' ||
    t === 'cinematographer' ||
    t === 'drone operator' ||
    t === 'operations head' ||
    t === 'null' ||
    t === 'undefined'
  );
}

export function extractFinanceMembers(
  workspaceMembers: any[],
  currentUserName?: string | null,
  currentUserEmail?: string | null,
  isOwner?: boolean,
  currentWorkspaceId?: string | null
): FinanceTeamMember[] {
  const result: FinanceTeamMember[] = [];
  const seen = new Set<string>();

  // 1. Resolve logged-in Studio Owner / Admin at the very top
  const cleanOwnerName = (currentUserName && !isPlaceholderName(currentUserName))
    ? currentUserName.trim()
    : 'Studio Owner';

  result.push({
    id: 'current-owner',
    name: cleanOwnerName,
    email: currentUserEmail || undefined,
    role: 'owner',
    primary_role: 'Studio Owner',
    finance_access: 'MANAGE',
    isOwner: true,
  });
  seen.add(cleanOwnerName.toLowerCase());

  // 2. Iterate workspace members strictly belonging to active workspace
  (workspaceMembers || []).forEach(m => {
    // Check workspace scoping
    if (currentWorkspaceId && m.workspace_id && m.workspace_id !== currentWorkspaceId && m.workspace_id !== 'all') {
      return;
    }

    const rawName = m.name || m.full_name;
    if (!rawName) return;
    const cleanName = rawName.trim();

    // Reject placeholder / generic names
    if (isPlaceholderName(cleanName)) return;

    // Avoid duplicates (Owner already added)
    if (seen.has(cleanName.toLowerCase())) return;

    const role = (m.role || '').toLowerCase();

    // Check permissions
    let perms = m.permissions;
    if (!perms && Array.isArray(m.member_permissions) && m.member_permissions.length > 0) {
      perms = m.member_permissions[0];
    } else if (!perms && m.member_permissions && typeof m.member_permissions === 'object') {
      perms = m.member_permissions;
    }
    if (!perms && m.studio_member_permissions) {
      perms = m.studio_member_permissions;
    }

    const fAccessRaw = perms?.finance_access || m.finance_access;
    const fAccessStr = String(fAccessRaw || '').trim().toUpperCase();

    // If explicitly negative or empty, reject (unless role === 'admin')
    if (['NONE', 'HIDDEN', 'FALSE', 'NO_ACCESS', '0', 'NULL', 'UNDEFINED', ''].includes(fAccessStr)) {
      if (role !== 'admin') return;
    }

    const hasFinance = [
      'MANAGE', 'ALL_MANAGE', 'FULL_ACCESS',
      'VIEW', 'VIEW_ONLY', 'ASSIGNED_ONLY',
      'ASSIGNED_ONLY_VIEW', 'EDIT', 'TRUE'
    ].includes(fAccessStr) ||
      fAccessStr.includes('VIEW') ||
      fAccessStr.includes('MANAGE') ||
      fAccessStr.includes('ACCESS');

    if (!hasFinance && role !== 'admin') {
      return;
    }

    seen.add(cleanName.toLowerCase());

    const cleanPrimaryRole = (!isPlaceholderName(m.primary_role) ? m.primary_role : null) ||
      (role === 'admin' ? 'Studio Admin' : fAccessStr.includes('MANAGE') ? 'Finance Manager' : 'Finance Access');

    result.push({
      id: m.id || cleanName,
      name: cleanName,
      email: m.email || undefined,
      role: m.role || 'member',
      primary_role: cleanPrimaryRole,
      finance_access: fAccessStr || (role === 'admin' ? 'MANAGE' : 'VIEW'),
      isOwner: false,
    });
  });

  return result;
}

export function HandledByMultiSelect({
  value,
  onChange,
  financeMembers,
  onAddNewMember,
}: HandledByMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected list from value string, ignoring placeholders
  const selectedMembers = useMemo(() => {
    if (!value || value === 'Unassigned' || value.trim() === '') return [];
    return value
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !isPlaceholderName(s));
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingCustom(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > 250) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setIsOpen(prev => !prev);
  };

  // Strictly display only verified finance members (Studio Owner + permitted members)
  const combinedMembers = useMemo(() => {
    return financeMembers;
  }, [financeMembers]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return combinedMembers;
    const q = searchQuery.toLowerCase().trim();
    return combinedMembers.filter(m => 
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.primary_role && m.primary_role.toLowerCase().includes(q))
    );
  }, [combinedMembers, searchQuery]);

  const toggleMember = (name: string) => {
    if (isPlaceholderName(name)) return;
    let next: string[];
    if (selectedMembers.includes(name)) {
      next = selectedMembers.filter(n => n !== name);
    } else {
      next = [...selectedMembers, name];
    }
    const newVal = next.length > 0 ? next.join(', ') : 'Unassigned';
    onChange(newVal);
  };

  const selectUnassigned = () => {
    onChange('Unassigned');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    const clean = customInput.trim();
    if (isPlaceholderName(clean)) {
      setCustomInput('');
      setIsAddingCustom(false);
      return;
    }
    if (onAddNewMember) {
      onAddNewMember(clean);
    }
    toggleMember(clean);
    setCustomInput('');
    setIsAddingCustom(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      {/* ── 3D CREAMY TRIGGER BUTTON ── */}
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-950 border border-amber-400 shadow-[0_2px_8px_rgba(217,119,6,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] ring-2 ring-amber-300/40'
            : 'bg-gradient-to-b from-amber-50/90 to-amber-100/50 text-amber-950 border border-amber-200/90 hover:border-amber-300 hover:bg-amber-100/70 shadow-[0_1px_3px_rgba(217,119,6,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
        }`}
      >
        <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Handled by:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {selectedMembers.length === 0 ? (
            <span className="text-slate-400 font-semibold italic text-[11px]">Unassigned</span>
          ) : selectedMembers.length === 1 ? (
            <span className="text-purple-800 font-extrabold text-[11px] truncate max-w-[140px] sm:max-w-[200px]">
              {selectedMembers[0]}
            </span>
          ) : selectedMembers.length === 2 ? (
            <span className="text-purple-800 font-extrabold text-[11px] truncate max-w-[180px] sm:max-w-[240px]">
              {selectedMembers.join(', ')}
            </span>
          ) : (
            <span className="text-purple-800 font-extrabold text-[11px] truncate max-w-[200px]">
              {selectedMembers[0]} <span className="text-purple-600 font-black">+{selectedMembers.length - 1} more</span>
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-amber-800 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── 3D CREAMY MULTI-SELECT DROPDOWN POPOVER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: dropUp ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 ${
              dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } w-72 sm:w-84 bg-[#FFFDF9] border border-amber-200/90 rounded-2xl shadow-[0_20px_45px_rgba(45,30,10,0.18),0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] z-[999] overflow-hidden`}
          >
            {/* 1. Header with Title & Search Bar */}
            <div className="p-2.5 bg-gradient-to-b from-amber-50/80 to-[#FFFDF9] border-b border-amber-100/80">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Finance Handlers
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 border border-amber-200/80 px-1.5 py-0.5 rounded-full">
                  Finance Access Only
                </span>
              </div>

              {/* Sticky Search Input */}
              <div className="flex items-center gap-1.5 bg-white border border-amber-200/90 rounded-xl px-2.5 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search finance team..."
                  className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Selection Summary & Reset Bar */}
            <div className="px-3 py-1.5 bg-amber-50/40 border-b border-amber-100/60 flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>
                {selectedMembers.length === 0 ? (
                  <span className="text-slate-400 italic">No members selected</span>
                ) : (
                  <span className="text-amber-950 font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'} selected
                  </span>
                )}
              </span>
              {selectedMembers.length > 0 && (
                <button
                  type="button"
                  onClick={selectUnassigned}
                  className="text-rose-600 hover:text-rose-700 font-extrabold hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* 3. Scrollable List of Members */}
            <div className="max-h-60 overflow-y-auto divide-y divide-amber-50/70 py-1">
              {/* Option: Unassigned */}
              <div
                onClick={selectUnassigned}
                className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  selectedMembers.length === 0
                    ? 'bg-amber-100/60'
                    : 'hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                    <UserX className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-700 block">
                      Unassigned
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 block">
                      Clear current assignment
                    </span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                  selectedMembers.length === 0
                    ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                    : 'border-slate-300 bg-white hover:border-amber-400'
                }`}>
                  {selectedMembers.length === 0 && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Members with Finance Access */}
              {filteredMembers.map((m) => {
                const isSelected = selectedMembers.includes(m.name);
                return (
                  <div
                    key={m.id || m.name}
                    onClick={() => toggleMember(m.name)}
                    className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-100/50 hover:bg-amber-100/70'
                        : 'hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {m.name}
                          </span>
                          {m.isOwner && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                              👑 Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 block truncate">
                          {m.primary_role || (m.isOwner ? 'Studio Owner' : 'Finance Team')}
                        </span>
                      </div>
                    </div>

                    {/* 3D Checkbox */}
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                        : 'border-slate-300 bg-white hover:border-amber-400'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="py-6 px-3 text-center text-slate-400">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No finance members found</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Only team members with granted finance permissions appear here.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Footer: + Add Custom Handler Option */}
            {onAddNewMember && (
              <div className="p-2 border-t border-amber-100 bg-amber-50/40">
                {isAddingCustom ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Handler name..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                      className="w-full text-xs font-bold px-2 py-1 bg-white border border-amber-300 rounded-lg focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="p-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="w-full text-center text-[10px] font-black text-amber-800 hover:text-amber-950 py-1 hover:bg-amber-100/50 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>+ Add Custom Handler</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
