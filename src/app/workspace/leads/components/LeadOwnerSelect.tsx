'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Search, Check, Briefcase, Building2, Users, AlertCircle, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isInHouseMember } from '@/lib/team-helpers';

export interface LeadOwnerMember {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  roles?: string[];          // Postgres text[]
  role_code?: string;
  role_codes?: string[];
  primary_role?: string;
  primary_type?: string;
  member_types?: string[];
  payout_frequency?: string;
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

  // 3. Check array of roles safely - matches Sales Person, Sales Head, Sales, SP, etc.
  const rolesArray: string[] = Array.isArray(member.roles)
    ? [...member.roles]
    : [];

  if (member.primary_role && typeof member.primary_role === 'string') {
    rolesArray.push(member.primary_role);
  }
  if (member.role && typeof member.role === 'string') {
    rolesArray.push(member.role);
  }

  return rolesArray.some((r: string) => {
    const clean = String(r || '').trim().toLowerCase();
    return clean.includes('sales') || clean === 'sp' || clean.includes('(sp)');
  });
}

function resolveDisplayRole(m: LeadOwnerMember): string {
  if (m.primary_role && typeof m.primary_role === 'string') return m.primary_role;
  if (Array.isArray(m.roles) && m.roles.length > 0) return m.roles[0];
  if (isMemberSalesPerson(m)) return 'Sales Person';
  if (isInHouseMember(m)) return 'In-House';
  return 'Crew';
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
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 280 });
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all active team members for the active studio owner from fw_team_members
  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeWs = typeof window !== 'undefined' 
          ? (localStorage.getItem('sc_active_workspace_id') || localStorage.getItem('impersonated_tenant_id') || '')
          : '';
        const sessionUserId = session?.user?.id || '';
        const searchStudio = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('studio') : null;

        const isValidUuid = (id?: string | null): id is string => 
          Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

        let resolvedStudioUid: string | null = null;
        if (searchStudio && !isValidUuid(searchStudio)) {
          try {
            const { data: prof } = await supabase
              .from('workspace_profiles')
              .select('user_id')
              .ilike('studio_slug', searchStudio)
              .maybeSingle();
            if (prof?.user_id && isValidUuid(prof.user_id)) {
              resolvedStudioUid = prof.user_id;
            }
          } catch (_) {}
        } else if (searchStudio && isValidUuid(searchStudio)) {
          resolvedStudioUid = searchStudio;
        }

        const targetIds = Array.from(new Set([sessionUserId, activeWs, resolvedStudioUid].filter(isValidUuid)));
        if (targetIds.length === 0) return;

        const membersList: LeadOwnerMember[] = [];

        // 1. Fetch from fw_team_members strictly querying actual DB columns
        const { data: fwCrew } = await supabase
          .from('fw_team_members')
          .select('id, user_id, name, roles, role_code, primary_role, primary_type, member_types, payout_frequency, is_sales_person, avatar_url, phone_number')
          .in('user_id', targetIds);

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
                primary_role: c.primary_role,
                primary_type: c.primary_type,
                member_types: c.member_types,
                payout_frequency: c.payout_frequency,
                avatar_url: c.avatar_url,
                phone: c.phone_number,
                is_sales_person: isMemberSalesPerson(c),
              });
            }
          });
        }

        // 2. Fetch from workspace_members for team collaboration / invited members
        try {
          const { data: wsCrew } = await supabase
            .from('workspace_members')
            .select('id, user_id, workspace_id, name, roles, primary_role, avatar_url, phone')
            .in('workspace_id', targetIds);

          if (wsCrew && wsCrew.length > 0) {
            wsCrew.forEach((w: any) => {
              if (w.name && !membersList.some(m => m.name.toLowerCase() === w.name.trim().toLowerCase())) {
                const rolesArr: string[] = Array.isArray(w.roles) ? w.roles : [];
                membersList.push({
                  id: w.id,
                  user_id: w.user_id,
                  name: w.name.trim(),
                  roles: rolesArr,
                  primary_role: w.primary_role,
                  avatar_url: w.avatar_url,
                  phone: w.phone,
                  is_sales_person: isMemberSalesPerson(w),
                });
              }
            });
          }
        } catch (_) {}

        // 3. Add studio owner / current user so owner can always assign themselves
        const ownerName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0];
        const ownerRole = session?.user?.user_metadata?.role || 'Studio Owner';

        if (ownerName && !membersList.some(m => m.name.toLowerCase() === ownerName.toLowerCase())) {
          membersList.unshift({
            id: sessionUserId || 'owner',
            name: ownerName,
            roles: [ownerRole],
            primary_role: 'Studio Owner',
            role_code: 'SP',
            is_sales_person: true,
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
            primary_role: isSales ? 'Sales Person' : 'Team Member',
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
            primary_role: m.primary_role,
            primary_type: m.primary_type,
            member_types: m.member_types,
            payout_frequency: m.payout_frequency,
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
        if (fm.is_sales_person) existing.is_sales_person = true;
        if (fm.primary_role && !existing.primary_role) existing.primary_role = fm.primary_role;
        if (fm.avatar_url && !existing.avatar_url) existing.avatar_url = fm.avatar_url;
        if (fm.primary_type) existing.primary_type = fm.primary_type;
        if (fm.member_types) existing.member_types = fm.member_types;
      }
    });

    return Array.from(memberMap.values()).filter(m => m.name.toLowerCase() !== 'unassigned');
  }, [propTeamMembers, fetchedMembers]);

  // Current active value normalized
  const currentOwner = (value || 'Unassigned').trim();
  const isUnassigned = currentOwner.toLowerCase() === 'unassigned' || !currentOwner;

  // Categorize members into the 3 explicit sections
  const { salesMembers, inHouseMembers, crewMembers } = useMemo(() => {
    const sales: LeadOwnerMember[] = [];
    const inHouse: LeadOwnerMember[] = [];
    const crew: LeadOwnerMember[] = [];

    const seenIds = new Set<string>();

    // 1. Sales Person
    consolidatedMembers.forEach(m => {
      if (isMemberSalesPerson(m)) {
        sales.push(m);
        seenIds.add(m.id || m.name);
      }
    });

    // 2. In-House Team (who aren't already sales)
    consolidatedMembers.forEach(m => {
      const id = m.id || m.name;
      if (!seenIds.has(id) && isInHouseMember(m)) {
        inHouse.push(m);
        seenIds.add(id);
      }
    });

    // 3. All Crew & Freelancers
    consolidatedMembers.forEach(m => {
      const id = m.id || m.name;
      if (!seenIds.has(id)) {
        crew.push(m);
      }
    });

    sales.sort((a, b) => a.name.localeCompare(b.name));
    inHouse.sort((a, b) => a.name.localeCompare(b.name));
    crew.sort((a, b) => a.name.localeCompare(b.name));

    return { salesMembers: sales, inHouseMembers: inHouse, crewMembers: crew };
  }, [consolidatedMembers]);

  // Selected Member Details
  const selectedMember = useMemo(() => {
    if (isUnassigned) return null;
    return consolidatedMembers.find(m => m.name.toLowerCase() === currentOwner.toLowerCase());
  }, [currentOwner, isUnassigned, consolidatedMembers]);

  // Update popup coordinates
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 360;
      const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight;
      const topPos = fitsBelow ? rect.bottom + 4 : Math.max(10, rect.top - dropdownHeight - 4);

      setCoords({
        top: Math.round(topPos),
        left: Math.round(Math.max(10, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 280) - 10))),
        width: Math.round(Math.max(rect.width, 280)),
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

  // Search filter across all 3 sections
  const q = searchQuery.toLowerCase().trim();
  const filterList = (list: LeadOwnerMember[]) => {
    if (!q) return list;
    return list.filter(m => {
      const nameMatch = m.name.toLowerCase().includes(q);
      const roleMatch = (m.primary_role || '').toLowerCase().includes(q) || 
        (Array.isArray(m.roles) && m.roles.some(r => r.toLowerCase().includes(q)));
      const phoneMatch = (m.phone || '').includes(q);
      return nameMatch || roleMatch || phoneMatch;
    });
  };

  const filteredSales = useMemo(() => filterList(salesMembers), [salesMembers, q]);
  const filteredInHouse = useMemo(() => filterList(inHouseMembers), [inHouseMembers, q]);
  const filteredCrew = useMemo(() => filterList(crewMembers), [crewMembers, q]);

  const hasAnyMatches = filteredSales.length > 0 || filteredInHouse.length > 0 || filteredCrew.length > 0;

  const handleSelect = (ownerName: string, memberId?: string) => {
    onChange(ownerName, memberId);
    setIsOpen(false);
  };

  const renderMemberRow = (m: LeadOwnerMember) => {
    const isSelected = currentOwner.toLowerCase() === m.name.toLowerCase();
    const roleBadge = resolveDisplayRole(m);

    return (
      <button
        key={m.id || m.name}
        type="button"
        onClick={() => handleSelect(m.name, m.id)}
        className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs select-none ${
          isSelected
            ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 font-bold border border-amber-300 dark:border-amber-800 shadow-2xs'
            : 'text-slate-800 dark:text-stone-200 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {m.avatar_url ? (
            <img src={m.avatar_url} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0 border border-amber-200" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-300/80">
              {m.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col text-left min-w-0">
            <span className="truncate text-xs font-semibold text-slate-900 dark:text-stone-100 leading-tight">
              {m.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-stone-400 font-medium truncate">
              {roleBadge}
            </span>
          </div>
        </div>

        {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />}
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-stone-900 border rounded-xl text-xs font-semibold transition-all shadow-2xs select-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed border-slate-200' : 'hover:border-amber-400 border-[#EAE5DA] dark:border-stone-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isUnassigned ? (
            <>
              <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                —
              </div>
              <span className="text-slate-400 dark:text-stone-500 font-medium">Unassigned</span>
            </>
          ) : selectedMember ? (
            <>
              {selectedMember.avatar_url ? (
                <img src={selectedMember.avatar_url} alt={selectedMember.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-amber-300" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-300">
                  {selectedMember.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-slate-800 dark:text-stone-100 font-bold truncate">
                {selectedMember.name}
              </span>
            </>
          ) : (
            <span className="text-slate-800 dark:text-stone-100 font-bold truncate">
              {currentOwner}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
      </button>

      {/* Dropdown Portal */}
      {isMounted && isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[1000001] cursor-default"
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
              zIndex: 1000002,
              maxHeight: '380px',
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
                  placeholder="🔍 Search team member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>
            </div>

            {/* Scrollable Items Container (Structured into 3 whitelisted sections) */}
            <div className="overflow-y-auto p-1.5 space-y-2 flex-1">
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
                  <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black text-xs">
                    —
                  </div>
                  <span>Unassigned</span>
                </div>
                {isUnassigned && <Check className="w-3.5 h-3.5 text-rose-600" />}
              </button>

              {/* 2. SECTION 1: 💼 Sales Person */}
              <div className="pt-1 space-y-1">
                <div className="px-2 py-1 text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg">
                  <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Sales Person ({salesMembers.length})</span>
                </div>

                {filteredSales.length > 0 ? (
                  filteredSales.map(m => renderMemberRow(m))
                ) : (
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 dark:text-stone-500 italic">
                    {searchQuery ? 'No sales person matches search' : 'No team members assigned as Sales Person'}
                  </div>
                )}
              </div>

              {/* 3. SECTION 2: 🏢 In-House Team */}
              <div className="pt-1 space-y-1">
                <div className="px-2 py-1 text-[10px] font-black text-sky-800 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5 bg-sky-50/60 dark:bg-sky-950/30 rounded-lg">
                  <Building2 className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>In-House Team ({inHouseMembers.length})</span>
                </div>

                {filteredInHouse.length > 0 ? (
                  filteredInHouse.map(m => renderMemberRow(m))
                ) : (
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 dark:text-stone-500 italic">
                    {searchQuery ? 'No in-house members match search' : 'No in-house team members found'}
                  </div>
                )}
              </div>

              {/* 4. SECTION 3: 👥 All Crew & Freelancers */}
              <div className="pt-1 space-y-1">
                <div className="px-2 py-1 text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg">
                  <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>All Crew & Freelancers ({crewMembers.length})</span>
                </div>

                {filteredCrew.length > 0 ? (
                  filteredCrew.map(m => renderMemberRow(m))
                ) : (
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 dark:text-stone-500 italic">
                    {searchQuery ? 'No crew matches search' : 'No freelancers or external crew found'}
                  </div>
                )}
              </div>

              {!hasAnyMatches && searchQuery && (
                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                  No matching team members found.
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
