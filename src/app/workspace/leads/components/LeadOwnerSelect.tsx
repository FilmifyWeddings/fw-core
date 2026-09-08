'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  ChevronDown, Search, Check, Sparkles, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface LeadOwnerMember {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  roles?: string[];          // Postgres text[]
  role_code?: string;
  role_codes?: string[];
  avatar_url?: string;
  phone?: string;
  color?: string;
  is_sales_person?: boolean;
}

/**
 * Safe, bulletproof check for Sales Person role against Postgres schema.
 * Handles array roles (roles text[]), role_code === 'SP', and direct boolean flag.
 */
export function isMemberSalesPerson(member: any): boolean {
  if (!member) return false;

  // 1. Direct boolean flag from DB
  if (member.is_sales_person === true) return true;

  // 2. Check role_code
  if (String(member.role_code || '').trim().toUpperCase() === 'SP') return true;
  if (Array.isArray(member.role_codes) && member.role_codes.some((c: string) => String(c || '').trim().toUpperCase() === 'SP')) return true;

  // 3. Check array of roles safely
  const rolesArray: string[] = Array.isArray(member.roles)
    ? [...member.roles]
    : [];

  if (member.primary_role && typeof member.primary_role === 'string') {
    rolesArray.push(member.primary_role);
  }

  return rolesArray.some((r: string) => {
    const clean = String(r || '').trim().toLowerCase();
    return clean.includes('sales') || clean === 'sp';
  });
}

interface LeadOwnerSelectProps {
  value?: string | null;
  onChange: (ownerName: string, memberId?: string) => void;
  leadId?: string;
  teamMembers?: any[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function LeadOwnerSelect({
  value,
  onChange,
  leadId,
  teamMembers: propTeamMembers,
  placeholder = 'Select Owner',
  disabled = false,
  className = '',
}: LeadOwnerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedMembers, setFetchedMembers] = useState<LeadOwnerMember[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 260 });
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all active team members for the active studio owner from fw_team_members (Postgres roles text[])
  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const wsId = session?.user?.id;
        if (!wsId) return;

        const membersList: LeadOwnerMember[] = [];

        // 1. Fetch from fw_team_members strictly querying actual DB columns (no 'role')
        const { data: fwCrew } = await supabase
          .from('fw_team_members')
          .select('id, user_id, name, roles, role_code, is_sales_person, avatar_url, phone_number')
          .eq('user_id', wsId);

        if (fwCrew && fwCrew.length > 0) {
          fwCrew.forEach((c: any) => {
            if (c.name) {
              const rolesArr: string[] = Array.isArray(c.roles) ? c.roles : [];
              membersList.push({
                id: c.id,
                user_id: c.user_id,
                name: c.name.trim(),
                roles: rolesArr,
                role_code: c.role_code,
                avatar_url: c.avatar_url,
                phone: c.phone_number,
                is_sales_person: isMemberSalesPerson(c),
              });
            }
          });
        }

        // 2. Add studio owner if assigned Sales Person role
        const ownerName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0];
        const ownerRole = session?.user?.user_metadata?.role || '';
        const isOwnerSales = 
          ownerRole.toLowerCase().includes('sales') || 
          ownerRole.toUpperCase() === 'SP';

        if (ownerName && !membersList.some(m => m.name.toLowerCase() === ownerName.toLowerCase())) {
          membersList.unshift({
            id: wsId,
            name: ownerName,
            roles: [ownerRole || 'Owner'],
            role_code: isOwnerSales ? 'SP' : undefined,
            is_sales_person: isOwnerSales,
          });
        }

        if (membersList.length > 0) {
          setFetchedMembers(membersList);
        }
      } catch (err) {
        console.warn('Error fetching lead owner team members:', err);
      }
    };

    fetchCrew();
  }, []);

  // Consolidate & Deduplicate Team Members
  const consolidatedMembers = useMemo(() => {
    const memberMap = new Map<string, LeadOwnerMember>();

    // Merge prop members if provided
    if (Array.isArray(propTeamMembers)) {
      propTeamMembers.forEach(m => {
        if (typeof m === 'string') {
          const isSales = m.toLowerCase().includes('sales') || m.toUpperCase() === 'SP';
          memberMap.set(m.toLowerCase(), {
            id: m,
            name: m,
            roles: isSales ? ['Sales Person'] : ['Team Member'],
            role_code: isSales ? 'SP' : undefined,
            is_sales_person: isSales,
          });
        } else if (m?.name) {
          const rolesArr: string[] = Array.isArray(m.roles) ? [...m.roles] : [];
          if (m.primary_role) rolesArr.push(m.primary_role);

          memberMap.set(m.name.toLowerCase(), {
            id: m.id || m.name,
            user_id: m.user_id,
            name: m.name,
            email: m.email,
            roles: rolesArr,
            role_code: m.role_code,
            avatar_url: m.avatar_url,
            is_sales_person: isMemberSalesPerson(m),
          });
        }
      });
    }

    // Merge fetched members from fw_team_members
    fetchedMembers.forEach(fm => {
      const key = fm.name.toLowerCase();
      if (!memberMap.has(key)) {
        memberMap.set(key, fm);
      } else {
        const existing = memberMap.get(key)!;
        if (fm.is_sales_person) {
          existing.is_sales_person = true;
        }
      }
    });

    return Array.from(memberMap.values()).filter(m => m.name.toLowerCase() !== 'unassigned');
  }, [propTeamMembers, fetchedMembers]);

  // Current active value normalized
  const currentOwner = (value || 'Unassigned').trim();
  const isUnassigned = currentOwner.toLowerCase() === 'unassigned' || !currentOwner;

  // ── STRICT WHITELIST FILTER: ONLY MEMBERS WITH 'SALES PERSON' (SP) ROLE ──
  // Always preserve currently assigned owner (e.g. Chad Thun...) in the options even if array parsing evaluates false during initial hydration
  const salesTeamMembers = useMemo(() => {
    const list = (consolidatedMembers || []).filter(isMemberSalesPerson);

    if (!isUnassigned && currentOwner) {
      const alreadyExists = list.some(
        m => m.name.toLowerCase() === currentOwner.toLowerCase()
      );
      if (!alreadyExists) {
        const matched = consolidatedMembers.find(
          m => m.name.toLowerCase() === currentOwner.toLowerCase()
        );
        list.unshift(
          matched || {
            id: currentOwner,
            name: currentOwner,
            roles: ['Sales Person'],
            role_code: 'SP',
            is_sales_person: true,
          }
        );
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [consolidatedMembers, isUnassigned, currentOwner]);

  // Selected Member Details (if assigned to a sales person)
  const selectedMember = useMemo(() => {
    if (isUnassigned) return null;
    return salesTeamMembers.find(m => m.name.toLowerCase() === currentOwner.toLowerCase());
  }, [currentOwner, isUnassigned, salesTeamMembers]);

  // Update popup coordinates
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 300;
      const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight;
      const topPos = fitsBelow ? rect.bottom + 4 : Math.max(10, rect.top - dropdownHeight - 4);

      setCoords({
        top: Math.round(topPos),
        left: Math.round(Math.max(10, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 10))),
        width: Math.round(Math.max(rect.width, 260)),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Window resize/scroll listener
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

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Search filtering strictly within salesTeamMembers
  const q = searchQuery.toLowerCase().trim();
  const filteredSales = useMemo(() => {
    if (!q) return salesTeamMembers;
    return salesTeamMembers.filter(m => {
      const matchName = m.name.toLowerCase().includes(q);
      const matchRole = Array.isArray(m.roles) && m.roles.some((r: string) => r.toLowerCase().includes(q));
      return matchName || matchRole;
    });
  }, [salesTeamMembers, q]);

  const handleSelect = (name: string, memberId?: string) => {
    onChange(name, memberId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full min-w-[140px] ${className}`}>
      {/* 3D Cream Trigger Pill */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer shadow-2xs ${
          isUnassigned
            ? 'bg-[#FAF8F5] dark:bg-stone-900 border-[#EAE5DA] dark:border-stone-800 text-rose-700 dark:text-rose-400 hover:border-rose-300'
            : selectedMember
            ? 'bg-[#FFFDF9] dark:bg-stone-900 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 hover:border-amber-400 shadow-amber-500/5'
            : 'bg-[#FFFDF9] dark:bg-stone-900 border-[#EAE5DA] dark:border-stone-800 text-slate-800 dark:text-stone-200 hover:border-amber-400'
        } ${isOpen ? 'ring-2 ring-amber-500/20 border-amber-400' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isUnassigned ? (
            <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-black shrink-0">
              —
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 border bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700">
              {currentOwner.slice(0, 2).toUpperCase()}
            </div>
          )}

          <span className="truncate text-xs font-bold">
            {isUnassigned ? (
              'Unassigned'
            ) : selectedMember ? (
              <span>
                <span className="text-amber-800 dark:text-amber-300 font-extrabold">[SP]</span> • {currentOwner}
              </span>
            ) : (
              currentOwner
            )}
          </span>

          {!isUnassigned && (
            <span className="text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white px-1.5 py-0.2 rounded-md shadow-2xs shrink-0 tracking-wider">
              SP
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
      </button>

      {/* Floating Portal Menu */}
      {isMounted && isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998] cursor-default"
            onClick={() => setIsOpen(false)}
          />

          {/* 3D Cream Popover */}
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
              maxHeight: '340px',
            }}
            className="bg-[#FFFDF9] dark:bg-[#1A1816] rounded-2xl border border-amber-900/15 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Sticky Search Header */}
            <div className="p-2 border-b border-[#EAE5DA] dark:border-stone-800 bg-[#FAF8F5] dark:bg-stone-900/90">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="🔍 Search sales rep..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>
            </div>

            {/* Scrollable Items Container (STRICTLY SALES PERSONS ONLY) */}
            <div className="overflow-y-auto p-1.5 space-y-1 flex-1">
              {/* 1. TOP PINNED: Unassigned */}
              <button
                type="button"
                onClick={() => handleSelect('Unassigned')}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs select-none ${
                  isUnassigned 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-black border border-rose-200 dark:border-rose-900/60' 
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 font-bold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black text-xs">
                    —
                  </div>
                  <span>Unassigned</span>
                </div>
                {isUnassigned && <Check className="w-3.5 h-3.5 text-rose-600" />}
              </button>

              {/* 2. SALES PERSONS ONLY (WHITELISTED) */}
              {salesTeamMembers.length > 0 ? (
                <div className="pt-1.5 space-y-1">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Available Sales Reps ({salesTeamMembers.length})
                    </span>
                  </div>

                  {filteredSales.map(m => {
                    const isSelected = currentOwner.toLowerCase() === m.name.toLowerCase();
                    return (
                      <button
                        key={m.id || m.name}
                        type="button"
                        onClick={() => handleSelect(m.name, m.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs select-none ${
                          isSelected
                            ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 font-black border border-amber-300 dark:border-amber-800 shadow-2xs'
                            : 'text-slate-800 dark:text-stone-200 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 flex items-center justify-center font-black text-[10px] shrink-0 border border-amber-300">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="truncate text-xs font-black">
                              <span className="text-amber-700 dark:text-amber-400">[SP]</span> • {m.name}
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
                              Sales Person
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                            [SP] Sales
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />}
                        </div>
                      </button>
                    );
                  })}

                  {filteredSales.length === 0 && searchQuery && (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      No matching sales reps found.
                    </div>
                  )}
                </div>
              ) : (
                /* Informative helper item when no sales person role exists */
                <div className="p-4 text-center space-y-1.5 bg-amber-50/50 dark:bg-stone-800/40 rounded-xl border border-dashed border-amber-200 dark:border-stone-700 my-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                    No team members assigned as Sales Person
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-stone-400">
                    Assign the &quot;Sales Person (SP)&quot; role in Team Manager to enable lead ownership.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}
