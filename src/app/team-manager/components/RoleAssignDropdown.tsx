'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FWAssignment, FWTeamMember } from '@/types';
import { Search, Plus, Check, UserPlus, UserCheck } from 'lucide-react';

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
  variant = 'chip',
}: RoleAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const isAssigned = !!assignment.assigned_member_id;
  const memberObj = assignment.fw_team_members;
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

  const filteredMembers = teamMembers.filter((m) => {
    const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cleanMName.toLowerCase().includes(q) ||
      (m.primary_role && m.primary_role.toLowerCase().includes(q))
    );
  });

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
        /* AVATAR VARIANT */
        <div
          onClick={handleOpenPopover}
          className="flex flex-col items-center group cursor-pointer"
          title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
        >
          {isAssigned ? (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 group-hover:scale-105 transition shrink-0">
              {cleanName.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 bg-red-50/90 text-red-600 font-black flex items-center justify-center shadow-xs group-hover:bg-red-100 transition-colors cursor-pointer shrink-0">
              <Plus className="w-5 h-5 text-red-600 stroke-[3]" />
            </div>
          )}
          <span className={`font-bold text-[11px] uppercase tracking-wide block text-center mt-1.5 leading-none ${
            isAssigned ? 'text-indigo-600' : 'text-red-600 font-extrabold'
          }`}>
            {role}
          </span>
          {isAssigned && (
            <span className="block font-extrabold text-slate-900 text-xs truncate max-w-[90px] mt-0.5">
              {cleanName}
            </span>
          )}
        </div>
      )}

      {/* PORTAL DROPDOWN POPOVER */}
      {isOpen && popoverPos && typeof window !== 'undefined' && createPortal(
        <>
          {/* BACKDROP OVERLAY TO CLOSE */}
          <div
            className="fixed inset-0 z-[99998]"
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
                zIndex: 99999,
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
                    onAssignMember(assignment.id, null);
                    handleClose();
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

                {filteredMembers.map((m) => {
                  const isSelected = assignment.assigned_member_id === m.id;
                  const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onAssignMember(assignment.id, m.id);
                        handleClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                          : 'text-[#0B111E] hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">
                          {cleanMName.slice(0, 2).toUpperCase() || 'TM'}
                        </div>
                        <div className="text-left leading-tight">
                          <span className="block">{cleanMName}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{m.primary_role}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#6C5CE7]" />}
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
