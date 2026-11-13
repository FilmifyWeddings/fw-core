'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, ShieldCheck, Users, X } from 'lucide-react';
import { getGroupedTeamMembers, getMemberDisplayRole } from '@/lib/team-helpers';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

function getInitials(name?: string | null): string {
  if (!name) return 'TM';
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface UnifiedTeamAssignDropdownProps {
  selectedId?: string | null;
  selectedName?: string | null;
  teamMembers: any[];
  onSelect: (member: {
    id: string | null;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    primary_role?: string | null;
    roles?: string[];
    avatar_url?: string | null;
  }) => void;
  labelPrefix?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  triggerClassName?: string;
  variant?: 'pill' | 'select-input' | 'minimal';
}

export default function UnifiedTeamAssignDropdown({
  selectedId,
  selectedName,
  teamMembers = [],
  onSelect,
  labelPrefix = 'PM:',
  placeholder = 'Assign PM',
  searchPlaceholder = 'Search team member...',
  disabled = false,
  allowClear = true,
  align = 'left',
  size = 'md',
  triggerClassName = '',
  variant = 'pill'
}: UnifiedTeamAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });
  const [isMounted, setIsMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Resolve selected member across all members
  const selectedMember = useMemo(() => {
    if (!selectedId && !selectedName) return null;
    return teamMembers.find(m => 
      (selectedId && m.id === selectedId) ||
      (selectedName && m.name && m.name.toLowerCase().trim() === selectedName.toLowerCase().trim())
    ) || null;
  }, [teamMembers, selectedId, selectedName]);

  const activeName = selectedMember?.name || selectedName || '';
  const isAssigned = Boolean(activeName && !['unassigned', 'none', 'not fixed', 'tbd', 'null', 'undefined'].includes(activeName.toLowerCase().trim()));

  // 2. Group & Deduplicate In-House and Freelancer team members
  const { inHouse, freelancers } = useMemo(() => {
    return getGroupedTeamMembers(teamMembers);
  }, [teamMembers]);

  // 3. Filter members by search query
  const q = searchQuery.toLowerCase().trim();
  const filterMember = (m: any) => {
    if (!q) return true;
    const nameMatch = (m.name || '').toLowerCase().includes(q);
    const roleMatch = getMemberDisplayRole(m).toLowerCase().includes(q);
    const emailMatch = (m.email || '').toLowerCase().includes(q);
    return nameMatch || roleMatch || emailMatch;
  };

  const inHouseFiltered = useMemo(() => inHouse.filter(filterMember), [inHouse, q]);
  const freelancersFiltered = useMemo(() => freelancers.filter(filterMember), [freelancers, q]);

  // 4. Update Portal Coordinates
  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const targetWidth = Math.max(rect.width, 280);
    const estimatedHeight = 360;
    const fitsBelow = rect.bottom + estimatedHeight <= window.innerHeight - 10;
    const topPos = fitsBelow ? rect.bottom + 6 : Math.max(10, rect.top - estimatedHeight - 6);

    let leftPos = align === 'right' ? rect.right - targetWidth : rect.left;
    leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - targetWidth - 10));

    setCoords({
      top: Math.round(topPos),
      left: Math.round(leftPos),
      width: Math.round(targetWidth)
    });
  };

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      const raf = requestAnimationFrame(() => {
        updateCoords();
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updateCoords();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Dynamic Trigger Sizes
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-1 gap-1.5 rounded-xl',
    md: 'text-xs px-2.5 py-1.5 gap-2 rounded-2xl',
    lg: 'text-sm px-3.5 py-2 gap-2.5 rounded-2xl'
  }[size];

  const avatarSizes = {
    sm: 'w-4 h-4 text-[7px]',
    md: 'w-5 h-5 text-[8.5px]',
    lg: 'w-6 h-6 text-[10px]'
  }[size];

  return (
    <>
      {/* ── TRIGGER BUTTON ── */}
      {variant === 'select-input' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 rounded-2xl text-left transition shadow-xs hover:border-amber-400 focus:outline-none cursor-pointer ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          } ${triggerClassName}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isAssigned ? (
              <>
                <div className={`${avatarSizes} rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black flex items-center justify-center shrink-0 overflow-hidden shadow-2xs`}>
                  {selectedMember?.avatar_url ? (
                    <img src={selectedMember.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(activeName)
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-stone-100 truncate block">
                    {activeName}
                  </span>
                  {selectedMember && (
                    <span className="text-[10px] text-slate-400 font-semibold truncate block">
                      {getMemberDisplayRole(selectedMember)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs italic text-slate-400 font-medium">
                {placeholder}
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      ) : (
        /* Default Pill Variant (100% Matching Screenshot) */
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`inline-flex items-center justify-between border transition shadow-xs cursor-pointer select-none ${sizeClasses} ${
            isAssigned
              ? 'bg-amber-50/90 hover:bg-amber-100/90 border-amber-200/90 text-amber-950 font-bold'
              : 'bg-[#FFFDF9] hover:bg-amber-50/80 border-[#EAE5DA] text-slate-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${triggerClassName}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {labelPrefix && (
              <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-850 shrink-0">
                {labelPrefix}
              </span>
            )}

            {isAssigned ? (
              <>
                <div className={`${avatarSizes} rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black flex items-center justify-center shrink-0 overflow-hidden shadow-2xs`}>
                  {selectedMember?.avatar_url ? (
                    <img src={selectedMember.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(activeName)
                  )}
                </div>
                <span className="text-xs font-black text-amber-950 truncate max-w-[130px]">
                  {activeName}
                </span>
              </>
            ) : (
              <span className="text-xs italic text-amber-700/80 font-semibold truncate">
                {placeholder}
              </span>
            )}
          </div>
          <ChevronDown className="w-3 h-3 text-amber-700/80 shrink-0 ml-1" />
        </button>
      )}

      {/* ── FLOATING POPOVER DROPDOWN (PORTAL) ── */}
      {isMounted && isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className="bg-[#FFFDF9] dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-stone-100"
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800 dark:text-stone-100 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Members Scrollable List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
            {/* Option: Unassign / Clear */}
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    id: null,
                    name: null,
                    email: null,
                    phone: null,
                    role: null,
                    primary_role: null,
                    roles: [],
                    avatar_url: null,
                  });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 p-1.5 rounded-xl text-left transition cursor-pointer ${
                  !isAssigned
                    ? 'bg-rose-50 text-rose-950 font-bold border border-rose-200'
                    : 'hover:bg-rose-50/50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-rose-100 text-rose-700 font-black text-[10px] flex items-center justify-center shrink-0">
                    ✕
                  </span>
                  <span className="text-xs font-semibold">Unassigned / Clear</span>
                </div>
                {!isAssigned && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
              </button>
            )}

            {/* SECTION 1: IN-HOUSE TEAM (TAGGED) */}
            {inHouseFiltered.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/80 rounded-md flex items-center justify-between border border-amber-200/80">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                    <span>In-House Team</span>
                  </span>
                  <span className="text-[8px] bg-amber-200 text-amber-950 px-1 rounded-full font-black">
                    {inHouseFiltered.length}
                  </span>
                </div>

                {inHouseFiltered.map((m: any) => {
                  const isSelected = Boolean(
                    (selectedId && m.id === selectedId) ||
                    (activeName && m.name && m.name.toLowerCase().trim() === activeName.toLowerCase().trim())
                  );
                  const displayRole = getMemberDisplayRole(m);

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          id: m.id,
                          name: m.name,
                          email: m.email || null,
                          phone: m.phone || m.phone_number || null,
                          role: m.role || null,
                          primary_role: m.primary_role || null,
                          roles: m.roles || [],
                          avatar_url: m.avatar_url || null,
                        });
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(m.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {displayRole}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SECTION 2: FREELANCERS & EXTERNAL VENDORS (TAGGED) */}
            {freelancersFiltered.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 bg-stone-100/90 rounded-md flex items-center justify-between border border-stone-200">
                  <span className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-stone-600" />
                    <span>Freelancers & External Vendors</span>
                  </span>
                  <span className="text-[8px] bg-stone-200 text-stone-900 px-1 rounded-full font-black">
                    {freelancersFiltered.length}
                  </span>
                </div>

                {freelancersFiltered.map((m: any) => {
                  const isSelected = Boolean(
                    (selectedId && m.id === selectedId) ||
                    (activeName && m.name && m.name.toLowerCase().trim() === activeName.toLowerCase().trim())
                  );
                  const displayRole = getMemberDisplayRole(m);

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          id: m.id,
                          name: m.name,
                          email: m.email || null,
                          phone: m.phone || m.phone_number || null,
                          role: m.role || null,
                          primary_role: m.primary_role || null,
                          roles: m.roles || [],
                          avatar_url: m.avatar_url || null,
                        });
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-stone-500 to-stone-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(m.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {displayRole}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {inHouseFiltered.length === 0 && freelancersFiltered.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                No matching team members found.
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
