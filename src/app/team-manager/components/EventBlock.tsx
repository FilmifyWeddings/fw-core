'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Trash2, MapPin, Link as LinkIcon, MessageSquare, Sparkles } from 'lucide-react';
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
  roles: string[];
  notes: string;
}

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
}: EventBlockProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [block.notes]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-slate-50/90 border-2 border-slate-300/90 rounded-3xl p-5 space-y-4 relative group shadow-md shadow-slate-200/50 hover:shadow-lg transition-all duration-300"
    >
      {/* DISTINCT DARK HEADER BAR FOR SUB-EVENT CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-xl shadow-2xs tracking-wide">
            EVENT #{index + 1}
          </span>
          <span className="text-xs font-black text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
            {block.subEventNames.join(' + ') || 'Sub-Event Block'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDuplicate(block)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
            title="Duplicate event block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {totalBlocks > 1 && (
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Remove event block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Wedding Program Type Multi-select */}
      <ProgramTypeSelect
        selected={block.subEventNames}
        onChange={(names) => onUpdate(block.id, { subEventNames: names })}
        onAddCustom={onAddCustomProgram}
      />

      {/* 2. Program Date Custom Calendar */}
      <CalendarPicker
        value={block.subEventDate}
        onChange={(date) => onUpdate(block.id, { subEventDate: date })}
      />

      {/* 3. Venue Coordinates / Location */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
          Venue Coordinates / Location
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="e.g. Royal Lawn Room, Mumbai"
            value={block.venueLocation}
            onChange={(e) => onUpdate(block.id, { venueLocation: e.target.value })}
            className="w-full bg-white border-2 border-slate-200 pl-9 pr-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
          />
        </div>
        <div className="relative">
          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            placeholder="Map Link (e.g. https://maps.google.com/...)"
            value={block.mapLink}
            onChange={(e) => onUpdate(block.id, { mapLink: e.target.value })}
            className="w-full bg-white border-2 border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Crew Timing & Smart Hourly Slots */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
          Crew Timing & Shift Slots
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SmartTimePicker
            label="Crew Roll Call Time"
            value={block.startTime}
            onChange={(time) => onUpdate(block.id, { startTime: time })}
          />
          <SmartTimePicker
            label="Dismissal Estimate"
            value={block.endTime}
            onChange={(time) => onUpdate(block.id, { endTime: time })}
            showSlots
            slotReferenceTime={block.startTime}
          />
        </div>
      </div>

      {/* 5. Role Placements Grid */}
      <RoleGrid
        selectedRoles={block.roles}
        onToggle={(role) => onToggleRole(block.id, role)}
        onAddCustom={onAddCustomRole}
      />

      {/* 6. Core Operational Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          Core Operational Notes / Instructions
        </label>
        <textarea
          ref={notesRef}
          value={block.notes}
          onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
          placeholder="On-field directives, special instructions, VIP handling notes..."
          rows={2}
          className="w-full bg-white border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#6C5CE7] transition resize-none placeholder:text-slate-400 min-h-[60px] shadow-2xs"
        />
      </div>
    </motion.div>
  );
}
