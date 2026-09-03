'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FWAssignment, FWTeamMember } from '@/types';
import { Search, Plus, Check } from 'lucide-react';
import { getRoleShortCode, getRoleAbbr } from '@/lib/workspace-settings';

interface RoleAssignDropdownProps {
  assignment: FWAssignment;
  subEventId: string;
  projectId: string;
  teamMembers: FWTeamMember[];
  onAssignMember: (assignmentId: string, memberId: string | null) => void;
  onAddNewMember: (info: { assignmentId: string; role: string; subEventId: string; projectId: string }) => void;
  variant?: 'chip' | 'avatar';
}

export default function RoleAssignDropdown({
  assignment,
  subEventId,
  projectId,
  teamMembers,
  onAssignMember,
  onAddNewMember,
  variant = 'avatar',
}: RoleAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const memberObj = assignment.fw_team_members || (assignment.assigned_member_id ? teamMembers.find(m => m.id === assignment.assigned_member_id) : null);
  const isAssigned = Boolean(assignment.assigned_member_id || memberObj);
  const rawName = memberObj?.name || '';
  const cleanName = rawName.replace(/\.\.\./g, '').trim();
  const role = assignment.required_role;

  const handleOpenPopover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.bottom + 6;
    // Keep popover inside window bounds horizontally
    const left = Math.max(10, Math.min(rect.left - 40, window.innerWidth - 270));
    setPopoverPos({ top, left });
    setSearchQuery('');
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPopoverPos(null);
  };

  const sortedMembers = React.useMemo(() => {
    const list = teamMembers.filter((m) => {
      const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        cleanMName.toLowerCase().includes(q) ||
        (m.primary_role && m.primary_role.toLowerCase().includes(q))
      );
    });

    return list.sort((a, b) => {
      // 1. Pinned Assigned Member ALWAYS at Position #1 (Top)
      const isAAssigned = assignment.assigned_member_id === a.id;
      const isBAssigned = assignment.assigned_member_id === b.id;
      if (isAAssigned && !isBAssigned) return -1;
      if (!isAAssigned && isBAssigned) return 1;

      // 2. Prioritize Role Matches next
      const isARole = (a.primary_role || '').toLowerCase() === (role || '').toLowerCase();
      const isBRole = (b.primary_role || '').toLowerCase() === (role || '').toLowerCase();
      if (isARole && !isBRole) return -1;
      if (!isARole && isBRole) return 1;

      // 3. Alphabetical fallback
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [teamMembers, searchQuery, assignment.assigned_member_id, role]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {/* TRIGGER UI */}
      {variant === 'chip' ? (
        <div
          onClick={handleOpenPopover}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer select-none shadow-2xs hover:shadow-xs active:scale-95 ${
            isAssigned
              ? 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-950 border-emerald-300'
              : 'bg-rose-50 hover:bg-rose-100/90 text-rose-800 border-rose-300'
          }`}
          title={`Click to assign or change team member for ${role}`}
        >
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
              isAssigned ? 'bg-emerald-600' : 'bg-rose-500'
            }`}
          >
            {role.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-extrabold">{role}:</span>
          <span className={isAssigned ? 'font-black text-emerald-900' : 'font-extrabold italic text-rose-600'}>
            {cleanName || 'Unassigned (+ Assign)'}
          </span>
        </div>
      ) : (
        /* STRICT SHORT-FORM ROLE AVATAR (NO OVERFLOW) */
        <div
          onClick={handleOpenPopover}
          className="flex flex-col items-center group cursor-pointer min-w-[50px] max-w-[75px]"
          title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
        >
          {/* Avatar */}
          {isAssigned ? (
            <div className="relative w-9 h-9 rounded-full ring-2 ring-emerald-500 ring-offset-1 p-0.5 overflow-hidden flex items-center justify-center bg-emerald-50 shrink-0 shadow-xs">
              {memberObj?.avatar_url ? (
                // eslint-disable-next-next/no-img-element
                <img
                  src={memberObj.avatar_url}
                  alt={cleanName}
                  className="w-full h-full rounded-full object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                  {cleanName.slice(0, 2).toUpperCase() || getRoleAbbr(role)}
                </div>
              )}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full border border-dashed border-red-500 bg-red-50/90 text-red-600 font-black flex items-center justify-center shadow-2xs group-hover:bg-red-100 transition-colors cursor-pointer shrink-0">
              <Plus className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
            </div>
          )}

          {/* Role Pill */}
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider mt-0.5 leading-none block text-center">
            {getRoleAbbr(role)}
          </span>

          {/* Member Full Clean Name */}
          {isAssigned ? (
            <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 text-center leading-tight truncate max-w-[75px] block mt-0.5" title={cleanName}>
              {cleanName}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[75px] text-center leading-none mt-0.5 block">
              Assign
            </span>
          )}
        </div>
      )}

      {/* PORTAL DROPDOWN POPOVER */}
      {isOpen && popoverPos && typeof window !== 'undefined' && createPortal(
        <>
          {/* BACKDROP OVERLAY TO CLOSE */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={handleClose}
          />
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                zIndex: 95,
              }}
              className="w-64 bg-white border border-[#6C5CE7]/20 rounded-[18px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-3 space-y-2 text-left select-none"
            >
              {/* SEARCH INPUT BAR */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search member or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* TOP PINNED ADD NEW MEMBER ACTION BUTTON */}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onAddNewMember({
                    assignmentId: assignment.id,
                    role: assignment.required_role,
                    subEventId,
                    projectId,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#F0EDFF] hover:bg-[#E5E0FF] text-[#6C5CE7] text-xs font-bold py-2 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add New Team Member
              </button>

              <div className="h-px bg-zinc-100 my-1" />

              {/* MEMBER SELECTION LIST */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                {/* UNASSIGN OPTION */}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onAssignMember(assignment.id, null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !isAssigned
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <span>• Unassign / Pending</span>
                  {!isAssigned && <Check className="w-3.5 h-3.5" />}
                </button>

                {sortedMembers.map((m) => {
                  const isSelected = assignment.assigned_member_id === m.id;
                  const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                  const isRoleMatch = (m.primary_role || '').toLowerCase() === (role || '').toLowerCase();

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        handleClose();
                        onAssignMember(assignment.id, m.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs'
                          : 'text-[#0B111E] hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.avatar_url ? (
                          // eslint-disable-next-next/no-img-element
                          <img
                            src={m.avatar_url}
                            alt={cleanMName}
                            className={`w-6 h-6 rounded-full object-cover shrink-0 border border-white ${
                              isSelected ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200'
                            }`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanMName)}`;
                            }}
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-full text-white font-black text-[9px] flex items-center justify-center shrink-0 border border-white ${
                            isSelected ? 'bg-emerald-600 ring-2 ring-emerald-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}>
                            {cleanMName.slice(0, 2).toUpperCase() || 'TM'}
                          </div>
                        )}
                        <div className="text-left leading-tight min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`block font-black text-xs truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                              {cleanMName}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Currently Assigned
                              </span>
                            )}
                          </div>
                          <span className={`text-[9.5px] font-semibold ${isSelected ? 'text-emerald-700' : isRoleMatch ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                            {m.primary_role || 'Crew'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
