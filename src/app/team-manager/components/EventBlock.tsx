'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, MapPin, Link as LinkIcon, MessageSquare, Clock, Calendar, Users, Layers, Sparkles, Zap, ChevronDown, Check } from 'lucide-react';
import ProgramTypeSelect from './ProgramTypeSelect';
import CalendarPicker from './CalendarPicker';
import SmartTimePicker from './SmartTimePicker';
import RoleGrid from './RoleGrid';

export interface EventBlockData {
  id: string;
  subEventNames: string[];
  subEventDate: string;
  venueLocation: string;
  mapLink: string;
  startTime: string;
  endTime: string;
  shiftSlot?: string;
  roles: string[];
  notes: string;
}

const SLOT_OPTIONS = [
  'None (Standard)',
  '1 Hour Slot',
  '2 Hours Slot',
  '3 Hours Slot',
  '4 Hours Slot',
  '6 Hours Slot',
  '8 Hours Slot',
  '10 Hours Slot',
  '12 Hours Slot',
];

interface EventBlockProps {
  block: EventBlockData;
  index: number;
  totalBlocks: number;
  onUpdate: (id: string, fields: Partial<EventBlockData>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (block: EventBlockData) => void;
  onAddCustomProgram: (name: string) => void;
  onAddCustomRole: (role: string) => void;
  onToggleRole: (blockId: string, role: string) => void;
  hasProgramTypeError?: boolean;
  hasDateError?: boolean;
}

export default function EventBlock({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onDuplicate,
  onAddCustomProgram,
  onAddCustomRole,
  onToggleRole,
  hasProgramTypeError,
  hasDateError,
}: EventBlockProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);
  const slotDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(e.target as Node)) {
        setIsSlotDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adjustNotesHeight = () => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustNotesHeight();
  }, [block.notes]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-sm relative group"
    >
      {/* HEADER ROW WITH BLOCK INDEX & ACTIONS */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#6C5CE7] font-black text-xs flex items-center justify-center border border-indigo-100">
            {index + 1}
          </div>
          <h4 className="text-xs font-black text-[#0B111E] uppercase tracking-wider flex items-center gap-1.5">
            <span>Sub-Event #{index + 1}</span>
            {block.subEventNames.length > 0 && (
              <span className="text-[#6C5CE7] font-extrabold normal-case">
                ({block.subEventNames.join(' + ')})
              </span>
            )}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(block)}
            className="p-1.5 text-slate-400 hover:text-[#6C5CE7] hover:bg-indigo-50 rounded-lg transition cursor-pointer"
            title="Duplicate event block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {totalBlocks > 1 && (
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Remove event block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. EVENT TYPE MULTI-SELECT */}
      <ProgramTypeSelect
        selected={block.subEventNames}
        onChange={(names) => onUpdate(block.id, { subEventNames: names })}
        onAddCustom={onAddCustomProgram}
        hasError={hasProgramTypeError}
      />

      {/* 2. PROGRAM DATE, TIMES & SINGLE SHIFT SLOT ICON DROPDOWN ON FAR RIGHT */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
        <div className="sm:col-span-2">
          <CalendarPicker
            value={block.subEventDate}
            onChange={(date) => onUpdate(block.id, { subEventDate: date })}
            hasError={hasDateError}
          />
        </div>

        <div className="sm:col-span-2">
          <SmartTimePicker
            label="Crew Roll Call Time"
            value={block.startTime}
            onChange={(time) => onUpdate(block.id, { startTime: time })}
          />
        </div>

        <div className="sm:col-span-2">
          <SmartTimePicker
            label="Dismissal Estimate Time"
            value={block.endTime}
            onChange={(time) => onUpdate(block.id, { endTime: time })}
          />
        </div>

        {/* SINGLE SHIFT SLOT DROPDOWN ON FAR RIGHT END */}
        <div className="sm:col-span-1 relative" ref={slotDropdownRef}>
          <label className="text-[10px] text-[#0B111E] font-black uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Shift Slot</span>
          </label>

          <button
            type="button"
            onClick={() => setIsSlotDropdownOpen(!isSlotDropdownOpen)}
            className={`w-full py-2 px-2.5 rounded-xl border-2 font-extrabold text-xs transition flex items-center justify-between cursor-pointer shadow-2xs ${
              block.shiftSlot && block.shiftSlot !== 'None (Standard)'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
            }`}
            title="Select Shift Slot Duration"
          >
            <span className="truncate text-[11px]">
              {block.shiftSlot && block.shiftSlot !== 'None (Standard)' ? block.shiftSlot : 'Slot'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform ${isSlotDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isSlotDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute right-0 top-full mt-1.5 w-44 bg-white/95 backdrop-blur-xl border-2 border-indigo-100 rounded-2xl shadow-xl p-1.5 z-50 space-y-0.5"
              >
                {SLOT_OPTIONS.map((option) => {
                  const isSelected = (block.shiftSlot || 'None (Standard)') === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onUpdate(block.id, { shiftSlot: option === 'None (Standard)' ? '' : option });
                        setIsSlotDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white font-extrabold shadow-xs'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Venue Coordinates / Location (Optional) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider block flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span>Venue Coordinates / Location</span>
          <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#4F5E74] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="e.g. Royal Lawn Room, Mumbai"
            value={block.venueLocation}
            onChange={(e) => onUpdate(block.id, { venueLocation: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-[#0B111E] placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
          />
        </div>
        <div className="relative">
          <LinkIcon className="w-3.5 h-3.5 text-[#4F5E74] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            placeholder="Map Link (e.g. https://maps.google.com/...)"
            value={block.mapLink}
            onChange={(e) => onUpdate(block.id, { mapLink: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white pl-9 pr-3 py-2 rounded-xl text-xs font-medium text-[#4F5E74] placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Roles Required Grid */}
      <RoleGrid
        selectedRoles={block.roles}
        onToggle={(role: string) => onToggleRole(block.id, role)}
        onAddCustom={onAddCustomRole}
      />

      {/* 5. Operational Notes / Comments (Optional) */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider block flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
          <span>Operational Notes & Instructions</span>
          <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <div className="relative">
          <MessageSquare className="w-3.5 h-3.5 text-[#4F5E74] absolute left-3 top-3" />
          <textarea
            ref={notesRef}
            rows={1}
            placeholder="Important operational notes for crew..."
            value={block.notes}
            onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white pl-9 pr-3 py-2 rounded-xl text-xs font-medium text-[#0B111E] placeholder:text-slate-400 focus:outline-none transition shadow-2xs resize-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
