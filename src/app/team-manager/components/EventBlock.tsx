"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Trash2, MapPin, Link as LinkIcon, MessageSquare, Clock, 
  Calendar, Users, Layers, Sparkles, Zap, ChevronDown, Check, Moon, AlertCircle
} from 'lucide-react';
import ProgramTypeSelect from './ProgramTypeSelect';
import CalendarPicker from './CalendarPicker';
import TimePicker12H from '@/components/ui/TimePicker12H';
import RoleGrid from './RoleGrid';

export interface EventBlockData {
  id: string;
  subEventNames: string[];
  subEventDate: string;
  isDateTbd?: boolean;
  isOvernight?: boolean;
  endDate?: string;
  venueLocation?: string;
  mapLink?: string;
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
      className="bg-[#FEFDF8] rounded-2xl border border-amber-200/90 p-3 sm:p-3.5 space-y-2.5 shadow-2xs relative group"
    >
      {/* HEADER ROW WITH BLOCK INDEX & ACTIONS */}
      <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] flex items-center justify-center border border-amber-300">
            {index + 1}
          </div>
          <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
            <span>Sub-Event #{index + 1}</span>
            {block.subEventNames.length > 0 && (
              <span className="text-amber-700 font-extrabold normal-case">
                ({block.subEventNames.join(' + ')})
              </span>
            )}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(block)}
            className="p-1.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100/70 rounded-lg transition cursor-pointer"
            title="Duplicate event block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {totalBlocks > 1 && (
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

      {/* 2. DATE SETTINGS (TBD + OVERNIGHT DUAL DAY OPTIONS) */}
      <div className="p-2 sm:p-2.5 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* TBD Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(block.isDateTbd)}
              onChange={(e) => {
                const isTbd = e.target.checked;
                onUpdate(block.id, {
                  isDateTbd: isTbd,
                  subEventDate: isTbd ? '' : block.subEventDate,
                });
              }}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
            <span className="text-xs font-black text-amber-950">
              📅 Date Not Fixed (TBD)
            </span>
          </label>

          {/* Overnight Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(block.isOvernight)}
              onChange={(e) => {
                const isOvernight = e.target.checked;
                onUpdate(block.id, {
                  isOvernight,
                  endDate: isOvernight ? (block.endDate || block.subEventDate) : '',
                });
              }}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
            <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span>🌙 Spans Overnight (Next Day End)</span>
            </span>
          </label>
        </div>

        {/* Calendar Picker Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider block mb-1">
              {block.isOvernight ? 'Start Date' : 'Event Date'}
            </label>
            {block.isDateTbd ? (
              <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Date: TBD / Not Fixed</span>
              </div>
            ) : (
              <CalendarPicker
                value={block.subEventDate}
                onChange={(date) => onUpdate(block.id, { subEventDate: date })}
                hasError={hasDateError}
              />
            )}
          </div>

          {block.isOvernight && !block.isDateTbd && (
            <div>
              <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block mb-1">
                🌙 End Date (Next Day)
              </label>
              <CalendarPicker
                value={block.endDate || block.subEventDate}
                onChange={(date) => onUpdate(block.id, { endDate: date })}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. UNIVERSAL 12-HOUR TIME PICKERS & SHIFT SLOT */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
        <div className="sm:col-span-3">
          <TimePicker12H
            label="Roll Call Time (Start)"
            value={block.startTime}
            onChange={(time) => onUpdate(block.id, { startTime: time })}
          />
        </div>

        <div className="sm:col-span-3">
          <TimePicker12H
            label="Dismissal Estimate (End)"
            value={block.endTime}
            onChange={(time) => onUpdate(block.id, { endTime: time })}
          />
        </div>

        {/* SINGLE SHIFT SLOT DROPDOWN */}
        <div className="sm:col-span-1 relative" ref={slotDropdownRef}>
          <label className="text-[10px] text-amber-950 font-black uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Shift</span>
          </label>
          <button
            type="button"
            onClick={() => setIsSlotDropdownOpen(!isSlotDropdownOpen)}
            className={`w-full h-7.5 px-2 rounded-lg border font-bold text-xs transition flex items-center justify-between cursor-pointer shadow-2xs ${
              block.shiftSlot && block.shiftSlot !== 'None (Standard)'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-amber-200 text-zinc-700 hover:border-amber-400'
            }`}
            title="Select Shift Slot Duration"
          >
            <span className="truncate text-[11px]">
              {block.shiftSlot && block.shiftSlot !== 'None (Standard)' ? block.shiftSlot : 'Slot'}
            </span>
            <ChevronDown className={`w-3 h-3 shrink-0 text-zinc-500 transition-transform ${isSlotDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isSlotDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-40 bg-white border border-amber-200 rounded-xl shadow-xl p-1 z-50 space-y-0.5"
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
                      className={`w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white font-extrabold shadow-xs'
                          : 'hover:bg-amber-50 text-zinc-800'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Venue Coordinates / Location */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider block flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-zinc-500" />
          <span>Venue Coordinates / Location</span>
          <span className="text-zinc-400 font-normal lowercase text-[9px]">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="e.g. Royal Lawn Room, Mumbai"
            value={block.venueLocation}
            onChange={(e) => onUpdate(block.id, { venueLocation: e.target.value })}
            className="w-full h-7.5 bg-white border border-amber-200/90 focus:border-amber-500 pl-7.5 pr-2.5 rounded-lg text-base sm:text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition shadow-2xs"
          />
        </div>
        <div className="relative">
          <LinkIcon className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            placeholder="Map Link (e.g. https://maps.google.com/?q=...)"
            value={block.mapLink}
            onChange={(e) => onUpdate(block.id, { mapLink: e.target.value })}
            className="w-full h-7.5 bg-white border border-amber-200/90 focus:border-amber-500 pl-7.5 pr-2.5 rounded-lg text-base sm:text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition shadow-2xs font-mono"
          />
        </div>
      </div>

      {/* 5. Roles Required Grid */}
      <RoleGrid
        selectedRoles={block.roles}
        onToggle={(role: string) => onToggleRole(block.id, role)}
        onAddCustom={onAddCustomRole}
      />

      {/* 6. Operational Notes / Comments */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span>Operational Notes & Instructions</span>
          <span className="text-zinc-400 font-normal lowercase">(optional)</span>
        </label>
        <div className="relative">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
          <textarea
            ref={notesRef}
            rows={1}
            placeholder="Important operational notes for crew..."
            value={block.notes}
            onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
            className="w-full bg-white border border-amber-200/90 focus:border-amber-500 pl-9 pr-3 py-2 rounded-xl text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition shadow-2xs resize-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
